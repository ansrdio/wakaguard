/**
 * @fileoverview Directions on a trip (build 25, Beta)
 *
 * The route comes from Mapbox's Directions API once, when the destination pin
 * is set or the trip starts, and again only when the traveller leaves it. The
 * phone then follows its own position along the route: which turn is next, how
 * far off it is, whether the traveller has left the route, and which spoken
 * lines are due. Nothing here sends anything anywhere; the fetch is in
 * lib/directionsFetch.ts.
 *
 * Mapbox's times leave out Lagos traffic (a 16 km Yaba to Ikeja route came back
 * as 25 minutes on 23 October 2026), so a suggested trip length adds a margin.
 *
 * Shown only when the server switch config/app `directions` is on, and spoken
 * only when `directionsVoice` is on too (lib/appConfig.ts).
 *
 * No Firebase or DOM access (functions/test/directions.test.ts).
 *
 * @module directions
 */

export type LatLng = { lat: number; lng: number };
export type RouteProfile = 'driving-traffic' | 'walking';

export interface RouteVoiceLine {
  /** Said when this many metres of the step are left */
  atRemainingM: number;
  text: string;
}

export interface RouteStep {
  /** "Turn left onto Commercial Avenue." */
  instruction: string;
  /** depart, turn, roundabout, arrive... */
  type: string;
  /** Metres along the whole route where this step begins and ends */
  startM: number;
  endM: number;
  voice: RouteVoiceLine[];
}

export interface Route {
  profile: RouteProfile;
  distanceM: number;
  durationS: number;
  /** Mapbox's simplified outline (polyline, precision 6): what the maps draw and the trip keeps */
  overview: string;
  /** Every point of the route, in order, with the metres travelled to reach it */
  points: LatLng[];
  along: number[];
  steps: RouteStep[];
  destination: LatLng;
}

/**
 * What a running trip keeps of its route: the outline, its length and time. The
 * server copies it to the page contacts open (functions/src/tripRoute.ts) and
 * deletes it from both when the trip ends.
 */
export interface StoredRoute {
  overview: string;
  distanceM: number;
  durationS: number;
  profile: RouteProfile;
}

export function routeToStore(route: Route): StoredRoute {
  return {
    overview: route.overview,
    distanceM: Math.round(route.distanceM),
    durationS: Math.round(route.durationS),
    profile: route.profile,
  };
}

/** Further from the route than this, on two positions running, and a new route is fetched */
export const OFF_ROUTE_M = 60;
export const OFF_ROUTE_FIXES = 2;
/** Closer to the destination than this counts as arrived (the trip is never ended for them) */
export const ARRIVED_M = 30;
/**
 * A spoken line whose mark was passed by more than this, or by more than half
 * its distance, is skipped: after a gap in positions "In 400 metres" would be
 * said 100 m from the turn
 */
export const LATE_LINE_M = 100;
/** The stored outline is refused above this length; a Lagos to Abuja route is a few thousand */
export const MAX_OVERVIEW_LENGTH = 20000;

/** Walking for people on foot; everything on the road uses driving with traffic */
export function routeProfile(travelMode: string | null | undefined): RouteProfile {
  return travelMode === 'foot' ? 'walking' : 'driving-traffic';
}

export function directionsUrl(from: LatLng, to: LatLng, profile: RouteProfile, token: string): string {
  const coords = `${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}`;
  const query = new URLSearchParams({
    geometries: 'polyline6',
    overview: 'simplified',
    steps: 'true',
    voice_instructions: 'true',
    voice_units: 'metric',
    language: 'en',
    access_token: token,
  });
  return `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?${query.toString()}`;
}

/** Mapbox's encoded polyline at precision 6, as [lat, lng] points */
export function decodePolyline6(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        if (index >= encoded.length) return points;
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push({ lat: lat / 1e6, lng: lng / 1e6 });
  }
  return points;
}

/** True for an outline that is safe to decode: the stored copy comes from a document others can write */
export function isOverview(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_OVERVIEW_LENGTH && /^[\x3f-\x7e]+$/.test(value);
}

/** The points of a stored route for a map, or null when there is no usable one */
export function readRouteOutline(route: unknown): LatLng[] | null {
  const overview = route && typeof route === 'object' ? (route as { overview?: unknown }).overview : null;
  if (!isOverview(overview)) return null;
  const points = decodePolyline6(overview).filter((p) => Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
  return points.length > 1 ? points : null;
}

export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Mapbox's answer as a Route, or null when it holds no usable route */
export function parseRoute(answer: unknown, profile: RouteProfile, destination: LatLng): Route | null {
  const a = answer as { code?: unknown; routes?: unknown[] } | null;
  if (!a || a.code !== 'Ok' || !Array.isArray(a.routes) || a.routes.length === 0) return null;
  const r = a.routes[0] as Record<string, unknown>;
  const distanceMeters = num(r.distance);
  const durationS = num(r.duration);
  const overview = r.geometry;
  const legs = r.legs as Array<{ steps?: unknown[] }> | undefined;
  if (distanceMeters === null || durationS === null || !isOverview(overview) || !Array.isArray(legs)) return null;

  const points: LatLng[] = [];
  const along: number[] = [];
  const steps: RouteStep[] = [];
  let travelled = 0;
  for (const leg of legs) {
    for (const raw of leg.steps ?? []) {
      const s = raw as Record<string, unknown>;
      const maneuver = (s.maneuver ?? {}) as Record<string, unknown>;
      const geometry = typeof s.geometry === 'string' ? decodePolyline6(s.geometry) : [];
      const startM = travelled;
      for (const p of geometry) {
        const last = points[points.length - 1];
        if (last && last.lat === p.lat && last.lng === p.lng) continue;
        if (last) travelled += distanceM(last, p);
        points.push(p);
        along.push(travelled);
      }
      const voice = Array.isArray(s.voiceInstructions)
        ? (s.voiceInstructions as Array<Record<string, unknown>>)
          .map((v) => ({ atRemainingM: num(v.distanceAlongGeometry) ?? 0, text: typeof v.announcement === 'string' ? v.announcement : '' }))
          .filter((v) => v.text)
        : [];
      steps.push({
        instruction: typeof maneuver.instruction === 'string' ? maneuver.instruction : '',
        type: typeof maneuver.type === 'string' ? maneuver.type : '',
        startM,
        endM: travelled,
        voice,
      });
    }
  }
  if (points.length < 2 || steps.length === 0) return null;
  return { profile, distanceM: distanceMeters, durationS, overview, points, along, steps, destination };
}

/** Where a position falls on the route: metres along it, and metres off it */
export function placeOnRoute(route: Route, here: LatLng): { alongM: number; offM: number } {
  // Flat-earth projection is plenty over a few hundred metres of one segment
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.cos((here.lat * Math.PI) / 180);
  let best = { alongM: 0, offM: Infinity };
  for (let i = 0; i < route.points.length - 1; i++) {
    const a = route.points[i];
    const b = route.points[i + 1];
    const ax = (a.lng - here.lng) * mPerLng;
    const ay = (a.lat - here.lat) * mPerLat;
    const bx = (b.lng - here.lng) * mPerLng;
    const by = (b.lat - here.lat) * mPerLat;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const off = Math.sqrt(px * px + py * py);
    if (off < best.offM) {
      best = { alongM: route.along[i] + t * (route.along[i + 1] - route.along[i]), offM: off };
    }
  }
  return best;
}

export interface Guidance {
  /** The next thing to do, e.g. "Turn left onto Commercial Avenue." */
  nextInstruction: string;
  /** Metres to that turn */
  toNextM: number;
  /** Metres left to the destination along the route */
  remainingM: number;
  offRoute: boolean;
  arrived: boolean;
  /** Index of the step being driven, for the spoken lines */
  stepIndex: number;
  /** Metres left in that step */
  stepLeftM: number;
}

export function guide(route: Route, here: LatLng): Guidance {
  const { alongM, offM } = placeOnRoute(route, here);
  const total = route.along[route.along.length - 1];
  let stepIndex = route.steps.findIndex((s) => alongM < s.endM);
  if (stepIndex === -1) stepIndex = route.steps.length - 1;
  const step = route.steps[stepIndex];
  const next = route.steps[stepIndex + 1];
  const remainingM = Math.max(0, total - alongM);
  return {
    nextInstruction: next ? next.instruction : step.instruction,
    toNextM: Math.max(0, step.endM - alongM),
    remainingM,
    offRoute: offM > OFF_ROUTE_M,
    arrived: distanceM(here, route.destination) <= ARRIVED_M || (remainingM <= ARRIVED_M && offM <= OFF_ROUTE_M),
    stepIndex,
    stepLeftM: Math.max(0, step.endM - alongM),
  };
}

/**
 * The spoken lines due now, each once: a line is due when the metres left in its
 * step fall to its mark. `said` holds "step:mark" keys already spoken.
 */
export function linesDue(route: Route, g: Guidance, said: ReadonlySet<string>): { key: string; text: string }[] {
  const step = route.steps[g.stepIndex];
  if (!step || g.offRoute) return [];
  const key = (v: RouteVoiceLine) => `${g.stepIndex}:${Math.round(v.atRemainingM)}`;
  // Furthest first, the order they are said in
  const lines = [...step.voice].sort((a, b) => b.atRemainingM - a.atRemainingM);
  // Once a line has been said, the ones before it count as said too, so a line
  // skipped below is never read out after a later one
  const saidUpTo = Math.min(Infinity, ...lines.filter((v) => said.has(key(v))).map((v) => v.atRemainingM));
  const late = (v: RouteVoiceLine) => v.atRemainingM - g.stepLeftM > Math.max(LATE_LINE_M, v.atRemainingM / 2);
  const due = lines
    .filter((v) => v.atRemainingM < saidUpTo && g.stepLeftM <= v.atRemainingM + 5 && !late(v))
    .map((v) => ({ key: key(v), text: v.text }));
  // Only the latest of several due at once: arriving late at a mark should not read out the whole list
  return due.length > 1 ? [due[due.length - 1]] : due;
}

/**
 * The trip length to suggest from the route's time: Mapbox's minutes plus a
 * third and five minutes for traffic and stops, rounded up to five minutes,
 * never under a quarter of an hour.
 */
export function suggestedTripMinutes(durationS: number): number {
  const minutes = durationS / 60;
  return Math.max(15, Math.ceil((minutes * TRAFFIC_MARGIN + 5) / 5) * 5);
}

/** Mapbox's times leave out Lagos traffic: a third more (see suggestedTripMinutes) */
const TRAFFIC_MARGIN = 1.3;

/**
 * Minutes still needed on the route from here, at Mapbox's pace for the
 * distance left plus the traffic margin. Used to warn when the rest of the
 * route will not fit before the check-in time.
 */
export function minutesToGo(route: Route, g: Guidance): number {
  if (route.distanceM <= 0 || g.arrived) return 0;
  const share = Math.min(1, g.remainingM / route.distanceM);
  return Math.ceil((route.durationS * share * TRAFFIC_MARGIN) / 60);
}

/** "80 m", "400 m", "1.5 km", "16 km" */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  const km = metres / 1000;
  return km < 10 ? `${(Math.round(km * 10) / 10).toString()} km` : `${Math.round(km)} km`;
}

/**
 * The next turn as a spoken line, with its distance in Mapbox's own style
 * ("In 16 kilometers, Make a left U-turn onto E1, Lagos-Ibadan Expressway."),
 * for when the voice is turned back on between Mapbox's lines
 */
export function spokenNextTurn(g: Guidance): string {
  const m = g.toNextM;
  const km = Number((m / 1000).toFixed(m < 10000 ? 1 : 0));
  const distance = m < 1000
    ? `${Math.max(50, Math.round(m / 50) * 50)} meters`
    : `${km} ${km === 1 ? 'kilometer' : 'kilometers'}`;
  const turn = g.nextInstruction.replace(/\s*\/\s*/g, ', ');
  return `In ${distance}, ${turn}`;
}
