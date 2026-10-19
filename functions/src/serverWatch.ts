/**
 * The hourly text check: warns when Termii's wallet is running low, or when
 * far more texts went out in the last hour than a normal day sends (a bug or
 * misuse spending the wallet). Limits in retentionPlan.ts.
 *
 * A warning is an error line in the log beginning "ALARM:". Google Cloud
 * Monitoring emails every error from the server functions to the owner
 * (docs/OPERATIONS.md), and separately warns if the minute-by-minute check of
 * trips stops running, which no check inside these functions could notice.
 *
 * @module serverWatch
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getProviders } from './sms';
import { termiiBalance } from './termii';
import { textAlarms } from './retentionPlan';

const HOUR_MS = 60 * 60 * 1000;

/** Texts that really went out in the hour before `nowMs`: one per contact, held-back ones not counted */
async function textsInLastHour(nowMs: number): Promise<number> {
  const logs = await admin.firestore().collection('safetyMessageLogs')
    .where('createdAt', '>=', Timestamp.fromMillis(nowMs - HOUR_MS))
    .select('recipients', 'provider')
    .get();
  return logs.docs
    .filter((doc) => doc.get('provider') !== 'blocked')
    .reduce((total, doc) => {
      const recipients = doc.get('recipients');
      return total + (Array.isArray(recipients) ? recipients.length : 0);
    }, 0);
}

export async function runTextWatch(
  nowMs: number,
  readBalance: () => Promise<number | null> = termiiBalance
): Promise<{ texts: number; balance: number | null; alarms: string[] }> {
  const texts = await textsInLastHour(nowMs);
  let balance: number | null = null;
  if (getProviders().some((provider) => provider.name === 'termii')) {
    balance = await readBalance().catch((error) => {
      console.warn(`Text watch: could not read the Termii wallet: ${String(error)}`);
      return null;
    });
  }
  const alarms = textAlarms(balance, texts);
  alarms.forEach((alarm) => console.error(`ALARM: ${alarm}`));
  console.log(`Text watch: ${texts} text(s) in the last hour; Termii wallet ${balance === null ? 'not read' : `NGN ${balance.toFixed(2)}`}`);
  return { texts, balance, alarms };
}

export const watchTexts = functions.pubsub
  .schedule('every 60 minutes')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    await runTextWatch(Date.now());
    return null;
  });
