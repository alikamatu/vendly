/**
 * Phone number utilities for checkout and address forms.
 * Enforces Ghana's standard 10-digit mobile number format (e.g. 0244123456).
 */

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

  // Strictly max 10 digits
  return digits.slice(0, 10);
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

/**
 * Quick boolean check whether a phone input is exactly 10 digits.
 */
export function isValid10DigitPhone(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10;
}
