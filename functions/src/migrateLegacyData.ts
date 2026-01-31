import * as admin from 'firebase-admin';

type FirestoreDb = FirebaseFirestore.Firestore;

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeContactId(phone: unknown) {
  const raw = typeof phone === 'string' ? phone : '';
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : null;
}

export interface MigrateOptions {
  collection: string;
  dryRun?: boolean;
  limit?: number;
  cursor?: string | null;
}

export async function migrateLegacyData(
  db: FirestoreDb,
  options: MigrateOptions
): Promise<{ ok: boolean; collection: string; processed?: number; usersProcessed?: number; contactsCreated?: number; nextCursor: string | null }> {
  const { collection, dryRun = false, limit: rawLimit = 200, cursor = null } = options;
  const limit = Math.min(500, Math.max(1, asNumber(rawLimit, 200)));

  if (collection === 'trips') {
    let q: FirebaseFirestore.Query = db.collection('trips').orderBy(admin.firestore.FieldPath.documentId()).limit(limit);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();

    let processed = 0;
    for (const tripDoc of snap.docs) {
      const trip = tripDoc.data() as any;
      const uid = typeof trip.uid === 'string' ? trip.uid : null;
      if (!uid) continue;

      const tripId = tripDoc.id;
      const destTripRef = db.collection('users').doc(uid).collection('trips').doc(tripId);
      const destShareRef = db.collection('sharedTrips').doc(tripId);

      const destTripData = {
        ...trip,
        uid,
        shareToken: typeof trip.shareToken === 'string' ? trip.shareToken : tripId,
      };

      const destSharedTripData = {
        uid,
        tripId,
        status: trip.status,
        expiresAt: trip.expiresAt,
        lastLocation: trip.lastLocation ?? null,
        lastUpdate: trip.lastUpdate ?? null,
        destination: trip.destination ?? null,
        createdAt: trip.createdAt ?? admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!dryRun) {
        const batch = db.batch();
        batch.set(destTripRef, destTripData, { merge: true });
        batch.set(destShareRef, destSharedTripData, { merge: true });
        await batch.commit();
      }

      processed++;
    }

    const nextCursor = snap.empty ? null : snap.docs[snap.docs.length - 1].id;
    return { ok: true, collection, processed, nextCursor };
  }

  if (collection === 'safetyTimers' || collection === 'alerts' || collection === 'checkIns') {
    let q: FirebaseFirestore.Query = db.collection(collection).orderBy(admin.firestore.FieldPath.documentId()).limit(limit);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();

    let processed = 0;
    for (const srcDoc of snap.docs) {
      const data = srcDoc.data() as any;
      const uid = typeof data.uid === 'string' ? data.uid : null;
      if (!uid) continue;

      const destRef = db.collection('users').doc(uid).collection(collection).doc(srcDoc.id);

      if (!dryRun) {
        await destRef.set({ ...data }, { merge: true });
      }

      processed++;
    }

    const nextCursor = snap.empty ? null : snap.docs[snap.docs.length - 1].id;
    return { ok: true, collection, processed, nextCursor };
  }

  if (collection === 'usersTrustedContacts') {
    let q: FirebaseFirestore.Query = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).limit(limit);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();

    let usersProcessed = 0;
    let contactsCreated = 0;

    for (const userDoc of snap.docs) {
      const uid = userDoc.id;
      const user = userDoc.data() as any;
      const contacts = Array.isArray(user.trustedContacts) ? user.trustedContacts : [];

      if (contacts.length > 0 && !dryRun) {
        const batch = db.batch();
        for (const c of contacts) {
          const contactId = normalizeContactId(c?.phone) ?? db.collection('_').doc().id;
          const dest = db.collection('users').doc(uid).collection('trustedContacts').doc(contactId);
          batch.set(dest, {
            name: c?.name ?? '',
            phone: c?.phone ?? '',
            email: c?.email ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          contactsCreated++;
        }
        await batch.commit();
      } else if (contacts.length > 0 && dryRun) {
        contactsCreated += contacts.length;
      }

      usersProcessed++;
    }

    const nextCursor = snap.empty ? null : snap.docs[snap.docs.length - 1].id;
    return { ok: true, collection, usersProcessed, contactsCreated, nextCursor };
  }

  throw new Error('Unknown collection');
}
