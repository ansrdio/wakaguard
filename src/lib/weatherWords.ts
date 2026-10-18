/**
 * @fileoverview The one line of weather on the Trip screen, in words
 *
 * Our server reads MET Norway's forecast for the traveller's rough area and
 * says what is coming (functions/src/weather.ts). This turns that into the
 * line shown before setting off and during a trip.
 *
 * Approved by the owner on 14 October 2026, in English. Nigerian languages,
 * Pidgin first, are planned for a later build.
 *
 * No Firebase or DOM access (functions/test/weatherWords.test.ts).
 *
 * @module weatherWords
 */

import type { TravelMode } from './travelMode';

export type WeatherKind = 'storm' | 'heavy-rain' | 'rain' | 'fog' | 'heat';

export interface WeatherAhead {
  kind: WeatherKind | null;
  /** Hours from now until it starts: 0 means within the hour */
  startsInHours: number | null;
  hottest: number | null;
  /** How many hours the forecast was read for */
  hours: number;
  /** The hour under way first, then the next few, for the top bar's weather icon. Empty from an older server */
  next: WeatherHour[];
}

export interface WeatherHour {
  atMs: number;
  temperature: number | null;
  /** MET Norway's symbol, such as "rain" or "partlycloudy_day" */
  symbol: string | null;
}

export type WeatherIcon = 'clear-day' | 'clear-night' | 'partly-day' | 'partly-night' | 'cloudy' | 'light-rain' | 'rain' | 'storm' | 'fog';

/** The picture for one of MET Norway's symbols */
export function weatherIcon(symbol: string | null): WeatherIcon {
  const s = symbol ?? '';
  if (s.includes('thunder')) return 'storm';
  if (s.includes('heavyrain') || (s.includes('rain') && !s.includes('light'))) return 'rain';
  if (s.includes('rain') || s.includes('sleet') || s.includes('drizzle')) return 'light-rain';
  if (s.includes('fog')) return 'fog';
  const night = s.endsWith('_night');
  if (s.startsWith('clearsky')) return night ? 'clear-night' : 'clear-day';
  if (s.startsWith('fair') || s.startsWith('partlycloudy')) return night ? 'partly-night' : 'partly-day';
  return 'cloudy';
}

/** Words for the picture, for screen readers */
export const WEATHER_ICON_WORDS: Record<WeatherIcon, string> = {
  'clear-day': 'Clear', 'clear-night': 'Clear', 'partly-day': 'Partly cloudy', 'partly-night': 'Partly cloudy',
  cloudy: 'Cloudy', 'light-rain': 'Light rain', rain: 'Rain', storm: 'Thunderstorms', fog: 'Fog',
};

function readHoursList(value: unknown): WeatherHour[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((h) => {
    const x = (h && typeof h === 'object' ? h : {}) as Record<string, unknown>;
    if (typeof x.atMs !== 'number' || !Number.isFinite(x.atMs)) return [];
    return [{
      atMs: x.atMs,
      temperature: typeof x.temperature === 'number' && Number.isFinite(x.temperature) ? x.temperature : null,
      symbol: typeof x.symbol === 'string' ? x.symbol : null,
    }];
  }).slice(0, 6);
}

export interface WeatherLine {
  /** 'warn' for something to plan around; 'calm' when nothing is coming */
  tone: 'warn' | 'calm';
  kind: WeatherKind | null;
  text: string;
}

/** MET Norway's data is free on condition that it is credited */
export const WEATHER_CREDIT = 'Data from MET Norway';

const KINDS: readonly WeatherKind[] = ['storm', 'heavy-rain', 'rain', 'fog', 'heat'];

/** What the server answered, checked. Null for anything that is not a forecast. */
export function readWeatherAhead(value: unknown): WeatherAhead | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const kind = KINDS.includes(v.kind as WeatherKind) ? (v.kind as WeatherKind) : null;
  if (v.kind !== null && kind === null) return null;
  const number = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : null);
  const hours = number(v.hours);
  if (hours === null || hours < 1) return null;
  return { kind, startsInHours: number(v.startsInHours), hottest: number(v.hottest), hours, next: readHoursList(v.next) };
}

function when(startsInHours: number | null): string {
  if (!startsInHours) return 'in the next hour';
  if (startsInHours === 1) return 'in about an hour';
  return `in about ${startsInHours} hours`;
}

/** Said after the weather for someone riding an okada, when the roads will be wet */
const WET_ROADS: Partial<Record<TravelMode, string>> = {
  okada: 'Okada is risky on wet roads.',
};

/** The line for a forecast, or null when there is no forecast to show */
export function weatherLine(ahead: WeatherAhead | null, travelMode?: TravelMode | null): WeatherLine | null {
  if (!ahead) return null;
  const at = when(ahead.startsInHours);
  const wet = travelMode ? WET_ROADS[travelMode] : undefined;
  const withWet = (text: string) => (wet ? `${text} ${wet}` : text);
  switch (ahead.kind) {
    case 'storm':
      return { tone: 'warn', kind: 'storm', text: withWet(`Thunderstorms expected here ${at}. If you can, wait until they pass.`) };
    case 'heavy-rain':
      return { tone: 'warn', kind: 'heavy-rain', text: withWet(`Heavy rain expected here ${at}. Allow extra time; low roads may flood.`) };
    case 'rain':
      return { tone: 'warn', kind: 'rain', text: withWet(`Rain expected here ${at}. Allow extra time.`) };
    case 'fog':
      return { tone: 'warn', kind: 'fog', text: `Fog expected here ${at}. Slow down and keep your lights on.` };
    case 'heat':
      return {
        tone: 'warn',
        kind: 'heat',
        text: `Very hot here ${at}${ahead.hottest !== null ? ` (${ahead.hottest}°C)` : ''}. Carry water.`,
      };
    default:
      return { tone: 'calm', kind: null, text: `No rain expected here in the next ${ahead.hours === 1 ? 'hour' : `${ahead.hours} hours`}.` };
  }
}

/** How many hours ahead to look for a trip of this many minutes still to go */
export function hoursToLookAhead(minutes: number): number {
  if (!Number.isFinite(minutes)) return 3;
  return Math.min(6, Math.max(1, Math.ceil(minutes / 60)));
}

/** A position rounded to about 11 km, which is all the server is told */
export function roughly(lat: number, lng: number): { lat: number; lng: number } {
  return { lat: Math.round(lat * 10) / 10, lng: Math.round(lng * 10) / 10 };
}
