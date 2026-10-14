/**
 * @fileoverview Saving fault reports (what goes in them is lib/errorReports.ts)
 *
 * @module sendErrorReport
 */

import { Capacitor } from '@capacitor/core';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { APP_BUILD, APP_VERSION } from './appVersion';
import { buildErrorReport, ERROR_REPORT_DAYS, ErrorPlatform, MAX_PER_SESSION } from './errorReports';

let sent = 0;
const seen = new Set<string>();

function platform(): ErrorPlatform {
  const name = Capacitor.getPlatform();
  return name === 'android' || name === 'ios' ? name : 'web';
}

/**
 * Saves a report of a fault. Never throws and never waits on anything the
 * person is doing: a report that cannot be saved is dropped.
 */
export function sendErrorReport(fault: unknown, where: string): void {
  try {
    if (sent >= MAX_PER_SESSION || typeof window === 'undefined') return;
    // The database only takes reports from a signed-in app, guests included
    if (!auth.currentUser) return;
    const report = buildErrorReport(fault, where, APP_BUILD, APP_VERSION, platform(), navigator.userAgent);
    if (!report) return;
    const key = `${report.where}|${report.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent += 1;
    void addDoc(collection(db, 'errorReports'), {
      ...report,
      createdAt: serverTimestamp(),
      deleteAfter: Timestamp.fromMillis(Date.now() + ERROR_REPORT_DAYS * 24 * 60 * 60 * 1000),
    }).catch(() => {});
  } catch {
    // Reporting a fault must never cause one
  }
}

let installed = false;

/** Reports faults that nothing else caught. Once per opening of the app. */
export function installErrorReporting(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (event) => {
    sendErrorReport(event.error ?? event.message, window.location.pathname);
  });
  window.addEventListener('unhandledrejection', (event) => {
    sendErrorReport(event.reason, `${window.location.pathname} (promise)`);
  });
}
