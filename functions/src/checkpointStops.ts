/**
 * @fileoverview "Stopped at a checkpoint?" on the contacts' trip page (build 27)
 *
 * Until build 27 a press saved an alert (`checkpoint_stop`) that nobody saw:
 * testers pressed it 20 times by 28 October. Now each stop on a running trip
 * is added to the trip's page, with its time and where the phone was, and the
 * page lists "Stopped at a checkpoint, 2:14 pm" with a pin on the map. Nobody
 * is texted: a checkpoint is routine, and an SOS is there for anything more.
 *
 * Only the traveller's own page is written (tripPage.ts).
 *
 * @module checkpointStops
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { ownPage } from './tripPage';
import { ID_PATTERN } from './tripLocation';

/** The page keeps this many; a trip with more has someone pressing for fun */
export const MAX_STOPS_SHOWN = 20;
/** Two presses this close together are one stop */
export const SAME_STOP_MS = 2 * 60 * 1000;

export interface CheckpointStop {
  atMs: number;
  lat?: number;
  lng?: number;
}

function place(value: unknown): { lat: number; lng: number } | null {
  if (!value || typeof value !== 'object') return null;
  const { lat, lng } = value as Record<string, unknown>;
  return typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}

/** The page's list with this stop added, or null when it changes nothing */
export function withStop(list: unknown, atMs: number, where: unknown): CheckpointStop[] | null {
  const stops: CheckpointStop[] = Array.isArray(list)
    ? list.filter((s): s is CheckpointStop => !!s && typeof s === 'object' && typeof (s as CheckpointStop).atMs === 'number')
    : [];
  if (stops.length >= MAX_STOPS_SHOWN) return null;
  if (stops.some((s) => Math.abs(s.atMs - atMs) < SAME_STOP_MS)) return null;
  const at = place(where);
  return [...stops, { atMs, ...(at ?? {}) }].sort((a, b) => a.atMs - b.atMs);
}

export const onCheckpointStop = functions.firestore
  .document('users/{uid}/alerts/{alertId}')
  .onCreate(async (snapshot, context) => {
    const alert = snapshot.data();
    if (alert.type !== 'checkpoint_stop') return null;
    const uid = context.params.uid as string;
    const tripId = alert.tripId;
    if (typeof tripId !== 'string' || !ID_PATTERN.test(tripId)) return null;

    const db = admin.firestore();
    const trip = (await db.doc(`users/${uid}/trips/${tripId}`).get()).data();
    if (!trip || (trip.status !== 'active' && trip.status !== 'emergency')) return null;
    const page = await ownPage(uid, tripId);
    if (!page) return null;

    // The phone's own fix when it had one, else the trip's latest position
    const where = place(alert.location) ?? place(trip.lastLocation);
    const atMs = snapshot.createTime?.toMillis() ?? Date.now();
    await db.runTransaction(async (tx) => {
      const now = await tx.get(page);
      if (!now.exists || now.get('uid') !== uid) return;
      const stops = withStop(now.get('checkpoints'), atMs, where);
      if (stops) tx.update(page, { checkpoints: stops });
    });
    return null;
  });
