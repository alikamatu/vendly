import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReportReason,
  ReportResolutionAction,
  ReportStatus,
  ReportTargetType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService, type Actor } from '../audit/audit-log.service';
import { NotificationService } from '../notification/notification.service';
import {
  AdminReportQueryDto,
  CreateReportDto,
  ResolveReportDto,
} from './dto/report.dto';

const REASON_LABELS: Record<ReportReason, string> = {
  COUNTERFEIT: 'Counterfeit or Fake Item',
  MISLEADING: 'Misleading Description or Photos',
  PROHIBITED_ITEM: 'Prohibited or Illegal Item',
  SCAM_FRAUD: 'Scam or Fraudulent Activity',
  HARASSMENT: 'Harassment or Abusive Behavior',
  SPAM: 'Spam or Repetitive Listing',
  OFFENSIVE_CONTENT: 'Offensive or Inappropriate Content',
  INACCURATE_PRICING: 'Inaccurate or Bait Pricing',
  OTHER: 'Other Policy Violation',
};

const REPORT_INCLUDE = {
  reporter: {
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true,
    },
  },
  reviewer: {
    select: {
      id: true,
      full_name: true,
      email: true,
    },
  },
  product: {
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      status: true,
      category: true,
      image_urls: true,
      seller_id: true,
      seller: {
        select: {
          id: true,
          store_name: true,
          store_link: true,
          user_id: true,
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              is_suspended: true,
              warnings: true,
            },
          },
        },
      },
    },
  },
  seller: {
    select: {
      id: true,
      store_name: true,
      store_link: true,
      logo_url: true,
      location: true,
      user_id: true,
      user: {
        select: {
          id: true,
          full_name: true,
          email: true,
          is_suspended: true,
          warnings: true,
        },
      },
    },
  },
} satisfies Prisma.ReportInclude;

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Buyer (or signed-in user) submits a trust & safety report against a
   * product listing or seller storefront.
   */
  async createReport(reporterId: string, dto: CreateReportDto) {
    let resolvedProductId: string | null = null;
    let resolvedSellerId: string | null = null;
    let targetLabel = '';

    if (dto.target_type === ReportTargetType.PRODUCT) {
      if (!dto.product_id) {
        throw new BadRequestException(
          'product_id is required when reporting a product.',
        );
      }

      const product = await this.prisma.product.findUnique({
        where: { id: dto.product_id },
        select: {
          id: true,
          title: true,
          seller_id: true,
          seller: {
            select: {
              id: true,
              user_id: true,
              store_name: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found.');
      }

      if (product.seller?.user_id === reporterId) {
        throw new ForbiddenException('You cannot report your own product.');
      }

      const existing = await this.prisma.report.findFirst({
        where: {
          reporter_id: reporterId,
          target_type: ReportTargetType.PRODUCT,
          product_id: product.id,
          status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] },
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException(
          'You already have an active report for this product under review.',
        );
      }

      resolvedProductId = product.id;
      resolvedSellerId = product.seller_id;
      targetLabel = `product "${product.title}"`;
    } else if (dto.target_type === ReportTargetType.SELLER) {
      if (!dto.seller_id) {
        throw new BadRequestException(
          'seller_id is required when reporting a seller.',
        );
      }

      const seller = await this.prisma.sellerProfile.findUnique({
        where: { id: dto.seller_id },
        select: {
          id: true,
          user_id: true,
          store_name: true,
        },
      });

      if (!seller) {
        throw new NotFoundException('Seller store not found.');
      }

      if (seller.user_id === reporterId) {
        throw new ForbiddenException('You cannot report your own store.');
      }

      const existing = await this.prisma.report.findFirst({
        where: {
          reporter_id: reporterId,
          target_type: ReportTargetType.SELLER,
          seller_id: seller.id,
          status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] },
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException(
          'You already have an active report for this seller under review.',
        );
      }

      resolvedSellerId = seller.id;
      targetLabel = `seller "${seller.store_name}"`;
    } else {
      throw new BadRequestException('Invalid report target_type.');
    }

    const report = await this.prisma.report.create({
      data: {
        reporter_id: reporterId,
        target_type: dto.target_type,
        product_id: resolvedProductId,
        seller_id: resolvedSellerId,
        reason: dto.reason,
        details: dto.details?.trim() || null,
        evidence_urls: dto.evidence_urls ?? [],
        status: ReportStatus.OPEN,
      },
      include: REPORT_INCLUDE,
    });

    // Notify all Super Admins immediately (best-effort)
    void this.notifyAdminsOfNewReport(
      report.id,
      dto.target_type,
      dto.reason,
      targetLabel,
    );

    this.logger.log(
      `Report ${report.id} filed by ${reporterId} against ${dto.target_type} (${targetLabel}) reason=${dto.reason}`,
    );

    return {
      message:
        'Report submitted. Our Trust & Safety team will review it shortly.',
      report,
    };
  }

  /**
   * Lists reports filed by the signed-in buyer.
   */
  async getMyReports(reporterId: string) {
    return this.prisma.report.findMany({
      where: { reporter_id: reporterId },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        product: {
          select: { id: true, title: true, image_urls: true, status: true },
        },
        seller: {
          select: {
            id: true,
            store_name: true,
            store_link: true,
            logo_url: true,
          },
        },
      },
    });
  }

  /**
   * Super Admin: paginated, filterable Trust & Safety report queue + stats.
   */
  async listAdminReports(query: AdminReportQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.ReportWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.target_type) where.target_type = query.target_type;
    if (query.reason) where.reason = query.reason;

    const q = query.search?.trim();
    if (q) {
      where.OR = [
        { details: { contains: q, mode: 'insensitive' } },
        { admin_notes: { contains: q, mode: 'insensitive' } },
        { reporter: { full_name: { contains: q, mode: 'insensitive' } } },
        { reporter: { email: { contains: q, mode: 'insensitive' } } },
        { product: { title: { contains: q, mode: 'insensitive' } } },
        { seller: { store_name: { contains: q, mode: 'insensitive' } } },
        { seller: { store_link: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total, statusGroups, typeGroups] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: REPORT_INCLUDE,
        orderBy: [{ created_at: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.report.count({ where }),
      this.prisma.report.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.report.groupBy({
        by: ['target_type'],
        where: {
          status: { in: [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW] },
        },
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {
      OPEN: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      DISMISSED: 0,
    };
    for (const g of statusGroups) {
      byStatus[g.status] = g._count._all;
    }

    const openByType: Record<string, number> = {
      PRODUCT: 0,
      SELLER: 0,
    };
    for (const g of typeGroups) {
      openByType[g.target_type] = g._count._all;
    }

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        open: byStatus.OPEN,
        under_review: byStatus.UNDER_REVIEW,
        resolved: byStatus.RESOLVED,
        dismissed: byStatus.DISMISSED,
        active_product_reports: openByType.PRODUCT,
        active_seller_reports: openByType.SELLER,
      },
    };
  }

  /**
   * Super Admin: inspect a single report plus repeat-offender context.
   */
  async getAdminReportById(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    });
    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    const [productReportCount, sellerReportCount] = await Promise.all([
      report.product_id
        ? this.prisma.report.count({ where: { product_id: report.product_id } })
        : Promise.resolve(0),
      report.seller_id
        ? this.prisma.report.count({ where: { seller_id: report.seller_id } })
        : Promise.resolve(0),
    ]);

    return {
      ...report,
      related_counts: {
        product_reports: productReportCount,
        seller_reports: sellerReportCount,
      },
    };
  }

  /**
   * Super Admin: update report status & optionally execute a real enforcement
   * action (reject/archive product, issue seller warning, suspend seller, or dismiss).
   */
  async resolveAdminReport(id: string, dto: ResolveReportDto, actor: Actor) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    });
    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    const action =
      dto.action ??
      (dto.status === ReportStatus.DISMISSED
        ? ReportResolutionAction.DISMISSED
        : ReportResolutionAction.NONE);

    // Validate target compatibility for product-specific enforcement actions
    if (
      (action === ReportResolutionAction.PRODUCT_REJECTED ||
        action === ReportResolutionAction.PRODUCT_ARCHIVED) &&
      !report.product_id
    ) {
      throw new BadRequestException(
        'Cannot apply a product action to a report without an associated product.',
      );
    }

    const targetSellerUserId =
      report.seller?.user_id || report.product?.seller?.user_id || null;

    if (
      (action === ReportResolutionAction.WARNING_ISSUED ||
        action === ReportResolutionAction.SELLER_SUSPENDED) &&
      !targetSellerUserId
    ) {
      throw new BadRequestException(
        'Cannot apply a seller action because the seller account no longer exists.',
      );
    }

    const trimmedNotes = dto.admin_notes?.trim() || null;
    const isFinalStatus =
      dto.status === ReportStatus.RESOLVED ||
      dto.status === ReportStatus.DISMISSED;

    const updatedReport = await this.prisma.$transaction(async (tx) => {
      if (
        action === ReportResolutionAction.PRODUCT_REJECTED &&
        report.product_id
      ) {
        await tx.product.update({
          where: { id: report.product_id },
          data: { status: 'rejected' },
        });
      } else if (
        action === ReportResolutionAction.PRODUCT_ARCHIVED &&
        report.product_id
      ) {
        await tx.product.update({
          where: { id: report.product_id },
          data: { status: 'archived' },
        });
      } else if (
        action === ReportResolutionAction.WARNING_ISSUED &&
        targetSellerUserId
      ) {
        await tx.user.update({
          where: { id: targetSellerUserId },
          data: { warnings: { increment: 1 } },
        });
      } else if (
        action === ReportResolutionAction.SELLER_SUSPENDED &&
        targetSellerUserId
      ) {
        await tx.user.update({
          where: { id: targetSellerUserId },
          data: { is_suspended: true },
        });
      }

      return tx.report.update({
        where: { id },
        data: {
          status: dto.status,
          resolution_action: action,
          admin_notes: trimmedNotes ?? report.admin_notes,
          reviewed_by: actor.id,
          reviewed_at: isFinalStatus ? new Date() : report.reviewed_at,
        },
        include: REPORT_INCLUDE,
      });
    });

    // Audit log (best-effort)
    void this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'report.resolve',
      entityType: 'report',
      entityId: report.id,
      reason: trimmedNotes || `Status set to ${dto.status} (${action})`,
      before: {
        status: report.status,
        resolution_action: report.resolution_action,
      },
      after: {
        status: updatedReport.status,
        resolution_action: updatedReport.resolution_action,
      },
      metadata: {
        target_type: report.target_type,
        product_id: report.product_id,
        seller_id: report.seller_id,
        enforcement_action: action,
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    // Notify affected seller when enforcement action was applied
    if (targetSellerUserId) {
      if (action === ReportResolutionAction.PRODUCT_REJECTED) {
        void this.notifications.create({
          userId: targetSellerUserId,
          type: NotificationType.PRODUCT_REJECTED,
          title: 'Product removed after buyer report',
          body: `Your listing "${report.product?.title || 'Product'}" was rejected by Trust & Safety following a buyer report.${trimmedNotes ? ` Note: ${trimmedNotes}` : ''}`,
          link: '/dashboard/products',
        });
      } else if (action === ReportResolutionAction.PRODUCT_ARCHIVED) {
        void this.notifications.create({
          userId: targetSellerUserId,
          type: NotificationType.SYSTEM,
          title: 'Product archived after review',
          body: `Your listing "${report.product?.title || 'Product'}" was archived by Trust & Safety.${trimmedNotes ? ` Note: ${trimmedNotes}` : ''}`,
          link: '/dashboard/products',
        });
      } else if (action === ReportResolutionAction.WARNING_ISSUED) {
        void this.notifications.create({
          userId: targetSellerUserId,
          type: NotificationType.SYSTEM,
          title: 'Account warning issued',
          body: `Verndly Trust & Safety issued a formal warning on your store following a buyer report.${trimmedNotes ? ` Note: ${trimmedNotes}` : ''}`,
          link: '/dashboard',
        });
      } else if (action === ReportResolutionAction.SELLER_SUSPENDED) {
        void this.notifications.create({
          userId: targetSellerUserId,
          type: NotificationType.SYSTEM,
          title: 'Store suspended by Trust & Safety',
          body: `Your store has been suspended following a Trust & Safety review.${trimmedNotes ? ` Note: ${trimmedNotes}` : ' Contact support@verndly.com for assistance.'}`,
          link: '/contact',
        });
      }
    }

    // Notify buyer (reporter) when report reaches a final state
    if (isFinalStatus) {
      const targetName =
        report.target_type === ReportTargetType.PRODUCT
          ? report.product?.title || 'the product'
          : report.seller?.store_name || 'the seller';
      void this.notifications.create({
        userId: report.reporter_id,
        type: NotificationType.SYSTEM,
        title:
          dto.status === ReportStatus.RESOLVED
            ? 'Your report has been resolved'
            : 'Update on your report',
        body:
          dto.status === ReportStatus.RESOLVED
            ? `Thank you for helping keep Verndly safe. Our Trust & Safety team reviewed your report regarding ${targetName} and took appropriate action.`
            : `Our Trust & Safety team reviewed your report regarding ${targetName} and determined no policy violation occurred at this time.`,
        link: '/',
      });
    }

    return {
      message: 'Report updated successfully.',
      report: updatedReport,
    };
  }

  private async notifyAdminsOfNewReport(
    reportId: string,
    targetType: ReportTargetType,
    reason: ReportReason,
    targetLabel: string,
  ) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', is_suspended: false },
        select: { id: true },
      });
      if (!admins.length) return;

      const reasonLabel = REASON_LABELS[reason] || reason;
      await this.notifications.createMany(
        admins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.SYSTEM,
          title: `New ${targetType === ReportTargetType.PRODUCT ? 'Product' : 'Seller'} Report`,
          body: `A buyer reported ${targetLabel} for ${reasonLabel}.`,
          link: `/reports?highlight=${reportId}`,
          data: { report_id: reportId, target_type: targetType, reason },
        })),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to notify admins for report ${reportId}: ${(err as Error)?.message}`,
      );
    }
  }
}
