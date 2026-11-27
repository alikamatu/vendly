/**
 * Arkesel SMS client. Replaces the previous Twilio adapter — Arkesel is
 * Ghana-native, cheaper per SMS than Twilio for local numbers, and has
 * better deliverability across MTN, Vodafone (Telecel), AirtelTigo.
 *
 *   POST https://sms.arkesel.com/api/v2/sms/send
 *   Headers: api-key: <ARKESEL_API_KEY>
 *   Body (JSON): { sender, message, recipients }
 *
 * Env:
 *   ARKESEL_API_KEY     required
 *   ARKESEL_SENDER_ID   up to 11 chars, must be registered with Arkesel
 *                       (defaults to "Verndly")
 *   ARKESEL_SANDBOX     "true" to call the sandbox endpoint (no real SMS)
 *
 * If creds are missing we log + no-op so dev / local work without an
 * Arkesel account — the caller decides whether to surface the failure.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsSendResult {
  sent: boolean;
  /** Provider message id / reference on success. */
  id?: string;
  /** Error message when not sent. */
  error?: string;
}

export interface SmsBulkSendResult {
  sent: boolean;
  recipients: string[];
  ids: Record<string, string>;
  error?: string;
}

export interface SmsConfigStatus {
  configured: boolean;
  sandbox: boolean;
  senderId: string;
  provider: 'arkesel';
}

const PROD_URL = 'https://sms.arkesel.com/api/v2/sms/send';
const SANDBOX_URL = 'https://sms.arkesel.com/api/v2/sms/send?sandbox=true';

/**
 * Normalizes a Ghanaian phone number into strict 12-digit `233XXXXXXXXX`
 * format (country code `233` + 9-digit subscriber number, no leading `+`
 * or `0`).
 *
 * Accepted inputs:
 * - `0244123456` (10 digits starting with 0) -> `233244123456`
 * - `244123456`  (9 digits)                  -> `233244123456`
 * - `+233244123456` / `233244123456`         -> `233244123456`
 * - `+2330244123456` / `2330244123456`       -> `233244123456`
 * - `00233244123456` / `002330244123456`     -> `233244123456`
 *
 * Returns `null` if the input cannot be formatted into a valid 12-digit
 * Ghana mobile/subscriber number (`233` + 9 digits).
 */
export function normalizeGhanaSmsNumber(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;

  // Strip international exit code 00 before 233 (e.g. 00233244123456)
  if (digits.startsWith('00233')) {
    digits = digits.slice(2);
  }

  // Fix common typo `2330XXXXXXXXX` (13 digits with redundant 0 after 233)
  if (digits.length === 13 && digits.startsWith('2330')) {
    digits = `233${digits.slice(4)}`;
  }

  // Standard 10-digit Ghana local number: remove leading 0 and prepend 233
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = `233${digits.slice(1)}`;
  }

  // 9-digit Ghana subscriber number without leading 0: prepend 233
  if (digits.length === 9 && !digits.startsWith('0')) {
    digits = `233${digits}`;
  }

  // Final strict validation: 233 + 9 non-zero-leading digits (12 digits total)
  if (/^233[1-9]\d{8}$/.test(digits)) {
    return digits;
  }

  return null;
}

/**
 * Provider-agnostic name so we can swap Arkesel for something else later
 * without touching every callsite. Currently wraps Arkesel's v2 REST API.
 */
@Injectable()
export class SmsClient {
  private readonly logger = new Logger('ArkeselClient');

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('ARKESEL_API_KEY'));
  }

  getConfigStatus(): SmsConfigStatus {
    return {
      configured: this.isConfigured(),
      sandbox: this.config.get<string>('ARKESEL_SANDBOX') === 'true',
      senderId: this.sender,
      provider: 'arkesel',
    };
  }

  private get sender(): string {
    // Arkesel caps sender id at 11 alphanumeric chars.
    const raw = this.config.get<string>('ARKESEL_SENDER_ID') || 'Verndly';
    return raw.slice(0, 11);
  }

  private resolveSender(override?: string | null): string {
    const cleaned = (override || '').replace(/[^a-zA-Z0-9]/g, '').trim();
    if (cleaned.length >= 3) {
      return cleaned.slice(0, 11);
    }
    return this.sender;
  }

  async sendSms(
    to: string,
    body: string,
    senderOverride?: string,
  ): Promise<SmsSendResult> {
    const apiKey = this.config.get<string>('ARKESEL_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `[arkesel] ARKESEL_API_KEY missing; not sending SMS to ${redact(to)}`,
      );
      return { sent: false, error: 'ARKESEL_NOT_CONFIGURED' };
    }

    const url =
      this.config.get<string>('ARKESEL_SANDBOX') === 'true'
        ? SANDBOX_URL
        : PROD_URL;

    const recipient = normalizeRecipient(to);
    const payload = {
      sender: this.resolveSender(senderOverride),
      message: body,
      recipients: [recipient],
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json: any = await res.json().catch(() => ({}));

      // Arkesel returns `{ status: "success", data: [...] }` on accept and
      // a non-2xx with `{ status: "error", message: "…" }` on reject.
      if (!res.ok || json?.status === 'error') {
        const msg = json?.message || `Arkesel responded ${res.status}`;
        this.logger.error(
          `[arkesel] send failed (${res.status}) to ${redact(recipient)}: ${msg}`,
        );
        return { sent: false, error: msg };
      }

      const id =
        Array.isArray(json?.data) && json.data[0]?.id
          ? String(json.data[0].id)
          : undefined;
      return { sent: true, id };
    } catch (err: any) {
      this.logger.error(
        `[arkesel] request error to ${redact(recipient)}: ${err?.message || err}`,
      );
      return { sent: false, error: err?.message || 'Network error' };
    }
  }

  async sendBulkSms(
    recipients: string[],
    body: string,
    senderOverride?: string,
  ): Promise<SmsBulkSendResult> {
    const normalized = Array.from(
      new Set(recipients.map(normalizeRecipient).filter(Boolean)),
    );
    if (normalized.length === 0) {
      return {
        sent: false,
        recipients: [],
        ids: {},
        error: 'No valid recipients',
      };
    }

    const apiKey = this.config.get<string>('ARKESEL_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `[arkesel] ARKESEL_API_KEY missing; not sending bulk SMS to ${normalized.length} recipient(s)`,
      );
      return {
        sent: false,
        recipients: normalized,
        ids: {},
        error: 'ARKESEL_NOT_CONFIGURED',
      };
    }

    const url =
      this.config.get<string>('ARKESEL_SANDBOX') === 'true'
        ? SANDBOX_URL
        : PROD_URL;

    const payload = {
      sender: this.resolveSender(senderOverride),
      message: body,
      recipients: normalized,
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || json?.status === 'error') {
        const msg = json?.message || `Arkesel responded ${res.status}`;
        this.logger.error(
          `[arkesel] bulk send failed (${res.status}) for ${normalized.length} recipients: ${msg}`,
        );
        return { sent: false, recipients: normalized, ids: {}, error: msg };
      }

      const ids: Record<string, string> = {};
      if (Array.isArray(json?.data)) {
        for (const item of json.data) {
          const rec = item?.recipient
            ? normalizeRecipient(String(item.recipient))
            : null;
          if (rec && item?.id) {
            ids[rec] = String(item.id);
          }
        }
      }

      return { sent: true, recipients: normalized, ids };
    } catch (err: any) {
      this.logger.error(`[arkesel] bulk request error: ${err?.message || err}`);
      return {
        sent: false,
        recipients: normalized,
        ids: {},
        error: err?.message || 'Network error',
      };
    }
  }
}

/**
 * Prefer strict Ghana `233XXXXXXXXX` normalization when applicable; fall back
 * to digit-stripped international format for non-Ghana numbers.
 */
function normalizeRecipient(raw: string): string {
  const ghana = normalizeGhanaSmsNumber(raw);
  if (ghana) return ghana;
  const cleaned = (raw || '').trim().replace(/[\s\-()]/g, '');
  return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
}

function redact(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  return `***${phone.slice(-4)}`;
}
