import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SmsClient, normalizeGhanaSmsNumber } from '../auth/arkesel.client';
import { Actor, AuditLogService } from '../audit/audit-log.service';

export type SmsRecipientSegment =
  | 'all'
  | 'sellers'
  | 'sellers_verified'
  | 'sellers_unverified'
  | 'sellers_incomplete_onboarding'
  | 'sellers_no_payout'
  | 'pro_sellers'
  | 'buyers';

export interface AdminSmsRecipientItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_verified: boolean;
  is_suspended: boolean;
  is_pro: boolean;
  raw_phone: string | null;
  formatted_phone: string | null;
  phone_source: 'account' | 'whatsapp' | 'address' | null;
  phone_valid: boolean;
  store_name: string | null;
  store_link: string | null;
  is_seller_verified: boolean;
  onboarding_completed: boolean;
  payment_setup_completed: boolean;
  created_at: Date;
}

export interface AdminSmsDeliveryRow {
  userId: string | null;
  name: string;
  rawPhone: string;
  formattedPhone: string | null;
  status: 'sent' | 'failed' | 'invalid';
  providerId?: string;
  error?: string;
  messagePreview?: string;
}

export interface SendAdminSmsInput {
  message: string;
  userIds?: string[];
  customNumbers?: string[];
  templateId?: string;
  senderId?: string;
}

const TEMPLATE_TOKEN_RE = /\{(first_name|name|store_name)\}/i;

export function interpolateSmsTemplate(
  template: string,
  recipient: { name?: string | null; storeName?: string | null },
): string {
  const fullName = (recipient.name || 'there').trim() || 'there';
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const storeName = (recipient.storeName || 'your Verndly store').trim();

  return template
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{name\}/gi, fullName)
    .replace(/\{store_name\}/gi, storeName)
    .trim();
}

@Injectable()
export class AdminSmsService {
  private readonly logger = new Logger(AdminSmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsClient,
    private readonly auditLogs: AuditLogService,
  ) {}

  async getStatus() {
    const gateway = this.sms.getConfigStatus();

    const [usersWithPhone, sellersWithPhone, recentLogs, totalCampaigns] =
      await Promise.all([
        this.prisma.user.count({
          where: {
            OR: [
              { phone_e164: { not: null } },
              { seller_profile: { whatsapp_number: { not: null } } },
            ],
          },
        }),
        this.prisma.user.count({
          where: {
            OR: [{ role: 'SELLER' }, { seller_profile: { isNot: null } }],
            AND: [
              {
                OR: [
                  { phone_e164: { not: null } },
                  { seller_profile: { whatsapp_number: { not: null } } },
                ],
              },
            ],
          },
        }),
        this.prisma.auditLog.findMany({
          where: { action: 'admin.sms_sent' },
          orderBy: { created_at: 'desc' },
          take: 100,
          select: { metadata: true },
        }),
        this.prisma.auditLog.count({
          where: { action: 'admin.sms_sent' },
        }),
      ]);

    let totalSent = 0;
    let totalFailed = 0;
    for (const log of recentLogs) {
      const meta = (log.metadata as Record<string, any>) || {};
      totalSent += Number(meta.sentCount || 0);
      totalFailed += Number(meta.failedCount || 0);
    }

    return {
      ...gateway,
      stats: {
        usersWithPhone,
        sellersWithPhone,
        totalCampaigns,
        totalSent,
        totalFailed,
      },
    };
  }

  async listRecipients(params: {
    search?: string;
    segment?: SmsRecipientSegment;
    onlyWithPhone?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(250, Math.max(1, params.limit || 100));
    const skip = (page - 1) * limit;
    const search = (params.search || '').trim();
    const segment = params.segment || 'all';
    const onlyWithPhone = params.onlyWithPhone !== false;

    const andConditions: Prisma.UserWhereInput[] = [];

    if (search) {
      const searchDigits = search.replace(/\D/g, '');
      const normalizedSearchPhone = normalizeGhanaSmsNumber(search);
      const orSearch: Prisma.UserWhereInput[] = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone_e164: { contains: search, mode: 'insensitive' } },
        {
          seller_profile: {
            store_name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          seller_profile: {
            whatsapp_number: { contains: search, mode: 'insensitive' },
          },
        },
      ];
      if (normalizedSearchPhone) {
        const localNine = normalizedSearchPhone.slice(3);
        orSearch.push(
          { phone_e164: { contains: localNine } },
          { seller_profile: { whatsapp_number: { contains: localNine } } },
        );
      } else if (searchDigits.length >= 4) {
        orSearch.push(
          { phone_e164: { contains: searchDigits } },
          { seller_profile: { whatsapp_number: { contains: searchDigits } } },
        );
      }
      andConditions.push({ OR: orSearch });
    }

    switch (segment) {
      case 'sellers':
        andConditions.push({
          OR: [{ role: 'SELLER' }, { seller_profile: { isNot: null } }],
        });
        break;
      case 'sellers_verified':
        andConditions.push({
          seller_profile: { is_seller_verified: true },
        });
        break;
      case 'sellers_unverified':
        andConditions.push({
          OR: [
            { role: 'SELLER', seller_profile: null },
            { seller_profile: { is_seller_verified: false } },
          ],
        });
        break;
      case 'sellers_incomplete_onboarding':
        andConditions.push({
          OR: [
            { role: 'SELLER', seller_profile: null },
            { seller_profile: { onboarding_completed: false } },
          ],
        });
        break;
      case 'sellers_no_payout':
        andConditions.push({
          seller_profile: { payment_setup_completed: false },
        });
        break;
      case 'pro_sellers':
        andConditions.push({ is_pro: true });
        break;
      case 'buyers':
        andConditions.push({
          role: 'USER',
          seller_profile: null,
        });
        break;
      case 'all':
      default:
        break;
    }

    if (onlyWithPhone) {
      andConditions.push({
        OR: [
          { phone_e164: { not: null } },
          { seller_profile: { whatsapp_number: { not: null } } },
          { addresses: { some: {} } },
        ],
      });
    }

    const where: Prisma.UserWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true,
          is_verified: true,
          is_suspended: true,
          is_pro: true,
          phone_e164: true,
          created_at: true,
          seller_profile: {
            select: {
              store_name: true,
              store_link: true,
              whatsapp_number: true,
              is_seller_verified: true,
              onboarding_completed: true,
              payment_setup_completed: true,
            },
          },
          addresses: {
            take: 1,
            orderBy: { is_default: 'desc' },
            select: { phone: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data: AdminSmsRecipientItem[] = users.map((u) => {
      const candidates: Array<{
        raw: string | null | undefined;
        source: 'account' | 'whatsapp' | 'address';
      }> = [
        { raw: u.phone_e164, source: 'account' },
        { raw: u.seller_profile?.whatsapp_number, source: 'whatsapp' },
        { raw: u.addresses?.[0]?.phone, source: 'address' },
      ];

      let rawPhone: string | null = null;
      let formattedPhone: string | null = null;
      let phoneSource: 'account' | 'whatsapp' | 'address' | null = null;

      for (const c of candidates) {
        if (!c.raw?.trim()) continue;
        if (!rawPhone) {
          rawPhone = c.raw.trim();
          phoneSource = c.source;
        }
        const normalized = normalizeGhanaSmsNumber(c.raw);
        if (normalized) {
          rawPhone = c.raw.trim();
          formattedPhone = normalized;
          phoneSource = c.source;
          break;
        }
      }

      return {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role: u.role,
        is_verified: u.is_verified,
        is_suspended: u.is_suspended,
        is_pro: u.is_pro,
        raw_phone: rawPhone,
        formatted_phone: formattedPhone,
        phone_source: phoneSource,
        phone_valid: Boolean(formattedPhone),
        store_name: u.seller_profile?.store_name ?? null,
        store_link: u.seller_profile?.store_link ?? null,
        is_seller_verified: Boolean(u.seller_profile?.is_seller_verified),
        onboarding_completed: Boolean(u.seller_profile?.onboarding_completed),
        payment_setup_completed: Boolean(
          u.seller_profile?.payment_setup_completed,
        ),
        created_at: u.created_at,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async sendSms(dto: SendAdminSmsInput, actor: Actor) {
    const cleanMessage = (dto.message || '').trim();
    if (cleanMessage.length < 2) {
      throw new BadRequestException(
        'SMS message must be at least 2 characters.',
      );
    }
    if (cleanMessage.length > 960) {
      throw new BadRequestException(
        'SMS message cannot exceed 960 characters.',
      );
    }

    const userIds = Array.from(
      new Set((dto.userIds || []).map((id) => id.trim()).filter(Boolean)),
    );
    const customNumbers = (dto.customNumbers || [])
      .map((n) => n.trim())
      .filter(Boolean);

    if (userIds.length === 0 && customNumbers.length === 0) {
      throw new BadRequestException(
        'Select at least one user or enter at least one phone number.',
      );
    }

    if (userIds.length + customNumbers.length > 500) {
      throw new BadRequestException(
        'A single SMS batch is capped at 500 recipients.',
      );
    }

    // 1. Resolve selected users from DB
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              full_name: true,
              phone_e164: true,
              seller_profile: {
                select: { store_name: true, whatsapp_number: true },
              },
              addresses: {
                take: 1,
                orderBy: { is_default: 'desc' },
                select: { phone: true },
              },
            },
          })
        : [];

    type QueueTarget = {
      userId: string | null;
      name: string;
      storeName: string | null;
      rawPhone: string;
      formattedPhone: string;
    };

    const dedupedTargets = new Map<string, QueueTarget>();
    const results: AdminSmsDeliveryRow[] = [];

    for (const u of users) {
      const candidatePhones = [
        u.phone_e164,
        u.seller_profile?.whatsapp_number,
        u.addresses?.[0]?.phone,
      ].filter((p): p is string => Boolean(p && p.trim()));

      let validPhone: string | null = null;
      let chosenRaw = candidatePhones[0] || '';
      for (const raw of candidatePhones) {
        const norm = normalizeGhanaSmsNumber(raw);
        if (norm) {
          validPhone = norm;
          chosenRaw = raw;
          break;
        }
      }

      if (!validPhone) {
        results.push({
          userId: u.id,
          name: u.full_name,
          rawPhone: chosenRaw || 'No phone on file',
          formattedPhone: null,
          status: 'invalid',
          error: 'Could not format to 12-digit Ghana number (233XXXXXXXXX)',
        });
        continue;
      }

      if (!dedupedTargets.has(validPhone)) {
        dedupedTargets.set(validPhone, {
          userId: u.id,
          name: u.full_name,
          storeName: u.seller_profile?.store_name ?? null,
          rawPhone: chosenRaw,
          formattedPhone: validPhone,
        });
      }
    }

    // 2. Resolve custom manually entered phone numbers
    for (const raw of customNumbers) {
      const normalized = normalizeGhanaSmsNumber(raw);
      if (!normalized) {
        results.push({
          userId: null,
          name: 'Manual Number',
          rawPhone: raw,
          formattedPhone: null,
          status: 'invalid',
          error:
            'Invalid Ghanaian phone format — expected 10-digit (0XXXXXXXXX) or 233XXXXXXXXX',
        });
        continue;
      }

      if (!dedupedTargets.has(normalized)) {
        dedupedTargets.set(normalized, {
          userId: null,
          name: 'Direct Recipient',
          storeName: null,
          rawPhone: raw,
          formattedPhone: normalized,
        });
      }
    }

    const targets = Array.from(dedupedTargets.values());
    if (targets.length === 0) {
      throw new BadRequestException(
        'None of the selected recipients have a valid Ghanaian phone number (233XXXXXXXXX).',
      );
    }

    const usesPersonalization = TEMPLATE_TOKEN_RE.test(cleanMessage);
    const senderOverride = dto.senderId?.trim() || undefined;

    // 3. Dispatch via Arkesel
    if (!usesPersonalization && targets.length > 1) {
      // Batch in chunks of 50 recipients for fast Arkesel bulk delivery
      const chunkSize = 50;
      for (let i = 0; i < targets.length; i += chunkSize) {
        const chunk = targets.slice(i, i + chunkSize);
        const bulk = await this.sms.sendBulkSms(
          chunk.map((t) => t.formattedPhone),
          cleanMessage,
          senderOverride,
        );

        for (const t of chunk) {
          results.push({
            userId: t.userId,
            name: t.name,
            rawPhone: t.rawPhone,
            formattedPhone: t.formattedPhone,
            status: bulk.sent ? 'sent' : 'failed',
            providerId: bulk.ids[t.formattedPhone],
            error: bulk.sent ? undefined : bulk.error,
            messagePreview: cleanMessage,
          });
        }
      }
    } else {
      // Personalized per-recipient dispatch (or single recipient) with bounded concurrency
      const concurrency = 5;
      for (let i = 0; i < targets.length; i += concurrency) {
        const slice = targets.slice(i, i + concurrency);
        const batchResults = await Promise.all(
          slice.map(async (t): Promise<AdminSmsDeliveryRow> => {
            const personalized = usesPersonalization
              ? interpolateSmsTemplate(cleanMessage, {
                  name: t.name,
                  storeName: t.storeName,
                })
              : cleanMessage;

            const send = await this.sms.sendSms(
              t.formattedPhone,
              personalized,
              senderOverride,
            );
            return {
              userId: t.userId,
              name: t.name,
              rawPhone: t.rawPhone,
              formattedPhone: t.formattedPhone,
              status: send.sent ? 'sent' : 'failed',
              providerId: send.id,
              error: send.sent ? undefined : send.error,
              messagePreview: personalized,
            };
          }),
        );
        results.push(...batchResults);
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;
    const invalidCount = results.filter((r) => r.status === 'invalid').length;

    const gateway = this.sms.getConfigStatus();

    // 4. Persist immutable audit record for SMS delivery history
    await this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'admin.sms_sent',
      entityType: 'sms_campaign',
      entityId: dto.templateId || 'custom',
      reason: `Admin SMS to ${targets.length} recipient(s): ${sentCount} sent, ${failedCount} failed, ${invalidCount} invalid`,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        templateId: dto.templateId || null,
        senderId: senderOverride || gateway.senderId,
        sandbox: gateway.sandbox,
        message: cleanMessage,
        personalized: usesPersonalization,
        totalTargeted: targets.length + invalidCount,
        sentCount,
        failedCount,
        invalidCount,
        recipients: results.slice(0, 50).map((r) => ({
          name: r.name,
          formattedPhone: r.formattedPhone,
          rawPhone: r.rawPhone,
          status: r.status,
          error: r.error || null,
          providerId: r.providerId || null,
        })),
      },
    });

    this.logger.log(
      `Admin ${actor.id} sent SMS batch: sent=${sentCount}, failed=${failedCount}, invalid=${invalidCount}`,
    );

    return {
      sentCount,
      failedCount,
      invalidCount,
      totalTargeted: targets.length + invalidCount,
      sandbox: gateway.sandbox,
      configured: gateway.configured,
      senderId: senderOverride || gateway.senderId,
      results,
    };
  }

  async getHistory(page = 1, limit = 25) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: 'admin.sms_sent' },
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.auditLog.count({
        where: { action: 'admin.sms_sent' },
      }),
    ]);

    const actorIds = Array.from(
      new Set(
        rows.map((r) => r.actor_id).filter((id): id is string => Boolean(id)),
      ),
    );
    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, full_name: true, email: true },
          })
        : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    return {
      data: rows.map((row) => {
        const meta = (row.metadata as Record<string, any>) || {};
        const actor = row.actor_id ? actorMap.get(row.actor_id) || null : null;
        return {
          id: row.id,
          created_at: row.created_at,
          actor: actor
            ? {
                id: actor.id,
                full_name: actor.full_name,
                email: actor.email,
              }
            : null,
          templateId: meta.templateId || null,
          senderId: meta.senderId || 'Verndly',
          sandbox: Boolean(meta.sandbox),
          message: String(meta.message || ''),
          personalized: Boolean(meta.personalized),
          totalTargeted: Number(meta.totalTargeted || 0),
          sentCount: Number(meta.sentCount || 0),
          failedCount: Number(meta.failedCount || 0),
          invalidCount: Number(meta.invalidCount || 0),
          recipients: Array.isArray(meta.recipients) ? meta.recipients : [],
        };
      }),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }
}
