/**
 * @fileoverview Registering the phone for notifications from the server
 *
 * The server sends one notification that matters for safety: "Are you okay?",
 * at the moment a trip passes its arrival time and before contacts are
 * alerted. It can only reach a phone whose token is saved, so the token is
 * saved as soon as the person has allowed notifications, without their having
 * to find a switch in Profile.
 *
 * A token saved this way carries no location, so it does not subscribe the
 * person to notifications about road reports near them; the switch in Profile
 * does that. Turning that switch off removes the token and is remembered, so
 * this does not quietly put it back.
 *
 * @module pushRegistration
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { settleWithin } from '@/lib/timeLimit';

const OPT_OUT_KEY = 'wakaguard_push_opt_out';

/** Reading the phone's setting should be instant; a phone that does not answer is skipped */
const CHECK_WAIT_MS = 3000;

/**
 * The Android channel the "Are you okay?" reminder arrives on. The server
 * names the same id (REMINDER_CHANNEL_ID in functions/src/tripMonitor.ts).
 */
export const REMINDER_CHANNEL_ID = 'trip_reminders';

let listening = false;
let signedInUid: string | null = null;
let channelReady = false;

/**
 * Android shows a notification the way its channel says. With no channel of
 * its own the reminder lands on Firebase's catch-all one, which makes a sound
 * but does not appear over whatever the person is doing, and this is the
 * notification that stops their contacts being alerted for nothing. Its own
 * channel is set to appear on screen. An iPhone has no channels.
 */
async function prepareReminderChannel(): Promise<void> {
  if (channelReady || Capacitor.getPlatform() !== 'android') return;
  await PushNotifications.createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Trip reminders',
    description: 'Asks if you are okay when a trip passes its arrival time, before your contacts are alerted',
    importance: 4,
    visibility: 1,
    vibration: true,
  });
  channelReady = true;
}

/** Remember that the person switched notifications off (or back on) in Profile */
export function setPushOptOut(optedOut: boolean): void {
  try {
    if (optedOut) window.localStorage.setItem(OPT_OUT_KEY, 'true');
    else window.localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // No storage: the choice lasts until the app restarts
  }
  // Profile removes every notification listener when it switches off
  if (optedOut) listening = false;
}

function hasOptedOut(): boolean {
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === 'true';
  } catch {
    return false;
  }
}

async function saveToken(uid: string, token: string): Promise<void> {
  const ref = doc(db, 'pushSubscriptions', uid);
  const existing = await getDoc(ref);
  const platform = Capacitor.getPlatform();

  if (!existing.exists()) {
    await setDoc(ref, {
      uid,
      fcmToken: token,
      platform,
      location: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  // Tokens rarely change; do not rewrite the document on every launch
  if (existing.data().fcmToken === token && existing.data().platform === platform) return;
  await setDoc(ref, { fcmToken: token, platform, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Save this phone's notification token for the signed-in person, if they have
 * allowed notifications. Never asks for permission, never throws, and does
 * nothing in a browser.
 */
export async function registerForPush(uid: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || hasOptedOut()) return;

  try {
    // Needs no permission, and has to exist before the first reminder arrives
    await settleWithin(prepareReminderChannel(), CHECK_WAIT_MS, null);

    const status = await settleWithin(PushNotifications.checkPermissions(), CHECK_WAIT_MS, null);
    if (status?.receive !== 'granted') return;

    signedInUid = uid;
    if (!listening) {
      listening = true;
      await PushNotifications.addListener('registration', (token) => {
        if (!signedInUid) return;
        saveToken(signedInUid, token.value).catch((error) =>
          console.warn('Could not save the notification token:', error)
        );
      });
      await PushNotifications.addListener('registrationError', (error) => {
        console.warn('This phone could not register for notifications:', error);
      });
    }
    await PushNotifications.register();
  } catch (error) {
    console.warn('Could not register for notifications:', error);
  }
}
