import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Single entry point for writing to the audit log. Two rules:
 *
 *   1. Never throw. An audit-log write that fails must not roll back the
 *      business operation it was tracking — callers stack `record()` after
 *      their primary work, often without `await`, and expect it to be safe.
 *   2. Snapshot the actor's role at write time. Roles change; an audit row
 *      that just stores `actor_id` becomes ambiguous a year later when the
 *      account has been demoted from ADMIN to USER.
 */
/**
 * Trimmed view of an authenticated request used by every audit-emitting
 * service method. Controllers build this with `actorFromReq(req)` so the
 * service layer never has to import Express types.
 */
export interface Actor {
  id: string;
  role: Role;
  ip?: string | null;
  userAgent?: string | null;
}

export function actorFromReq(req: any): Actor {
  const fwd = req?.headers?.['x-forwarded-for'];
  const ip =
    (typeof fwd === 'string' ? fwd.split(',')[0].trim() : undefined) ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    null;
  return {
    id: req?.user?.id,
    role: req?.user?.role,
    ip,
    userAgent: req?.headers?.['user-agent']?.toString().slice(0, 255) || null,
  };
}

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditListFilter {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  /** Only the listed actor roles are returned. */
  actorRoles?: Role[];
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: entry.actorId ?? null,
          actor_role: entry.actorRole ?? null,
          action: entry.action,
          entity_type: entry.entityType,
          entity_id: entry.entityId ?? null,
          reason: entry.reason ?? null,
          before: (entry.before ?? Prisma.DbNull) as any,
          after: (entry.after ?? Prisma.DbNull) as any,
          metadata: (entry.metadata ?? Prisma.DbNull) as any,
          ip: entry.ip ?? null,
          user_agent: entry.userAgent ?? null,
        },
      });
    } catch (err) {
      // Swallow + log — see class doc. We'd rather lose a row than refuse a
      // suspension, refund, etc. because the audit table was unreachable.
      this.logger.error(
        `Failed to record audit entry action=${entry.action} entity=${entry.entityType}:${entry.entityId}`,
        err as any,
      );
    }
  }

  async list(filter: AuditListFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(filter.actorId ? { actor_id: filter.actorId } : {}),
      ...(filter.entityType ? { entity_type: filter.entityType } : {}),
      ...(filter.entityId ? { entity_id: filter.entityId } : {}),
      ...(filter.action ? { action: filter.action } : {}),
      ...(filter.actorRoles && filter.actorRoles.length
        ? { actor_role: { in: filter.actorRoles } }
        : {}),
      ...(filter.from || filter.to
        ? {
            created_at: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}
