/**
 * The weather ahead, for one line on the Trip screen ("Heavy rain expected
 * here in about 2 hours").
 *
 * The app sends a rough area, rounded to about 10 km, and is told the one
 * thing worth knowing about the next few hours there. Our server asks MET
 * Norway (the Norwegian Meteorological Institute) for that area's forecast,
 * so MET Norway never learns who is asking or where they are exactly.
 *
 * MET Norway's terms (read 14 October 2026): free, CC BY 4.0, so it may be
 * used in an app with sponsors as long as it is credited ("Data from MET
 * Norway"); every request names the app; an answer is kept until its
 * Expires time, and asked for again with If-Modified-Since; at most 4
 * decimals in a position. One forecast per area is kept in
 * `weatherForecasts`, which only this server reads.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

const FORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
/** MET Norway turns away requests that do not say which app is asking and how to reach it */
const NAMED_AS = 'WakaGuard/1.2 https://wakaguard.com';

/** One decimal of a degree is about 11 km: a town, never a street */
export const AREA_DECIMALS = 1;
/** How far ahead a line can look; MET Norway's hourly forecast is most reliable in the first hours */
export const MAX_HOURS = 6;
/** Hotter than this, in °C, is worth a word */
export const HOT_FROM = 38;
/** An hour with this much rain or more, in mm, is heavy rain whatever its symbol says */
export const HEAVY_RAIN_MM = 4;
/** A forecast kept past its expiry, for when MET Norway cannot be reached */
const STALE_LIMIT_MS = 6 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type WeatherKind = 'storm' | 'heavy-rain' | 'rain' | 'fog' | 'heat';
/** Most serious first */
const SERIOUSNESS: WeatherKind[] = ['storm', 'heavy-rain', 'rain', 'fog', 'heat'];

export interface ForecastHour {
  time?: string;
  data?: {
    instant?: { details?: { air_temperature?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
  };
}

export interface Ahead {
  /** The most serious thing coming, or null when nothing is worth a word */
  kind: WeatherKind | null;
  /** Hours from now until it starts: 0 means within the hour */
  startsInHours: number | null;
  /** The hottest temperature in the hours looked at, rounded */
  hottest: number | null;
  /** How many hours were looked at */
  hours: number;
}

/** A rough area for a position, or null when it is not a position */
export function roughArea(lat: unknown, lng: unknown): { lat: number; lng: number; key: string } | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // (+ 0 turns -0, just south or west of 0°, into 0)
  const round = (n: number) => Math.round(n * 10 ** AREA_DECIMALS) / 10 ** AREA_DECIMALS + 0;
  const area = { lat: round(lat), lng: round(lng) };
  return { ...area, key: `${area.lat.toFixed(AREA_DECIMALS)}_${area.lng.toFixed(AREA_DECIMALS)}` };
}

/**
 * Nigeria, with a margin for its borders. Asking for anywhere else is refused:
 * each new area costs a request to MET Norway in our name, so the function
 * must not answer for the whole world.
 */
export const SERVICE_AREA = { south: 3, north: 15, west: 1.5, east: 16 };

export function inServiceArea(area: { lat: number; lng: number }): boolean {
  return area.lat >= SERVICE_AREA.south && area.lat <= SERVICE_AREA.north
    && area.lng >= SERVICE_AREA.west && area.lng <= SERVICE_AREA.east;
}

/** How long MET Norway is waited for before a kept forecast, or none, is used */
const FETCH_WAIT_MS = 8000;

/** What one hour of the forecast says, if anything */
export function kindOfHour(hour: ForecastHour): WeatherKind | null {
  const symbol = hour.data?.next_1_hours?.summary?.symbol_code ?? '';
  const rain = hour.data?.next_1_hours?.details?.precipitation_amount ?? 0;
  const temperature = hour.data?.instant?.details?.air_temperature;
  if (symbol.includes('thunder')) return 'storm';
  if (symbol.includes('heavyrain') || rain >= HEAVY_RAIN_MM) return 'heavy-rain';
  if (symbol.includes('rain') || symbol.includes('sleet')) return 'rain';
  if (symbol.includes('fog')) return 'fog';
  if (typeof temperature === 'number' && temperature >= HOT_FROM) return 'heat';
  return null;
}

/**
 * The most serious thing in the next `hours` hours, and when it starts. An
 * hour counts while any part of it is still ahead.
 */
export function readAhead(timeseries: ForecastHour[], nowMs: number, hours: number): Ahead {
  const span = Math.min(MAX_HOURS, Math.max(1, Math.ceil(hours)));
  const coming = timeseries
    .map((hour) => ({ hour, startMs: Date.parse(hour.time ?? '') }))
    .filter(({ startMs }) => Number.isFinite(startMs) && startMs + HOUR_MS > nowMs && startMs < nowMs + span * HOUR_MS)
    .sort((a, b) => a.startMs - b.startMs);

  let kind: WeatherKind | null = null;
  let startsInHours: number | null = null;
  let hottest: number | null = null;
  for (const { hour, startMs } of coming) {
    const temperature = hour.data?.instant?.details?.air_temperature;
    if (typeof temperature === 'number') hottest = Math.max(hottest ?? -Infinity, Math.round(temperature));
    const found = kindOfHour(hour);
    if (!found) continue;
    if (kind === null || SERIOUSNESS.indexOf(found) < SERIOUSNESS.indexOf(kind)) {
      kind = found;
      startsInHours = Math.max(0, Math.floor((startMs - nowMs) / HOUR_MS));
    }
  }
  return { kind, startsInHours, hottest, hours: span };
}

/**
 * Only what the line uses from one hour: its symbol, rain and temperature.
 * Parts the forecast leaves out are left out here too (the database refuses
 * an empty value).
 */
export function keepWhatIsUsed(hour: ForecastHour): ForecastHour {
  const temperature = hour.data?.instant?.details?.air_temperature;
  const symbol = hour.data?.next_1_hours?.summary?.symbol_code;
  const rain = hour.data?.next_1_hours?.details?.precipitation_amount;
  return {
    time: hour.time ?? '',
    data: {
      instant: { details: typeof temperature === 'number' ? { air_temperature: temperature } : {} },
      next_1_hours: {
        summary: typeof symbol === 'string' ? { symbol_code: symbol } : {},
        details: typeof rain === 'number' ? { precipitation_amount: rain } : {},
      },
    },
  };
}

interface KeptForecast {
  timeseries: ForecastHour[];
  expiresMs: number;
  lastModified: string | null;
  fetchedMs: number;
}

/** The forecast for an area: the kept one while it is in date, otherwise asked for again */
export async function forecastFor(area: { lat: number; lng: number; key: string }, nowMs: number): Promise<ForecastHour[]> {
  const kept = admin.firestore().doc(`weatherForecasts/${area.key}`);
  const before = (await kept.get()).data() as KeptForecast | undefined;
  if (before && nowMs < before.expiresMs) return before.timeseries;

  try {
    const response = await fetch(`${FORECAST_URL}?lat=${area.lat}&lon=${area.lng}`, {
      signal: AbortSignal.timeout(FETCH_WAIT_MS),
      headers: {
        'User-Agent': NAMED_AS,
        'Accept-Encoding': 'gzip',
        ...(before?.lastModified ? { 'If-Modified-Since': before.lastModified } : {}),
      },
    });
    const expiresMs = Date.parse(response.headers.get('expires') ?? '') || nowMs + HOUR_MS / 2;
    if (response.status === 304 && before) {
      await kept.update({ expiresMs, fetchedMs: nowMs });
      return before.timeseries;
    }
    if (!response.ok) throw new Error(`MET Norway answered ${response.status}`);
    const body = await response.json() as { properties?: { timeseries?: ForecastHour[] } };
    const timeseries = (body.properties?.timeseries ?? [])
      .filter((hour) => Date.parse(hour.time ?? '') < nowMs + 24 * HOUR_MS)
      .map(keepWhatIsUsed);
    await kept.set({ timeseries, expiresMs, lastModified: response.headers.get('last-modified'), fetchedMs: nowMs });
    return timeseries;
  } catch (error) {
    if (before && nowMs - before.fetchedMs < STALE_LIMIT_MS) return before.timeseries;
    throw error;
  }
}

/**
 * The app asks with { lat, lng, hours }. Anyone signed in may ask, guests
 * included; the answer holds no position.
 */
export const weatherAhead = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first');
  const area = roughArea(data?.lat, data?.lng);
  if (!area) throw new functions.https.HttpsError('invalid-argument', 'A position is needed');
  if (!inServiceArea(area)) throw new functions.https.HttpsError('out-of-range', 'Weather is only given for Nigeria');
  const hours = typeof data?.hours === 'number' && Number.isFinite(data.hours) ? data.hours : 3;
  const nowMs = Date.now();
  try {
    return { ...readAhead(await forecastFor(area, nowMs), nowMs, hours), credit: 'Data from MET Norway' };
  } catch (error) {
    functions.logger.warn('Weather could not be had', { area: area.key, error: String(error) });
    throw new functions.https.HttpsError('unavailable', 'No forecast just now');
  }
});
