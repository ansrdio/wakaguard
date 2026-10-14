/**
 * The push sent to a traveller, with "I've arrived" and "+15 min" buttons on
 * the reminders that come near or after a trip's time.
 *
 * Of 41 real beta trips over four days (to 14 October 2026), 13 ran past the
 * wait before contacts are texted; most of those travellers had the reminders
 * and did not open the app. A button on the notification itself is one tap.
 *
 * - iPhone: the usual notification, in the category whose buttons the app
 *   declares when it starts (ios/App/App/AppDelegate.swift). An older build
 *   that does not declare them simply shows no buttons.
 * - Android: Firebase's own notifications cannot carry buttons, so from build
 *   ANDROID_BUTTONS_FROM_BUILD the app draws these itself
 *   (TripReminderMessagingService.java) from a message with no notification
 *   part. Older builds would show nothing for such a message, so they keep
 *   the plain notification; the app says which build it is when it registers.
 *
 * No Firebase calls here (functions/test/reminderPush.test.ts).
 */

import type { TokenMessage } from 'firebase-admin/messaging';

/** Android's channel for reminders; the app makes it (src/lib/pushRegistration.ts). The two must match. */
export const REMINDER_CHANNEL_ID = 'trip_reminders';
/** The iPhone category whose buttons the app declares. The two must match. */
export const TRIP_REMINDER_CATEGORY = 'TRIP_REMINDER';
/** The first Android build that draws reminders with buttons itself */
export const ANDROID_BUTTONS_FROM_BUILD = 23;

/** The reminders that get buttons: everything about a trip's time running out */
const WITH_BUTTONS = new Set(['trip_reminder', 'overdue_warning', 'overdue_last_warning']);

export interface TravellerMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface PushSubscription {
  fcmToken: string;
  platform?: unknown;
  appBuild?: unknown;
  /** The token the build was reported with; a build for another phone's token is not believed */
  appBuildToken?: unknown;
}

export function hasButtons(message: TravellerMessage): boolean {
  return message.data.kind === 'trip' && !!message.data.id && WITH_BUTTONS.has(message.data.type);
}

export function buildTravellerPush(subscription: PushSubscription, message: TravellerMessage): TokenMessage {
  const buttons = hasButtons(message);
  const drawnByApp = buttons
    && subscription.platform === 'android'
    && subscription.appBuildToken === subscription.fcmToken
    && typeof subscription.appBuild === 'number'
    && subscription.appBuild >= ANDROID_BUTTONS_FROM_BUILD;

  if (drawnByApp) {
    return {
      token: subscription.fcmToken,
      data: { ...message.data, wg_title: message.title, wg_body: message.body, wg_buttons: 'trip' },
      android: { priority: 'high' },
    };
  }

  return {
    token: subscription.fcmToken,
    notification: { title: message.title, body: message.body },
    data: message.data,
    // A reminder nobody hears is no use: deliver it at once, with a sound.
    // On Android it goes to the app's own channel, which appears over other
    // apps. A phone whose app has not made that channel yet falls back to
    // Firebase's default one.
    android: { priority: 'high', notification: { sound: 'default', channelId: REMINDER_CHANNEL_ID } },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default', ...(buttons ? { category: TRIP_REMINDER_CATEGORY } : {}) } },
    },
  };
}
