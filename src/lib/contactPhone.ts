/**
 * @fileoverview Phone numbers of trusted contacts
 *
 * The server texts a contact only when a full international number is saved
 * for them (getTrustedContacts in functions/src/safetyDelivery.ts). A contact
 * without one is never told anything, so the app must not show them as
 * someone who will be.
 *
 * @module contactPhone
 */

/** A full international number: + then 7 to 15 digits. The same test the server applies. */
const FULL_NUMBER = /^\+[1-9]\d{6,14}$/;
/** A Nigerian mobile number after the country code: ten digits starting 7, 8 or 9 */
const NIGERIAN_MOBILE = /^[789]\d{9}$/;

const NOT_COMPLETE =
  'Enter the full mobile number, such as 0803 123 4567. For a number outside Nigeria, start with + and the country code.';

/** Whether the server will text this contact */
export function canBeTexted(contact: { phoneE164?: string | null }): boolean {
  return typeof contact.phoneE164 === 'string' && FULL_NUMBER.test(contact.phoneE164);
}

export type ContactPhoneResult = { ok: true; phoneE164: string } | { ok: false; error: string };

/**
 * Turn what someone typed into the number to text.
 *
 * A number typed without a country code is taken to be Nigerian, and is only
 * accepted if it is a complete Nigerian mobile number. Anything else needs
 * its country code: guessing would save a number that reaches a stranger, or
 * nobody, and the person would still be shown as someone who will be told.
 */
export function readContactPhone(typed: string): ContactPhoneResult {
  const trimmed = typed.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Enter a phone number' };

  if (trimmed.startsWith('+')) {
    if (digits.startsWith('234')) {
      // People often keep the leading 0 after the country code: +234 0803...
      const rest = digits.slice(3).replace(/^0/, '');
      return NIGERIAN_MOBILE.test(rest)
        ? { ok: true, phoneE164: `+234${rest}` }
        : { ok: false, error: NOT_COMPLETE };
    }
    const full = `+${digits}`;
    return FULL_NUMBER.test(full) ? { ok: true, phoneE164: full } : { ok: false, error: NOT_COMPLETE };
  }

  const local = digits.startsWith('234') ? digits.slice(3) : digits;
  const rest = local.replace(/^0/, '');
  return NIGERIAN_MOBILE.test(rest)
    ? { ok: true, phoneE164: `+234${rest}` }
    : { ok: false, error: NOT_COMPLETE };
}
