/**
 * @fileoverview Asking for permission to show notifications in the phone apps
 *
 * During a trip the phone shows a "Safe Trip active" notification, and the
 * server sends a warning before contacts are alerted. Neither can be seen
 * until the person has allowed notifications, and the web page's own
 * Notification API does not exist inside the apps, so the system has to be
 * asked through the native plugin.
 *
 * @module nativeNotifications
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

/** Starting a trip must not hang on an unanswered prompt */
const ANSWER_WAIT_MS = 20000;

/**
 * Show the system's notification prompt if the person has never answered it.
 * Someone who has already said no is not asked again; they can change it in
 * the phone's settings. Does nothing in a browser. Never throws.
 *
 * @returns whether notifications are allowed afterwards
 */
export async function askToShowNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const current = await PushNotifications.checkPermissions();
    if (current.receive !== 'prompt') return current.receive === 'granted';

    const answer = await Promise.race([
      PushNotifications.requestPermissions().then((status) => status.receive),
      new Promise<'unanswered'>((resolve) => setTimeout(() => resolve('unanswered'), ANSWER_WAIT_MS)),
    ]);
    return answer === 'granted';
  } catch (error) {
    console.warn('Could not ask to show notifications:', error);
    return false;
  }
}
