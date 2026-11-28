import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, AuditLogService } from '../audit/audit-log.service';
import { EmailService } from '../email/email.service';
import type { AdminReminderEmailInput } from '../email/email-templates';

export interface SendAdminEmailInput {
  subject: string;
  preheader?: string;
  eyebrow?: string;
  headline: string;
  paragraphs: string[];
  statusLabel?: string;
  statusVariant?: AdminReminderEmailInput['statusVariant'];
  ctaLabel?: string;
  ctaPath?: string;
  userIds: string[];
  templateId?: string;
}

function fill(
  template: string,
  recipient: { name: string; storeName: string | null },
) {
  const fullName = recipient.name.trim() || 'there';
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const storeName = recipient.storeName?.trim() || 'your Verndly store';
  return template
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{name\}/gi, fullName)
    .replace(/\{store_name\}/gi, storeName);
}

@Injectable()
export class AdminEmailService {
  private readonly logger = new Logger(AdminEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly auditLogs: AuditLogService,
  ) {}

  getStatus() {
    const status = this.email.getStatus();
    return {
      configured: status.configured,
      provider: status.provider,
      fromAddress: status.fromAddress,
    };
  }

  async send(dto: SendAdminEmailInput, actor: Actor) {
    const userIds = Array.from(
      new Set((dto.userIds || []).map((id) => id.trim()).filter(Boolean)),
    );
    if (userIds.length === 0) {
      throw new BadRequestException('Select at least one user.');
    }
    if (userIds.length > 200) {
      throw new BadRequestException('Send to 200 users or fewer at a time.');
    }
    const paragraphs = (dto.paragraphs || [])
      .map((p) => p.trim())
      .filter(Boolean);
    if (
      !dto.subject?.trim() ||
      !dto.headline?.trim() ||
      paragraphs.length === 0
    ) {
      throw new BadRequestException(
        'Subject, headline, and at least one paragraph are required.',
      );
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        full_name: true,
        email: true,
        seller_profile: { select: { store_name: true } },
      },
    });
    const byId = new Map(users.map((user) => [user.id, user]));

    const results: Array<{
      userId: string;
      name: string;
      email: string | null;
      status: 'sent' | 'failed' | 'invalid';
      providerId?: string;
      error?: string;
    }> = [];

    for (const userId of userIds) {
      const user = byId.get(userId);
      if (!user?.email?.includes('@')) {
        results.push({
          userId,
          name: user?.full_name || 'Unknown',
          email: user?.email || null,
          status: 'invalid',
          error: 'User has no email address',
        });
        continue;
      }

      const vars = {
        name: user.full_name,
        storeName: user.seller_profile?.store_name || null,
      };
      const send = await this.email.sendAdminReminderEmail(user.email, {
        subject: fill(dto.subject, vars),
        preheader: fill(dto.preheader || dto.subject, vars),
        eyebrow: fill(dto.eyebrow || 'Verndly', vars),
        headline: fill(dto.headline, vars),
        paragraphs: paragraphs.map((paragraph) => fill(paragraph, vars)),
        statusLabel: dto.statusLabel,
        statusVariant: dto.statusVariant,
        ctaLabel: dto.ctaLabel,
        ctaHref: dto.ctaPath,
      });
      results.push({
        userId: user.id,
        name: user.full_name,
        email: user.email,
        status: send.sent ? 'sent' : 'failed',
        providerId: send.id,
        error: send.sent ? undefined : send.error,
      });
    }

    const sentCount = results.filter((row) => row.status === 'sent').length;
    const failedCount = results.filter((row) => row.status === 'failed').length;
    const invalidCount = results.filter(
      (row) => row.status === 'invalid',
    ).length;

    await this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'admin.email_sent',
      entityType: 'email_campaign',
      entityId: dto.templateId || 'custom',
      reason: `Admin email to ${userIds.length} user(s): ${sentCount} sent, ${failedCount} failed`,
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        templateId: dto.templateId || null,
        subject: dto.subject.trim(),
        headline: dto.headline.trim(),
        sentCount,
        failedCount,
        invalidCount,
        totalTargeted: userIds.length,
        recipients: results.slice(0, 50),
      },
    });

    this.logger.log(
      `Admin ${actor.id} sent reminder email: sent=${sentCount} failed=${failedCount}`,
    );

    return {
      configured: this.email.getStatus().configured,
      fromAddress: this.email.getStatus().fromAddress,
      sentCount,
      failedCount,
      invalidCount,
      totalTargeted: userIds.length,
      results,
    };
  }

  async getHistory(page = 1, limit = 25) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: 'admin.email_sent' },
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.auditLog.count({ where: { action: 'admin.email_sent' } }),
    ]);

    const actorIds = Array.from(
      new Set(
        rows
          .map((row) => row.actor_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, full_name: true, email: true },
          })
        : [];
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    return {
      data: rows.map((row) => {
        const meta = (row.metadata || {}) as Record<string, unknown>;
        const actor = row.actor_id ? actorMap.get(row.actor_id) || null : null;
        return {
          id: row.id,
          created_at: row.created_at,
          actor,
          templateId: (meta.templateId as string | null) || null,
          subject: typeof meta.subject === 'string' ? meta.subject : '',
          headline: typeof meta.headline === 'string' ? meta.headline : '',
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
