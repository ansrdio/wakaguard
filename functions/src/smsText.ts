/**
 * Text handling for SMS bodies.
 *
 * Names, destinations and custom messages are typed by users and end up in
 * messages sent from WakaGuard's sender ID to phone numbers the user chose.
 * Without cleaning, that is a way to send phishing links under our name, and
 * a single non-GSM character triples the cost of a message.
 */

// GSM 03.38 basic character set, plus the extension table
const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXTENDED = '^{}\\[~]|€';

const GSM7_SINGLE_LIMIT = 160;
const GSM7_MULTI_LIMIT = 153;
const UCS2_SINGLE_LIMIT = 70;
const UCS2_MULTI_LIMIT = 67;

export function isGsm7(text: string): boolean {
  for (const ch of text) {
    if (!GSM7_BASIC.includes(ch) && !GSM7_EXTENDED.includes(ch)) return false;
  }
  return true;
}

/** Number of SMS segments (billing units) a body will use. */
export function countSmsSegments(text: string): number {
  if (text.length === 0) return 0;

  if (isGsm7(text)) {
    let septets = 0;
    for (const ch of text) septets += GSM7_EXTENDED.includes(ch) ? 2 : 1;
    return septets <= GSM7_SINGLE_LIMIT ? 1 : Math.ceil(septets / GSM7_MULTI_LIMIT);
  }

  const units = text.length; // UTF-16 code units
  return units <= UCS2_SINGLE_LIMIT ? 1 : Math.ceil(units / UCS2_MULTI_LIMIT);
}

/** Replace characters outside GSM-7 with close plain equivalents. */
export function toGsm7(text: string): string {
  const replaced = text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ');

  let out = '';
  for (const ch of replaced) {
    if (GSM7_BASIC.includes(ch) || GSM7_EXTENDED.includes(ch)) {
      out += ch;
      continue;
    }
    // Strip accents and tone marks: "Adébáyọ̀" becomes "Adebayo"
    const base = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    for (const b of base) {
      if (GSM7_BASIC.includes(b)) out += b;
    }
  }
  return out;
}

const URL_LIKE = /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|ng|io|co|ly|me|app|info|xyz|link|site|online|top|biz|gl|to)\b\S*/gi;
const PHONE_LIKE = /\+?\d[\d\s().-]{6,}\d/g;

export interface SanitizeOptions {
  maxLength: number;
  /** Remove phone numbers as well as links. Use for names and place labels. */
  stripPhoneNumbers?: boolean;
}

/**
 * Make user-typed text safe to embed in an SMS: no links, no control
 * characters, GSM-7 only, single line, capped length.
 */
export function sanitizeForSms(input: unknown, options: SanitizeOptions): string {
  if (typeof input !== 'string') return '';

  let text = input.replace(/[\u0000-\u001f\u007f]/g, ' ');
  text = text.replace(URL_LIKE, ' ');
  if (options.stripPhoneNumbers) text = text.replace(PHONE_LIKE, ' ');
  text = toGsm7(text).replace(/\s+/g, ' ').trim();

  if (text.length > options.maxLength) {
    text = text.slice(0, options.maxLength).trim();
  }
  return text;
}

/** Flatten accented letters to plain ones: "José" becomes "Jose". */
function stripAccents(text: string): string {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function sanitizeLabel(input: unknown, maxLength: number, allowed: RegExp): string {
  if (typeof input !== 'string') return '';
  return sanitizeForSms(stripAccents(input), { maxLength, stripPhoneNumbers: true })
    .replace(allowed, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A person's name as it may appear in a message to their contacts.
 * Names do not need most punctuation; removing it limits message spoofing.
 */
export function sanitizeName(input: unknown): string {
  return sanitizeLabel(input, 30, /[^A-Za-z0-9 .'_-]/g);
}

/** A place label such as a trip destination. */
export function sanitizePlace(input: unknown): string {
  return sanitizeLabel(input, 40, /[^A-Za-z0-9 .,'()&/_-]/g);
}
