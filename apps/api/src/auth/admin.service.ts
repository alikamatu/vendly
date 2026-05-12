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

  async updateUserRole(id: bigint, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });

    return { message: `User role updated to ${dto.role}` };
  }

  async toggleUserSuspension(id: bigint, dto: ToggleSuspensionDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { is_suspended: !user.is_suspended },
    });

    return {
      message: `User ${updated.is_suspended ? 'suspended' : 'unsuspended'} successfully`,
      is_suspended: updated.is_suspended,
    };
  }

  async warnUser(id: bigint, dto: WarnUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { warnings: { increment: 1 } },
    });

    return {
      message: `Warning issued. Total warnings: ${updated.warnings}`,
      warnings: updated.warnings,
    };
  }

  async deleteUser(id: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.adminApproval.deleteMany({ where: { user_id: id } }),
      this.prisma.sellerProfile.deleteMany({ where: { user_id: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

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
    approvalId: bigint,
    adminId: bigint,
    dto: ApproveVerificationDto,
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

    // Automatically create Paystack subaccount if approved
    if (dto.status === 'APPROVED') {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { user_id: approval.user_id },
      });

      if (seller) {
        // Fire and forget or handle error? The task says "Failure does not crash system".
        // createSubaccount already handles its own errors and retries.
        this.paymentsService.createSubaccount(seller.id).catch((err) => {
          console.error('Failed to trigger subaccount creation:', err);
        });
      }
    }

    return {
      id: updated.id.toString(),
      status: updated.status,
      reviewed_at: updated.reviewed_at,
      message: `Verification ${dto.status.toLowerCase()} successfully`,
    };
  }

  async getApprovalById(id: bigint) {
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

  async getUserById(id: bigint) {
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
        seller_profile: {
          include: {
            structured_location: true,
          },
        },
      },
    });

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
}
