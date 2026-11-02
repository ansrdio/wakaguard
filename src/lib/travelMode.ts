/**
 * @fileoverview "How are you travelling?" and the safety tips that go with the answer
 *
 * Asked when a trip is started. One tap, remembered for next time, and it can
 * be left unanswered: a tip must never hold up starting a trip.
 *
 * Written on 12 October 2026 and approved by the owner on 14 October for the
 * beta. Any change goes back to the owner first.
 *
 * No Firebase access (functions/test/travelMode.test.ts).
 *
 * @module travelMode
 */

/** `short` is the word under the picture on a button; `label` is the full name */
export const TRAVEL_MODES = [
  { id: 'bus', label: 'Bus or danfo', short: 'Bus' },
  { id: 'keke', label: 'Keke', short: 'Keke' },
  { id: 'okada', label: 'Okada', short: 'Okada' },
  { id: 'car', label: 'Private car', short: 'Car' },
  { id: 'taxi', label: 'Taxi or ride-hailing', short: 'Taxi' },
  { id: 'foot', label: 'On foot', short: 'On foot' },
  { id: 'other', label: 'Other', short: 'Other' },
] as const;

export type TravelMode = typeof TRAVEL_MODES[number]['id'];

/** Tips for each way of travelling, the most useful first. "Other" has none. */
const TIPS: Record<TravelMode, readonly string[]> = {
  bus: [
    'Board at a recognised park, not by the roadside.',
    'Note the plate number before you sit.',
    'If something feels wrong about the other passengers, wait for the next one.',
  ],
  keke: [
    'Agree the fare and the route before you get in.',
    'Keep your bag on your lap, away from the open side.',
  ],
  okada: [
    'Ask for a helmet and hold on with both hands.',
    'Avoid okada at night and in the rain.',
  ],
  car: [
    'Check fuel, tyres and water before a long trip.',
    'Take a break every two hours.',
    'Avoid driving between cities at night.',
  ],
  taxi: [
    'Check the plate and the driver match before you get in.',
    'Sit in the back.',
  ],
  foot: [
    'Stay on busy, well-lit roads.',
    'Keep your phone in your pocket when crossing.',
  ],
  other: [],
};

export function isTravelMode(value: unknown): value is TravelMode {
  return typeof value === 'string' && TRAVEL_MODES.some((mode) => mode.id === value);
}

/** "Okada" for 'okada'; an empty string for anything that is not a way of travelling */
export function travelModeLabel(value: unknown): string {
  return TRAVEL_MODES.find((mode) => mode.id === value)?.label ?? '';
}

/** Every tip for a way of travelling */
export function tipsFor(mode: TravelMode | null | undefined): readonly string[] {
  return mode && isTravelMode(mode) ? TIPS[mode] : [];
}

/** The one tip shown on the start form, before setting off */
export function tipBeforeSettingOff(mode: TravelMode | null | undefined): string | null {
  return tipsFor(mode)[0] ?? null;
}

/** The one tip shown on the card of a running trip: a different one from the start form's */
export function tipOnTheWay(mode: TravelMode | null | undefined): string | null {
  const tips = tipsFor(mode);
  return tips[1] ?? tips[0] ?? null;
}

const KEY = 'wakaguard_travel_mode';

/** What this phone's owner chose last time, so most trips need no tap at all */
export function lastTravelMode(): TravelMode | null {
  try {
    const saved = window.localStorage.getItem(KEY);
    return isTravelMode(saved) ? saved : null;
  } catch {
    return null;
  }
}

/** Remember the answer, or forget it when the question was left unanswered */
export function rememberTravelMode(mode: TravelMode | null): void {
  try {
    if (mode) window.localStorage.setItem(KEY, mode);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to remember it in; it is asked again next time
  }
}
