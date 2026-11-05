/**
 * @fileoverview SOS from the lock screen (build 27), Android only
 *
 * Once a trip's background location has started, the app tells the native
 * TripSos plugin (android/.../TripSosPlugin.java) which trip it is, and the
 * "Safe Trip active" notification gets an SOS button that works from the lock
 * screen. Cleared when the trip ends. iPhones show no such notification; there
 * the phone's own Emergency SOS is the lock-screen route.
 *
 * @module tripSos
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import { tripActionEndpoint } from './tripLocation';

interface TripSosPlugin {
  arm(options: { uid: string; tripId: string; key: string; endpoint: string; isTest: boolean; title: string; message: string }): Promise<{ armed: boolean }>;
  disarm(): Promise<void>;
}

const TripSos = registerPlugin<TripSosPlugin>('TripSos');

const onAndroid = () => Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('TripSos');

/** Adds SOS to the trip notification. Never throws: the trip runs on without it */
export async function armLockScreenSos(trip: { uid: string; tripId: string; key: string; isTest: boolean }, title: string, message: string): Promise<void> {
  const endpoint = tripActionEndpoint();
  if (!onAndroid() || !endpoint) return;
  try {
    await TripSos.arm({ ...trip, endpoint, title, message });
  } catch (error) {
    console.warn('Could not add SOS to the trip notification:', error);
  }
}

export async function disarmLockScreenSos(): Promise<void> {
  if (!onAndroid()) return;
  try {
    await TripSos.disarm();
  } catch {
    // Nothing armed
  }
}
