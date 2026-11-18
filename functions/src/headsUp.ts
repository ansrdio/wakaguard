/**
 * @fileoverview The heads-up in the "Heading out?" reminder (build 29)
 *
 * Testers who stopped using WakaGuard mostly forgot to start a trip before
 * they left (17 November 2026). The reminder at their usual time now says
 * something worth reading as well: the weather where they usually set off,
 * and road reports from other travellers near their usual route since the
 * night before, ending with a tap that starts the trip. On a day with nothing
 * to say it stays the plain reminder. The owner chose this on 17 November.
 *
 * Where they set off and where they go are rounded to about a kilometre
 * (POINT_DECIMALS) before they are kept with the usual time; the weather uses
 * the rough area of about 10 km (weather.ts). Nothing here is shown to anyone
 * else. No Firestore access: the reading is in usualTimes.ts.
 *
 * @module headsUp
 */

import type { DayOutlook } from './weather';

export interface Spot {
  lat: number;
  lng: number;
}

/** A road report as the heads-up needs it */
export interface RoadReport {
  type: string;
  lat: number;
  lng: number;
  /** The street or area the reporter's phone gave, if any */
  address: string | null;
  createdMs: number;
}

export interface HeadsUp {
  weather: DayOutlook | null;
  reports: RoadReport[];
}

/** Kept to two decimals: about a kilometre */
export const POINT_DECIMALS = 2;
/** Reports since this long before the reminder: from about the evening before a morning trip */
export const REPORTS_SINCE_HOURS = 14;
/** How far from the straight line between the usual start and destination a report may be */
export const CORRIDOR_M = 2000;
/** Around the start or the destination, a report this close also counts */
export const ENDS_M = 3000;
/** With no destination on the map, reports this close to where they set off */
export const AROUND_START_M = 5000;

const HOUR_MS = 60 * 60 * 1000;
const LAGOS_OFFSET_MS = HOUR_MS;

/** A position rounded for keeping with the usual time, or null when it is not one */
export function roundSpot(value: unknown): Spot | null {
  const v = (value && typeof value === 'object' ? value : null) as Record<string, unknown> | null;
  const lat = v?.lat;
  const lng = v?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const round = (n: number) => Math.round(n * 10 ** POINT_DECIMALS) / 10 ** POINT_DECIMALS + 0;
  return { lat: round(lat), lng: round(lng) };
}

/** Metres between two spots; flat-earth sums are close enough over a city */
function metres(a: Spot, b: Spot): number {
  const kx = 111320 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const ky = 110540;
  return Math.hypot((a.lng - b.lng) * kx, (a.lat - b.lat) * ky);
}

/** Metres from `p` to the straight line between `a` and `b` */
export function metresFromLine(p: Spot, a: Spot, b: Spot): number {
  const kx = 111320 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const ky = 110540;
  const ax = 0, ay = 0;
  const bx = (b.lng - a.lng) * kx, by = (b.lat - a.lat) * ky;
  const px = (p.lng - a.lng) * kx, py = (p.lat - a.lat) * ky;
  const lengthSq = bx * bx + by * by;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * bx + (py - ay) * by) / lengthSq));
  return Math.hypot(px - t * bx, py - t * by);
}

/** The reports near the usual route, newest first */
export function reportsNearRoute(reports: RoadReport[], from: Spot, to: Spot | null): RoadReport[] {
  return reports
    .filter((r) => {
      const p = { lat: r.lat, lng: r.lng };
      if (!to) return metres(p, from) <= AROUND_START_M;
      return metres(p, from) <= ENDS_M || metres(p, to) <= ENDS_M || metresFromLine(p, from, to) <= CORRIDOR_M;
    })
    .sort((a, b) => b.createdMs - a.createdMs);
}

const REPORT_WORDS: Record<string, string> = {
  checkpoint: 'a checkpoint',
  accident: 'an accident',
  closure: 'a road closure',
  traffic: 'heavy traffic',
  roadwork: 'roadworks',
  hazard: 'a hazard on the road',
  pothole: 'a pothole',
  other: 'a road problem',
};
const PLURAL_WORDS = new Set(['roadworks']);

const WEATHER_WORDS: Record<string, string> = {
  storm: 'Thunderstorms',
  'heavy-rain': 'Heavy rain',
  rain: 'Rain',
  fog: 'Fog',
};

/** "7:10 am", Nigeria time */
function clockAt(ms: number): string {
  const d = new Date(ms + LAGOS_OFFSET_MS);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** "4 pm", Nigeria time */
function hourAt(ms: number): string {
  const h = new Date(ms + LAGOS_OFFSET_MS).getUTCHours();
  return `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
}

/** The first part of an address, short enough for a notification */
function shortPlace(address: string | null): string | null {
  const first = (address ?? '').split(',')[0].trim();
  // Nothing, or only a house number
  if (!first || (/^\d/.test(first) && first.length < 6)) return null;
  return first.length > 30 ? `${first.slice(0, 29)}…` : first;
}

/** The weather in a few words, or null when nothing is worth a word */
export function weatherWords(day: DayOutlook | null, nowMs: number): string | null {
  if (!day?.kind) return null;
  if (day.kind === 'heat') {
    const feels = day.feelsLike ?? null;
    return feels !== null && feels > (day.hottest ?? 0)
      ? `Very hot today: it will feel like ${feels}°C.`
      : `Very hot today: up to ${day.hottest ?? 38}°C.`;
  }
  const when = day.startsAtMs === null || day.startsAtMs < nowMs + HOUR_MS ? 'soon' : `from about ${hourAt(day.startsAtMs)}`;
  if (day.kind === 'showers') return `A chance of showers ${when}.`;
  return `${WEATHER_WORDS[day.kind] ?? 'Bad weather'} likely ${when}.`;
}

/** The road reports in a sentence, or null when there are none */
export function roadWords(reports: RoadReport[]): string | null {
  if (reports.length === 0) return null;
  if (reports.length === 1) {
    const [r] = reports;
    const what = REPORT_WORDS[r.type] ?? REPORT_WORDS.other;
    const verb = PLURAL_WORDS.has(what) ? 'were' : 'was';
    const where = shortPlace(r.address);
    return `On your way: ${what} ${verb} reported${where ? ` near ${where}` : ''} at ${clockAt(r.createdMs)}.`;
  }
  const kinds = [...new Set(reports.map((r) => REPORT_WORDS[r.type] ?? REPORT_WORDS.other))].slice(0, 2);
  return `On your way: ${reports.length} road reports since last night, including ${kinds.join(' and ')}.`;
}

/**
 * The reminder with its heads-up, or null when there is nothing to add (the
 * plain reminder is sent then). `where` is the usual destination, if known.
 */
export function headsUpMessage(where: string | null, news: HeadsUp, nowMs: number): { title: string; body: string } | null {
  const weather = weatherWords(news.weather, nowMs);
  const road = roadWords(news.reports);
  if (!weather && !road) return null;
  return {
    title: where ? `Heading to ${where}?` : 'Heading out?',
    body: [weather, road, 'Tap to start your trip.'].filter(Boolean).join(' '),
  };
}
