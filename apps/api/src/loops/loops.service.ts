import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LoopsContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  userGroup?: 'Buyer' | 'Seller' | 'Lead' | 'Contact' | string;
  source?: string;
  subscribed?: boolean;
  userId?: string;
  phone?: string;
  [key: string]: any;
}

export interface LoopsEventData {
  email: string;
  eventName: string;
  eventProperties?: Record<string, any>;
}

@Injectable()
export class LoopsService {
  private readonly logger = new Logger(LoopsService.name);
  private readonly baseUrl = 'https://app.loops.so/api/v1';
  private readonly apiKey: string | null = null;
  private readonly timeoutMs = 5000;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LOOPS_API_KEY') || null;
    if (!this.apiKey) {
      this.logger.log(
        'LOOPS_API_KEY is not configured. Loops service will operate in safe mock mode.',
      );
    }
  }

  /** Returns true if a live Loops API key is present. */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Upsert a contact in Loops.
   * Attempts POST /contacts/create first; if the contact already exists (409),
   * automatically falls back to PUT /contacts/update.
   */
  async createOrUpdateContact(data: LoopsContactData): Promise<{ success: boolean; error?: string }> {
    const email = data.email?.trim().toLowerCase();
    if (!email) {
      return { success: false, error: 'Email is required' };
    }

    if (!this.isConfigured()) {
      this.logger.debug(
        `[Mock Loops] createOrUpdateContact for ${email} (${data.userGroup || 'Unknown'}, subscribed=${data.subscribed ?? true})`,
      );
      return { success: true };
    }

    const payload: Record<string, any> = {
      email,
      subscribed: data.subscribed ?? true,
    };

    if (data.firstName) payload.firstName = data.firstName;
    if (data.lastName) payload.lastName = data.lastName;
    if (data.userGroup) payload.userGroup = data.userGroup;
    if (data.source) payload.source = data.source;
    if (data.userId) payload.userId = data.userId;
    if (data.phone) payload.phone = data.phone;

    try {
      // 1. Try create
      const createRes = await this.request('/contacts/create', 'POST', payload);

      if (createRes.ok) {
        this.logger.log(`Successfully created Loops contact for ${email}`);
        return { success: true };
      }

      // If contact already exists (409), update them
      if (createRes.status === 409) {
        this.logger.debug(`Contact ${email} already exists in Loops. Updating properties...`);
        const updateRes = await this.request('/contacts/update', 'PUT', payload);
        if (updateRes.ok) {
          this.logger.log(`Successfully updated Loops contact for ${email}`);
          return { success: true };
        }
        const updateError = await updateRes.text().catch(() => 'Unknown update error');
        this.logger.warn(`Failed to update existing Loops contact for ${email}: ${updateError}`);
        return { success: false, error: updateError };
      }

      const errorText = await createRes.text().catch(() => 'Unknown error');
      this.logger.warn(`Loops contact creation returned status ${createRes.status}: ${errorText}`);
      return { success: false, error: errorText };
    } catch (err: any) {
      this.logger.error(`Exception while syncing contact ${email} to Loops: ${err?.message || err}`);
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  /**
   * Update an existing contact properties in Loops (e.g. unsubscribing).
   */
  async updateContact(
    email: string,
    properties: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    const normalisedEmail = email?.trim().toLowerCase();
    if (!normalisedEmail) return { success: false, error: 'Email is required' };

    if (!this.isConfigured()) {
      this.logger.debug(`[Mock Loops] updateContact for ${normalisedEmail}: ${JSON.stringify(properties)}`);
      return { success: true };
    }

    try {
      const res = await this.request('/contacts/update', 'PUT', {
        email: normalisedEmail,
        ...properties,
      });

      if (res.ok) {
        return { success: true };
      }

      const errText = await res.text().catch(() => 'Unknown error');
      this.logger.warn(`Loops updateContact returned status ${res.status}: ${errText}`);
      return { success: false, error: errText };
    } catch (err: any) {
      this.logger.error(`Exception while updating Loops contact ${normalisedEmail}: ${err?.message || err}`);
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  /**
   * Trigger a custom event in Loops (e.g. "signup_completed", "newsletter_subscribed").
   * Events can trigger automated sequences (Loops) configured in the Loops dashboard.
   */
  async sendEvent(
    email: string,
    eventName: string,
    eventProperties: Record<string, any> = {},
  ): Promise<{ success: boolean; error?: string }> {
    const normalisedEmail = email?.trim().toLowerCase();
    if (!normalisedEmail || !eventName) {
      return { success: false, error: 'Email and eventName are required' };
    }

    if (!this.isConfigured()) {
      this.logger.debug(
        `[Mock Loops] sendEvent "${eventName}" for ${normalisedEmail}: ${JSON.stringify(eventProperties)}`,
      );
      return { success: true };
    }

    try {
      const res = await this.request('/events/send', 'POST', {
        email: normalisedEmail,
        eventName,
        eventProperties,
      });

      if (res.ok) {
        this.logger.log(`Loops event "${eventName}" dispatched for ${normalisedEmail}`);
        return { success: true };
      }

      const errText = await res.text().catch(() => 'Unknown error');
      this.logger.warn(`Loops sendEvent returned status ${res.status}: ${errText}`);
      return { success: false, error: errText };
    } catch (err: any) {
      this.logger.error(`Exception while sending Loops event "${eventName}" for ${normalisedEmail}: ${err?.message || err}`);
      return { success: false, error: err?.message || 'Network error' };
    }
  }

  /**
   * Helper method to perform authenticated HTTP requests to the Loops API with a timeout.
   */
  private async request(endpoint: string, method: string, body?: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
