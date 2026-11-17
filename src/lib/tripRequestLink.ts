/**
 * @fileoverview "Let me know you got there" links, in the app (build 29)
 *
 * Someone who worries (a mum, a partner) makes a link and sends it themselves.
 * The link is the address the phone apps already claim (/open), with the
 * request's id: on a phone with WakaGuard it opens the app, anywhere else the
 * website. The id is kept on the phone until the person is signed in and
 * has seen the request; the name and number behind it are only fetched from
 * the server then (functions/src/tripRequests.ts). Nothing starts by itself:
 * the traveller chooses to add the asker and start a trip.
 *
 * @module tripRequestLink
 */

import { APP_URL } from './appUrl';

export const ASK_PARAM = 'ask';
const STORAGE_KEY = 'wakaguard_pending_ask';
/** Requests already seen and answered, so a phone reopening the app from the same link does not ask again */
const DONE_KEY = 'wakaguard_done_asks';
const DONE_KEPT = 20;
/** Links work for 7 days (REQUEST_DAYS on the server); a kept id is not kept longer */
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;
/** Sent on the window when a link arrives while the app is open */
export const ASK_EVENT = 'wakaguard:ask';
/** The ids the server makes: 16 letters and digits, without 0, O, 1, l or I */
const ID_PATTERN = /^[a-km-np-zA-HJ-NP-Z2-9]{16}$/;

export type CreateProblem = 'name' | 'phone' | 'too_many' | 'not_confirmed';
export type ReadProblem = 'not_found' | 'expired' | 'own';

/** The link to send */
export function askLink(id: string): string {
  return `${APP_URL}/open?${ASK_PARAM}=${id}`;
}

/** The "Open WakaGuard" button on the website page, for a phone where the link opened in the browser */
export function askAppHref(id: string): string {
  return `wakaguard://open?${ASK_PARAM}=${id}`;
}

/** Carrying on in the browser instead: the web app, with the request */
export function askBrowserHref(id: string): string {
  return `/?app=1&${ASK_PARAM}=${id}`;
}

/** The request id in an address (a full link, or only its ?query), or null */
export function askIdFrom(address: string): string | null {
  const query = address.includes('?') ? address.slice(address.indexOf('?') + 1) : address;
  const id = new URLSearchParams(query.split('#')[0]).get(ASK_PARAM);
  return id && ID_PATTERN.test(id) ? id : null;
}

/** What the asker sends, in their own words, with the link */
export function askMessage(link: string): string {
  return "Please let me know when you get there 🙏 Tap this link to start a WakaGuard trip with me as your contact. If you don't arrive on time, I get a text with where your phone was last.\n"
    + link;
}

/** Plain words for why a link could not be made */
export function createProblemWords(problem: CreateProblem): string {
  switch (problem) {
    case 'name': return 'Add your name, as they know you.';
    case 'phone': return 'Enter your Nigerian mobile number, like 0803 and 7 more digits.';
    case 'too_many': return "You've made 10 links today. Try again tomorrow.";
    case 'not_confirmed': return 'Confirm your email first: open the link we sent you, then try again.';
  }
}

/** Plain words for why a link could not be opened */
export function readProblemWords(problem: ReadProblem): string {
  switch (problem) {
    case 'not_found': return 'This link does not work. Ask them to send a new one.';
    case 'expired': return 'This link has expired: links work for 7 days. Ask them to send a new one.';
    case 'own': return 'This is your own link. Send it to the person you want to hear from.';
  }
}

// ---------------------------------------------------------------- kept on the phone

/** Keeps an id from a link until the person has seen the request */
export function rememberAsk(id: string, nowMs = Date.now()): void {
  try {
    if (doneAsks().includes(id)) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, at: nowMs }));
    window.dispatchEvent(new Event(ASK_EVENT));
  } catch {
    // No storage: the link only works while this page is open
  }
}

/** The id kept from a link, if any and not older than a link lasts */
export function pendingAsk(nowMs = Date.now()): string | null {
  try {
    const kept = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as { id?: unknown; at?: unknown } | null;
    if (!kept || typeof kept.id !== 'string' || !ID_PATTERN.test(kept.id)) return null;
    if (typeof kept.at !== 'number' || nowMs - kept.at > KEEP_MS) return null;
    return kept.id;
  } catch {
    return null;
  }
}

function doneAsks(): string[] {
  try {
    const done = JSON.parse(window.localStorage.getItem(DONE_KEY) || '[]');
    return Array.isArray(done) ? done.filter((d): d is string => typeof d === 'string') : [];
  } catch {
    return [];
  }
}

/** The request has been answered (added, or "Not now"): forget it, and do not ask again for the same link */
export function forgetAsk(id?: string): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    if (id) window.localStorage.setItem(DONE_KEY, JSON.stringify([id, ...doneAsks().filter((d) => d !== id)].slice(0, DONE_KEPT)));
  } catch {
    // Nothing kept
  }
}
