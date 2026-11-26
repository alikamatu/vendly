import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CloudinaryService } from '../common/cloudinary.service';
import { AuditLogService } from '../audit/audit-log.service';

export const SELLER_DELETION_GRACE_DAYS = 14;
export const SELLER_DELETION_REMINDER_DAYS_BEFORE = 3;

export const ACTIVE_STANDING_ORDER_STATUSES = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'PROCESSING',
  'PROCESSED',
  'SHIPPED',
  'ON THE WAY',
  'AVAILABLE FOR PICKUP',
] as const;

export const OPEN_RETURN_STATUSES = [
  'PENDING',
  'APPROVED',
  'ESCALATED',
] as const;

export interface LifecycleBlocker {
  code:
    | 'ADMIN_ACCOUNT'
    | 'STANDING_SELLER_ORDERS'
    | 'ESCROW_WINDOW_ORDERS'
    | 'OPEN_SELLER_RETURNS'
    | 'UNSETTLED_PAYOUTS'
    | 'STANDING_BUYER_ORDERS'
    | 'OPEN_BUYER_RETURNS';
  label: string;
  count?: number;
  amount?: number;
  href?: string;
}

export interface AccountLifecycleStatus {
  role: string;
  is_seller: boolean;
  has_password: boolean;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING_DELETION' | 'SUSPENDED';
  disabled_at: string | null;
  deletion_requested_at: string | null;
  deletion_scheduled_for: string | null;
  grace_period_days: number;
  product_count: number;
  can_disable: boolean;
  disable_blockers: LifecycleBlocker[];
  can_delete: boolean;
  delete_blockers: LifecycleBlocker[];
}

export interface LifecycleActionDto {
  password?: string;
  confirmText?: string;
}

@Injectable()
export class AccountLifecycleService {
  private readonly logger = new Logger(AccountLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly cloudinary: CloudinaryService,
    private readonly auditLogs: AuditLogService,
  ) {}

  private async verifyConfirmation(
    user: { password_hash: string | null },
    dto: LifecycleActionDto | undefined,
    expectedKeyword: 'DISABLE' | 'DELETE',
  ) {
    if (user.password_hash) {
      const password = dto?.password?.trim();
      if (!password) {
        throw new BadRequestException(
          'Please enter your current password to confirm this action.',
        );
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        throw new UnauthorizedException('Incorrect password.');
      }
    } else {
      const keyword = dto?.confirmText?.trim().toUpperCase();
      if (keyword !== expectedKeyword) {
        throw new BadRequestException(
          `Please type ${expectedKeyword} to confirm this action.`,
        );
      }
    }
  }

  async getLifecycleStatus(userId: string): Promise<AccountLifecycleStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seller_profile: {
          include: {
            balance_snapshot: true,
            _count: { select: { products: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const sellerProfile = user.seller_profile;
    const isSeller = user.role === 'SELLER' || Boolean(sellerProfile);
    const disableBlockers: LifecycleBlocker[] = [];
    const deleteBlockers: LifecycleBlocker[] = [];

    if (user.role === 'ADMIN') {
      const adminBlocker: LifecycleBlocker = {
        code: 'ADMIN_ACCOUNT',
        label:
          'Administrator accounts cannot be self-disabled or self-deleted.',
      };
      disableBlockers.push(adminBlocker);
      deleteBlockers.push(adminBlocker);
    }

    // 1. Buyer-side standing orders & open returns (applies to every user)
    const [standingBuyerOrders, openBuyerReturns] = await Promise.all([
      this.prisma.order.count({
        where: {
          buyer_id: userId,
          status: { in: [...ACTIVE_STANDING_ORDER_STATUSES] },
        },
      }),
      this.prisma.returnRequest.count({
        where: {
          buyer_id: userId,
          status: { in: [...OPEN_RETURN_STATUSES] },
        },
      }),
    ]);

    if (standingBuyerOrders > 0) {
      deleteBlockers.push({
        code: 'STANDING_BUYER_ORDERS',
        label: `You have ${standingBuyerOrders} active order${standingBuyerOrders === 1 ? '' : 's'} in progress. Wait for delivery or cancel them before deleting your account.`,
        count: standingBuyerOrders,
        href: '/orders',
      });
    }

    if (openBuyerReturns > 0) {
      deleteBlockers.push({
        code: 'OPEN_BUYER_RETURNS',
        label: `You have ${openBuyerReturns} open return or refund claim${openBuyerReturns === 1 ? '' : 's'}. Wait for resolution before deleting your account.`,
        count: openBuyerReturns,
        href: '/orders',
      });
    }

    // 2. Seller-side standing orders, 3-day escrow holds, open returns, & pending payouts
    if (sellerProfile) {
      const [
        standingSellerOrders,
        escrowWindowOrders,
        openSellerReturns,
        pendingPayoutCount,
      ] = await Promise.all([
        this.prisma.order.count({
          where: {
            status: { in: [...ACTIVE_STANDING_ORDER_STATUSES] },
            items: { some: { product: { seller_id: sellerProfile.id } } },
          },
        }),
        this.prisma.order.count({
          where: {
            status: 'DELIVERED',
            items: { some: { product: { seller_id: sellerProfile.id } } },
            transaction: {
              is: {
                provider: 'PAYSTACK',
                status: 'SUCCESS',
                payout: { is: null },
              },
            },
          },
        }),
        this.prisma.returnRequest.count({
          where: {
            status: { in: [...OPEN_RETURN_STATUSES] },
            order: {
              items: { some: { product: { seller_id: sellerProfile.id } } },
            },
          },
        }),
        this.prisma.payout.count({
          where: {
            seller_id: sellerProfile.id,
            status: { in: ['PENDING', 'PROCESSING'] },
          },
        }),
      ]);

      if (standingSellerOrders > 0) {
        const blocker: LifecycleBlocker = {
          code: 'STANDING_SELLER_ORDERS',
          label: `You have ${standingSellerOrders} standing customer order${standingSellerOrders === 1 ? '' : 's'} to fulfill or cancel first.`,
          count: standingSellerOrders,
          href: '/dashboard/orders',
        };
        disableBlockers.push(blocker);
        deleteBlockers.push(blocker);
      }

      if (openSellerReturns > 0) {
        const blocker: LifecycleBlocker = {
          code: 'OPEN_SELLER_RETURNS',
          label: `You have ${openSellerReturns} open customer return/dispute claim${openSellerReturns === 1 ? '' : 's'} that must be resolved first.`,
          count: openSellerReturns,
          href: '/dashboard/orders',
        };
        disableBlockers.push(blocker);
        deleteBlockers.push(blocker);
      }

      if (escrowWindowOrders > 0) {
        deleteBlockers.push({
          code: 'ESCROW_WINDOW_ORDERS',
          label: `${escrowWindowOrders} delivered order${escrowWindowOrders === 1 ? ' is' : 's are'} still inside the 3-day Paystack escrow inspection window.`,
          count: escrowWindowOrders,
          href: '/dashboard/orders',
        });
      }

      const pendingBal = Number(
        sellerProfile.balance_snapshot?.pending_balance ?? 0,
      );
      const availableBal = Number(
        sellerProfile.balance_snapshot?.available_balance ?? 0,
      );
      const unsettledTotal =
        Math.max(0, pendingBal) + Math.max(0, availableBal);

      if (pendingPayoutCount > 0 || unsettledTotal > 0.01) {
        deleteBlockers.push({
          code: 'UNSETTLED_PAYOUTS',
          label:
            unsettledTotal > 0.01
              ? `You still have GH₵ ${unsettledTotal.toFixed(2)} in pending/available balance or active payout transfers. Wait for settlement before deleting.`
              : `You have ${pendingPayoutCount} payout transfer${pendingPayoutCount === 1 ? '' : 's'} still processing.`,
          count: pendingPayoutCount,
          amount: unsettledTotal,
          href: '/dashboard/payouts',
        });
      }
    }

    const status: AccountLifecycleStatus['status'] = user.is_suspended
      ? 'SUSPENDED'
      : user.deletion_scheduled_for
        ? 'PENDING_DELETION'
        : user.disabled_at
          ? 'DISABLED'
          : 'ACTIVE';

    return {
      role: user.role,
      is_seller: isSeller,
      has_password: Boolean(user.password_hash),
      status,
      disabled_at: user.disabled_at ? user.disabled_at.toISOString() : null,
      deletion_requested_at: user.deletion_requested_at
        ? user.deletion_requested_at.toISOString()
        : null,
      deletion_scheduled_for: user.deletion_scheduled_for
        ? user.deletion_scheduled_for.toISOString()
        : null,
      grace_period_days: isSeller ? SELLER_DELETION_GRACE_DAYS : 0,
      product_count: sellerProfile?._count?.products ?? 0,
      can_disable: disableBlockers.length === 0 && !user.is_suspended,
      disable_blockers: disableBlockers,
      can_delete: deleteBlockers.length === 0 && !user.is_suspended,
      delete_blockers: deleteBlockers,
    };
  }

  async disableAccount(userId: string, dto?: LifecycleActionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller_profile: { select: { id: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.is_suspended) {
      throw new ForbiddenException('Suspended accounts cannot be modified.');
    }

    await this.verifyConfirmation(user, dto, 'DISABLE');

    const status = await this.getLifecycleStatus(userId);
    if (!status.can_disable) {
      throw new BadRequestException({
        message:
          status.disable_blockers[0]?.label ||
          'Resolve active store obligations before disabling your account.',
        blockers: status.disable_blockers,
      });
    }

    const now = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { disabled_at: now },
    });

    await this.auditLogs
      .record({
        actorId: userId,
        actorRole: user.role,
        entityType: 'user',
        entityId: userId,
        action: 'user.self_disable',
        after: { disabled_at: now.toISOString() },
      })
      .catch(() => {});

    this.emailService
      .sendAccountDisabledEmail(user.email, user.full_name, status.is_seller)
      .catch((err) =>
        this.logger.warn(`Failed to send account disabled email: ${err}`),
      );

    return {
      message: status.is_seller
        ? 'Your account and storefront have been disabled. Sign back in anytime to reactivate.'
        : 'Your account has been disabled. Sign back in anytime to reactivate.',
      disabled_at: now.toISOString(),
    };
  }

  async reactivateAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.is_suspended) {
      throw new ForbiddenException(
        'This account was suspended by an administrator and cannot be self-reactivated.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        disabled_at: null,
        deletion_requested_at: null,
        deletion_scheduled_for: null,
        deletion_reminder_sent_at: null,
      },
    });

    await this.auditLogs
      .record({
        actorId: userId,
        actorRole: user.role,
        entityType: 'user',
        entityId: userId,
        action: 'user.self_reactivate',
      })
      .catch(() => {});

    return {
      message: 'Your account is active again.',
      status: 'ACTIVE',
    };
  }

  async requestAccountDeletion(userId: string, dto?: LifecycleActionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seller_profile: {
          include: { _count: { select: { products: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.is_suspended) {
      throw new ForbiddenException('Suspended accounts cannot be modified.');
    }

    await this.verifyConfirmation(user, dto, 'DELETE');

    const status = await this.getLifecycleStatus(userId);
    if (!status.can_delete) {
      throw new BadRequestException({
        message:
          status.delete_blockers[0]?.label ||
          'You cannot delete your account while standing orders or payouts remain open.',
        blockers: status.delete_blockers,
      });
    }

    // Buyers without a seller profile are deleted immediately
    if (!status.is_seller) {
      await this.executePermanentDeletion(userId, { skipBlockerRecheck: true });
      return {
        deleted: true,
        scheduled: false,
        deletion_scheduled_for: null,
        grace_period_days: 0,
        message: 'Your account has been permanently deleted.',
      };
    }

    // Sellers get a mandatory 14-day grace period; storefront & products hide immediately
    const now = new Date();
    const scheduledFor = new Date(
      now.getTime() + SELLER_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        disabled_at: now,
        deletion_requested_at: now,
        deletion_scheduled_for: scheduledFor,
        deletion_reminder_sent_at: null,
      },
    });

    await this.auditLogs
      .record({
        actorId: userId,
        actorRole: user.role,
        entityType: 'user',
        entityId: userId,
        action: 'user.deletion_scheduled',
        after: {
          deletion_requested_at: now.toISOString(),
          deletion_scheduled_for: scheduledFor.toISOString(),
          product_count: status.product_count,
        },
      })
      .catch(() => {});

    this.emailService
      .sendAccountDeletionScheduledEmail(
        user.email,
        user.full_name,
        scheduledFor,
        status.product_count,
      )
      .catch((err) =>
        this.logger.warn(`Failed to send deletion scheduled email: ${err}`),
      );

    return {
      deleted: false,
      scheduled: true,
      deletion_scheduled_for: scheduledFor.toISOString(),
      grace_period_days: SELLER_DELETION_GRACE_DAYS,
      message: `Your seller account is scheduled for permanent deletion on ${scheduledFor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. Your storefront and listings are now hidden, and all products will be permanently deleted in ${SELLER_DELETION_GRACE_DAYS} days unless you cancel.`,
    };
  }

  async cancelScheduledDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.is_suspended) {
      throw new ForbiddenException('Suspended accounts cannot be modified.');
    }
    if (!user.deletion_scheduled_for) {
      return {
        message: 'No scheduled account deletion was active.',
        status: user.disabled_at ? 'DISABLED' : 'ACTIVE',
      };
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        disabled_at: null,
        deletion_requested_at: null,
        deletion_scheduled_for: null,
        deletion_reminder_sent_at: null,
      },
    });

    await this.auditLogs
      .record({
        actorId: userId,
        actorRole: user.role,
        entityType: 'user',
        entityId: userId,
        action: 'user.deletion_cancelled',
      })
      .catch(() => {});

    return {
      message:
        'Scheduled account deletion has been cancelled. Your storefront and listings are active again.',
      status: 'ACTIVE',
    };
  }

  /**
   * Executes final permanent account deletion:
   * - For sellers: snapshots `product_title` on historical `OrderItem`s,
   *   hard-deletes ALL seller `Product` rows (+ best-effort Cloudinary cleanup),
   *   and retires `store_link` (`deleted-<shortId>-<oldLink>`).
   * - If the user has zero financial/order history, hard-deletes the `User` row.
   * - Otherwise anonymizes PII (`deleted_<id>@verndly.com`, freeing their real
   *   email for future reuse) while preserving accounting records.
   */
  async executePermanentDeletion(
    userId: string,
    opts?: { skipBlockerRecheck?: boolean },
  ): Promise<{
    deleted: boolean;
    mode: 'HARD_DELETE' | 'ANONYMIZED';
    deletedProducts: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: { take: 1, select: { id: true } },
        seller_profile: {
          include: {
            products: {
              select: {
                id: true,
                title: true,
                image_urls: true,
                video_url: true,
              },
            },
            payouts: { take: 1, select: { id: true } },
            ledger_entries: { take: 1, select: { id: true } },
            promotion_payments: { take: 1, select: { id: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!opts?.skipBlockerRecheck) {
      const status = await this.getLifecycleStatus(userId);
      if (!status.can_delete) {
        this.logger.warn(
          `Skipped scheduled deletion for user ${userId} due to blockers: ${status.delete_blockers.map((b) => b.code).join(', ')}`,
        );
        return { deleted: false, mode: 'ANONYMIZED', deletedProducts: 0 };
      }
    }

    const originalEmail = user.email;
    const originalName = user.full_name;
    const sellerProfile = user.seller_profile;
    const isSeller = user.role === 'SELLER' || Boolean(sellerProfile);
    const sellerProducts = sellerProfile?.products ?? [];
    let deletedProducts = 0;

    // 1. Delete all seller products (hard delete!) after snapshotting OrderItem titles
    const mediaToDestroy: Array<{ url: string; type: 'image' | 'video' }> = [];
    if (sellerProfile && sellerProducts.length > 0) {
      for (const product of sellerProducts) {
        for (const img of product.image_urls || []) {
          mediaToDestroy.push({ url: img, type: 'image' });
        }
        if (product.video_url) {
          mediaToDestroy.push({ url: product.video_url, type: 'video' });
        }
      }

      // Snapshot product_title on historical order items before hard-deleting products
      await Promise.all(
        sellerProducts.map((p) =>
          this.prisma.orderItem.updateMany({
            where: { product_id: p.id, product_title: null },
            data: { product_title: p.title },
          }),
        ),
      );

      const delRes = await this.prisma.product.deleteMany({
        where: { seller_id: sellerProfile.id },
      });
      deletedProducts = delRes.count;
    }

    // Check if any historical financial / order / review records require anonymization
    const hasBuyerOrders = user.orders.length > 0;
    const hasSellerFinancials = Boolean(
      sellerProfile &&
      (sellerProfile.payouts.length > 0 ||
        sellerProfile.ledger_entries.length > 0 ||
        sellerProfile.promotion_payments.length > 0),
    );
    const hasOrderItemsForSeller =
      sellerProfile && !hasSellerFinancials
        ? (await this.prisma.orderItem.count({
            where: {
              product_title: { not: null },
              order: {
                transaction: {
                  is: {
                    ledger_entries: {
                      some: { seller_id: sellerProfile.id },
                    },
                  },
                },
              },
            },
          })) > 0
        : false;

    const mustRetainLedger =
      hasBuyerOrders || hasSellerFinancials || hasOrderItemsForSeller;

    let mode: 'HARD_DELETE' | 'ANONYMIZED' = 'HARD_DELETE';

    if (mustRetainLedger || sellerProfile) {
      // If seller has zero financials & zero orders, we can still retire their store_link
      // to prevent handle hijacking (per user decision #4) while freeing their real email.
      if (sellerProfile) {
        if (sellerProfile.logo_url) {
          mediaToDestroy.push({ url: sellerProfile.logo_url, type: 'image' });
        }
        const retiredSlug = sellerProfile.store_link.startsWith('deleted-')
          ? sellerProfile.store_link
          : `deleted-${sellerProfile.id.slice(0, 8)}-${sellerProfile.store_link}`.slice(
              0,
              120,
            );

        await this.prisma.sellerProfile.update({
          where: { id: sellerProfile.id },
          data: {
            store_name: 'Closed Store',
            store_link: retiredSlug,
            logo_url: null,
            bio: null,
            whatsapp_number: null,
            location: null,
            area: null,
            delivery_policies: null,
            business_hours: null,
            social_links: {},
            bank_name: null,
            bank_code: null,
            account_number: null,
          },
        });
      }

      mode = 'ANONYMIZED';
      await this.prisma.address.deleteMany({ where: { user_id: userId } });
      await this.prisma.favorite.deleteMany({ where: { user_id: userId } });
      await this.prisma.notification.deleteMany({ where: { user_id: userId } });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          full_name: 'Deleted User',
          email: `deleted_${userId}@verndly.com`,
          password_hash: null,
          school: 'Deleted',
          is_suspended: true,
          disabled_at: new Date(),
          deletion_scheduled_for: null,
          deletion_reminder_sent_at: null,
          email_verification_token: null,
          password_reset_token: null,
          verification_doc: null,
          phone_e164: null,
          oauth_provider: null,
          oauth_provider_id: null,
          avatar_url: null,
          totp_secret: null,
          totp_enabled: false,
          totp_backup_codes: [],
        },
      });
    } else {
      // Pure buyer with zero orders — full hard delete
      await this.prisma.address.deleteMany({ where: { user_id: userId } });
      await this.prisma.favorite.deleteMany({ where: { user_id: userId } });
      await this.prisma.notification.deleteMany({ where: { user_id: userId } });
      await this.prisma.adminApproval.deleteMany({
        where: { user_id: userId },
      });
      await this.prisma.user.delete({ where: { id: userId } });
    }

    // Best-effort Cloudinary cleanup (non-blocking)
    if (mediaToDestroy.length > 0) {
      void Promise.allSettled(
        mediaToDestroy.map((m) => this.cloudinary.deleteByUrl(m.url, m.type)),
      );
    }

    await this.auditLogs
      .record({
        actorId: null,
        actorRole: user.role,
        entityType: 'user',
        entityId: userId,
        action: 'user.permanently_deleted',
        metadata: { mode, isSeller, deletedProducts },
      })
      .catch(() => {});

    if (originalEmail && !originalEmail.startsWith('deleted_')) {
      this.emailService
        .sendAccountDeletedEmail(originalEmail, originalName, isSeller)
        .catch((err) =>
          this.logger.warn(`Failed to send account deleted email: ${err}`),
        );
    }

    this.logger.log(
      `Permanently deleted account ${userId} (mode=${mode}, isSeller=${isSeller}, deletedProducts=${deletedProducts})`,
    );

    return { deleted: true, mode, deletedProducts };
  }

  /**
   * Hourly cron sweep:
   * 1. Sends a 3-day pre-deletion reminder email (Day 11) to sellers whose
   *    deletion_scheduled_for is within the next 3 days.
   * 2. Executes permanent deletion for any account whose deletion_scheduled_for <= now.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledDeletions() {
    const now = new Date();
    const reminderCutoff = new Date(
      now.getTime() +
        SELLER_DELETION_REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000,
    );

    // 1. Send 3-day reminder emails
    const reminderCandidates = await this.prisma.user.findMany({
      where: {
        deletion_scheduled_for: { gt: now, lte: reminderCutoff },
        deletion_reminder_sent_at: null,
        is_suspended: false,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        deletion_scheduled_for: true,
      },
      take: 100,
    });

    let remindersSent = 0;
    for (const candidate of reminderCandidates) {
      if (!candidate.deletion_scheduled_for) continue;
      const daysRemaining = Math.max(
        1,
        Math.ceil(
          (candidate.deletion_scheduled_for.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      try {
        await this.emailService.sendAccountDeletionReminderEmail(
          candidate.email,
          candidate.full_name,
          candidate.deletion_scheduled_for,
          daysRemaining,
        );
        await this.prisma.user.update({
          where: { id: candidate.id },
          data: { deletion_reminder_sent_at: now },
        });
        remindersSent++;
      } catch (err) {
        this.logger.error(
          `Failed to send deletion reminder to user ${candidate.id}`,
          err,
        );
      }
    }

    // 2. Execute matured Day-14 deletions
    const dueUsers = await this.prisma.user.findMany({
      where: {
        deletion_scheduled_for: { lte: now },
      },
      select: { id: true },
      take: 50,
    });

    let deletedCount = 0;
    let totalProductsDeleted = 0;
    for (const u of dueUsers) {
      try {
        const res = await this.executePermanentDeletion(u.id);
        if (res.deleted) {
          deletedCount++;
          totalProductsDeleted += res.deletedProducts;
        }
      } catch (err) {
        this.logger.error(
          `Failed to execute scheduled deletion for user ${u.id}`,
          err,
        );
      }
    }

    if (remindersSent > 0 || deletedCount > 0) {
      this.logger.log(
        `Account deletion sweep complete: remindersSent=${remindersSent}, deletedCount=${deletedCount}, totalProductsDeleted=${totalProductsDeleted}`,
      );
    }

    return {
      remindersChecked: reminderCandidates.length,
      remindersSent,
      dueChecked: dueUsers.length,
      deletedCount,
      totalProductsDeleted,
    };
  }
}
