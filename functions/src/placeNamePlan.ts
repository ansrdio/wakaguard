/**
 * The checks and wording behind naming a destination pin (placeName.ts),
 * kept apart from Firestore and the network so they can be tested on their own.
 *
 * The name comes from OpenStreetMap's look-up service, Nominatim, until
 * NIPOST's postcodes can be used (the owner chose it on 18 October 2026, after
 * a trial on five landmarks gave the street and the area, for example
 * "Ikorodu Road, Ojota, Ikeja" for Ojota bus park).
 */

/** As long as a typed destination may be (src/lib/tripPlanning.ts MAX_DESTINATION_LENGTH) */
export const MAX_NAME_LENGTH = 40;

/** Nominatim's rules: no more than one look-up a second for the whole app */
export const LOOKUP_GAP_MS = 1100;

/** Look-ups one person may ask for in an hour: a few pins per trip is plenty */
export const MAX_LOOKUPS_PER_HOUR = 30;
const HOUR_MS = 60 * 60 * 1000;

/** Four decimals of a degree is about 11 m: the same spot for the cache */
const SPOT_DECIMALS = 4;

export interface Spot {
  lat: number;
  lng: number;
}

/**
 * The spot the app asks about, anywhere: a trip may end across a border, and
 * the owner tests from abroad (it was Nigeria only until the evening of 18
 * October 2026, when the owner's pins in Arizona got no name).
 */
export function readSpot(data: unknown): Spot | null {
  const value = data as { lat?: unknown; lng?: unknown } | null;
  const lat = value?.lat;
  const lng = value?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** The same key for pins a few metres apart */
export function spotKey(spot: Spot): string {
  return `${spot.lat.toFixed(SPOT_DECIMALS)},${spot.lng.toFixed(SPOT_DECIMALS)}`;
}

/**
 * Plain letters only: "Ọjọta" becomes "Ojota". A letter outside the texting
 * alphabet would double the length of every alert text that names the
 * destination.
 */
function plain(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ,.'&()/-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A short name for the spot from Nominatim's answer: the street (or the
 * place's own name), the area and the town, with the state only when little
 * else is known. As many of them as fit the destination box; null when
 * nothing useful came back.
 */
export function placeNameFrom(answer: unknown): string | null {
  const value = answer as { name?: unknown; address?: Record<string, unknown>; error?: unknown } | null;
  if (!value || typeof value !== 'object' || value.error) return null;
  const address = value.address && typeof value.address === 'object' ? value.address : {};
  const first = plain(value.name) || plain(address.road);
  const area = plain(address.suburb) || plain(address.neighbourhood) || plain(address.quarter)
    || plain(address.village) || plain(address.hamlet);
  const town = plain(address.city) || plain(address.town) || plain(address.municipality) || plain(address.county);
  const state = plain(address.state);

  const parts: string[] = [];
  for (const part of [first, area, town]) {
    if (part && !parts.some((kept) => kept.toLowerCase() === part.toLowerCase())) parts.push(part);
  }
  if (parts.length < 2 && state && !parts.includes(state)) parts.push(state);

  let name = '';
  for (const part of parts) {
    const longer = name ? `${name}, ${part}` : part;
    if (longer.length <= MAX_NAME_LENGTH) name = longer;
  }
  return name.length >= 2 ? name : null;
}

/** The count of look-ups for one person after this one, and whether this one may go ahead */
export function nextLookup(
  previous: { startMs: number; count: number } | null,
  nowMs: number
): { startMs: number; count: number; allowed: boolean } {
  const fresh = !previous || nowMs >= previous.startMs + HOUR_MS || nowMs < previous.startMs;
  const startMs = fresh ? nowMs : previous!.startMs;
  const count = (fresh ? 0 : previous!.count) + 1;
  return { startMs, count, allowed: count <= MAX_LOOKUPS_PER_HOUR };
}

/** How long to wait before the next look-up to Nominatim, 0 when it may go now */
export function waitForTurnMs(lastLookupMs: number | null, nowMs: number): number {
  if (lastLookupMs === null || nowMs < lastLookupMs) return 0;
  return Math.max(0, lastLookupMs + LOOKUP_GAP_MS - nowMs);
}
