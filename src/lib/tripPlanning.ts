/**
 * @fileoverview Pure helpers for planning and showing a Safe Trip
 *
 * No Firebase or DOM access, so these can be unit tested directly
 * (functions/test/tripPlanning.test.ts).
 *
 * @module tripPlanning
 */

/** Minutes after the expected arrival before contacts are alerted. Matches OVERDUE_GRACE_MS on the server. */
export const ALERT_GRACE_MINUTES = 5;

/** A test trip: the same steps as a real one, with waits short enough to watch (see the server's TEST_OVERDUE_GRACE_MS) */
export const TEST_TRIP_MINUTES = 2;
export const TEST_ALERT_GRACE_MINUTES = 1;

/** Matches MAX_RECIPIENTS in functions/src/safetyDelivery.ts */
export const MAX_TRUSTED_CONTACTS = 5;

export const MIN_TRIP_MINUTES = 5;
export const MAX_TRIP_MINUTES = 20 * 60;

/** The server trims longer values before they go into a message */
export const MAX_DESTINATION_LENGTH = 40;
export const MAX_ALERT_NAME_LENGTH = 30;

/** Within this many minutes of the deadline the trip is shown as ending soon */
const ENDING_SOON_MINUTES = 10;

/** Location updates normally arrive at least every 2 minutes during a trip */
const LOCATION_STALE_MS = 5 * 60 * 1000;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Quick choices for how long a trip will take. Weighted towards trips within a
 * city, which is where most early use is expected; longer journeys use "Other".
 */
export const ARRIVAL_PRESETS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hr' },
  { minutes: 120, label: '2 hr' },
  { minutes: 240, label: '4 hr' },
] as const;

export const DEFAULT_TRIP_MINUTES = 30;

/** Trips at least this long text the link to contacts at the start unless the traveller says otherwise */
const TEXT_ON_START_FROM_MINUTES = 120;

/**
 * Whether contacts are texted the trip link at the start by default.
 * On for long journeys, where knowing someone has set off matters. Off for
 * short hops, where a text per contact on every trip is a cost and a nuisance;
 * the overdue alert still reaches them if something goes wrong.
 */
export function textContactsByDefault(durationMinutes: number): boolean {
  return durationMinutes >= TEXT_ON_START_FROM_MINUTES;
}

/** "45 min", "2 h", "2 h 15 min" */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

export interface ClockOptions {
  locale?: string;
  timeZone?: string;
}

/**
 * A time of day for display, with the weekday added when it falls on a
 * different day from now: "4:30 pm" or "Wed 1:15 am".
 */
export function formatClock(ms: number, nowMs: number = Date.now(), options: ClockOptions = {}): string {
  const { locale, timeZone } = options;
  const day = new Intl.DateTimeFormat(locale, { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
  const sameDay = day.format(new Date(ms)) === day.format(new Date(nowMs));

  const time = new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(sameDay ? {} : { weekday: 'short' }),
  }).format(new Date(ms));

  return time.replace(',', '');
}

export interface TimeLeft {
  state: 'active' | 'endingSoon' | 'overdue';
  /** One line: "32 min left", "12 min overdue" */
  text: string;
  /** The same in two parts, for a label above a figure: "Time remaining" / "32 min" */
  label: string;
  value: string;
}

/** Countdown text for an active trip. */
export function describeTimeLeft(endsAtMs: number, nowMs: number): TimeLeft {
  const diff = endsAtMs - nowMs;

  if (diff <= 0) {
    const lateMinutes = Math.floor(-diff / MINUTE_MS);
    if (lateMinutes < 1) {
      return { state: 'overdue', text: 'Arrival time reached', label: 'Time remaining', value: formatDuration(0) };
    }
    const late = formatDuration(lateMinutes);
    return { state: 'overdue', text: `${late} overdue`, label: 'Overdue by', value: late };
  }

  // Round up so "1 min left" is shown until the deadline itself
  const minutesLeft = Math.ceil(diff / MINUTE_MS);
  const left = formatDuration(minutesLeft);
  return {
    state: minutesLeft <= ENDING_SOON_MINUTES ? 'endingSoon' : 'active',
    text: `${left} left`,
    label: 'Time remaining',
    value: left,
  };
}

export interface TripPlan {
  destination: string;
  durationMinutes: number;
  contactIds: string[];
  alertName: string;
}

export type TripPlanErrors = Partial<Record<'destination' | 'duration' | 'contacts' | 'alertName', string>>;

/** Check a trip plan before it is started. An empty result means it is valid. */
export function validateTripPlan(plan: TripPlan): TripPlanErrors {
  const errors: TripPlanErrors = {};

  const destination = plan.destination.trim();
  if (destination.length < 2) {
    errors.destination = 'Enter where you are going';
  } else if (destination.length > MAX_DESTINATION_LENGTH) {
    errors.destination = `Keep it under ${MAX_DESTINATION_LENGTH} characters`;
  }

  if (!Number.isFinite(plan.durationMinutes) || plan.durationMinutes < MIN_TRIP_MINUTES) {
    errors.duration = 'Choose when you expect to arrive';
  } else if (plan.durationMinutes > MAX_TRIP_MINUTES) {
    errors.duration = `Trips can be up to ${formatDuration(MAX_TRIP_MINUTES)}. Add time on the way if you need more.`;
  }

  if (plan.contactIds.length === 0) {
    errors.contacts = 'Choose at least one person to alert';
  } else if (plan.contactIds.length > MAX_TRUSTED_CONTACTS) {
    errors.contacts = `Choose up to ${MAX_TRUSTED_CONTACTS} people`;
  }

  const name = plan.alertName.trim();
  if (name.length < 2) {
    errors.alertName = 'Enter the name your contacts know you by';
  } else if (name.length > MAX_ALERT_NAME_LENGTH) {
    errors.alertName = `Keep it under ${MAX_ALERT_NAME_LENGTH} characters`;
  }

  return errors;
}

/**
 * When a trip's documents (and its share link) expire if nothing else happens.
 * Always comfortably after the expected arrival, so the link is still readable
 * when contacts are alerted.
 */
export function tripExpiryMs(startMs: number, endsAtMs: number | null): number {
  const dayAfterStart = startMs + 24 * HOUR_MS;
  if (endsAtMs == null) return dayAfterStart;
  return Math.max(dayAfterStart, endsAtMs + 12 * HOUR_MS);
}

export interface LocationStatus {
  state: 'fresh' | 'stale' | 'none';
  text: string;
}

/** What to tell the traveller about their own location sharing. */
export function describeLocationStatus(
  lastUpdateMs: number | null,
  hasLocation: boolean,
  nowMs: number
): LocationStatus {
  if (!hasLocation || lastUpdateMs == null) {
    return { state: 'none', text: 'No location sent yet. Check that location is switched on.' };
  }

  const ageMs = Math.max(0, nowMs - lastUpdateMs);
  const ageMinutes = Math.floor(ageMs / MINUTE_MS);
  if (ageMs > LOCATION_STALE_MS) {
    // The app may well be open, so the advice is about what usually stops a phone reporting
    return { state: 'stale', text: `No location received for ${formatDuration(ageMinutes)}. Check your signal and that location is switched on.` };
  }
  return {
    state: 'fresh',
    text: ageMinutes < 1 ? 'Sharing your location, updated just now' : `Sharing your location, updated ${ageMinutes} min ago`,
  };
}

/** Up to two letters to stand in for a photo: "Mum" gives "M", "Aunty Ngozi" gives "AN" */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => Array.from(word)[0].toUpperCase()).join('');
}

/** "Mum", "Mum and Tunde", "Mum, Tunde and Ngozi" */
export function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
