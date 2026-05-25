import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveVerificationDto } from './dto/approve-verification.dto';
import { AdminQueryDto, ApprovalStatusFilter } from './dto/admin-query.dto';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../email/email.service';
import { Actor, AuditLogService } from '../audit/audit-log.service';

import {
  UpdateUserRoleDto,
  WarnUserDto,
  ToggleSuspensionDto,
} from './dto/admin-user-actions.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private emailService: EmailService,
    private auditLogs: AuditLogService,
  ) {}

  async getAllTransactions(query: AdminQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { reference: { contains: term, mode: 'insensitive' } },
        { order: { customer_name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            include: {
              buyer: {
                select: { full_name: true, email: true },
              },
              items: {
                take: 1,
                include: {
                  product: {
                    include: {
                      seller: {
                        select: {
                          store_name: true,
                          paystack_subaccount_code: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((t: any) => {
        const store = t.order?.items?.[0]?.product?.seller;
        return {
          id: t.id.toString(),
          reference: t.reference,
          amount: t.amount?.toString(),
          status: t.status,
          provider: t.provider,
          created_at: t.created_at,
          order_id: t.order?.id?.toString(),
          payer: {
            name: t.order?.customer_name || t.order?.buyer?.full_name,
            phone: t.order?.customer_phone,
            email: t.order?.buyer?.email,
          },
          receiver: {
            store_name: store?.store_name,
            subaccount: store?.paystack_subaccount_code,
          },
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUsers(query: AdminQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    if (query.status && query.status !== ApprovalStatusFilter.ALL) {
      if (query.status === 'PENDING') where.is_verified = false;
      if (query.status === 'APPROVED') where.is_verified = true;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { full_name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

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
          warnings: true,
          created_at: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({ ...u, id: u.id.toString() })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto, actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.role_change',
      entityType: 'user',
      entityId: id,
      before: { role: user.role },
      after: { role: dto.role },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { message: `User role updated to ${dto.role}` };
  }

  async toggleUserSuspension(
    id: string,
    dto: ToggleSuspensionDto,
    actor: Actor,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { is_suspended: !user.is_suspended },
    });

    // Only notify on transition to suspended. Unsuspending doesn't need a heavy email.
    if (updated.is_suspended && user.email) {
      this.emailService
        .sendAccountSuspendedEmail(
          user.email,
          user.full_name,
          dto.reason || 'Policy violation. Contact support for details.',
        )
        .catch((err) =>
          console.error('Failed to send suspension email:', err),
        );
    }

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: updated.is_suspended ? 'user.suspend' : 'user.unsuspend',
      entityType: 'user',
      entityId: id,
      reason: dto.reason,
      before: { is_suspended: user.is_suspended },
      after: { is_suspended: updated.is_suspended },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: `User ${updated.is_suspended ? 'suspended' : 'unsuspended'} successfully`,
      is_suspended: updated.is_suspended,
    };
  }

  async warnUser(id: string, dto: WarnUserDto, actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { warnings: { increment: 1 } },
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.warn',
      entityType: 'user',
      entityId: id,
      reason: dto.reason,
      before: { warnings: user.warnings },
      after: { warnings: updated.warnings },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: `Warning issued. Total warnings: ${updated.warnings}`,
      warnings: updated.warnings,
    };
  }

  async deleteUser(id: string, actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.adminApproval.deleteMany({ where: { user_id: id } }),
      this.prisma.sellerProfile.deleteMany({ where: { user_id: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.delete',
      entityType: 'user',
      entityId: id,
      before: {
        email: user.email,
        role: user.role,
        is_suspended: user.is_suspended,
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { message: 'User and associated data deleted successfully' };
  }

  async getApprovals(query: AdminQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    // Status filter
    if (query.status && query.status !== ApprovalStatusFilter.ALL) {
      where.status = query.status;
    }

    // Search filter (name or email)
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.user = {
        OR: [
          { full_name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const [approvals, total] = await Promise.all([
      this.prisma.adminApproval.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              school: true,
              verification_doc: true,
              created_at: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      }),
      this.prisma.adminApproval.count({ where }),
    ]);

    return {
      data: approvals.map((a: any) => ({
        id: a.id.toString(),
        user: {
          id: a.user.id.toString(),
          full_name: a.user.full_name,
          email: a.user.email,
          school: a.user.school,
          verification_doc: a.user.verification_doc,
          created_at: a.user.created_at,
        },
        status: a.status,
        type: a.type,
        verification_data: a.verification_data,
        reviewed_by: a.reviewer
          ? { id: a.reviewer.id.toString(), full_name: a.reviewer.full_name }
          : null,
        reviewed_at: a.reviewed_at,
        created_at: a.created_at,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.adminApproval.count(),
      this.prisma.adminApproval.count({
        where: { status: ApprovalStatus.PENDING },
      }),
      this.prisma.adminApproval.count({
        where: { status: ApprovalStatus.APPROVED },
      }),
      this.prisma.adminApproval.count({
        where: { status: ApprovalStatus.REJECTED },
      }),
    ]);

    return { total, pending, approved, rejected };
  }

  async getHotSalesStats() {
    const [total, successful, activeProducts, revenueAggregate] =
      await Promise.all([
        this.prisma.productPromotionPayment.count(),
        this.prisma.productPromotionPayment.count({
          where: { status: 'SUCCESS' },
        }),
        this.prisma.product.count({ where: { is_featured: true } }),
        this.prisma.productPromotionPayment.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalSubscriptions: total,
      successfulSubscriptions: successful,
      activeHotSalesProducts: activeProducts,
      totalRevenueGhs: Number(revenueAggregate._sum.amount || 0),
    };
  }

  async getHotSalesSubscriptions(query: AdminQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { reference: { contains: term, mode: 'insensitive' } },
        { product: { title: { contains: term, mode: 'insensitive' } } },
        { seller: { store_name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.productPromotionPayment.findMany({
        where,
        include: {
          product: { select: { id: true, title: true, is_featured: true } },
          seller: { select: { id: true, store_name: true, user_id: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.productPromotionPayment.count({ where }),
    ]);

    return {
      data: rows.map((row: any) => ({
        id: row.id.toString(),
        reference: row.reference,
        amount: row.amount.toString(),
        currency: row.currency,
        status: row.status,
        paid_at: row.paid_at,
        created_at: row.created_at,
        product: {
          id: row.product.id.toString(),
          title: row.product.title,
          is_featured: row.product.is_featured,
        },
        seller: {
          id: row.seller.id.toString(),
          user_id: row.seller.user_id.toString(),
          store_name: row.seller.store_name,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveOrReject(
    approvalId: string,
    adminId: string,
    dto: ApproveVerificationDto,
    actor?: Actor,
  ) {
    const approval = await this.prisma.adminApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        'This verification has already been reviewed',
      );
    }

    // Update approval record and user verification status in a transaction
    const [updated] = await this.prisma.$transaction([
      this.prisma.adminApproval.update({
        where: { id: approvalId },
        data: {
          status: dto.status,
          reviewed_by: adminId,
          reviewed_at: new Date(),
        },
      }),
      // If approved, grant the user full access and assign SELLER role
      ...(dto.status === 'APPROVED'
        ? [
            this.prisma.user.update({
              where: { id: approval.user_id },
              data: { is_verified: true, role: Role.SELLER },
            }),
          ]
        : []),
    ]);

    // Automatically create Paystack subaccount + notify seller via email
    const user = await this.prisma.user.findUnique({
      where: { id: approval.user_id },
      select: { email: true, full_name: true },
    });

    if (dto.status === 'APPROVED') {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { user_id: approval.user_id },
      });

      if (seller) {
        // createSubaccount handles its own errors + retries.
        this.paymentsService.createSubaccount(seller.id).catch((err) => {
          console.error('Failed to trigger subaccount creation:', err);
        });
      }

      // Approval email — store_link comes from the seller profile if it exists.
      if (user?.email) {
        this.emailService
          .sendSellerApprovedEmail(
            user.email,
            user.full_name,
            seller?.store_link || '',
          )
          .catch((err) => console.error('Failed to send approval email:', err));
      }
    } else if (dto.status === 'REJECTED' && user?.email) {
      this.emailService
        .sendSellerRejectedEmail(user.email, user.full_name, dto.reason)
        .catch((err) => console.error('Failed to send rejection email:', err));
    }

    this.auditLogs.record({
      actorId: actor?.id ?? adminId,
      actorRole: actor?.role ?? Role.ADMIN,
      action:
        dto.status === 'APPROVED'
          ? 'approval.approve'
          : 'approval.reject',
      entityType: 'approval',
      entityId: approvalId,
      reason: dto.reason,
      before: { status: approval.status },
      after: { status: dto.status, reviewed_by: adminId },
      metadata: { user_id: approval.user_id, type: approval.type },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });

    return {
      id: updated.id.toString(),
      status: updated.status,
      reviewed_at: updated.reviewed_at,
      message: `Verification ${dto.status.toLowerCase()} successfully`,
    };
  }

  async getApprovalById(id: string) {
    const approval = await this.prisma.adminApproval.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
            school: true,
            verification_doc: true,
            created_at: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    });

    if (!approval) throw new NotFoundException('Approval request not found');

    const a = approval as any;
    return {
      id: a.id.toString(),
      user: {
        id: a.user.id.toString(),
        full_name: a.user.full_name,
        email: a.user.email,
        school: a.user.school,
        verification_doc: a.user.verification_doc,
        created_at: a.user.created_at,
      },
      status: a.status,
      type: a.type,
      verification_data: a.verification_data,
      reviewed_by: a.reviewer
        ? { id: a.reviewer.id.toString(), full_name: a.reviewer.full_name }
        : null,
      reviewed_at: a.reviewed_at,
      created_at: a.created_at,
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        email: true,
        school: true,
        role: true,
        is_verified: true,
        is_suspended: true,
        warnings: true,
        created_at: true,
        verification_doc: true,
        // 2FA / OAuth / Pro — needed by the admin user-detail page.
        totp_enabled: true,
        totp_method: true,
        totp_verified_at: true,
        phone_e164: true,
        phone_verified_at: true,
        oauth_provider: true,
        avatar_url: true,
        terms_accepted_at: true,
        is_pro: true,
        pro_expires_at: true,
        seller_profile: {
          include: {
            structured_location: true,
          },
        },
      } as any,
    }) as any;

    if (!user) throw new NotFoundException('User not found');

    let stats: any = null;
    if (user.role === 'SELLER' && user.seller_profile) {
      const storeId = user.seller_profile.id;
      const [productCount, orderItems] = await Promise.all([
        this.prisma.product.count({ where: { seller_id: storeId } }),
        this.prisma.orderItem.findMany({
          where: { product: { seller_id: storeId } },
          include: {
            order: true,
            product: { select: { title: true } },
          },
          orderBy: { order: { created_at: 'desc' } },
          take: 50,
        }),
      ]);

      const totalSales = orderItems.reduce(
        (acc, item) => acc + Number(item.price) * item.quantity,
        0,
      );
      const uniqueOrders = new Set(
        orderItems.map((item) => item.order_id.toString()),
      ).size;

      stats = {
        productCount,
        totalOrders: uniqueOrders,
        totalSales,
        recentOrders: orderItems.slice(0, 10).map((item) => ({
          id: item.order_id.toString(),
          product: item.product.title,
          amount: Number(item.price) * item.quantity,
          date: item.order.created_at,
          status: item.order.status,
        })),
      };
    }

    return {
      user: {
        ...user,
        id: user.id.toString(),
        seller_profile: user.seller_profile
          ? {
              ...user.seller_profile,
              id: user.seller_profile.id.toString(),
              user_id: user.seller_profile.user_id.toString(),
              location_id: user.seller_profile.location_id?.toString(),
            }
          : null,
      },
      stats,
    };
  }

  async getGlobalOverview() {
    const [
      transactionAggregate,
      transactionCount,
      userCounts,
      productCount,
      sellerCount,
      recentOrders,
      recentTransactions,
      recentApprovals,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({ where: { status: 'SUCCESS' } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      this.prisma.product.count({ where: { status: 'published' } }),
      this.prisma.sellerProfile.count(),
      this.prisma.order.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { buyer: { select: { full_name: true } } },
      }),
      this.prisma.transaction.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { order: { select: { customer_name: true } } },
      }),
      this.prisma.adminApproval.findMany({
        orderBy: { created_at: 'desc' },
        take: 5,
        include: { user: { select: { full_name: true } } },
      }),
    ]);

    // Format user counts
    const usersByRole = userCounts.reduce((acc, curr) => {
      acc[curr.role.toLowerCase()] = curr._count._all;
      return acc;
    }, {});

    // Create a unified activity feed
    const feed = [
      ...recentOrders.map((o) => ({
        id: `order-${o.id}`,
        type: 'ORDER',
        title: `New order from ${o.customer_name || o.buyer?.full_name}`,
        amount: o.total_amount.toString(),
        timestamp: o.created_at,
        reference: `#ORD-${o.id.toString().slice(-4)}`,
      })),
      ...recentTransactions.map((t) => ({
        id: `tx-${t.id}`,
        type: 'TRANSACTION',
        title: `Payment processed: ${t.reference}`,
        amount: t.amount.toString(),
        timestamp: t.created_at,
        reference: t.reference,
        status: t.status,
      })),
      ...recentApprovals.map((a: any) => ({
        id: `approval-${a.id}`,
        type: 'APPROVAL',
        title: `Verification Request: ${a.user?.full_name}`,
        timestamp: a.created_at,
        status: a.status,
      })),
    ].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      revenue: Number(transactionAggregate._sum.amount || 0),
      transactionCount: transactionCount || 0,
      productCount: productCount || 0,
      sellerCount: sellerCount || 0,
      users: {
        total: Object.values(usersByRole).reduce(
          (a: number, b: number) => a + (Number(b) || 0),
          0,
        ),
        ...usersByRole,
      },
      feed: feed.slice(0, 10),
    };
  }

  // ───────────────── 2FA admin reset / Pro toggle ─────────────────

  /**
   * Force-disable 2FA for a user. Used when someone lost their phone +
   * backup codes and contacted support. The audit trail lives in the
   * platform's notification feed (we also drop them an in-app note).
   */
  async forceDisable2fa(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');
    await (this.prisma.user as any).update({
      where: { id: userId },
      data: {
        totp_enabled: false,
        totp_secret: null,
        totp_verified_at: null,
        totp_backup_codes: [],
        totp_method: 'TOTP',
        sms_code_hash: null,
        sms_code_expires_at: null,
        phone_verified_at: null,
      },
    });
    return { message: '2FA disabled. The user should re-enroll on their next sign-in.' };
  }

  async setProStatus(
    userId: string,
    args: { is_pro: boolean; duration_days?: number },
  ) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');

    if (!args.is_pro) {
      const updated = await (this.prisma.user as any).update({
        where: { id: userId },
        data: { is_pro: false, pro_expires_at: null },
        select: { id: true, is_pro: true, pro_expires_at: true },
      });
      return { ...updated, id: updated.id.toString() };
    }

    const days = Math.max(1, Math.floor(args.duration_days ?? 30));
    const now = new Date();
    const baseDate =
      (u as any).pro_expires_at && (u as any).pro_expires_at.getTime() > now.getTime()
        ? (u as any).pro_expires_at
        : now;
    const nextExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const updated = await (this.prisma.user as any).update({
      where: { id: userId },
      data: { is_pro: true, pro_expires_at: nextExpiry },
      select: { id: true, is_pro: true, pro_expires_at: true },
    });
    return { ...updated, id: updated.id.toString() };
  }

  // ───────────────── Returns admin ─────────────────

  async listReturns(query: {
    status?: string;
    page?: string;
    limit?: string;
    search?: string;
  }) {
    const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit || '20', 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search?.trim()) {
      where.OR = [
        { reason: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        include: {
          buyer: { select: { id: true, full_name: true, email: true } },
          order: {
            select: {
              id: true,
              status: true,
              total_amount: true,
              created_at: true,
              items: {
                take: 1,
                select: {
                  product: {
                    select: {
                      title: true,
                      image_urls: true,
                      seller: { select: { store_name: true } },
                    },
                  },
                },
              },
            },
          },
        } as any,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.returnRequest.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async updateReturnStatus(
    id: string,
    args: { status: 'APPROVED' | 'REJECTED' | 'COMPLETED'; admin_note?: string },
  ) {
    const ret = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!ret) throw new NotFoundException('Return request not found');
    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: args.status as any,
        ...(args.admin_note ? { admin_notes: args.admin_note } : {}),
      } as any,
    });
    return updated;
  }

  // ───────────────── Reviews admin ─────────────────

  async listReviews(query: {
    flagged?: string;
    rating?: string;
    page?: string;
    limit?: string;
    search?: string;
  }) {
    const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit || '20', 10) || 20, 1),
      100,
    );
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.flagged === 'true') {
      where.flags = { some: {} };
    }
    if (query.rating) {
      const r = parseInt(query.rating, 10);
      if (!isNaN(r)) where.rating = r;
    }
    if (query.search?.trim()) {
      where.comment = { contains: query.search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          buyer: { select: { id: true, full_name: true, email: true } },
          product: { select: { id: true, title: true, image_urls: true } },
          flags: {
            select: {
              id: true,
              reason: true,
              notes: true,
              created_at: true,
              reporter: { select: { full_name: true, email: true } },
            },
            orderBy: { created_at: 'desc' },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async moderateReview(
    id: string,
    args: { action: 'hide' | 'show' | 'delete' | 'dismiss_flags' },
  ) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (args.action === 'delete') {
      await this.prisma.review.delete({ where: { id } });
      return { deleted: true };
    }
    if (args.action === 'dismiss_flags') {
      await this.prisma.reviewFlag.deleteMany({ where: { review_id: id } });
      return { dismissed: true };
    }
    const status = args.action === 'hide' ? 'HIDDEN' : 'PUBLISHED';
    const updated = await (this.prisma.review as any).update({
      where: { id },
      data: { status },
    });
    return updated;
  }
}
