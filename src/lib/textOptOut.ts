/**
 * @fileoverview A contact asking for no more WakaGuard texts, from the trip page
 *
 * Posts the trip link's code and the number the contact typed to the
 * server's stopTexts function (functions/src/textOptOut.ts), which checks the
 * number is one of that trip's contacts.
 *
 * @module textOptOut
 */

import { EMULATOR_HOST, usingEmulators } from './firebase';
import { stopTextsEndpoint } from './tripLocation';

export type OptOutAction = 'stop' | 'resume';
export type OptOutAnswer = 'stopped' | 'resumed' | 'not_matched' | 'too_many' | 'failed';

/** What the server's answer means for the person on the page */
export function readOptOutAnswer(status: number, body: unknown): OptOutAnswer {
  const done = (body as { done?: unknown } | null)?.done;
  if (status === 200 && (done === 'stopped' || done === 'resumed')) return done;
  if (status === 403) return 'not_matched';
  if (status === 429) return 'too_many';
  return 'failed';
}

/** Never rejects */
export async function sendOptOut(token: string, phoneE164: string, action: OptOutAction): Promise<OptOutAnswer> {
  const url = usingEmulators()
    ? `http://${EMULATOR_HOST}:5001/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/us-central1/stopTexts`
    : stopTextsEndpoint();
  if (!url) return 'failed';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, phoneE164, action }),
    });
    const body = await response.json().catch(() => null);
    return readOptOutAnswer(response.status, body);
  } catch (err) {
    console.warn('Could not reach WakaGuard to change texts:', err);
    return 'failed';
  }
}
