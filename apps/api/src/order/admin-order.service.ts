import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { Actor, AuditLogService } from '../audit/audit-log.service';
import {
  ADMIN_ORDER_STATUSES,
  AdminOrderListQueryDto,
  AdminUpdateOrderStatusDto,
} from './dto/admin-order.dto';

@Injectable()
export class AdminOrderService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notifications: NotificationService,
    private auditLogs: AuditLogService,
  ) {}

  async list(query: AdminOrderListQueryDto) {
    const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit || '20', 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.buyer_id) {
      try {
        where.buyer_id = query.buyer_id;
      } catch {
        throw new BadRequestException('Invalid buyer_id');
      }
    }

    if (query.seller_id) {
      let sellerId: string;
      try {
        sellerId = query.seller_id;
      } catch {
        throw new BadRequestException('Invalid seller_id');
      }
      where.items = {
        some: {
          product: {
            seller_id: sellerId,
          },
        },
      };
    }

    if (query.from || query.to) {
      where.created_at = {};
      if (query.from) {
        const fromDate = new Date(query.from);
        if (isNaN(fromDate.getTime())) {
          throw new BadRequestException('Invalid from date');
        }
        (where.created_at as Prisma.DateTimeFilter).gte = fromDate;
      }
      if (query.to) {
        const toDate = new Date(query.to);
        if (isNaN(toDate.getTime())) {
          throw new BadRequestException('Invalid to date');
        }
        (where.created_at as Prisma.DateTimeFilter).lte = toDate;
      }
    }

    if (query.search) {
      const search = query.search.trim();
      const orFilters: Prisma.OrderWhereInput[] = [
        {
          buyer: {
            OR: [
              { full_name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];

      try {
        const asId = search;
        orFilters.push({ id: asId });
      } catch {
        // not a valid string, skip id match
      }

      where.OR = orFilters;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          buyer: {
            select: { id: true, full_name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, title: true, image_urls: true },
              },
            },
          },
          transaction: {
            select: { reference: true, status: true, provider: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: {
          select: { id: true, full_name: true, email: true },
        },
        items: {
          include: {
            product: {
              include: {
                seller: {
                  select: {
                    id: true,
                    store_name: true,
                    store_link: true,
                    user_id: true,
                  },
                },
              },
            },
          },
        },
        transaction: {
          include: {
            payout: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    id: string,
    dto: AdminUpdateOrderStatusDto,
    actor: Actor,
  ) {
    if (!ADMIN_ORDER_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Invalid status');
    }

    const existing = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        total_amount: true,
        customer_name: true,
        buyer: { select: { email: true, full_name: true } },
        items: {
          take: 1,
          select: {
            product: { select: { seller: { select: { store_name: true } } } },
          },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'order.status_change',
      entityType: 'order',
      entityId: id,
      reason: dto.reason,
      before: { status: existing.status },
      after: { status: dto.status },
      metadata: {
        buyer_email: existing.buyer?.email,
        total: existing.total_amount.toString(),
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    // Notify buyer about the status change. Fire-and-forget.
    if (existing.buyer?.email && existing.status !== dto.status) {
      const orderNumber = `ORD-${id.slice(-6).toUpperCase()}`;
      const storeName =
        existing.items[0]?.product?.seller?.store_name || 'Vendly seller';
      this.emailService
        .sendOrderStatusUpdate(existing.buyer.email, {
          orderNumber,
          customerName:
            existing.customer_name || existing.buyer.full_name || 'Customer',
          storeName,
          status: dto.status as any,
          total: existing.total_amount.toString(),
          currency: 'GHS',
          reason: dto.reason ?? null,
        })
        .catch((err) =>
          console.error('Failed to send order status email:', err),
        );

      // In-app notification for the buyer.
      const buyerId = await this.prisma.order
        .findUnique({ where: { id }, select: { buyer_id: true } })
        .then((o) => o?.buyer_id);
      if (buyerId) {
        const type =
          dto.status === 'CANCELLED'
            ? 'ORDER_CANCELLED'
            : dto.status === 'DELIVERED'
              ? 'ORDER_DELIVERED'
              : 'ORDER_STATUS_CHANGED';
        await this.notifications.create({
          userId: buyerId,
          type: type as any,
          title: `Order ${orderNumber} ${dto.status.toLowerCase()}`,
          body: dto.reason
            ? `Status updated to ${dto.status}. ${dto.reason}`
            : `Your order status was updated to ${dto.status}.`,
          link: `/orders`,
          data: { orderId: id, status: dto.status },
        });
      }
    }

    return {
      message: 'Order status updated',
      id: updated.id,
      status: updated.status,
    };
  }

  async statsSummary() {
    const excludeStatuses = ['PENDING', 'CANCELLED'];

    const [totalOrders, revenueAgg, pending, grouped] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        _sum: { total_amount: true },
        where: { status: { notIn: excludeStatuses } },
      }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
        orderBy: { status: 'asc' },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of grouped) {
      byStatus[row.status] = row._count?._all ?? 0;
    }

    return {
      totalOrders,
      totalRevenue: revenueAgg._sum.total_amount ?? 0,
      pending,
      byStatus,
    };
  }
}
