/**
 * @fileoverview Phone numbers of trusted contacts
 *
 * The server texts a contact only when a Nigerian mobile number is saved for
 * them and they have not asked for texts to stop (getTrustedContacts in
 * functions/src/safetyDelivery.ts). Any other contact is never told anything,
 * so the app must not show them as someone who will be.
 *
 * Texts go to Nigerian mobile numbers only (the owner, 8 November 2026). A
 * contact saved earlier with a number abroad keeps it in phoneE164Abroad.
 *
 * @module contactPhone
 */

/** A Nigerian mobile number in full: +234 then ten digits starting 7, 8 or 9. The same test the server applies. */
const NIGERIAN_FULL = /^\+234[789]\d{9}$/;
/** A Nigerian mobile number after the country code: ten digits starting 7, 8 or 9 */
const NIGERIAN_MOBILE = /^[789]\d{9}$/;

// Described in words, never shown as a real-looking number: on 15 October 2026 an example number that looked
// real was copied and a real person got a test text (build 27 safety fixes)
const NOT_COMPLETE =
  'Enter the full Nigerian mobile number: 11 digits starting with 0, as it is saved in your phone.';

/** Shown when someone types a number from another country */
export const NIGERIAN_ONLY =
  'WakaGuard can only text Nigerian mobile numbers. Enter a Nigerian mobile number: 11 digits starting with 0.';

/** Whether the server will text this contact */
export function canBeTexted(contact: { phoneE164?: string | null; smsOptedOut?: boolean }): boolean {
  return typeof contact.phoneE164 === 'string' && NIGERIAN_FULL.test(contact.phoneE164) && !askedForNoTexts(contact);
}

/**
 * Whether this contact asked WakaGuard to stop texting their number (from the
 * trip page in a text). Only they can turn texts back on.
 */
export function askedForNoTexts(contact: { smsOptedOut?: boolean }): boolean {
  return contact.smsOptedOut === true;
}

/** Whether this contact has a number outside Nigeria, which WakaGuard does not text */
export function hasNumberAbroad(contact: { phoneE164?: string | null; phoneE164Abroad?: string | null }): boolean {
  if (typeof contact.phoneE164Abroad === 'string' && contact.phoneE164Abroad) return true;
  return typeof contact.phoneE164 === 'string' && /^\+[1-9]\d{6,14}$/.test(contact.phoneE164) && !contact.phoneE164.startsWith('+234');
}

export type ContactPhoneResult = { ok: true; phoneE164: string } | { ok: false; error: string };

/**
 * Turn what someone typed into the number to text.
 *
 * A number typed without a country code is taken to be Nigerian, and is only
 * accepted if it is a complete Nigerian mobile number. A number with another
 * country's code is refused: WakaGuard texts Nigerian numbers only, and
 * guessing would save a number that reaches a stranger, or nobody, while the
 * person would still be shown as someone who will be told.
 */
export function readContactPhone(typed: string): ContactPhoneResult {
  const trimmed = typed.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Enter a phone number' };

  if (trimmed.startsWith('+') && !digits.startsWith('234')) {
    return { ok: false, error: NIGERIAN_ONLY };
  }

  // People often keep the leading 0 after the country code: +234 0803...
  const local = digits.startsWith('234') ? digits.slice(3) : digits;
  const rest = local.replace(/^0/, '');
  return NIGERIAN_MOBILE.test(rest)
    ? { ok: true, phoneE164: `+234${rest}` }
    : { ok: false, error: NOT_COMPLETE };
}
