/**
 * @fileoverview A first trip on day one (build 27)
 *
 * Of the 41 testers' accounts on 28 October, 20 of the 22 who came back after
 * their first day had started a trip; of the 19 who never came back, only 10
 * had. So a new account is led straight from sign-up to adding one contact
 * and a 2-minute test trip, instead of being left on the home screen. Every
 * step can be skipped, and the guide is offered once.
 *
 * No Firebase access (functions/test/firstTrip.test.ts).
 *
 * @module firstTrip
 */

export type FirstTripStep = 'contact' | 'test';

const KEY = (uid: string) => `wakaguard_first_trip_${uid}`;

type Store = Pick<Storage, 'getItem' | 'setItem'> | null;
const browserStore = (): Store => (typeof window !== 'undefined' ? window.localStorage : null);

/** The guide was finished or skipped on this phone */
export function firstTripGuideSeen(uid: string, storage: Store = browserStore()): boolean {
  try {
    return !!storage?.getItem(KEY(uid));
  } catch {
    return true;
  }
}

export function markFirstTripGuideSeen(uid: string, how: 'done' | 'skipped', storage: Store = browserStore()): void {
  try {
    storage?.setItem(KEY(uid), how);
  } catch {
    // Nothing to keep it in: it may be offered again, which is harmless
  }
}

/** Which step to show: the contact first when there is none yet */
export function firstTripStep(contactCount: number, contactSkipped: boolean): FirstTripStep {
  return contactCount === 0 && !contactSkipped ? 'contact' : 'test';
}

/** What happens if the test trip is left to run, in words for the guide */
export function testTripOutcome(contactNames: string[]): string {
  if (contactNames.length === 0) return 'You have no contact yet, so nobody is texted.';
  const who = contactNames.length === 1 ? contactNames[0] : 'your contacts';
  return `If you don't, ${who} ${contactNames.length === 1 ? 'gets' : 'get'} a text marked TEST, so they know what one looks like.`;
}
