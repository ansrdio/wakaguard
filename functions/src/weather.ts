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
export const NAMED_AS = 'WakaGuard/1.2 https://wakaguard.com';

/** One decimal of a degree is about 11 km: a town, never a street */
export const AREA_DECIMALS = 1;
/** How far ahead a line can look; MET Norway's hourly forecast is most reliable in the first hours */
export const MAX_HOURS = 6;
/** Hotter than this, in °C, is worth a word */
export const HOT_FROM = 38;
/**
 * Feeling hotter than this, in °C, is worth a word too, whatever the air
 * temperature: in the humid south 33°C can feel like 41°C, which the US
 * weather service counts as dangerous heat. Added for the heatwaves of
 * late 2026 (the owner, 28 October 2026).
 */
export const FEELS_HOT_FROM = 41;
/** Feeling hotter than this is dangerous for anyone out in it */
export const FEELS_DANGEROUS_FROM = 46;
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
    instant?: { details?: { air_temperature?: number; relative_humidity?: number } };
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

/**
 * How hot it feels, in °C: the US National Weather Service's heat index from
 * the air temperature and relative humidity (per cent). Never below the air
 * temperature, as dry air does not make heat any safer to travel in.
 */
export function feelsLike(temperatureC: number, humidity: number): number {
  const t = (temperatureC * 9) / 5 + 32;
  const rh = humidity;
  let index = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
  if (index >= 80) {
    index = -42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh - 0.00683783 * t * t
      - 0.05481717 * rh * rh + 0.00122874 * t * t * rh + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh;
    if (rh < 13 && t >= 80 && t <= 112) index -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
    else if (rh > 85 && t >= 80 && t <= 87) index += ((rh - 85) / 10) * ((87 - t) / 5);
  }
  return Math.max(temperatureC, ((index - 32) * 5) / 9);
}

/** How hot one hour of the forecast feels, or null without both temperature and humidity */
export function feelsLikeOfHour(hour: ForecastHour): number | null {
  const details = hour.data?.instant?.details;
  const temperature = details?.air_temperature;
  const humidity = details?.relative_humidity;
  return typeof temperature === 'number' && typeof humidity === 'number' ? feelsLike(temperature, humidity) : null;
}

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
  if ((feelsLikeOfHour(hour) ?? 0) >= FEELS_HOT_FROM) return 'heat';
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

export interface HourAtGlance {
  /** When the hour starts */
  atMs: number;
  /** Rounded °C, or null when the forecast has none */
  temperature: number | null;
  /** MET Norway's symbol for the hour, such as "rain" or "partlycloudy_day" */
  symbol: string | null;
}

/**
 * The hour under way and the ones after it, for the weather icon in the app's
 * top bar and the few hours it opens onto.
 */
export function readHours(timeseries: ForecastHour[], nowMs: number, hours: number): HourAtGlance[] {
  return timeseries
    .map((hour) => ({ hour, startMs: Date.parse(hour.time ?? '') }))
    .filter(({ startMs }) => Number.isFinite(startMs) && startMs + HOUR_MS > nowMs)
    .sort((a, b) => a.startMs - b.startMs)
    .slice(0, Math.max(1, Math.min(MAX_HOURS, Math.ceil(hours))))
    .map(({ hour, startMs }) => {
      const temperature = hour.data?.instant?.details?.air_temperature;
      const symbol = hour.data?.next_1_hours?.summary?.symbol_code;
      return {
        atMs: startMs,
        temperature: typeof temperature === 'number' ? Math.round(temperature) : null,
        symbol: typeof symbol === 'string' ? symbol : null,
      };
    });
}

export interface DayOutlook {
  /** The most serious thing in the rest of the day, or null when nothing is worth a word */
  kind: WeatherKind | null;
  /** When it starts */
  startsAtMs: number | null;
  /** The hottest temperature in the rest of the day, rounded */
  hottest: number | null;
  /** How hot the hottest hour feels, rounded; null when the forecast has no humidity */
  feelsLike?: number | null;
  /** When it feels hottest */
  hottestAtMs?: number | null;
}

/**
 * The most serious thing between now and `untilMs`, for the morning
 * notification (morningWeather.ts). Like readAhead, but over the day.
 */
export function readDay(timeseries: ForecastHour[], nowMs: number, untilMs: number): DayOutlook {
  let kind: WeatherKind | null = null;
  let startsAtMs: number | null = null;
  let hottest: number | null = null;
  let feels: number | null = null;
  let hottestAtMs: number | null = null;
  const coming = timeseries
    .map((hour) => ({ hour, startMs: Date.parse(hour.time ?? '') }))
    .filter(({ startMs }) => Number.isFinite(startMs) && startMs + HOUR_MS > nowMs && startMs < untilMs)
    .sort((a, b) => a.startMs - b.startMs);
  for (const { hour, startMs } of coming) {
    const temperature = hour.data?.instant?.details?.air_temperature;
    if (typeof temperature === 'number') hottest = Math.max(hottest ?? -Infinity, Math.round(temperature));
    const hourFeels = feelsLikeOfHour(hour);
    if (hourFeels !== null && (feels === null || Math.round(hourFeels) > feels)) {
      feels = Math.round(hourFeels);
      hottestAtMs = Math.max(nowMs, startMs);
    }
    const found = kindOfHour(hour);
    if (!found) continue;
    if (kind === null || SERIOUSNESS.indexOf(found) < SERIOUSNESS.indexOf(kind)) {
      kind = found;
      startsAtMs = Math.max(nowMs, startMs);
    }
  }
  return { kind, startsAtMs, hottest, feelsLike: feels, hottestAtMs };
}

/** Where someone last looked at the weather, kept for the morning notification (morningWeather.ts) */
export const WEATHER_AREAS = 'weatherAreas';

/**
 * Only what the line uses from one hour: its symbol, rain, temperature and
 * humidity (for how hot it feels). Parts the forecast leaves out are left out
 * here too (the database refuses an empty value).
 */
export function keepWhatIsUsed(hour: ForecastHour): ForecastHour {
  const temperature = hour.data?.instant?.details?.air_temperature;
  const humidity = hour.data?.instant?.details?.relative_humidity;
  const symbol = hour.data?.next_1_hours?.summary?.symbol_code;
  const rain = hour.data?.next_1_hours?.details?.precipitation_amount;
  return {
    time: hour.time ?? '',
    data: {
      instant: {
        details: {
          ...(typeof temperature === 'number' ? { air_temperature: temperature } : {}),
          ...(typeof humidity === 'number' ? { relative_humidity: humidity } : {}),
        },
      },
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

/** Kept on each look-up by someone signed in, unless the morning weather is switched off */
export async function keepArea(uid: string, area: { lat: number; lng: number; key: string }): Promise<void> {
  const db = admin.firestore();
  const wanted = (await db.doc(`users/${uid}`).get()).get('morningWeather') !== false;
  const ref = db.doc(`${WEATHER_AREAS}/${uid}`);
  if (!wanted) {
    await ref.delete();
    return;
  }
  await ref.set({ key: area.key, lat: area.lat, lng: area.lng, at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
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
  // The rough area is kept for the morning weather, unless it is switched off
  // in Settings (guests have no notifications to send it to)
  if (context.auth.token.firebase?.sign_in_provider !== 'anonymous') {
    await keepArea(context.auth.uid, area).catch((error) =>
      functions.logger.warn('Could not keep the weather area', { error: String(error) }));
  }
  try {
    const forecast = await forecastFor(area, nowMs);
    // The hours are for the weather icon (build 24); older apps ignore them
    return { ...readAhead(forecast, nowMs, hours), next: readHours(forecast, nowMs, MAX_HOURS), credit: 'Data from MET Norway' };
  } catch (error) {
    functions.logger.warn('Weather could not be had', { area: area.key, error: String(error) });
    throw new functions.https.HttpsError('unavailable', 'No forecast just now');
  }
});
