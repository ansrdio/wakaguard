import { useSyncExternalStore } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db } from './firebase';
import { functions } from './firebaseFunctions';
import { noteAccountDeleted } from './frontPage';
import { settleWithin } from './timeLimit';

/**
 * Deleting your own account from the app.
 *
 * It takes two steps. First the password is asked for again, so that a phone
 * left unlocked is not enough (the server refuses a sign-in older than a few
 * minutes). Then the server deletes everything it holds, and this device
 * forgets what it had kept: the sign-in, its settings and its offline copy of
 * the person's data. The page is then reloaded and says, once, that the
 * account is gone.
 *
 * What the server deletes and what it keeps is in
 * functions/src/accountDeletion.ts.
 */

export type DeletionProblem = 'wrong-password' | 'too-many-attempts' | 'offline' | 'trip-running' | 'failed';

export type DeletionStage =
  | { stage: 'idle' }
  | { stage: 'deleting' }
  | { stage: 'failed'; problem: DeletionProblem };

// Everything this app keeps in the browser's storage starts with this
const LOCAL_KEY_PREFIX = 'wakaguard_';
// Clearing the offline copy must not hold up the reload
const CLEAR_WAIT_MS = 4000;

// The deletion is shown full screen by the app's home (AppHome), which
// replaces the screen the request was started from, so its progress is kept
// here and not in that screen.
const IDLE: DeletionStage = { stage: 'idle' };
let current: DeletionStage = IDLE;
const listeners = new Set<() => void>();

function show(next: DeletionStage) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAccountDeletion(): DeletionStage {
  return useSyncExternalStore(subscribe, () => current, () => IDLE);
}

/** Back to the app after a deletion that did not go through. */
export function dismissDeletionProblem(): void {
  show(IDLE);
}

function codeOf(error: unknown): string {
  return typeof (error as { code?: unknown })?.code === 'string' ? (error as { code: string }).code : '';
}

function isOffline(code: string): boolean {
  return (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    code === 'auth/network-request-failed' ||
    code === 'functions/unavailable' ||
    code === 'functions/deadline-exceeded'
  );
}

/** Step one: checks the password. Resolves with what went wrong, or null. */
export async function confirmPassword(password: string): Promise<DeletionProblem | null> {
  const user = auth.currentUser;
  if (!user?.email) return 'failed';

  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return null;
  } catch (error) {
    const code = codeOf(error);
    console.error(`Could not confirm the password before deleting the account: ${code || error}`);
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'wrong-password';
    if (code === 'auth/too-many-requests') return 'too-many-attempts';
    return isOffline(code) ? 'offline' : 'failed';
  }
}

function clearStorage(storage: Storage) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(LOCAL_KEY_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

async function forgetThisDevice(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(`Could not sign out after deleting the account: ${error}`);
  }
  try {
    clearStorage(localStorage);
    clearStorage(sessionStorage);
  } catch {
    // Storage can be refused; there is then nothing in it to clear
  }
  // The offline copy of the person's contacts and trips. It can only be
  // cleared once the database has been shut down, which is why the page is
  // reloaded straight afterwards.
  await settleWithin(terminate(db).then(() => clearIndexedDbPersistence(db)), CLEAR_WAIT_MS, null);
}

/**
 * Step two: deletes the account. Call once confirmPassword has passed.
 * On success the page reloads; on failure the stage says what went wrong.
 */
export async function deleteAccount(): Promise<void> {
  show({ stage: 'deleting' });

  try {
    await httpsCallable(functions, 'deleteMyAccount')();
  } catch (error) {
    const code = codeOf(error);
    const reason = (error as { details?: { reason?: unknown } })?.details?.reason;
    console.error(`The account was not deleted: ${code || error}${reason ? ` (${reason})` : ''}`);
    show({
      stage: 'failed',
      problem: reason === 'trip-running' ? 'trip-running' : isOffline(code) ? 'offline' : 'failed',
    });
    return;
  }

  await forgetThisDevice();
  noteAccountDeleted();
  window.location.replace('/');
}
