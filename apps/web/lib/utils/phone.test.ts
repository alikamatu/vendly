import { sanitizePhoneNumber, validatePhoneNumber, isValid10DigitPhone } from './phone';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test sanitizePhoneNumber
assert(sanitizePhoneNumber('+233244123456') === '0244123456', '+233 prefix to 0');
assert(sanitizePhoneNumber('+233 24 412 3456') === '0244123456', '+233 with spaces');
assert(sanitizePhoneNumber('233244123456') === '0244123456', '233 prefix to 0');
assert(sanitizePhoneNumber('0244123456') === '0244123456', 'standard 10-digit number');
assert(sanitizePhoneNumber('024-412-3456') === '0244123456', 'number with hyphens');
assert(sanitizePhoneNumber('024412345699999') === '0244123456', 'more than 10 digits capped at 10');
assert(sanitizePhoneNumber('abc0244123456xyz') === '0244123456', 'strips letters');

// Test validatePhoneNumber
assert(validatePhoneNumber('0244123456') === null, 'valid 10-digit phone returns null');
assert(validatePhoneNumber('') !== null, 'empty phone returns error');
assert(validatePhoneNumber('024412345') !== null, '9 digits returns error');
assert(validatePhoneNumber('02441234567') !== null, '11 digits returns error');

// Test isValid10DigitPhone
assert(isValid10DigitPhone('0244123456') === true, 'valid 10-digit phone is true');
assert(isValid10DigitPhone('024412345') === false, '9-digit phone is false');
assert(isValid10DigitPhone('02441234567') === false, '11-digit phone is false');

console.log('ALL PHONE TESTS PASSED SUCCESSFULLY!');
