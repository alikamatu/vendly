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

const PROD_URL = 'https://sms.arkesel.com/api/v2/sms/send';
const SANDBOX_URL = 'https://sms.arkesel.com/api/v2/sms/send?sandbox=true';

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

  private get sender(): string {
    // Arkesel caps sender id at 11 alphanumeric chars.
    const raw = this.config.get<string>('ARKESEL_SENDER_ID') || 'Verndly';
    return raw.slice(0, 11);
  }

  async sendSms(to: string, body: string): Promise<SmsSendResult> {
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

    const payload = {
      sender: this.sender,
      message: body,
      recipients: [normalizeRecipient(to)],
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
          `[arkesel] send failed (${res.status}) to ${redact(to)}: ${msg}`,
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
        `[arkesel] request error to ${redact(to)}: ${err?.message || err}`,
      );
      return { sent: false, error: err?.message || 'Network error' };
    }
  }
}

/**
 * Arkesel accepts numbers without the leading `+`. Normalise: strip any
 * whitespace / dashes / parens, drop a leading `+`, and ensure we keep
 * digits only. If callers pass a local `0…` number we leave it alone —
 * Arkesel handles GH local format. Pure E.164 input still works because
 * we just drop the `+`.
 */
function normalizeRecipient(raw: string): string {
  const cleaned = (raw || '').trim().replace(/[\s\-()]/g, '');
  return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
}

function redact(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  return `***${phone.slice(-4)}`;
}
