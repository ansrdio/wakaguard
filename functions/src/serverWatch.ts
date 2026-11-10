/**
 * The hourly text check: warns when the wallet of a text provider in use
 * (Africa's Talking, Termii) is running low, or when
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
import { africasTalkingBalance } from './africasTalking';
import { textAlarms, WalletReading } from './retentionPlan';

type ReadBalance = () => Promise<number | null>;

/** The providers whose wallet can be read, by provider name */
const WALLETS: Record<string, { label: string; read: ReadBalance }> = {
  africastalking: { label: "Africa's Talking", read: africasTalkingBalance },
  termii: { label: 'Termii', read: termiiBalance },
};

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

/**
 * Reads the wallet of each provider in use, main sender first, then warns as
 * textAlarms says. `readers` stands in for a provider's wallet in tests.
 */
export async function runTextWatch(
  nowMs: number,
  readers: Partial<Record<string, ReadBalance>> = {}
): Promise<{ texts: number; wallets: WalletReading[]; alarms: string[] }> {
  const texts = await textsInLastHour(nowMs);
  const wallets: WalletReading[] = [];
  for (const provider of getProviders()) {
    const wallet = WALLETS[provider.name];
    if (!wallet) continue;
    const read = readers[provider.name] ?? wallet.read;
    const balanceNgn = await read().catch((error) => {
      console.warn(`Text watch: could not read the ${wallet.label} wallet: ${String(error)}`);
      return null;
    });
    wallets.push({ name: wallet.label, balanceNgn });
  }
  const alarms = textAlarms(wallets, texts);
  alarms.forEach((alarm) => console.error(`ALARM: ${alarm}`));
  const walletText = wallets.length === 0
    ? 'no wallet to read'
    : wallets.map((w) => `${w.name} wallet ${w.balanceNgn === null ? 'not read' : `NGN ${w.balanceNgn.toFixed(2)}`}`).join('; ');
  console.log(`Text watch: ${texts} text(s) in the last hour; ${walletText}`);
  return { texts, wallets, alarms };
}

export const watchTexts = functions.pubsub
  .schedule('every 60 minutes')
  .timeZone('Africa/Lagos')
  .onRun(async () => {
    await runTextWatch(Date.now());
    return null;
  });
