/**
 * Minimal RFC 6238 TOTP implementation — no external dependencies.
 *
 * - HMAC-SHA1, 30-second step, 6 digits (the de-facto standard supported by
 *   Google Authenticator, Authy, 1Password, etc.).
 * - Secrets are 20 bytes (160 bits) encoded as Base32 with no padding, which
 *   is what authenticator apps expect.
 * - `verify` checks the current code plus ±1 step (±30s) of clock drift.
 */
import { createHmac, randomBytes, randomInt } from 'crypto';

const STEP_SECONDS = 30;
const DIGITS = 6;
const DRIFT_WINDOW = 1; // ±1 step

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error('Invalid base32 character');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

function counterAt(timeSec: number): Buffer {
  const counter = Math.floor(timeSec / STEP_SECONDS);
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  return buf;
}

function hotp(secret: Buffer, counter: Buffer): string {
  const hmac = createHmac('sha1', secret).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function generateCode(secretBase32: string, when = Date.now()): string {
  const secret = base32Decode(secretBase32);
  return hotp(secret, counterAt(Math.floor(when / 1000)));
}

/**
 * Verifies a 6-digit code against the secret, allowing ±1 step of drift.
 * Strips whitespace and rejects non-numeric input.
 */
export function verifyCode(
  secretBase32: string,
  rawCode: string,
  when = Date.now(),
): boolean {
  const code = (rawCode || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(secretBase32);
  const baseStep = Math.floor(when / 1000);
  for (let drift = -DRIFT_WINDOW; drift <= DRIFT_WINDOW; drift++) {
    const counter = counterAt(baseStep + drift * STEP_SECONDS);
    if (hotp(secret, counter) === code) return true;
  }
  return false;
}

/**
 * Builds the `otpauth://` URI consumed by authenticator apps. The label and
 * issuer are URL-encoded per the spec.
 */
export function buildOtpAuthUrl(args: {
  secret: string;
  issuer: string;
  accountName: string;
}): string {
  const label = `${args.issuer}:${args.accountName}`;
  const params = new URLSearchParams({
    secret: args.secret,
    issuer: args.issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

/**
 * Generates 10 single-use backup codes in `XXXX-XXXX` format. Suitable for
 * hashing with bcrypt before storage.
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const left = String(randomInt(0, 10000)).padStart(4, '0');
    const right = String(randomInt(0, 10000)).padStart(4, '0');
    codes.push(`${left}-${right}`);
  }
  return codes;
}

export const TOTP_DIGITS = DIGITS;
export const TOTP_STEP_SECONDS = STEP_SECONDS;
