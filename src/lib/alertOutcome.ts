/**
 * @fileoverview What to tell the traveller about an alert to their contacts
 *
 * Each time the server texts a trip's contacts it records what happened on
 * the trip (functions/src/tripMonitor.ts). The app says that and no more.
 * "Sent" means the SMS provider accepted the text; it does not mean the text
 * has reached the contact's phone, so nothing here says "delivered".
 *
 * @module alertOutcome
 */

/** The fields of a trip that describe its alerts */
export interface AlertFields {
  status?: string | null;
  overdueAt?: unknown;
  overdueAlertState?: string | null;
  overdueAlertSent?: number | null;
  overdueAlertTotal?: number | null;
  overdueAlertAttempts?: number | null;
  sosAlertState?: string | null;
  sosAlertSent?: number | null;
  sosAlertTotal?: number | null;
}

export interface AlertOutcome {
  kind: 'overdue' | 'sos';
  /** sent: the texts went out. pending: they are on their way out. problem: some or all did not go out. */
  tone: 'sent' | 'pending' | 'problem';
  /** What to show on the trip card */
  text: string;
  /** Words to follow the contacts' names: "Mum and Tunde" + "have been sent a text" */
  caption: (contactCount: number) => string;
  /** Some contact was, or is being, texted, so the server follows up with them when the trip ends */
  texted: boolean;
}

/** How many times the server tries an overdue alert before giving up (MAX_ALERT_ATTEMPTS on the server) */
const OVERDUE_ALERT_ATTEMPTS = 3;

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

const yourContacts = (total: number | null) =>
  total === 1 ? 'your contact' : total ? `your ${total} contacts` : 'your contacts';

const sentCaption = (n: number) => (n === 1 ? 'has been sent a text' : 'have been sent a text');
const pendingCaption = (n: number) => (n === 1 ? 'is being texted' : 'are being texted');
const partialCaption = () => 'were not all sent a text';
const problemCaption = () => 'could not be texted';

/**
 * The overdue alert, once the server has started on it.
 * Null while the trip is on time or still inside the wait before contacts are told.
 */
export function describeOverdueAlert(trip: AlertFields): AlertOutcome | null {
  if (!trip.overdueAt && !trip.overdueAlertState) return null;

  const total = count(trip.overdueAlertTotal);
  const sent = count(trip.overdueAlertSent);
  const kind = 'overdue' as const;

  switch (trip.overdueAlertState) {
    case 'sent':
      return {
        kind, tone: 'sent', texted: true, caption: sentCaption,
        text: `A text saying you are overdue was sent to ${yourContacts(total)}. Add time or end the trip to let them know you are okay.`,
      };
    case 'partial':
      return {
        kind, tone: 'problem', texted: true, caption: partialCaption,
        text: sent != null && total != null
          ? `A text saying you are overdue was sent to ${sent} of your ${total} contacts. The rest could not be sent. Call them if you can.`
          : 'A text saying you are overdue was sent to some of your contacts, but not all. Call them if you can.',
      };
    case 'failed':
      return (count(trip.overdueAlertAttempts) ?? 0) < OVERDUE_ALERT_ATTEMPTS
        ? {
            kind, tone: 'problem', texted: false, caption: problemCaption,
            text: 'The text to your contacts could not be sent. WakaGuard is trying again.',
          }
        : {
            kind, tone: 'problem', texted: false, caption: problemCaption,
            text: 'The text to your contacts could not be sent. Call them yourself, or share the trip link.',
          };
    case 'blocked':
      return {
        kind, tone: 'problem', texted: false, caption: problemCaption,
        text: 'WakaGuard could not text your contacts. Call them yourself, or share the trip link.',
      };
    case 'no_contacts':
      return {
        kind, tone: 'problem', texted: false, caption: problemCaption,
        text: 'Nobody was told: this trip has no contact with a number that can be texted.',
      };
    default:
      // 'sending', or the moment between the trip being marked overdue and the texts going out
      return {
        kind, tone: 'pending', texted: true, caption: pendingCaption,
        text: 'Your arrival time has passed. Your contacts are being texted now.',
      };
  }
}

/** The SOS on a trip. Null unless the trip is an emergency. */
export function describeSosAlert(trip: AlertFields): AlertOutcome | null {
  if (trip.status !== 'emergency') return null;

  const total = count(trip.sosAlertTotal);
  const sent = count(trip.sosAlertSent);
  const kind = 'sos' as const;
  const whenSafe = ' End the trip when you are safe.';

  switch (trip.sosAlertState) {
    case 'sent':
      return {
        kind, tone: 'sent', texted: true, caption: sentCaption,
        text: `An SOS text was sent to ${yourContacts(total)}. They can follow this trip.${whenSafe}`,
      };
    case 'partial':
      return {
        kind, tone: 'problem', texted: true, caption: partialCaption,
        text: (sent != null && total != null
          ? `An SOS text was sent to ${sent} of your ${total} contacts. The rest could not be sent.`
          : 'An SOS text was sent to some of your contacts, but not all.')
          + ` Call them if you can.${whenSafe}`,
      };
    case 'failed':
    case 'blocked':
      return {
        kind, tone: 'problem', texted: false, caption: problemCaption,
        text: `The SOS text to your contacts could not be sent. Call them, or call 112.${whenSafe}`,
      };
    case 'no_contacts':
      return {
        kind, tone: 'problem', texted: false, caption: problemCaption,
        text: `No SOS text was sent: you have no contact with a number that can be texted. Call 112, or someone you trust.${whenSafe}`,
      };
    case 'sending':
      return {
        kind, tone: 'pending', texted: true, caption: pendingCaption,
        text: `SOS received. Your contacts are being texted now.${whenSafe}`,
      };
    default:
      // The phone has marked the trip, but the server has not said it has the SOS yet
      return {
        kind, tone: 'pending', texted: true, caption: pendingCaption,
        text: `SOS started. Your contacts are texted as soon as WakaGuard receives it.${whenSafe}`,
      };
  }
}

/** The alert that matters most on a trip right now: an SOS, otherwise an overdue alert */
export function describeTripAlert(trip: AlertFields): AlertOutcome | null {
  return describeSosAlert(trip) ?? describeOverdueAlert(trip);
}

/** Words to follow the contacts' names on the trip card and the trip map */
export function watcherCaption(outcome: AlertOutcome | null, contactCount: number): string {
  return outcome ? outcome.caption(contactCount) : "will be told if you don't arrive";
}
