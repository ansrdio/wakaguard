/**
 * @fileoverview "I've arrived" and "+15 min" pressed on a reminder notification
 *
 * The server puts the two buttons on the reminders near and after a trip's
 * time (functions/src/reminderPush.ts). Pressing one opens the app, which
 * then does exactly what the same button on the Trip screen does. A plain
 * tap on any trip notification just opens the Trip screen.
 *
 * - iPhone: Capacitor hands over the button as the actionId.
 * - Android: the app draws these notifications itself
 *   (TripReminderMessagingService.java) and says which button in wg_action,
 *   because Capacitor reports every tap there as "tap".
 *
 * No Firebase or DOM access (functions/test/tripNotificationActions.test.ts).
 *
 * @module tripNotificationActions
 */

export interface TripNotificationAction {
  action: 'arrived' | 'add15' | 'open';
  tripId: string;
  /** This one press: the notification and its button */
  key: string;
  /** The trip's due time when carrying out the press began, if it began before a reload */
  deadlineMs?: number | null;
}

/** Minutes the "+15 min" button adds */
export const BUTTON_ADDS_MINUTES = 15;

/** What a pressed notification asks for, or null when it is not about a trip */
export function readTripNotificationAction(performed: unknown): TripNotificationAction | null {
  if (!performed || typeof performed !== 'object') return null;
  const { actionId, notification } = performed as { actionId?: unknown; notification?: { data?: unknown } };
  const data = (notification?.data && typeof notification.data === 'object' ? notification.data : {}) as Record<string, unknown>;
  if (data.kind !== 'trip' || typeof data.id !== 'string' || !data.id) return null;
  const pressed = typeof data.wg_action === 'string' ? data.wg_action : actionId;
  const action = pressed === 'arrived' ? 'arrived' : pressed === 'add15' ? 'add15' : 'open';
  const id = (notification as { id?: unknown } | undefined)?.id;
  return { action, tripId: data.id, key: `${typeof id === 'string' ? id : ''}|${data.type ?? ''}|${action}` };
}

const HANDLED_KEY = 'wakaguard_handled_presses';
const KEEP_HANDLED = 20;

/**
 * True the first time a press is seen on this phone. Android can hand the
 * same press over again when it rebuilds the app, and "+15 min" must not add
 * time twice. A plain tap is harmless and always passes.
 */
export function firstTimePressed(press: TripNotificationAction, storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): boolean {
  if (press.action === 'open' || !storage) return true;
  try {
    const handled: string[] = JSON.parse(storage.getItem(HANDLED_KEY) ?? '[]');
    if (handled.includes(press.key)) return false;
    storage.setItem(HANDLED_KEY, JSON.stringify([...handled, press.key].slice(-KEEP_HANDLED)));
  } catch {
    // Nothing to remember it in: carry the press out
  }
  return true;
}

const PENDING_KEY = 'wakaguard_pending_press';
/** A press older than this is not carried out after a reload: the moment has passed */
export const PENDING_PRESS_MS = 2 * 60 * 1000;

/**
 * A press is kept on the phone until it has been carried out. On an iPhone
 * the app often reloads itself the moment it comes back from the background
 * (see lib/localStore.ts), and a press held only in memory was lost in that
 * reload: "+15 min" and "I've arrived" did nothing (owner's iPhone, 14
 * October 2026). The reloaded app picks it up again.
 */
export function rememberPendingPress(press: TripNotificationAction, nowMs = Date.now(), storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): void {
  if (press.action === 'open' || !storage) return;
  try {
    storage.setItem(PENDING_KEY, JSON.stringify({ ...press, at: nowMs }));
  } catch {
    // Nothing to keep it in: it is carried out now or not at all
  }
}

/** The press still waiting to be carried out, if one is recent enough */
export function pendingPress(nowMs = Date.now(), storage: Pick<Storage, 'getItem' | 'removeItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): TripNotificationAction | null {
  if (!storage) return null;
  try {
    const kept = JSON.parse(storage.getItem(PENDING_KEY) ?? 'null') as (TripNotificationAction & { at?: number }) | null;
    if (!kept || typeof kept.at !== 'number' || nowMs - kept.at > PENDING_PRESS_MS || nowMs < kept.at
      || (kept.action !== 'arrived' && kept.action !== 'add15') || typeof kept.tripId !== 'string') {
      storage.removeItem(PENDING_KEY);
      return null;
    }
    return {
      action: kept.action,
      tripId: kept.tripId,
      key: String(kept.key ?? ''),
      deadlineMs: typeof kept.deadlineMs === 'number' ? kept.deadlineMs : null,
    };
  } catch {
    return null;
  }
}

/** The press has been carried out, or there is nothing left to do for it */
export function forgetPendingPress(storage: Pick<Storage, 'removeItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): void {
  try {
    storage?.removeItem(PENDING_KEY);
  } catch {
    // Nothing to do
  }
}

/**
 * Notes the trip's due time as carrying out the kept press begins. If the app
 * reloads before the press is marked done, the reloaded app sees whether the
 * due time has already moved, so "+15 min" is never added twice.
 */
export function noteDeadlineAtPress(deadlineMs: number | null, storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null): void {
  if (!storage || deadlineMs == null) return;
  try {
    const kept = JSON.parse(storage.getItem(PENDING_KEY) ?? 'null');
    if (kept && typeof kept === 'object') storage.setItem(PENDING_KEY, JSON.stringify({ ...kept, deadlineMs }));
  } catch {
    // Nothing to do
  }
}
