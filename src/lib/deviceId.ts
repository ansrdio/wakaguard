/**
 * @fileoverview Telling one install of the app from another
 *
 * Someone can be signed in on two phones. Only one of them should send a
 * trip's positions, or the trip's location jumps between the two.
 *
 * @module deviceId
 */

const STORAGE_KEY = 'wakaguard_device_id';

let cachedId: string | null = null;

function newId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** A random id for this install. Kept in the browser's storage, so it survives restarts. */
export function getDeviceId(): string {
  if (cachedId) return cachedId;
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = newId();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    cachedId = id;
  } catch {
    // No storage (private browsing, or not in a browser): an id for this session only
    cachedId = newId();
  }
  return cachedId;
}

/**
 * Whether this device is the one that sends a trip's positions.
 * A trip with no device recorded was started by an older version of the app,
 * so any device sends for it.
 */
export function sendsTripLocation(trackingDeviceId: string | null | undefined, deviceId: string): boolean {
  return !trackingDeviceId || trackingDeviceId === deviceId;
}
