/**
 * Phone number utilities for checkout and address forms.
 * Enforces Ghana's standard 10-digit mobile number format (e.g. 0244123456).
 */

/** Ghana local mobile numbers are 10 digits, e.g. 0244123456. */
export const PHONE_DIGIT_LIMIT = 10;

/**
 * Strips all non-digit characters, normalizes international +233 prefix
 * to local 0 prefix, and caps the length strictly at 10 digits.
 */
export function sanitizePhoneNumber(raw: string): string {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.trim();

  // Normalize international Ghana format (+233 or 233) to local 0 prefix
  if (cleaned.startsWith('+233')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('233')) {
    cleaned = '0' + cleaned.slice(3);
  }

  // Keep only digits
  const digits = cleaned.replace(/\D/g, '');

  return digits.slice(0, PHONE_DIGIT_LIMIT);
}

/**
 * Digits for a field that already shows a +233 prefix.
 * A pasted local number (0244…) drops the leading 0. Never more than 9 digits,
 * so the full local number stays within 10.
 */
export function sanitizeSubscriberNumber(raw: string): string {
  const local = sanitizePhoneNumber(raw);
  const national = local.startsWith('0') ? local.slice(1) : local;
  return national.slice(0, PHONE_DIGIT_LIMIT - 1);
}

const PHONE_EDIT_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

/** Blocks letters and any digit past `maxDigits`. Paste is cleaned by the sanitizers. */
export function guardPhoneKeyDown(
  event: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    preventDefault: () => void;
    currentTarget: { value: string; selectionStart: number | null; selectionEnd: number | null };
  },
  maxDigits: number = PHONE_DIGIT_LIMIT,
) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (PHONE_EDIT_KEYS.has(event.key)) return;
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
    return;
  }
  const selected =
    (event.currentTarget.selectionEnd ?? 0) - (event.currentTarget.selectionStart ?? 0);
  const digits = event.currentTarget.value.replace(/\D/g, '').length;
  if (digits - Math.max(0, selected) >= maxDigits) {
    event.preventDefault();
  }
}

/**
 * Validates that a phone number contains strictly 10 digits.
 * Returns an error string if invalid, or null if valid.
 */
export function validatePhoneNumber(raw: string): string | null {
  if (!raw || typeof raw !== 'string') {
    return 'Phone number is required';
  }

  const digits = raw.replace(/\D/g, '');

  if (!digits) {
    return 'Phone number is required';
  }

  if (digits.length !== 10) {
    return `Phone number must be exactly 10 digits (${digits.length}/10)`;
  }

  return null;
}
