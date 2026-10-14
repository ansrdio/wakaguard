/**
 * @fileoverview Telling us when the app hits a fault on someone's phone
 *
 * A tester should not have to notice a crash and describe it for us to hear
 * of it (owner's yes, 14 October 2026). When a screen crashes, or code fails
 * with nothing to catch it, a short report is saved in `errorReports`: what
 * failed and where, the build, and the kind of phone. Never who it was, where
 * they were, or what they typed: email addresses, and numbers that could be a
 * phone number or a position, are blanked out of the text first. The database
 * deletes each report after ERROR_REPORT_DAYS days. Nobody can read them from
 * the app; scripts/error-reports.mjs lists them for us.
 *
 * The pure parts have no Firebase or DOM access (functions/test/errorReports.test.ts).
 *
 * @module errorReports
 */

export const ERROR_REPORT_DAYS = 30;
/** At most this many reports from one opening of the app: a fault in a loop must not flood the database */
export const MAX_PER_SESSION = 5;
export const MAX_MESSAGE = 300;
export const MAX_STACK = 2000;
export const MAX_WHERE = 60;
export const MAX_DEVICE = 60;

export type ErrorPlatform = 'android' | 'ios' | 'web';

export interface ErrorReport {
  message: string;
  stack: string;
  where: string;
  build: number;
  version: string;
  platform: ErrorPlatform;
  device: string;
}

/** Blanks out what could identify a person or a place */
export function scrub(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>')
    // A web address keeps where it goes, not what it carried
    .replace(/(https?:\/\/[^\s?#)'"]+)[?#][^\s)'"]*/g, '$1?<…>')
    // Positions such as 6.52437, -0.1234 or 6.52 (two decimals is still about a kilometre)
    .replace(/-?\d{1,3}\.\d{2,}/g, '<number>')
    // Phone numbers, with or without spaces and dashes
    .replace(/\+?\d[\d\s-]{6,}\d/g, '<number>')
    // Tokens and ids, a trip's share code among them: long runs of letters mixed with digits.
    // Long names made of letters alone (a function in a stack) are kept
    .replace(/[A-Za-z0-9_-]{16,}/g, (run) => (/\d/.test(run) && /[A-Za-z]/.test(run) ? '<id>' : run));
}

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** "Android 14 · Infinix X6837", "iPhone · iOS 18.0", or the browser for the website */
export function deviceFromUserAgent(userAgent: string): string {
  // "(Linux; Android 11; Infinix X688B Build/RP1A.200720.011; wv)": the model follows the Android version
  const parts = (/\(([^)]*)\)/.exec(userAgent)?.[1] ?? '').split(';').map((part) => part.trim());
  const at = parts.findIndex((part) => /^Android [\d.]+$/.test(part));
  if (at >= 0) {
    const model = parts.slice(at + 1)
      .map((part) => part.replace(/\s*Build\/.*$/, '').trim())
      .find((part) => part && !/^(wv|K|U|[a-z]{2}(-[a-z]{2})?)$/i.test(part)) ?? 'phone';
    return cut(`${parts[at]} · ${model}`, MAX_DEVICE);
  }
  const ios = /(iPhone|iPad)[^)]*? OS ([\d_]+)/.exec(userAgent);
  if (ios) return `${ios[1]} · iOS ${ios[2].replace(/_/g, '.')}`;
  const browser = /(Edg|Firefox|Chrome|Safari)\/[\d.]+/.exec(userAgent)?.[1] ?? 'Browser';
  const system = /Windows|Mac OS X|Linux|CrOS/.exec(userAgent)?.[0] ?? '';
  return cut(`${browser === 'Edg' ? 'Edge' : browser}${system ? ` · ${system}` : ''}`, MAX_DEVICE);
}

/** What any thrown value says, as text */
export function describeFault(fault: unknown): { message: string; stack: string } {
  if (fault instanceof Error) return { message: `${fault.name}: ${fault.message}`, stack: fault.stack ?? '' };
  if (typeof fault === 'string') return { message: fault, stack: '' };
  try {
    return { message: JSON.stringify(fault) ?? String(fault), stack: '' };
  } catch {
    return { message: String(fault), stack: '' };
  }
}

/** Faults that say nothing we can act on */
export function isNoise(message: string): boolean {
  return /^Script error\.?$/i.test(message)
    || /ResizeObserver loop/i.test(message)
    || /^AbortError/.test(message);
}

/** The report for a fault, ready to save, or null when it is not worth one */
export function buildErrorReport(
  fault: unknown,
  where: string,
  build: number,
  version: string,
  platform: ErrorPlatform,
  userAgent: string,
): ErrorReport | null {
  const { message, stack } = describeFault(fault);
  if (!message.trim() || isNoise(message)) return null;
  return {
    message: cut(scrub(message), MAX_MESSAGE),
    stack: cut(scrub(stack), MAX_STACK),
    where: cut(scrub(where), MAX_WHERE),
    build,
    version: cut(version, 20),
    platform,
    device: deviceFromUserAgent(userAgent),
  };
}
