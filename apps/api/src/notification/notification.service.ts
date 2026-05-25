import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  data?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a single notification. Safe to call from anywhere; failures are
   * swallowed and logged so a notification bug never blocks the primary flow
   * (placing an order, processing a payment, etc.).
   */
  async create(input: CreateNotificationInput) {
    try {
      return await (this.prisma as any).notification.create({
        data: {
          user_id: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link ?? null,
          data: input.data ?? undefined,
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[notifications] create failed:', (err as Error)?.message);
      return null;
    }
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (!inputs.length) return { count: 0 };
    try {
      return await (this.prisma as any).notification.createMany({
        data: inputs.map((i) => ({
          user_id: i.userId,
          type: i.type,
          title: i.title,
          body: i.body,
          link: i.link ?? null,
          data: i.data ?? undefined,
        })),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[notifications] createMany failed:', (err as Error)?.message);
      return { count: 0 };
    }
  }

  async list(
    userId: string,
    opts: { unreadOnly?: boolean; cursor?: string; take?: number } = {},
  ) {
    const take = Math.min(opts.take ?? 20, 50);
    const where: any = { user_id: userId };
    if (opts.unreadOnly) where.is_read = false;

    const items = await (this.prisma as any).notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: take + 1,
      ...(opts.cursor
        ? { cursor: { id: opts.cursor }, skip: 1 }
        : {}),
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    return {
      items: data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  async unreadCount(userId: string) {
    const count = await (this.prisma as any).notification.count({
      where: { user_id: userId, is_read: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const notif = await (this.prisma as any).notification.findUnique({
      where: { id },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.user_id !== userId) throw new ForbiddenException();
    if (notif.is_read) return notif;
    return (this.prisma as any).notification.update({
      where: { id },
      data: { is_read: true, read_at: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const res = await (this.prisma as any).notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return { updated: res.count };
  }

  async delete(userId: string, id: string) {
    const notif = await (this.prisma as any).notification.findUnique({
      where: { id },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.user_id !== userId) throw new ForbiddenException();
    await (this.prisma as any).notification.delete({ where: { id } });
    return { deleted: true };
  }

  // ───────────────── Admin / broadcast ─────────────────

  /**
   * Broadcast to all users (or all users with a given role).
   * Chunked to avoid a single huge insert.
   */
  async broadcast(args: {
    title: string;
    body: string;
    link?: string;
    role?: 'USER' | 'SELLER' | 'ADMIN';
  }) {
    const where: any = {};
    if (args.role) where.role = args.role;

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    const CHUNK = 500;
    let total = 0;
    for (let i = 0; i < users.length; i += CHUNK) {
      const chunk = users.slice(i, i + CHUNK);
      const res = await (this.prisma as any).notification.createMany({
        data: chunk.map((u) => ({
          user_id: u.id,
          type: 'ADMIN_BROADCAST' as NotificationType,
          title: args.title,
          body: args.body,
          link: args.link ?? null,
        })),
      });
      total += res.count;
    }
    return { delivered: total };
  }

  async adminStats() {
    const [total, unread, last24h] = await Promise.all([
      (this.prisma as any).notification.count(),
      (this.prisma as any).notification.count({ where: { is_read: false } }),
      (this.prisma as any).notification.count({
        where: { created_at: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
      }),
    ]);

    const byType = await (this.prisma as any).notification.groupBy({
      by: ['type'],
      _count: { _all: true },
      orderBy: { _count: { type: 'desc' } },
    });

    return {
      total,
      unread,
      last24h,
      byType: byType.map((r: any) => ({ type: r.type, count: r._count._all })),
    };
  }

  async adminList(opts: { take?: number; cursor?: string; userId?: string } = {}) {
    const take = Math.min(opts.take ?? 50, 100);
    const where: any = {};
    if (opts.userId) where.user_id = opts.userId;

    const items = await (this.prisma as any).notification.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, full_name: true, email: true } },
      },
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    return { items: data, nextCursor: hasMore ? data[data.length - 1].id : null };
  }
}
