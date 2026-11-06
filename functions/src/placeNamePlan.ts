/**
 * The checks and wording behind naming a spot (placeName.ts), kept apart from
 * the network so they can be tested on their own.
 *
 * From build 27 the name comes from Google's address look-up (Geocoding API,
 * reverse geocoding), as every map is Google's (the owner, 6 November 2026:
 * "switch all of them to Google, everything should be google"). Before, it came
 * from OpenStreetMap's Nominatim. The same look-up names a destination pin and
 * tells the app which state the phone is in.
 */

/** As long as a text carries (sanitizePlace in smsText.ts, MAX_DESTINATION_LENGTH in src/lib/tripPlanning.ts) */
export const MAX_NAME_LENGTH = 40;

/** Look-ups one person may ask for in an hour: a few pins per trip, and the state now and then, is plenty */
export const MAX_LOOKUPS_PER_HOUR = 60;
const HOUR_MS = 60 * 60 * 1000;

/** Google's address look-up, in English, as seen from Nigeria */
export const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface Spot {
  lat: number;
  lng: number;
}

export interface SpotNames {
  /** "Ikorodu Road, Ojota, Lagos", for "Where are you going?"; null when nothing useful came back */
  name: string | null;
  /** The state as Google names it ("Lagos", "Federal Capital Territory"), or null */
  state: string | null;
  /** Two letters, "NG" in Nigeria, or null */
  country: string | null;
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

/** The look-up's address: the spot to six decimals (about 10 cm), English, Nigeria's way of writing places */
export function geocodeQuery(spot: Spot, key: string): string {
  const query = new URLSearchParams({
    latlng: `${spot.lat.toFixed(6)},${spot.lng.toFixed(6)}`,
    language: 'en',
    region: 'ng',
    key,
  });
  return `${GEOCODE_URL}?${query.toString()}`;
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

interface Component {
  long_name?: unknown;
  short_name?: unknown;
  types?: unknown;
}

/**
 * Google answers with several results, the most precise first, each with its
 * parts (street, area, town, state, country). The first of each kind of part
 * across them is kept; Plus Code results ("8F2Q+XG Lagos") are skipped.
 */
function partsOf(answer: unknown): Map<string, { long: string; short: string }> {
  const parts = new Map<string, { long: string; short: string }>();
  const results = (answer as { results?: unknown })?.results;
  if (!Array.isArray(results)) return parts;
  for (const result of results) {
    const types = (result as { types?: unknown })?.types;
    if (Array.isArray(types) && types.includes('plus_code')) continue;
    const components = (result as { address_components?: unknown })?.address_components;
    if (!Array.isArray(components)) continue;
    for (const c of components as Component[]) {
      if (!Array.isArray(c?.types) || typeof c.long_name !== 'string') continue;
      for (const type of c.types) {
        if (typeof type === 'string' && type !== 'political' && !parts.has(type)) {
          parts.set(type, { long: c.long_name, short: typeof c.short_name === 'string' ? c.short_name : c.long_name });
        }
      }
    }
  }
  return parts;
}

/**
 * A short name for the spot from Google's answer: the street, the area and the
 * town, with the state only when little else is known. As many of them as fit
 * the destination box. Also the state and country, for the app's state choice.
 * Null when Google found nothing there.
 */
export function namesFromGoogle(answer: unknown): SpotNames | null {
  const status = (answer as { status?: unknown })?.status;
  if (status !== 'OK') return null;
  const parts = partsOf(answer);
  const long = (type: string) => plain(parts.get(type)?.long);

  const first = long('premise') || long('route');
  const area = long('neighborhood') || long('sublocality_level_1') || long('sublocality');
  const town = long('locality') || long('administrative_area_level_2');
  const stateRaw = parts.get('administrative_area_level_1')?.long ?? null;
  const state = stateRaw ? plain(stateRaw) : null;
  const country = parts.get('country')?.short ?? null;

  const kept: string[] = [];
  for (const part of [first, area, town]) {
    if (part && !kept.some((k) => k.toLowerCase() === part.toLowerCase())) kept.push(part);
  }
  if (kept.length < 2 && state && !kept.some((k) => k.toLowerCase() === state.toLowerCase())) kept.push(state);

  let name = '';
  for (const part of kept) {
    const longer = name ? `${name}, ${part}` : part;
    if (longer.length <= MAX_NAME_LENGTH) name = longer;
  }
  return { name: name.length >= 2 ? name : null, state: state || null, country };
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
