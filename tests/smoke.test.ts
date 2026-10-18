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
  Timestamp,
  runTransaction,
  updateDoc,
  deleteDoc,
  deleteField,
  serverTimestamp
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

const DAY_MS = 24 * 60 * 60 * 1000;

function errorReportData(overrides: Record<string, unknown> = {}) {
  return {
    message: 'TypeError: a made-up fault for the rules test',
    stack: 'at test (made-up.js:1:1)',
    where: '/ (screen crashed)',
    build: 23,
    version: '1.2.0',
    platform: 'android',
    device: 'Android 14 · Test phone',
    createdAt: serverTimestamp(),
    deleteAfter: Timestamp.fromMillis(Date.now() + 30 * DAY_MS),
    ...overrides
  };
}

async function createErrorReport(ctx: AppContext, id: string, overrides: Record<string, unknown> = {}) {
  await setDoc(doc(ctx.db, 'errorReports', id), errorReportData(overrides));
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

/** A report marked as posted from far away (src/lib/reportDistance.ts) */
async function createFarReport(ctx: AppContext, uid: string, id: string) {
  await setDoc(doc(ctx.db, 'reports', id), { ...buildReportData(uid), postedFarAway: true });
}

async function removeFarMark(ctx: AppContext, id: string) {
  await updateDoc(doc(ctx.db, 'reports', id), { postedFarAway: deleteField() });
}

async function editFarReport(ctx: AppContext, id: string) {
  await updateDoc(doc(ctx.db, 'reports', id), { description: 'Edited, still marked' });
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

// The server adds the path travelled and the traveller's name (functions/src/tripMonitor.ts).
// Written here as the Admin SDK would, bypassing rules.
/** Changes a comment's status the way the server does when several people have reported it */
async function adminSetCommentStatus(commentId: string, status: string) {
  const url = `http://127.0.0.1:8080/v1/projects/${getProjectId()}/databases/(default)/documents/comments/${commentId}`
    + '?updateMask.fieldPaths=status';
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { status: { stringValue: status } } })
  });
  if (!response.ok) throw new Error(`Could not set the comment's status: ${response.status}`);
}

/** Puts how the traveller is travelling on the shared trip, as the server does when contacts are alerted */
async function adminAddTravelMode(token: string) {
  const url = `http://127.0.0.1:8080/v1/projects/${getProjectId()}/databases/(default)/documents/sharedTrips/${token}`
    + '?updateMask.fieldPaths=travelMode';
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { travelMode: { stringValue: 'okada' } } })
  });
  if (!response.ok) throw new Error(`Could not add the way of travelling: ${response.status}`);
}

/** Puts the vehicle on the shared trip, as the server does when contacts are alerted */
async function adminAddVehicle(token: string) {
  const url = `http://127.0.0.1:8080/v1/projects/${getProjectId()}/databases/(default)/documents/sharedTrips/${token}`
    + '?updateMask.fieldPaths=vehicle';
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { vehicle: { mapValue: { fields: { plate: { stringValue: 'TEST 01' }, details: { stringValue: 'Blue bus' } } } } } })
  });
  if (!response.ok) throw new Error(`Could not add the vehicle: ${response.status}`);
}

async function sharedTripChangeVehicle(ctx: AppContext, token: string) {
  await updateDoc(doc(ctx.db, 'sharedTrips', token), { vehicle: { plate: 'OTHER 02', details: '' } });
}

async function adminAddPathAndName(token: string) {
  const url = `http://127.0.0.1:8080/v1/projects/${getProjectId()}/databases/(default)/documents/sharedTrips/${token}`
    + '?updateMask.fieldPaths=path&updateMask.fieldPaths=name';
  const point = (lat: number, lng: number, at: number) => ({
    mapValue: { fields: { lat: { doubleValue: lat }, lng: { doubleValue: lng }, at: { integerValue: String(at) } } }
  });
  const body = {
    fields: {
      name: { stringValue: 'Ada' },
      path: { arrayValue: { values: [point(6.5, 3.4, Date.now() - 120000), point(6.51, 3.41, Date.now() - 60000)] } }
    }
  };
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Admin write failed: ${response.status} ${await response.text()}`);
  }
}

// Once the server has added them, the app's own updates must still pass rules
async function sharedTripUpdateAfterServerFields(ctx: AppContext, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  const data = (await getDoc(sharedRef)).data();
  if (!data?.path || data.name !== 'Ada') {
    throw new Error('Server fields missing from the shared trip');
  }
  await updateDoc(sharedRef, { lastLocation: { lat: 6.53, lng: 3.43, accuracy: 8 }, lastUpdate: Timestamp.now() });
  await updateDoc(sharedRef, { endsAt: Timestamp.fromDate(new Date(Date.now() + 90 * 60 * 1000)) });
}

async function sharedTripChangePath(ctx: AppContext, token: string) {
  await updateDoc(doc(ctx.db, 'sharedTrips', token), { path: [{ lat: 9.0, lng: 7.4, at: Date.now() }] });
}

async function sharedTripRemovePath(ctx: AppContext, token: string) {
  await updateDoc(doc(ctx.db, 'sharedTrips', token), { path: deleteField() });
}

async function sharedTripChangeName(ctx: AppContext, token: string) {
  await updateDoc(doc(ctx.db, 'sharedTrips', token), { name: 'Somebody Else' });
}

async function sharedTripCreateWithServerFields(ctx: AppContext, uid: string, token: string) {
  await setDoc(doc(ctx.db, 'sharedTrips', token), {
    uid,
    tripId: token,
    status: 'active',
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)),
    lastUpdate: Timestamp.now(),
    createdAt: Timestamp.now(),
    name: 'Ada',
    path: [{ lat: 6.5, lng: 3.4, at: Date.now() }]
  });
}

// A test trip says so on its public page, so a contact who opens the link is not alarmed
/** A shared trip with the destination set on the map (src/lib/destinationPoint.ts) */
async function sharedTripWithPinCreate(ctx: AppContext, uid: string, token: string, destinationPoint: unknown) {
  await setDoc(doc(ctx.db, 'sharedTrips', token), {
    uid,
    tripId: token,
    status: 'active',
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)),
    lastLocation: null,
    lastUpdate: Timestamp.now(),
    destination: 'Ikeja',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)),
    destinationPoint
  });
}

async function sharedTestTripCreate(ctx: AppContext, uid: string, token: string, isTest: unknown) {
  await setDoc(doc(ctx.db, 'sharedTrips', token), {
    uid,
    tripId: token,
    status: 'active',
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)),
    lastLocation: null,
    lastUpdate: Timestamp.now(),
    destination: 'Ikeja',
    createdAt: Timestamp.now(),
    endsAt: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 1000)),
    isTest
  });
}

async function sharedTestTripStaysWritable(ctx: AppContext, token: string) {
  const sharedRef = doc(ctx.db, 'sharedTrips', token);
  await updateDoc(sharedRef, { lastLocation: { lat: 6.5, lng: 3.4, accuracy: 10 }, lastUpdate: Timestamp.now() });
  const data = (await getDoc(sharedRef)).data();
  if (data?.isTest !== true) throw new Error('isTest was lost');
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

/** The app says which build it is, so the server knows whether it can draw reminders with buttons */
async function pushSubSaveBuild(ctx: AppContext, uid: string, appBuild: unknown) {
  await setDoc(doc(ctx.db, 'pushSubscriptions', uid), { fcmToken: `token_${uid}`, platform: 'android', appBuild, appBuildToken: `token_${uid}`, updatedAt: Timestamp.now() }, { merge: true });
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

async function userDocCreate(ctx: AppContext, uid: string) {
  await setDoc(doc(ctx.db, 'users', uid), { createdAt: Timestamp.now(), blockedUids: [] });
}

async function userDocCreateWithExtraField(ctx: AppContext, uid: string) {
  await setDoc(doc(ctx.db, 'users', uid), { createdAt: Timestamp.now(), role: 'admin' });
}

// Same two writes the app makes in UsernameSetup
async function userClaimUsername(ctx: AppContext, uid: string, username: string) {
  await runTransaction(ctx.db, async (transaction) => {
    transaction.set(doc(ctx.db, 'usernames', username.toLowerCase()), {
      uid,
      usernameLower: username.toLowerCase(),
      createdAt: Timestamp.now()
    });
    transaction.update(doc(ctx.db, 'users', uid), {
      username,
      usernameUpdatedAt: Timestamp.now()
    });
  });
}

async function userDocUpdate(ctx: AppContext, uid: string, data: Record<string, unknown>) {
  await updateDoc(doc(ctx.db, 'users', uid), data);
}

async function userDocDelete(ctx: AppContext, uid: string) {
  await deleteDoc(doc(ctx.db, 'users', uid));
}

// Writes as the Admin SDK would, bypassing rules ("Bearer owner" is the emulator's admin token)
async function adminSetUserFields(uid: string, fields: Record<string, string>) {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const url = `http://127.0.0.1:8080/v1/projects/${getProjectId()}/databases/(default)/documents/users/${uid}?${mask}`;
  const body = {
    fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: v }]))
  };
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Admin write failed: ${response.status} ${await response.text()}`);
  }
}

async function userDocHasFields(ctx: AppContext, uid: string, expected: Record<string, unknown>) {
  const data = (await getDoc(doc(ctx.db, 'users', uid))).data() || {};
  for (const [key, value] of Object.entries(expected)) {
    if (JSON.stringify(data[key]) !== JSON.stringify(value)) {
      throw new Error(`users/${uid}.${key} is ${JSON.stringify(data[key])}, expected ${JSON.stringify(value)}`);
    }
  }
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

    // ---- App-wide switches: everyone reads config/app, nobody writes it ----
    await runStep('Guest: read app config', async () => {
      await getDoc(doc(guest.db, 'config', 'app'));
    });
    await runStep('User: read app config', async () => {
      await getDoc(doc(user.db, 'config', 'app'));
    });
    await runStep('User: write app config denied', () =>
      setDoc(doc(user.db, 'config', 'app'), { minBuild: 1 }), true
    );
    await runStep('Guest: list config denied', async () => {
      await getDocs(collection(guest.db, 'config'));
    }, true);
    await runStep('User: read other config doc denied', async () => {
      await getDoc(doc(user.db, 'config', 'secrets'));
    }, true);

    // ---- Stopped numbers: server only (functions/src/textOptOut.ts) ----
    await runStep('User: read stopped numbers denied', async () => {
      await getDoc(doc(user.db, 'smsOptOuts', '+2340000000001'));
    }, true);
    await runStep('User: add a stopped number denied', () =>
      setDoc(doc(user.db, 'smsOptOuts', '+2340000000001'), { stopped: true }), true
    );
    await runStep('Guest: read stop tries denied', async () => {
      await getDoc(doc(guest.db, 'textOptOutTries', 'any_trip'));
    }, true);

    // ---- User document: only app-written fields, usernames must be reserved ----
    const name1 = `Smoke_${runId.slice(-12)}`;
    const name2 = `Other_${runId.slice(-12)}`;
    await runStep('User: create user doc with unknown field denied', () =>
      userDocCreateWithExtraField(user, userUid), true
    );
    await runStep('User: create user doc', () => userDocCreate(user, userUid));
    await runStep('User2: create user doc', () => userDocCreate(user2, user2Uid));
    await runStep('User: claim username in a transaction', () => userClaimUsername(user, userUid, name1));
    await runStep('User2: claim own username', () => userClaimUsername(user2, user2Uid, name2));
    await runStep('User: set username without reserving it denied', () =>
      userDocUpdate(user, userUid, { username: `Unreserved_${runId.slice(-6)}` }), true
    );
    await runStep('User: set username reserved by another user denied', () =>
      userDocUpdate(user, userUid, { username: name2 }), true
    );
    await runStep('User: set malformed username denied', () =>
      userDocUpdate(user, userUid, { username: 'x http://evil.example' }), true
    );
    await runStep('User: update checklist, block list and stats', () =>
      userDocUpdate(user, userUid, {
        safetyChecklist: ['phone', 'water'],
        blockedUids: [user2Uid],
        points: 15,
        level: 1,
        lastLoginDate: '2026-10-06'
      })
    );
    await runStep('User: set alert name', () => userDocUpdate(user, userUid, { alertName: 'Ada' }));
    await runStep('User: switch the morning weather off', () => userDocUpdate(user, userUid, { morningWeather: false }));
    await runStep('User: set the morning weather to a word denied', () =>
      userDocUpdate(user, userUid, { morningWeather: 'no' }), true
    );
    await runStep('User: read the kept weather areas denied', async () => {
      await getDoc(doc(user.db, 'weatherAreas', userUid));
    }, true);
    await runStep('User: set over-long alert name denied', () =>
      userDocUpdate(user, userUid, { alertName: 'x'.repeat(31) }), true
    );
    await runStep('User: set non-text alert name denied', () =>
      userDocUpdate(user, userUid, { alertName: 42 }), true
    );
    await runStep('User: set server-owned field denied', () =>
      userDocUpdate(user, userUid, { smsBlocked: false }), true
    );
    await runStep('User: set negative points denied', () =>
      userDocUpdate(user, userUid, { points: -5 }), true
    );
    await runStep('Admin: add server-owned and legacy fields', () =>
      adminSetUserFields(userUid, { smsBlocked: 'true', legacyState: 'Lagos' })
    );
    await runStep('User: update doc that carries server-owned fields', () =>
      userDocUpdate(user, userUid, { safetyChecklist: ['phone'] })
    );
    await runStep('User: change server-owned field denied', () =>
      userDocUpdate(user, userUid, { smsBlocked: 'false' }), true
    );
    await runStep('User: remove server-owned field denied', () =>
      userDocUpdate(user, userUid, { smsBlocked: deleteField() }), true
    );
    await runStep('User: delete own user doc denied', () => userDocDelete(user, userUid), true);
    await runStep('User2: write to user1 doc denied', () =>
      userDocUpdate(user2, userUid, { safetyChecklist: [] }), true
    );
    await runStep('User: user doc is intact', () =>
      userDocHasFields(user, userUid, {
        username: name1,
        smsBlocked: 'true',
        legacyState: 'Lagos',
        safetyChecklist: ['phone'],
        points: 15
      })
    );

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
    const farId = `far_${runId}`;
    await runStep('User: create report marked as posted from far away', () => createFarReport(user, userUid, farId));
    await runStep('User: edit a far-away report and keep the mark', () => editFarReport(user, farId));
    await runStep('User: remove the far-away mark denied', () => removeFarMark(user, farId), true);

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
    await runStep('Server: add path and name to shared trip', () => adminAddPathAndName(ids.tripId));
    await runStep('User: update shared trip after the server added a path and a name', () =>
      sharedTripUpdateAfterServerFields(user, ids.tripId)
    );
    await runStep('Server: add how they are travelling to shared trip', () => adminAddTravelMode(ids.tripId));
    await runStep('User: update shared trip after the server added how they are travelling', () =>
      sharedTripUpdateAfterServerFields(user, ids.tripId)
    );
    await runStep('Server: add the vehicle to shared trip', () => adminAddVehicle(ids.tripId));
    await runStep('User: update shared trip after the server added the vehicle', () =>
      sharedTripUpdateAfterServerFields(user, ids.tripId)
    );
    await runStep('User: changing the vehicle on the shared trip denied', () =>
      sharedTripChangeVehicle(user, ids.tripId), true
    );
    await runStep('User: changing the shared trip path denied', () =>
      sharedTripChangePath(user, ids.tripId), true
    );
    await runStep('User: removing the shared trip path denied', () =>
      sharedTripRemovePath(user, ids.tripId), true
    );
    await runStep('User: changing the shared trip name denied', () =>
      sharedTripChangeName(user, ids.tripId), true
    );
    await runStep('User: creating a shared trip with a path and a name denied', () =>
      sharedTripCreateWithServerFields(user, userUid, `shared_serverfields_${runId}`), true
    );

    await runStep('User: create a shared test trip', () =>
      sharedTestTripCreate(user, userUid, `shared_test_${runId}`, true)
    );
    await runStep('User: update a shared test trip (location)', () =>
      sharedTestTripStaysWritable(user, `shared_test_${runId}`)
    );
    await runStep('User: shared trip with a test flag that is not true or false (should be denied)', () =>
      sharedTestTripCreate(user, userUid, `shared_test_bad_${runId}`, 'yes'), true
    );
    await runStep('User: create shared trip with a destination pin', () =>
      sharedTripWithPinCreate(user, userUid, `shared_pin_${runId}`, { lat: 6.6, lng: 3.35 })
    );
    await runStep('User: create shared trip with a malformed destination pin denied', () =>
      sharedTripWithPinCreate(user, userUid, `shared_pin_bad_${runId}`, { lat: 6.6, lng: 3.35, name: 'x' }), true
    );
    await runStep('User: create shared trip with an impossible destination pin denied', () =>
      sharedTripWithPinCreate(user, userUid, `shared_pin_far_${runId}`, { lat: 120, lng: 3.35 }), true
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
    await runStep('User: save the app build with the push subscription', () => pushSubSaveBuild(user, userUid, 23));
    await runStep('User: an app build that is not a number denied', () => pushSubSaveBuild(user, userUid, '23'), true);

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

    // --- A comment hidden after reports, and deleting your own posts ---
    // These come last: they remove the report and the comment the steps above use.
    await runStep('Server: hide the comment', () => adminSetCommentStatus(ids.commentId, 'hidden'));
    await runStep(
      'User: putting their own hidden comment back denied',
      () => updateDoc(doc(user.db, 'comments', ids.commentId), { status: 'active' }),
      true
    );
    await runStep(
      'User: editing their own hidden comment denied',
      () => updateDoc(doc(user.db, 'comments', ids.commentId), { text: 'Edited while hidden' }),
      true
    );
    await runStep(
      'User2: deleting user1 comment denied',
      () => deleteDoc(doc(user2.db, 'comments', ids.commentId)),
      true
    );
    await runStep(
      'User2: deleting user1 report denied',
      () => deleteDoc(doc(user2.db, 'reports', ids.reportId)),
      true
    );
    await runStep('User: delete own comment', () => deleteDoc(doc(user.db, 'comments', ids.commentId)));
    await runStep('User: delete own report', () => deleteDoc(doc(user.db, 'reports', ids.reportId)));

    const faultId = `fault-${Date.now()}`;
    await runStep('Guest: save a fault report', () => createErrorReport(guest, `${faultId}-guest`));
    await runStep('User: save a fault report', () => createErrorReport(user, faultId));
    await runStep('User: reading a fault report denied', async () => { await getDoc(doc(user.db, 'errorReports', faultId)); }, true);
    await runStep('User: changing a fault report denied', () => updateDoc(doc(user.db, 'errorReports', faultId), { message: 'changed' }), true);
    await runStep('User: deleting a fault report denied', () => deleteDoc(doc(user.db, 'errorReports', faultId)), true);
    await runStep('User: a fault report naming the account denied', () =>
      createErrorReport(user, `${faultId}-uid`, { uid: userUid }), true
    );
    await runStep('User: a fault report with a long message denied', () =>
      createErrorReport(user, `${faultId}-long`, { message: 'x'.repeat(301) }), true
    );
    await runStep('User: a fault report kept for a year denied', () =>
      createErrorReport(user, `${faultId}-year`, { deleteAfter: Timestamp.fromMillis(Date.now() + 365 * DAY_MS) }), true
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
