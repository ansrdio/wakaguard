import fs from 'fs';
import path from 'path';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  connectAuthEmulator,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  Timestamp
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

type AppContext = {
  app: FirebaseApp;
  auth: ReturnType<typeof getAuth>;
  db: ReturnType<typeof getFirestore>;
  storage: ReturnType<typeof getStorage>;
};

type StepResult = {
  name: string;
  status: 'PASS' | 'FAIL';
  error?: { code?: string; message?: string };
};

const startedAt = new Date();
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '');
const ids = {
  reportId: `report_smoke_${runId}`,
  commentId: `comment_smoke_${runId}`,
  flagId: `flag_smoke_${runId}`,
  tripId: `trip_smoke_${runId}`,
  alertId: `alert_smoke_${runId}`,
  checkInId: `checkin_smoke_${runId}`,
  contactId: `contact_smoke_${runId}`,
  photoName: `photo_${runId}.png`
};

const results: StepResult[] = [];
const logs: string[] = [];
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

function logToBuffer(level: keyof typeof originalConsole, args: unknown[]) {
  const message = args
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    .join(' ');
  logs.push(`[${level.toUpperCase()}] ${message}`);
  originalConsole[level](...args);
}

console.log = (...args: unknown[]) => logToBuffer('log', args);
console.error = (...args: unknown[]) => logToBuffer('error', args);
console.warn = (...args: unknown[]) => logToBuffer('warn', args);

function recordResult(name: string, status: 'PASS' | 'FAIL', error?: unknown) {
  const err = error as { code?: string; message?: string } | undefined;
  results.push({
    name,
    status,
    error: err ? { code: err.code, message: err.message } : undefined
  });
  const line = `${status}: ${name}`;
  if (status === 'PASS') {
    console.log(line);
  } else {
    console.error(line, err?.code ?? '', err?.message ?? '');
  }
}

function ensureArtifactsDir() {
  const artifactsDir = path.join('tests', 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });
  return artifactsDir;
}

function writeArtifacts() {
  const artifactsDir = ensureArtifactsDir();
  const summary = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    total: results.length,
    passed: results.filter((r) => r.status === 'PASS').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    results
  };
  fs.writeFileSync(
    path.join(artifactsDir, 'smoke-results.json'),
    JSON.stringify(summary, null, 2)
  );
  fs.writeFileSync(path.join(artifactsDir, 'smoke.log'), logs.join('\n'));
}

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || 'routepulse-5701f';
}

function initEmulatorApp(name: string): AppContext {
  const projectId = getProjectId();
  const app = initializeApp(
    {
      apiKey: 'demo',
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      appId: `1:000000000000:web:${name}`
    },
    name
  );
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  return { app, auth, db, storage };
}

function isPermissionDenied(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code === 'permission-denied' || code === 'storage/unauthorized';
}

async function runStep(
  name: string,
  fn: () => Promise<void>,
  expectDenied = false
) {
  try {
    await fn();
    if (expectDenied) {
      recordResult(name, 'FAIL', {
        code: 'no-error',
        message: 'Expected permission-denied'
      });
    } else {
      recordResult(name, 'PASS');
    }
  } catch (error) {
    if (expectDenied && isPermissionDenied(error)) {
      recordResult(name, 'PASS');
    } else {
      recordResult(name, 'FAIL', error);
    }
  }
}

async function signInAnonymous(ctx: AppContext) {
  const creds = await signInAnonymously(ctx.auth);
  return creds.user.uid;
}

async function signUpEmailPassword(ctx: AppContext, email: string, password: string) {
  try {
    const creds = await createUserWithEmailAndPassword(ctx.auth, email, password);
    return creds.user.uid;
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === 'auth/email-already-in-use') {
      const creds = await signInWithEmailAndPassword(ctx.auth, email, password);
      return creds.user.uid;
    }
    throw error;
  }
}

async function signInEmailPassword(ctx: AppContext, email: string, password: string) {
  const creds = await signInWithEmailAndPassword(ctx.auth, email, password);
  return creds.user.uid;
}

function buildReportData(uid: string) {
  const now = Timestamp.now();
  return {
    uid,
    type: 'pothole',
    severity: 'low',
    status: 'active',
    state: 'Lagos',
    verification: 'pending',
    location: { lat: 6.5244, lng: 3.3792, address: 'Lagos' },
    description: 'Smoke test report',
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    upvotes: 0,
    downvotes: 0,
    commentCount: 0,
    flagCount: 0,
    photoUrls: [],
    createdAt: now
  };
}

async function createReport(ctx: AppContext, uid: string) {
  const reportRef = doc(ctx.db, 'reports', ids.reportId);
  await setDoc(reportRef, buildReportData(uid));
}

async function uploadReportPhoto(ctx: AppContext, uid: string, reportId: string) {
  const storageRef = ref(
    ctx.storage,
    `report_photos/${uid}/${reportId}/${ids.photoName}`
  );
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  await uploadBytes(storageRef, bytes, { contentType: 'image/png' });
  try {
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.warn('Download URL unavailable in emulator, using fallback URL.');
    return `https://example.com/${uid}/${reportId}/${ids.photoName}`;
  }
}

async function updateReportPhotoUrls(
  ctx: AppContext,
  reportId: string,
  photoUrls: string[]
) {
  const reportRef = doc(ctx.db, 'reports', reportId);
  const snapshot = await getDoc(reportRef);
  if (!snapshot.exists()) {
    throw new Error('Report missing for photo update.');
  }
  const data = snapshot.data();
  await setDoc(reportRef, { ...data, photoUrls });
}

async function reportUpdateForbiddenField(ctx: AppContext, reportId: string) {
  const reportRef = doc(ctx.db, 'reports', reportId);
  const snapshot = await getDoc(reportRef);
  if (!snapshot.exists()) {
    throw new Error('Report missing');
  }
  const data = snapshot.data();
  await setDoc(reportRef, {
    ...data,
    upvotes: (data.upvotes ?? 0) + 1
  });
}

async function reportUpdateTooManyPhotos(ctx: AppContext, reportId: string) {
  const reportRef = doc(ctx.db, 'reports', reportId);
  const snapshot = await getDoc(reportRef);
  if (!snapshot.exists()) {
    throw new Error('Report missing');
  }
  const data = snapshot.data();
  await setDoc(reportRef, {
    ...data,
    photoUrls: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg', 'f.jpg'] // 6 photos
  });
}

async function createComment(ctx: AppContext, uid: string, reportId: string) {
  const commentRef = doc(ctx.db, 'comments', ids.commentId);
  await setDoc(commentRef, {
    uid,
    reportId,
    text: 'Smoke test comment',
    status: 'active',
    createdAt: Timestamp.now()
  });
}

async function sharedTripUpdateToCompleted(ctx: AppContext, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  const snapshot = await getDoc(sharedRef);
  if (!snapshot.exists()) {
    throw new Error('Shared trip missing');
  }
  const data = snapshot.data();
  await setDoc(sharedRef, {
    ...data,
    status: 'completed',
    lastUpdate: Timestamp.now()
  });
}

async function sharedTripCreateExpired(ctx: AppContext, uid: string, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  await setDoc(sharedRef, {
    uid,
    tripId: token,
    status: 'active',
    expiresAt: Timestamp.fromDate(new Date(Date.now() - 60 * 1000)),
    lastLocation: { lat: 6.5, lng: 3.4, accuracy: 12 },
    lastUpdate: Timestamp.now(),
    destination: 'Ikeja',
    createdAt: Timestamp.now()
  });
}

async function sharedTripPublicGet(ctx: AppContext, token: string) {
  const refDoc = doc(ctx.db, 'sharedTrips', token);
  await getDoc(refDoc);
}

async function createVote(
  ctx: AppContext,
  uid: string,
  reportId: string,
  value: 1 | -1
) {
  const voteId = `${uid}_${reportId}`;
  const voteRef = doc(ctx.db, 'votes', voteId);
  await setDoc(voteRef, {
    uid,
    reportId,
    value,
    createdAt: Timestamp.now()
  });
}

async function createVoteWithBadId(ctx: AppContext, uid: string, reportId: string) {
  const voteRef = doc(ctx.db, 'votes', `BAD_${uid}_${reportId}`);
  await setDoc(voteRef, {
    uid,
    reportId,
    value: 1,
    createdAt: Timestamp.now()
  });
}

async function createVoteWithBadValue(ctx: AppContext, uid: string, reportId: string) {
  const voteId = `${uid}_${reportId}`; // valid ID
  const voteRef = doc(ctx.db, 'votes', voteId);
  await setDoc(voteRef, {
    uid,
    reportId,
    value: 2, // invalid value
    createdAt: Timestamp.now()
  } as never);
}

async function createFlag(ctx: AppContext, uid: string, reportId: string) {
  const flagRef = doc(ctx.db, 'flags', ids.flagId);
  await setDoc(flagRef, {
    reporterId: uid,
    status: 'pending',
    reason: 'spam',
    targetType: 'report',
    targetId: reportId,
    details: 'Smoke test flag',
    createdAt: Timestamp.now()
  });
}

async function safetyStartTrip(ctx: AppContext, uid: string) {
  const tripRef = doc(ctx.db, 'users', uid, 'trips', ids.tripId);
  await setDoc(tripRef, {
    status: 'active',
    createdAt: Timestamp.now()
  });
}

async function safetyUpdateTripLocation(ctx: AppContext, uid: string, tripId: string) {
  const tripRef = doc(ctx.db, 'users', uid, 'trips', tripId);
  await setDoc(tripRef, {
    status: 'active',
    lastLocation: { lat: 6.5, lng: 3.4 },
    updatedAt: Timestamp.now()
  });
}

async function safetyTriggerSOS(ctx: AppContext, uid: string) {
  const alertRef = doc(ctx.db, 'users', uid, 'alerts', ids.alertId);
  await setDoc(alertRef, {
    type: 'sos',
    status: 'active',
    createdAt: Timestamp.now()
  });
}

async function safetyQuickCheckIn(ctx: AppContext, uid: string) {
  const checkInRef = doc(ctx.db, 'users', uid, 'checkIns', ids.checkInId);
  await setDoc(checkInRef, {
    message: 'I am okay',
    createdAt: Timestamp.now()
  });
}

async function safetyAddTrustedContact(ctx: AppContext, uid: string) {
  const contactRef = doc(
    ctx.db,
    'users',
    uid,
    'trustedContacts',
    ids.contactId
  );
  await setDoc(contactRef, {
    name: 'Test Contact',
    phone: '+1234567890',
    createdAt: Timestamp.now()
  });
}

async function sharedTripCreate(ctx: AppContext, uid: string, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  await setDoc(sharedRef, {
    uid,
    tripId: token,
    status: 'active',
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)),
    lastLocation: { lat: 6.5, lng: 3.4, accuracy: 12 },
    lastUpdate: Timestamp.now(),
    destination: 'Ikeja',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.fromDate(new Date(Date.now() + 45 * 60 * 1000))
  });
}

// The server adds overdueAt; the owner's location updates must still pass rules afterwards
async function sharedTripUpdateWhileOverdue(ctx: AppContext, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  const snapshot = await getDoc(sharedRef);
  await setDoc(sharedRef, {
    ...snapshot.data(),
    overdueAt: Timestamp.now(),
    endsAt: Timestamp.fromDate(new Date(Date.now() + 75 * 60 * 1000)),
    lastLocation: { lat: 6.52, lng: 3.42, accuracy: 9 },
    lastUpdate: Timestamp.now()
  });
}

async function sharedTripUpdateBadEndsAt(ctx: AppContext, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  const snapshot = await getDoc(sharedRef);
  await setDoc(sharedRef, { ...snapshot.data(), endsAt: 'soon' });
}

async function sharedTripUpdate(ctx: AppContext, uid: string, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  const snapshot = await getDoc(sharedRef);
  if (!snapshot.exists()) {
    throw new Error('Shared trip missing');
  }
  const data = snapshot.data();
  await setDoc(sharedRef, {
    ...data,
    status: 'emergency',
    lastLocation: { lat: 6.51, lng: 3.41, accuracy: 10 },
    lastUpdate: Timestamp.now()
  });
}

async function pushSubCreate(ctx: AppContext, uid: string) {
  const subRef = doc(ctx.db, 'pushSubscriptions', uid);
  await setDoc(subRef, {
    uid,
    fcmToken: `token_${uid}`,
    platform: 'web',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

async function pushSubGet(ctx: AppContext, uid: string) {
  const subRef = doc(ctx.db, 'pushSubscriptions', uid);
  const snapshot = await getDoc(subRef);
  if (!snapshot.exists()) {
    throw new Error('Push subscription missing');
  }
}

async function pushSubGetOther(ctx: AppContext, otherUid: string) {
  const subRef = doc(ctx.db, 'pushSubscriptions', otherUid);
  await getDoc(subRef);
}

async function pushSubUpdateLocation(ctx: AppContext, uid: string) {
  const subRef = doc(ctx.db, 'pushSubscriptions', uid);
  const snapshot = await getDoc(subRef);
  if (!snapshot.exists()) {
    throw new Error('Push subscription missing');
  }
  const data = snapshot.data();
  await setDoc(subRef, {
    ...data,
    location: { lat: 6.52, lng: 3.38 },
    updatedAt: Timestamp.now(),
    locationUpdatedAt: Timestamp.now()
  });
}

async function userDocGet(ctx: AppContext, uid: string) {
  const userRef = doc(ctx.db, 'users', uid);
  await getDoc(userRef);
}

async function uploadNonImage(ctx: AppContext, uid: string, reportId: string) {
  const storageRef = ref(
    ctx.storage,
    `report_photos/${uid}/${reportId}/bad_${runId}.txt`
  );
  const bytes = new TextEncoder().encode('not an image');
  await uploadBytes(storageRef, bytes, { contentType: 'text/plain' });
}

async function readReport(ctx: AppContext) {
  const reportRef = doc(ctx.db, 'reports', ids.reportId);
  const snapshot = await getDoc(reportRef);
  if (!snapshot.exists()) {
    throw new Error('Report not found');
  }
}

async function readComment(ctx: AppContext) {
  const commentRef = doc(ctx.db, 'comments', ids.commentId);
  const snapshot = await getDoc(commentRef);
  if (!snapshot.exists()) {
    throw new Error('Comment not found');
  }
}

async function listPushSubscriptions(ctx: AppContext) {
  await getDocs(collection(ctx.db, 'pushSubscriptions'));
}

// --- User2 cross-user access helpers ---

async function reportUpdateAsOtherUser(ctx: AppContext, reportId: string) {
  const reportRef = doc(ctx.db, 'reports', reportId);
  const snapshot = await getDoc(reportRef);
  if (!snapshot.exists()) throw new Error('Report missing');
  const data = snapshot.data();
  await setDoc(reportRef, { ...data, description: 'Hacked by other user' });
}

async function safetyWriteOtherUsersTrip(ctx: AppContext, otherUid: string, runId: string) {
  const tripRef = doc(ctx.db, 'users', otherUid, 'trips', `trip_other_${runId}`);
  await setDoc(tripRef, { status: 'active', createdAt: Timestamp.now() });
}

async function storageUploadAsOtherUserPath(ctx: AppContext, otherUid: string, reportId: string, runId: string) {
  const storageRef = ref(ctx.storage, `report_photos/${otherUid}/${reportId}/x_${runId}.png`);
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  await uploadBytes(storageRef, bytes, { contentType: 'image/png' });
}

async function storageUploadOver5MB(ctx: AppContext, uid: string, reportId: string, runId: string) {
  const storageRef = ref(ctx.storage, `report_photos/${uid}/${reportId}/big_${runId}.png`);
  const size = 5 * 1024 * 1024 + 1; // 5 MiB + 1 byte
  const bytes = new Uint8Array(size);
  bytes[0] = 137; bytes[1] = 80; bytes[2] = 78; bytes[3] = 71;
  await uploadBytes(storageRef, bytes, { contentType: 'image/png' });
}

async function sharedTripCreateWrongOwner(ctx: AppContext, uid: string, token: string, otherUid: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  await setDoc(sharedRef, {
    uid: otherUid, // wrong owner
    tripId: token,
    status: 'active',
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)),
    lastLocation: { lat: 6.5, lng: 3.4, accuracy: 12 },
    lastUpdate: Timestamp.now(),
    destination: 'Ikeja',
    createdAt: Timestamp.now()
  });
}

async function sharedTripCreateBadLatLng(ctx: AppContext, uid: string, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  await setDoc(sharedRef, {
    uid,
    tripId: token,
    status: 'active',
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)),
    lastLocation: { lat: 999, lng: 3.4, accuracy: 12 }, // invalid lat
    lastUpdate: Timestamp.now(),
    destination: 'Ikeja',
    createdAt: Timestamp.now()
  } as never);
}

async function user2CanVoteOnUser1Report(ctx: AppContext, uid: string, reportId: string) {
  const voteId = `${uid}_${reportId}`;
  const voteRef = doc(ctx.db, 'votes', voteId);
  await setDoc(voteRef, {
    uid,
    reportId,
    value: 1,
    createdAt: Timestamp.now()
  });
}

async function run() {
  const guest = initEmulatorApp('guest');
  const user = initEmulatorApp('user');
  const user2 = initEmulatorApp('user2');

  let guestUid = '';
  let userUid = '';
  let user2Uid = '';
  try {
    guestUid = await signInAnonymous(guest);
    const email = `smoke_${runId}@example.com`;
    userUid = await signUpEmailPassword(user, email, 'SmokePass123!');
    const email2 = `smoke2_${runId}@example.com`;
    user2Uid = await signUpEmailPassword(user2, email2, 'SmokePass123!');

    await runStep('Guest: create report denied', () => createReport(guest, guestUid), true);
    await runStep(
      'Guest: upload photo denied',
      () => uploadReportPhoto(guest, guestUid, ids.reportId).then(() => undefined),
      true
    );
    await runStep(
      'Guest: create comment denied',
      () => createComment(guest, guestUid, ids.reportId),
      true
    );
    await runStep(
      'Guest: create vote denied',
      () => createVote(guest, guestUid, ids.reportId, 1),
      true
    );
    await runStep(
      'Guest: create flag denied',
      () => createFlag(guest, guestUid, ids.reportId),
      true
    );
    await runStep(
      'Guest: safety trip write denied',
      () => safetyStartTrip(guest, guestUid),
      true
    );
    await runStep(
      'Guest: safety trip update denied',
      () => safetyUpdateTripLocation(guest, guestUid, ids.tripId),
      true
    );
    await runStep(
      'Guest: safety SOS denied',
      () => safetyTriggerSOS(guest, guestUid),
      true
    );
    await runStep(
      'Guest: check-in denied',
      () => safetyQuickCheckIn(guest, guestUid),
      true
    );
    await runStep(
      'Guest: trusted contact denied',
      () => safetyAddTrustedContact(guest, guestUid),
      true
    );
    await runStep(
      'Guest: push subscription denied',
      () => pushSubCreate(guest, guestUid),
      true
    );
    await runStep(
      'Guest: push subscription update denied',
      () => pushSubUpdateLocation(guest, guestUid),
      true
    );
    await runStep(
      'Guest: read other user doc denied',
      () => userDocGet(guest, userUid),
      true
    );
    await runStep(
      'User: read guest user doc denied',
      () => userDocGet(user, guestUid),
      true
    );

    await runStep('User: create report', () => createReport(user, userUid));

    let photoUrl = '';
    await runStep('User: upload photo', async () => {
      photoUrl = await uploadReportPhoto(user, userUid, ids.reportId);
    });

    await runStep(
      'User: upload non-image denied',
      () => uploadNonImage(user, userUid, ids.reportId),
      true
    );

    await runStep('User: update report photoUrls', () =>
      updateReportPhotoUrls(user, ids.reportId, [photoUrl])
    );
    await runStep(
      'User: report update forbidden field denied',
      () => reportUpdateForbiddenField(user, ids.reportId),
      true
    );
    await runStep(
      'User: report update >5 photos denied',
      () => reportUpdateTooManyPhotos(user, ids.reportId),
      true
    );
    await runStep('User: create comment', () => createComment(user, userUid, ids.reportId));
    await runStep('User: create vote', () => createVote(user, userUid, ids.reportId, 1));
    await runStep(
      'User: second vote denied',
      () => createVote(user, userUid, ids.reportId, -1),
      true
    );
    await runStep(
      'User: vote bad id denied',
      () => createVoteWithBadId(user, userUid, ids.reportId),
      true
    );
    await runStep(
      'User: vote bad value denied',
      () => createVoteWithBadValue(user, userUid, ids.reportId),
      true
    );
    await runStep('User: create flag', () => createFlag(user, userUid, ids.reportId));

    await runStep('User: start trip', () => safetyStartTrip(user, userUid));
    await runStep('User: update trip location', () =>
      safetyUpdateTripLocation(user, userUid, ids.tripId)
    );
    await runStep('User: create shared trip', () => sharedTripCreate(user, userUid, ids.tripId));
    await runStep('User: update shared trip', () => sharedTripUpdate(user, userUid, ids.tripId));
    await runStep('User: update shared trip with endsAt/overdueAt', () =>
      sharedTripUpdateWhileOverdue(user, ids.tripId)
    );
    await runStep('User: shared trip with non-timestamp endsAt denied', () =>
      sharedTripUpdateBadEndsAt(user, ids.tripId), true
    );
    await runStep('User: shared trip set completed', () =>
      sharedTripUpdateToCompleted(user, ids.tripId)
    );
    await runStep(
      'Guest: public get completed shared trip denied',
      () => sharedTripPublicGet(guest, ids.tripId),
      true
    );
    const expiredToken = `shared_expired_${runId}`;
    await runStep('User: create expired shared trip', () =>
      sharedTripCreateExpired(user, userUid, expiredToken)
    );
    await runStep(
      'Guest: public get expired shared trip denied',
      () => sharedTripPublicGet(guest, expiredToken),
      true
    );
    await runStep('User: trigger SOS', () => safetyTriggerSOS(user, userUid));
    await runStep('User: quick check-in', () => safetyQuickCheckIn(user, userUid));
    await runStep('User: add trusted contact', () => safetyAddTrustedContact(user, userUid));

    await runStep('User: create push subscription', () => pushSubCreate(user, userUid));
    await runStep(
      'User: get other user push subscription denied',
      () => pushSubGetOther(user, guestUid),
      true
    );
    await runStep('User: get push subscription', () => pushSubGet(user, userUid));
    await runStep('User: update push location', () => pushSubUpdateLocation(user, userUid));

    await runStep('Read: guest can read report', () => readReport(guest));
    await runStep('Read: guest can read comment', () => readComment(guest));
    await runStep('Read: list pushSubscriptions denied', () => listPushSubscriptions(user), true);

    // --- User2 cross-user access tests ---
    await runStep(
      'User2: cannot update user1 report denied',
      () => reportUpdateAsOtherUser(user2, ids.reportId),
      true
    );
    await runStep(
      'User2: cannot write to user1 trips denied',
      () => safetyWriteOtherUsersTrip(user2, userUid, runId),
      true
    );
    await runStep(
      'User2: can vote on user1 report',
      () => user2CanVoteOnUser1Report(user2, user2Uid, ids.reportId)
    );
    await runStep(
      'User2: can read public reports',
      () => readReport(user2)
    );
    await runStep(
      'User2: can read public comments',
      () => readComment(user2)
    );

    // --- Storage negative cases ---
    await runStep(
      'User: upload >5MB denied',
      () => storageUploadOver5MB(user, userUid, ids.reportId, runId),
      true
    );
    await runStep(
      'User2: upload to user1 photo path denied',
      () => storageUploadAsOtherUserPath(user2, userUid, ids.reportId, runId),
      true
    );

    // --- SharedTrips schema validation ---
    const badOwnerToken = `shared_wrong_owner_${runId}`;
    await runStep(
      'User: sharedTrip create wrong owner denied',
      () => sharedTripCreateWrongOwner(user, userUid, badOwnerToken, user2Uid),
      true
    );
    const badLatLngToken = `shared_bad_latlng_${runId}`;
    await runStep(
      'User: sharedTrip create bad lat/lng denied',
      () => sharedTripCreateBadLatLng(user, userUid, badLatLngToken),
      true
    );
  } finally {
    await signOut(guest.auth).catch(() => undefined);
    await signOut(user.auth).catch(() => undefined);
    await signOut(user2.auth).catch(() => undefined);
    await deleteApp(guest.app).catch(() => undefined);
    await deleteApp(user.app).catch(() => undefined);
    await deleteApp(user2.app).catch(() => undefined);
  }
}

run()
  .catch((error) => {
    recordResult('Unhandled error', 'FAIL', error);
  })
  .finally(() => {
    writeArtifacts();
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    console.log(`SUMMARY: ${passed}/${results.length} passed`);
    if (failed > 0) {
      console.error(`SUMMARY: ${failed} failed`);
    }
    process.exit(failed > 0 ? 1 : 0);
  });
