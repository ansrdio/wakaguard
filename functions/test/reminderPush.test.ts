import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANDROID_BUTTONS_FROM_BUILD, buildTravellerPush, hasButtons, IOS_ALERT_SOUND, LOUD_FROM_BUILD, TRIP_REMINDER_CATEGORY } from '../src/reminderPush';
import { OVERDUE_GRACE_MS } from '../src/overdueLogic';
import { ALERT_GRACE_MINUTES } from '../../src/lib/tripPlanning';
import { firstTimePressed, forgetPendingPress, noteDeadlineAtPress, pendingPress, PENDING_PRESS_MS, readTripNotificationAction, rememberPendingPress } from '../../src/lib/tripNotificationActions';

const reminder = (type: string, kind = 'trip') => ({ title: 'Are you okay?', body: 'Check in or add time.', data: { type, kind, id: 'trip-1' } });

test('the app and the public pages quote the wait the server applies', () => {
  assert.equal(ALERT_GRACE_MINUTES * 60 * 1000, OVERDUE_GRACE_MS);
});

test('only reminders about a trip running out of time get the buttons', () => {
  for (const type of ['trip_reminder', 'overdue_warning', 'overdue_last_warning']) assert.equal(hasButtons(reminder(type)), true, type);
  assert.equal(hasButtons(reminder('location_stopped')), false, 'opening the app is the point of that one');
  assert.equal(hasButtons(reminder('overdue_warning', 'timer')), false, 'a safety timer is not a trip');
});

test('an iPhone gets the usual notification in the category with the buttons', () => {
  const push = buildTravellerPush({ fcmToken: 't', platform: 'ios', appBuild: 23 }, reminder('overdue_warning'));
  assert.deepEqual(push.notification, { title: 'Are you okay?', body: 'Check in or add time.' });
  assert.equal(push.apns?.payload?.aps?.category, TRIP_REMINDER_CATEGORY);
  assert.equal(buildTravellerPush({ fcmToken: 't', platform: 'ios' }, reminder('location_stopped')).apns?.payload?.aps?.category, undefined);
});

test('from build 24 an iPhone reminder is Time Sensitive with the WakaGuard sound; older builds keep the usual sound', () => {
  const loud = buildTravellerPush({ fcmToken: 't', platform: 'ios', appBuild: LOUD_FROM_BUILD, appBuildToken: 't' }, reminder('overdue_warning'));
  assert.equal(loud.apns?.payload?.aps?.sound, IOS_ALERT_SOUND);
  assert.equal(loud.apns?.payload?.aps?.['interruption-level'], 'time-sensitive');
  assert.equal(loud.apns?.payload?.aps?.category, TRIP_REMINDER_CATEGORY);
  assert.equal(loud.apns?.headers?.['apns-priority'], '10');

  // An older app has no such sound; a build reported with another token is not believed
  for (const sub of [
    { fcmToken: 't', platform: 'ios', appBuild: 23, appBuildToken: 't' },
    { fcmToken: 't', platform: 'ios', appBuild: LOUD_FROM_BUILD, appBuildToken: 'other' },
    { fcmToken: 't', platform: 'ios' },
  ]) {
    const quiet = buildTravellerPush(sub, reminder('overdue_warning'));
    assert.equal(quiet.apns?.payload?.aps?.sound, 'default', JSON.stringify(sub));
    assert.equal(quiet.apns?.payload?.aps?.['interruption-level'], undefined, JSON.stringify(sub));
  }
  // Only the reminders about time running out are urgent
  const nudge = buildTravellerPush({ fcmToken: 't', platform: 'ios', appBuild: LOUD_FROM_BUILD, appBuildToken: 't' }, reminder('location_stopped'));
  assert.equal(nudge.apns?.payload?.aps?.['interruption-level'], undefined);
});

test('a new Android app draws the reminder itself; an older one keeps the plain notification', () => {
  const drawn = buildTravellerPush({ fcmToken: 't', platform: 'android', appBuild: ANDROID_BUTTONS_FROM_BUILD, appBuildToken: 't' }, reminder('trip_reminder'));
  assert.equal(drawn.notification, undefined);
  assert.equal(drawn.data?.wg_buttons, 'trip');
  assert.equal(drawn.data?.wg_title, 'Are you okay?');
  assert.equal(drawn.data?.id, 'trip-1');
  assert.equal(drawn.android?.priority, 'high');

  for (const appBuild of [undefined, 22, '23']) {
    const plain = buildTravellerPush({ fcmToken: 't', platform: 'android', appBuild, appBuildToken: 't' }, reminder('trip_reminder'));
    assert.ok(plain.notification, `build ${appBuild}`);
    assert.equal(plain.android?.notification?.channelId, 'trip_reminders');
  }
  assert.ok(buildTravellerPush({ fcmToken: 't', platform: 'android', appBuild: 23, appBuildToken: 't' }, reminder('location_stopped')).notification);
  // An older app on another phone took over the account's token; the build was not reported with it
  assert.ok(buildTravellerPush({ fcmToken: 'older-phone', platform: 'android', appBuild: 23, appBuildToken: 't' }, reminder('trip_reminder')).notification);
});

test('a press is read the same way from either phone', () => {
  const read = (performed: unknown) => {
    const press = readTripNotificationAction(performed);
    return press && { action: press.action, tripId: press.tripId };
  };
  // iPhone: the button is the actionId
  assert.deepEqual(read({ actionId: 'arrived', notification: { data: { kind: 'trip', id: 'trip-1' } } }), { action: 'arrived', tripId: 'trip-1' });
  assert.deepEqual(read({ actionId: 'add15', notification: { data: { kind: 'trip', id: 'trip-1' } } }), { action: 'add15', tripId: 'trip-1' });
  // Android: Capacitor says "tap"; the app's own notification says which button
  assert.deepEqual(read({ actionId: 'tap', notification: { data: { kind: 'trip', id: 'trip-1', wg_action: 'arrived' } } }), { action: 'arrived', tripId: 'trip-1' });
  assert.deepEqual(read({ actionId: 'tap', notification: { data: { kind: 'trip', id: 'trip-1' } } }), { action: 'open', tripId: 'trip-1' });
  // "More time…" on either phone
  assert.deepEqual(read({ actionId: 'more', notification: { data: { kind: 'trip', id: 'trip-1' } } }), { action: 'more', tripId: 'trip-1' });
  assert.deepEqual(read({ actionId: 'tap', notification: { data: { kind: 'trip', id: 'trip-1', wg_action: 'more' } } }), { action: 'more', tripId: 'trip-1' });
  assert.deepEqual(read({ actionId: 'something-else', notification: { data: { kind: 'trip', id: 'trip-1' } } }), { action: 'open', tripId: 'trip-1' });
  for (const other of [null, {}, { actionId: 'arrived' }, { notification: { data: { kind: 'timer', id: 'x' } } }, { notification: { data: { kind: 'trip' } } }]) {
    assert.equal(readTripNotificationAction(other), null);
  }
});

test('a press handed over again is carried out only once', () => {
  const kept = new Map<string, string>();
  const storage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v) };
  const press = readTripNotificationAction({ actionId: 'tap', notification: { id: 'wg-add15-1760000000000', data: { kind: 'trip', id: 'trip-1', type: 'overdue_warning', wg_action: 'add15' } } })!;
  assert.equal(firstTimePressed(press, storage), true);
  assert.equal(firstTimePressed(press, storage), false, 'Android rebuilt the app and handed the same press over again');
  // The other button on the same iPhone notification is a different press
  const iphone = (actionId: string) => readTripNotificationAction({ actionId, notification: { id: 'ios-1', data: { kind: 'trip', id: 'trip-1', type: 'trip_reminder' } } })!;
  assert.equal(firstTimePressed(iphone('add15'), storage), true);
  assert.equal(firstTimePressed(iphone('arrived'), storage), true);
  // Opening the app is harmless and always allowed
  const tap = iphone('tap');
  assert.equal(firstTimePressed(tap, storage), true);
  assert.equal(firstTimePressed(tap, storage), true);
});

test('a press survives the app reloading itself, until it has been carried out', () => {
  const kept = new Map<string, string>();
  const storage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) };
  const now = Date.UTC(2026, 9, 14, 17, 22);
  const press = { action: 'add15' as const, tripId: 'trip-1', key: 'n1|trip_reminder|add15' };

  rememberPendingPress(press, now, storage);
  assert.deepEqual(pendingPress(now + 5000, storage), { ...press, deadlineMs: null }, 'the reloaded app finds it');
  noteDeadlineAtPress(Date.UTC(2026, 9, 14, 17, 51), storage);
  assert.equal(pendingPress(now + 6000, storage)?.deadlineMs, Date.UTC(2026, 9, 14, 17, 51), 'with the due time it began from');
  forgetPendingPress(storage);
  assert.equal(pendingPress(now + 7000, storage), null, 'done: nothing left to carry out');

  rememberPendingPress(press, now, storage);
  assert.equal(pendingPress(now + PENDING_PRESS_MS + 1, storage), null, 'too old to act on after a reload');
  rememberPendingPress({ ...press, action: 'open' }, now, storage);
  assert.equal(pendingPress(now, storage), null, 'opening the app is never kept');
});

test('"More time…" pressed just before the app reloads still opens the picker afterwards', () => {
  const kept = new Map<string, string>();
  const storage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) };
  const now = Date.UTC(2026, 9, 18, 9, 0);
  const press = { action: 'more' as const, tripId: 'trip-1', key: 'n1|trip_reminder|more' };
  rememberPendingPress(press, now, storage);
  assert.deepEqual(pendingPress(now + 3000, storage), { ...press, deadlineMs: null });
});
