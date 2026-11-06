/**
 * The checks and shapes behind searching for where a trip is going
 * (placeSearch.ts), kept apart from Firestore and the network so they can be
 * tested on their own.
 *
 * Google's Places API (New): Autocomplete while the traveller types, then Place
 * Details for the place they choose, both in one "session" so Google charges
 * the session as one look-up (build 27, item 10 in docs/BUILDS.md). Only the
 * place's id, address and spot are asked for, which keeps the look-up in
 * Google's cheapest tier; the name shown is the one from the suggestion.
 *
 * Google's terms (Maps Platform Terms 3.2.3(e), Service Specific Terms 14):
 * these results may only be shown on a Google map or with no map, a spot may
 * be kept for 30 days at most, and Google is never sent who someone is.
 */

/** As long as a text carries (MAX_DESTINATION_LENGTH in src/lib/tripPlanning.ts, sanitizePlace in smsText.ts) */
export const MAX_NAME_LENGTH = 40;
export const MIN_QUERY_LENGTH = 3;
export const MAX_QUERY_LENGTH = 80;
export const MAX_SUGGESTIONS = 5;

/** Per person per hour: suggestions come as someone types, a place only when they choose one */
export const MAX_SUGGESTS_PER_HOUR = 60;
export const MAX_PLACES_PER_HOUR = 20;
const HOUR_MS = 60 * 60 * 1000;

/** Places within this distance of the traveller come first; nothing further is left out */
export const NEAR_RADIUS_M = 50000;
/** The traveller's position is rounded to about a kilometre before it goes to Google */
const NEAR_DECIMALS = 2;

/** All of Nigeria, to put Nigerian places first when the phone's position is not known */
export const NIGERIA_BOX = {
  low: { latitude: 4.0, longitude: 2.6 },
  high: { latitude: 14.0, longitude: 14.7 },
};

export const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
export const PLACE_URL = 'https://places.googleapis.com/v1/places/';
/** Place Details fields asked for: all in Google's "Essentials" tier */
export const PLACE_FIELDS = 'id,formattedAddress,location';
export const AUTOCOMPLETE_FIELDS =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat';

export interface Spot {
  lat: number;
  lng: number;
}

export interface Suggestion {
  placeId: string;
  /** "Ikeja City Mall" */
  name: string;
  /** "Obafemi Awolowo Way, Ikeja, Lagos" */
  detail: string;
}

export interface Place {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** Google's session tokens: we make them in the app, as a UUID */
const SESSION = /^[A-Za-z0-9-]{16,64}$/;
/** Google's place ids */
const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

function readNear(value: unknown): Spot | null {
  const v = value as { lat?: unknown; lng?: unknown } | null;
  if (!v || typeof v !== 'object') return null;
  const { lat, lng } = v;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const round = (n: number) => Math.round(n * 10 ** NEAR_DECIMALS) / 10 ** NEAR_DECIMALS;
  return { lat: round(lat), lng: round(lng) };
}

/** What the app asks for, checked; null for anything else */
export function readRequest(data: unknown):
  | { kind: 'suggest'; text: string; session: string; near: Spot | null }
  | { kind: 'place'; placeId: string; session: string; name: string }
  | null {
  const d = data as Record<string, unknown> | null;
  if (!d || typeof d !== 'object') return null;
  const session = typeof d.session === 'string' && SESSION.test(d.session) ? d.session : null;
  if (!session) return null;
  if (d.kind === 'suggest') {
    const text = typeof d.text === 'string' ? d.text.replace(/\s+/g, ' ').trim() : '';
    if (text.length < MIN_QUERY_LENGTH || text.length > MAX_QUERY_LENGTH) return null;
    return { kind: 'suggest', text, session, near: readNear(d.near) };
  }
  if (d.kind === 'place') {
    const placeId = typeof d.placeId === 'string' && PLACE_ID.test(d.placeId) ? d.placeId : null;
    const name = plainName(d.name);
    if (!placeId) return null;
    return { kind: 'place', placeId, session, name };
  }
  return null;
}

/** What Autocomplete is sent: the words, the session, English, and where to look first */
export function autocompleteBody(text: string, session: string, near: Spot | null): Record<string, unknown> {
  return {
    input: text,
    sessionToken: session,
    languageCode: 'en',
    regionCode: 'ng',
    locationBias: near
      ? { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: NEAR_RADIUS_M } }
      : { rectangle: NIGERIA_BOX },
  };
}

/**
 * Plain letters only, as long as a text carries: "Ọjọta" becomes "Ojota". A
 * letter outside the texting alphabet would double the length of every alert
 * text that names the destination (as placeNamePlan.ts does for pins).
 */
export function plainName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const plain = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ,.'&()/-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= MAX_NAME_LENGTH) return plain;
  const cut = plain.slice(0, MAX_NAME_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace >= 20 ? cut.slice(0, lastSpace) : cut).replace(/[ ,.-]+$/, '');
}

const textOf = (value: unknown): string =>
  value && typeof value === 'object' && typeof (value as { text?: unknown }).text === 'string'
    ? (value as { text: string }).text
    : '';

/** The suggestions in Google's Autocomplete answer, as the app shows them */
export function suggestionsFrom(answer: unknown): Suggestion[] {
  const list = (answer as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];
  const out: Suggestion[] = [];
  for (const item of list) {
    const prediction = (item as { placePrediction?: Record<string, unknown> })?.placePrediction;
    if (!prediction) continue;
    const placeId = typeof prediction.placeId === 'string' && PLACE_ID.test(prediction.placeId) ? prediction.placeId : null;
    const format = prediction.structuredFormat as Record<string, unknown> | undefined;
    const name = plainName(textOf(format?.mainText));
    const detail = textOf(format?.secondaryText).trim().slice(0, 120);
    if (!placeId || name.length < 2) continue;
    out.push({ placeId, name, detail });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

/** The chosen place from Google's Place Details answer, named as it was suggested; null if unusable */
export function placeFrom(answer: unknown, name: string): Place | null {
  const value = answer as { id?: unknown; formattedAddress?: unknown; location?: { latitude?: unknown; longitude?: unknown } } | null;
  if (!value || typeof value !== 'object') return null;
  const lat = value.location?.latitude;
  const lng = value.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const address = typeof value.formattedAddress === 'string' ? value.formattedAddress.trim().slice(0, 160) : '';
  const placeId = typeof value.id === 'string' ? value.id : '';
  const shown = name.length >= 2 ? name : plainName(address);
  if (shown.length < 2) return null;
  return { placeId, name: shown, address, lat, lng };
}

/** One person's count for the hour after this try, and whether this one may go ahead */
export function nextTry(
  previous: { startMs: number; count: number } | null,
  nowMs: number,
  max: number
): { startMs: number; count: number; allowed: boolean } {
  const fresh = !previous || nowMs >= previous.startMs + HOUR_MS || nowMs < previous.startMs;
  const startMs = fresh ? nowMs : previous!.startMs;
  const count = (fresh ? 0 : previous!.count) + 1;
  return { startMs, count, allowed: count <= max };
}
