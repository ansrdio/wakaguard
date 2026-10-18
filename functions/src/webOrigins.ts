/**
 * Lets pages on our own website call an HTTPS function from the browser.
 *
 * A browser asks first (an OPTIONS request) before posting JSON to another
 * address, and reads the answer only if the function names the page's site.
 * Only our own sites are named; the phone apps post natively and need none
 * of this.
 */

import type * as functions from 'firebase-functions/v1';

const SITES = [
  'https://wakaguard.com',
  'https://www.wakaguard.com',
  'https://routepulse-5701f.web.app',
  'https://routepulse-5701f.firebaseapp.com',
];

/** Local test pages, accepted only while the function runs in the emulator */
const LOCAL_SITES = ['http://localhost:3000', 'http://127.0.0.1:3000'];

export function allowedOrigin(origin: unknown, inEmulator = process.env.FUNCTIONS_EMULATOR === 'true'): string | null {
  if (typeof origin !== 'string') return null;
  if (SITES.includes(origin)) return origin;
  return inEmulator && LOCAL_SITES.includes(origin) ? origin : null;
}

/**
 * Names our site on the answer, and answers the browser's question itself.
 * Returns true when the request was that question and nothing more is needed.
 */
export function answerBrowser(req: functions.https.Request, res: functions.Response): boolean {
  const origin = allowedOrigin(req.headers?.origin);
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  if (req.method !== 'OPTIONS') return false;
  if (origin) {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
  }
  res.status(204).send('');
  return true;
}
