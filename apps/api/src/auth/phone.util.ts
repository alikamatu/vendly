/**
 * Ghana-first phone number normaliser. We accept the messy ways people
 * actually write phone numbers in the wild — "0244 123 456",
 * "+233 244 123 456", "233-244-123-456", "(024) 412-3456" — and produce
 * a single canonical E.164 string ("+233244123456").
 *
 * Why this exists:
 *   - SMS providers (Arkesel) only accept E.164 or local digits, no
 *     spaces, no parens. Without a single canonical form we end up with
 *     duplicate users and silently undeliverable SMS.
 *   - The frontend strips the leading "0" before submission, but server
 *     code MUST NOT trust that — admins, mobile clients, and OAuth
 *     callbacks can all send the legacy "0..." format. Normalise here.
 *
 * Uses libphonenumber-js which has full carrier metadata for GH numbers.
 */
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface PhoneParseResult {
  ok: boolean;
  /** Canonical E.164 form, e.g. "+233244123456". Only present when ok. */
  e164?: string;
  /** Reason the number was rejected, suitable for error messages. */
  error?: string;
}

/**
 * Parse a phone number with Ghana as the default region.
 *
 * Rules:
 *   1. Trim, strip spaces/dashes/parens before handing to libphonenumber.
 *   2. If the user wrote a leading "0", drop it (Ghana local format) so
 *      libphonenumber treats the rest as a Ghanaian subscriber number.
 *   3. Reject anything that isn't a valid mobile/fixed-line GH number,
 *      OR a valid number with an explicit "+" prefix from any country.
 *      (We support diaspora sellers eventually; the +233 enforcement is
 *      purely about the bare-digits case.)
 */
export function parseGhanaPhone(raw: string | null | undefined): PhoneParseResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Phone number is required.' };
  }

  // Strip whitespace, dashes, parens — keep digits and a possible "+".
  let cleaned = raw.replace(/[\s\-().]/g, '');
  if (!cleaned) {
    return { ok: false, error: 'Phone number is required.' };
  }

  // Local-format helper: a leading "0" on a bare-digits string means it
  // was written in Ghana local format. Drop it so libphonenumber pairs
  // the remainder with the GH country code. We DON'T drop the "0" if
  // the string already begins with "+" (e.g. "+233 0244…" is malformed
  // — let libphonenumber reject it cleanly).
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, '');
  }

  // If the string is now bare digits, prepend "+233" so libphonenumber
  // doesn't get confused by ambiguous formats. If it already has "+"
  // it's an explicit international number and we trust it.
  const candidate = cleaned.startsWith('+') ? cleaned : `+233${cleaned}`;

  const parsed = parsePhoneNumberFromString(candidate, 'GH');
  if (!parsed) {
    return {
      ok: false,
      error: "That number doesn't look right. Use a Ghana mobile number, e.g. 024 123 4567.",
    };
  }
  if (!parsed.isValid()) {
    return {
      ok: false,
      error: 'Please enter a valid phone number.',
    };
  }
  // Make sure mobile-ish — reject obvious typos like all-zero numbers.
  // libphonenumber's `isValid()` already does most of this work; this is
  // belt-and-braces for the few short numbers that pass formal checks.
  if (parsed.number.length < 8) {
    return { ok: false, error: 'Please enter a valid phone number.' };
  }

  return { ok: true, e164: parsed.number };
}
