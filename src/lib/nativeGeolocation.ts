/**
 * @fileoverview Location in the iPhone app without a second permission prompt
 *
 * The app's pages ask for location through the browser API
 * (navigator.geolocation). Inside the iPhone app that makes iOS show its own
 * prompt and then a second one from the web view, worded
 * "localhost would like to use your current location", again on later
 * launches. Routing the same API through the native location plugin leaves
 * only the system prompt, and no call site has to change.
 *
 * Android's web view already asks once, natively, so it is left alone.
 *
 * @module nativeGeolocation
 */

import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

function toWebPosition(position: Position): GeolocationPosition {
  return {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? null,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
    },
    timestamp: position.timestamp,
  } as GeolocationPosition;
}

function toWebError(error: unknown): GeolocationPositionError {
  const message = (error as { message?: string })?.message || 'Location unavailable';
  let code = POSITION_UNAVAILABLE;
  if (/denied|permission|not authorized/i.test(message)) code = PERMISSION_DENIED;
  else if (/time(d)? ?out/i.test(message)) code = TIMEOUT;
  return { code, message, PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT } as GeolocationPositionError;
}

/**
 * Replace navigator.geolocation with a native-backed version on iOS.
 * Safe to call more than once and on any platform.
 */
export function installNativeGeolocation(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isNativePlatform()) return;
  if ((navigator.geolocation as unknown as { native?: boolean })?.native) return;

  // Web watch ids are numbers handed back at once; the plugin's ids arrive later
  const watches = new Map<number, string | null>();
  let nextWatchId = 1;

  const native = {
    native: true,

    getCurrentPosition(
      success: PositionCallback,
      failure?: PositionErrorCallback | null,
      options?: PositionOptions
    ): void {
      Geolocation.getCurrentPosition(options).then(
        (position) => success(toWebPosition(position)),
        (error) => failure?.(toWebError(error))
      );
    },

    watchPosition(
      success: PositionCallback,
      failure?: PositionErrorCallback | null,
      options?: PositionOptions
    ): number {
      const id = nextWatchId++;
      watches.set(id, null);

      Geolocation.watchPosition(options ?? {}, (position, error) => {
        if (error) failure?.(toWebError(error));
        else if (position) success(toWebPosition(position));
      }).then(
        (callbackId) => {
          // Cleared before the plugin answered
          if (!watches.has(id)) Geolocation.clearWatch({ id: callbackId });
          else watches.set(id, callbackId);
        },
        (error) => failure?.(toWebError(error))
      );

      return id;
    },

    clearWatch(id: number): void {
      const callbackId = watches.get(id);
      watches.delete(id);
      if (callbackId) Geolocation.clearWatch({ id: callbackId });
    },
  };

  try {
    Object.defineProperty(navigator, 'geolocation', { value: native, configurable: true });
  } catch (error) {
    console.warn('Could not route location through the native plugin:', error);
  }
}
