import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Role, ApprovalStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveVerificationDto } from './dto/approve-verification.dto';
import {
  AdminQueryDto,
  ApprovalStatusFilter,
  UserAccountStatusFilter,
} from './dto/admin-query.dto';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../email/email.service';
import { Actor, AuditLogService } from '../audit/audit-log.service';
import { NotificationService } from '../notification/notification.service';
import { AccountLifecycleService } from './account-lifecycle.service';

import {
  UpdateUserRoleDto,
  WarnUserDto,
  ToggleSuspensionDto,
  SetVerificationDto,
  ResetWarningsDto,
  AdminUpdateProfileDto,
  AdminUpdateStoreDto,
  AdminNotifyUserDto,
  AdminExecuteDeletionDto,
} from './dto/admin-user-actions.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private emailService: EmailService,
    private auditLogs: AuditLogService,
    private notifications: NotificationService,
    private accountLifecycle: AccountLifecycleService,
  ) {}

  private assertNotSelf(
    targetUserId: string,
    actor?: Actor,
    action = 'perform this action on',
  ) {
    if (actor?.id && actor.id === targetUserId) {
      throw new ForbiddenException(
        `Restricted: you cannot ${action} your own admin account.`,
      );
    }
  }

  private async assertNotLastActiveAdmin(targetUserId: string) {
    const otherActiveAdmins = await this.prisma.user.count({
      where: {
        role: Role.ADMIN,
        is_suspended: false,
        disabled_at: null,
        id: { not: targetUserId },
      },
    });
    if (otherActiveAdmins === 0) {
      throw new BadRequestException(
        'Restricted: cannot modify or remove the last active platform admin.',
      );
    }
  }

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
    const limit = Math.min(200, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.hasStore === 'true') {
      where.seller_profile = { isNot: null };
    } else if (query.hasStore === 'false') {
      where.seller_profile = { is: null };
    }

    if (
      query.accountStatus &&
      query.accountStatus !== UserAccountStatusFilter.ALL
    ) {
      switch (query.accountStatus) {
        case UserAccountStatusFilter.SUSPENDED:
          where.is_suspended = true;
          break;
        case UserAccountStatusFilter.DISABLED:
          where.disabled_at = { not: null };
          where.deletion_scheduled_for = null;
          break;
        case UserAccountStatusFilter.DELETING:
          where.deletion_scheduled_for = { not: null };
          break;
        case UserAccountStatusFilter.ACTIVE:
          where.is_suspended = false;
          where.disabled_at = null;
          where.deletion_scheduled_for = null;
          break;
        case UserAccountStatusFilter.VERIFIED:
          where.is_verified = true;
          break;
        case UserAccountStatusFilter.UNVERIFIED:
          where.is_verified = false;
          break;
      }
    } else if (query.status && query.status !== ApprovalStatusFilter.ALL) {
      if (query.status === 'PENDING') where.is_verified = false;
      if (query.status === 'APPROVED') where.is_verified = true;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { full_name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { school: { contains: term, mode: 'insensitive' } },
        { phone_e164: { contains: term, mode: 'insensitive' } },
        {
          seller_profile: {
            store_name: { contains: term, mode: 'insensitive' },
          },
        },
        {
          seller_profile: {
            store_link: { contains: term, mode: 'insensitive' },
          },
        },
      ];
    }

    const [
      users,
      total,
      totalAll,
      buyersCount,
      sellersCount,
      adminsCount,
      verifiedCount,
      suspendedCount,
      disabledCount,
      deletingCount,
      storesCount,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          full_name: true,
          email: true,
          school: true,
          role: true,
          is_verified: true,
          is_suspended: true,
          disabled_at: true,
          deletion_requested_at: true,
          deletion_scheduled_for: true,
          warnings: true,
          is_pro: true,
          pro_expires_at: true,
          totp_enabled: true,
          totp_method: true,
          phone_e164: true,
          oauth_provider: true,
          avatar_url: true,
          created_at: true,
          updated_at: true,
          seller_profile: {
            select: {
              id: true,
              store_name: true,
              store_link: true,
              logo_url: true,
              whatsapp_number: true,
              location: true,
              area: true,
              bank_name: true,
              paystack_subaccount_code: true,
              onboarding_completed: true,
              payment_timing: true,
              service_area: true,
              rating_avg: true,
              rating_count: true,
              balance_snapshot: {
                select: {
                  available_balance: true,
                  pending_balance: true,
                  total_earned: true,
                  total_withdrawn: true,
                },
              },
              _count: {
                select: {
                  products: true,
                  reports: true,
                },
              },
            },
          },
          _count: {
            select: {
              orders: true,
              reviews: true,
              reports_filed: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.USER } }),
      this.prisma.user.count({ where: { role: Role.SELLER } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.user.count({ where: { is_verified: true } }),
      this.prisma.user.count({ where: { is_suspended: true } }),
      this.prisma.user.count({
        where: { disabled_at: { not: null }, deletion_scheduled_for: null },
      }),
      this.prisma.user.count({
        where: { deletion_scheduled_for: { not: null } },
      }),
      this.prisma.sellerProfile.count(),
    ]);

    return {
      data: users.map((u: any) => ({
        ...u,
        id: u.id.toString(),
        orders_count: u._count?.orders ?? 0,
        reviews_count: u._count?.reviews ?? 0,
        reports_filed_count: u._count?.reports_filed ?? 0,
        seller_profile: u.seller_profile
          ? {
              ...u.seller_profile,
              id: u.seller_profile.id.toString(),
              products_count: u.seller_profile._count?.products ?? 0,
              reports_count: u.seller_profile._count?.reports ?? 0,
              balance_snapshot: u.seller_profile.balance_snapshot
                ? {
                    available_balance: Number(
                      u.seller_profile.balance_snapshot.available_balance || 0,
                    ),
                    pending_balance: Number(
                      u.seller_profile.balance_snapshot.pending_balance || 0,
                    ),
                    total_earned: Number(
                      u.seller_profile.balance_snapshot.total_earned || 0,
                    ),
                    total_withdrawn: Number(
                      u.seller_profile.balance_snapshot.total_withdrawn || 0,
                    ),
                  }
                : null,
            }
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        summary: {
          totalUsers: totalAll,
          buyers: buyersCount,
          sellers: sellersCount,
          admins: adminsCount,
          verified: verifiedCount,
          suspended: suspendedCount,
          disabled: disabledCount,
          deleting: deletingCount,
          totalStores: storesCount,
        },
      },
    };
  }

  async getStores(query: AdminQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { store_name: { contains: term, mode: 'insensitive' } },
        { store_link: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { whatsapp_number: { contains: term, mode: 'insensitive' } },
        { user: { full_name: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (
      query.accountStatus &&
      query.accountStatus !== UserAccountStatusFilter.ALL
    ) {
      if (query.accountStatus === UserAccountStatusFilter.SUSPENDED) {
        where.user = { is_suspended: true };
      } else if (query.accountStatus === UserAccountStatusFilter.DISABLED) {
        where.user = {
          disabled_at: { not: null },
          deletion_scheduled_for: null,
        };
      } else if (query.accountStatus === UserAccountStatusFilter.DELETING) {
        where.user = { deletion_scheduled_for: { not: null } };
      } else if (query.accountStatus === UserAccountStatusFilter.ACTIVE) {
        where.user = {
          is_suspended: false,
          disabled_at: null,
          deletion_scheduled_for: null,
        };
      } else if (query.accountStatus === UserAccountStatusFilter.VERIFIED) {
        where.user = { is_verified: true };
      } else if (query.accountStatus === UserAccountStatusFilter.UNVERIFIED) {
        where.user = { is_verified: false };
      }
    }

    const [stores, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
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
              role: true,
              phone_e164: true,
              is_verified: true,
              is_suspended: true,
              disabled_at: true,
              deletion_scheduled_for: true,
              warnings: true,
              is_pro: true,
              pro_expires_at: true,
              created_at: true,
            },
          },
          balance_snapshot: true,
          _count: {
            select: {
              products: true,
              payouts: true,
              reviews: true,
              reports: true,
            },
          },
        },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    return {
      data: stores.map((s) => ({
        id: s.id.toString(),
        user_id: s.user_id.toString(),
        store_name: s.store_name,
        store_link: s.store_link,
        logo_url: s.logo_url,
        bio: s.bio,
        whatsapp_number: s.whatsapp_number,
        location: s.location,
        area: s.area,
        bank_name: s.bank_name,
        account_number: s.account_number,
        paystack_subaccount_code: s.paystack_subaccount_code,
        onboarding_completed: s.onboarding_completed,
        payment_timing: s.payment_timing,
        service_area: s.service_area,
        avg_delivery_time: s.avg_delivery_time,
        rating_avg: s.rating_avg,
        rating_count: s.rating_count,
        created_at: s.created_at,
        products_count: s._count.products,
        payouts_count: s._count.payouts,
        reviews_count: s._count.reviews,
        reports_count: s._count.reports,
        balance_snapshot: s.balance_snapshot
          ? {
              available_balance: Number(
                s.balance_snapshot.available_balance || 0,
              ),
              pending_balance: Number(s.balance_snapshot.pending_balance || 0),
              total_earned: Number(s.balance_snapshot.total_earned || 0),
              total_withdrawn: Number(s.balance_snapshot.total_withdrawn || 0),
            }
          : null,
        owner: {
          ...s.user,
          id: s.user.id.toString(),
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto, actor: Actor) {
    this.assertNotSelf(id, actor, 'change the role of');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ADMIN && dto.role !== Role.ADMIN) {
      await this.assertNotLastActiveAdmin(id);
    }

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
      reason: dto.reason,
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
    this.assertNotSelf(id, actor, 'suspend or unsuspend');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ADMIN && !user.is_suspended) {
      await this.assertNotLastActiveAdmin(id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { is_suspended: !user.is_suspended },
    });

    if (updated.is_suspended && user.email) {
      this.emailService
        .sendAccountSuspendedEmail(
          user.email,
          user.full_name,
          dto.reason || 'Policy violation. Contact support for details.',
        )
        .catch((err) => console.error('Failed to send suspension email:', err));
    }

    void this.notifications.create({
      userId: id,
      type: NotificationType.SYSTEM,
      title: updated.is_suspended
        ? 'Your account has been suspended'
        : 'Your account suspension was lifted',
      body: updated.is_suspended
        ? dto.reason ||
          'Your account has been suspended by platform administration. Contact support@verndly.com for details.'
        : 'Your Verndly account has been reinstated by platform administration.',
      link: '/contact',
    });

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
    this.assertNotSelf(id, actor, 'issue a warning to');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { warnings: { increment: 1 } },
    });

    void this.notifications.create({
      userId: id,
      type: NotificationType.SYSTEM,
      title: 'Official account warning',
      body: dto.reason,
      link: '/account',
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

  async resetUserWarnings(id: string, dto: ResetWarningsDto, actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { warnings: 0 },
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.warnings_reset',
      entityType: 'user',
      entityId: id,
      reason: dto.reason || 'Admin cleared warnings',
      before: { warnings: user.warnings },
      after: { warnings: 0 },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { message: 'User warnings cleared.', warnings: 0 };
  }

  async setUserVerification(id: string, dto: SetVerificationDto, actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { is_verified: dto.is_verified },
      }),
      this.prisma.sellerProfile.updateMany({
        where: { user_id: id },
        data: { is_seller_verified: dto.is_verified },
      }),
    ]);

    if (dto.is_verified) {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { user_id: id },
      });
      if (
        seller &&
        seller.bank_code &&
        seller.account_number &&
        !seller.paystack_subaccount_code
      ) {
        this.paymentsService.createSubaccount(seller.id).catch((err) => {
          console.error(
            'Failed to trigger subaccount creation on admin verify:',
            err,
          );
        });
      }
    }

    void this.notifications.create({
      userId: id,
      type: NotificationType.SYSTEM,
      title: dto.is_verified
        ? 'Your account is now verified'
        : 'Account verification status updated',
      body: dto.is_verified
        ? 'An administrator verified your Verndly account.'
        : dto.reason ||
          'Your verification badge was removed by platform administration.',
      link: '/dashboard',
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: dto.is_verified ? 'user.verify' : 'user.unverify',
      entityType: 'user',
      entityId: id,
      reason: dto.reason,
      before: { is_verified: user.is_verified },
      after: { is_verified: dto.is_verified },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: dto.is_verified
        ? 'User marked as verified.'
        : 'User verification revoked.',
      is_verified: dto.is_verified,
    };
  }

  async updateUserProfile(
    id: string,
    dto: AdminUpdateProfileDto,
    actor: Actor,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: Record<string, any> = {};
    if (dto.full_name !== undefined) data.full_name = dto.full_name.trim();
    if (dto.school !== undefined) data.school = dto.school.trim();
    if (dto.phone_e164 !== undefined) {
      data.phone_e164 = dto.phone_e164?.trim() || null;
    }
    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email.toLowerCase()) {
        const conflict = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });
        if (conflict) {
          throw new ConflictException(
            'Another user is already registered with that email address.',
          );
        }
        data.email = normalizedEmail;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No profile changes provided.');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        full_name: true,
        email: true,
        school: true,
        phone_e164: true,
      },
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.profile_update',
      entityType: 'user',
      entityId: id,
      reason: dto.reason,
      before: {
        full_name: user.full_name,
        email: user.email,
        school: user.school,
        phone_e164: user.phone_e164,
      },
      after: updated,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { message: 'User profile updated.', user: updated };
  }

  async updateUserStore(id: string, dto: AdminUpdateStoreDto, actor: Actor) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: id },
    });
    if (!store) {
      throw new NotFoundException('This user does not have a seller store.');
    }

    const data: Record<string, any> = {};
    if (dto.store_name !== undefined) data.store_name = dto.store_name.trim();
    if (dto.bio !== undefined) data.bio = dto.bio?.trim() || null;
    if (dto.whatsapp_number !== undefined) {
      data.whatsapp_number = dto.whatsapp_number?.trim() || null;
    }
    if (dto.location !== undefined)
      data.location = dto.location?.trim() || null;
    if (dto.area !== undefined) data.area = dto.area?.trim() || null;
    if (dto.payment_timing !== undefined)
      data.payment_timing = dto.payment_timing;
    if (dto.service_area !== undefined) data.service_area = dto.service_area;
    if (dto.avg_delivery_time !== undefined) {
      data.avg_delivery_time = dto.avg_delivery_time;
    }
    if (dto.onboarding_completed !== undefined) {
      data.onboarding_completed = dto.onboarding_completed;
    }
    if (dto.store_link !== undefined) {
      const slug = dto.store_link
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) {
        throw new BadRequestException('Invalid store handle.');
      }
      if (slug !== store.store_link) {
        const conflict = await this.prisma.sellerProfile.findUnique({
          where: { store_link: slug },
          select: { id: true },
        });
        if (conflict) {
          throw new ConflictException(
            `Store handle "@${slug}" is already taken.`,
          );
        }
        data.store_link = slug;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No store changes provided.');
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { id: store.id },
      data,
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.store_update',
      entityType: 'seller_profile',
      entityId: store.id,
      reason: dto.reason,
      before: {
        store_name: store.store_name,
        store_link: store.store_link,
        whatsapp_number: store.whatsapp_number,
        location: store.location,
        payment_timing: store.payment_timing,
        onboarding_completed: store.onboarding_completed,
      },
      after: {
        store_name: updated.store_name,
        store_link: updated.store_link,
        whatsapp_number: updated.whatsapp_number,
        location: updated.location,
        payment_timing: updated.payment_timing,
        onboarding_completed: updated.onboarding_completed,
      },
      metadata: { user_id: id },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { message: 'Seller store updated.', store: updated };
  }

  async retryStoreSubaccount(id: string, actor: Actor) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: id },
    });
    if (!store) {
      throw new NotFoundException('This user does not have a seller store.');
    }
    if (!store.bank_code || !store.account_number) {
      throw new BadRequestException(
        'Seller has not configured bank code and account number yet.',
      );
    }

    const res = await this.paymentsService.createSubaccount(store.id);

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.store_subaccount_retry',
      entityType: 'seller_profile',
      entityId: store.id,
      metadata: { user_id: id, result: res ? 'triggered' : 'noop' },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: 'Paystack subaccount provisioning triggered.',
      subaccount: res,
    };
  }

  async reactivateUser(id: string, actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { disabled_at: null },
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.reactivate',
      entityType: 'user',
      entityId: id,
      before: { disabled_at: user.disabled_at },
      after: { disabled_at: null },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { message: 'User account reactivated.' };
  }

  async cancelUserScheduledDeletion(id: string, actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.deletion_scheduled_for) {
      throw new BadRequestException(
        'This account is not scheduled for deletion.',
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        disabled_at: null,
        deletion_requested_at: null,
        deletion_scheduled_for: null,
        deletion_reminder_sent_at: null,
      },
    });

    void this.notifications.create({
      userId: id,
      type: NotificationType.SYSTEM,
      title: 'Scheduled account deletion cancelled',
      body: 'Platform administration cancelled your pending account deletion and restored your account.',
      link: '/dashboard',
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.cancel_deletion',
      entityType: 'user',
      entityId: id,
      before: { deletion_scheduled_for: user.deletion_scheduled_for },
      after: { deletion_scheduled_for: null, disabled_at: null },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { message: 'Scheduled account deletion cancelled.' };
  }

  async forceExecuteDeletion(
    id: string,
    dto: AdminExecuteDeletionDto,
    actor: Actor,
  ) {
    this.assertNotSelf(id, actor, 'permanently delete');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ADMIN) {
      await this.assertNotLastActiveAdmin(id);
    }

    const expected = dto.confirmText?.trim().toUpperCase();
    if (
      expected !== 'DELETE' &&
      dto.confirmText?.trim().toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new BadRequestException(
        'Confirmation mismatch. Type DELETE or the exact user email to execute permanent deletion.',
      );
    }

    const result = await this.accountLifecycle.executePermanentDeletion(id, {
      skipBlockerRecheck: true,
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.force_delete',
      entityType: 'user',
      entityId: id,
      reason: dto.reason || 'Admin force-executed permanent deletion',
      before: { email: user.email, role: user.role },
      after: result,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: `Account permanently deleted (${result.mode}, ${result.deletedProducts} product(s) removed).`,
      result,
    };
  }

  async triggerPasswordReset(id: string, actor: Actor) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id },
      data: {
        password_reset_token: token,
        password_reset_expires: expires,
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, token);

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.password_reset_sent',
      entityType: 'user',
      entityId: id,
      metadata: { email: user.email },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: `Password reset email sent to ${user.email}.`,
    };
  }

  async sendDirectNotification(
    id: string,
    dto: AdminNotifyUserDto,
    actor: Actor,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, full_name: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.notifications.create({
      userId: id,
      type: NotificationType.ADMIN_BROADCAST,
      title: dto.title.trim(),
      body: dto.body.trim(),
      link: dto.link?.trim() || '/',
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'user.direct_notify',
      entityType: 'user',
      entityId: id,
      metadata: { title: dto.title.trim() },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: `Notification delivered to ${user.full_name || user.email}.`,
    };
  }

  async deleteUser(id: string, actor: Actor) {
    this.assertNotSelf(id, actor, 'delete');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === Role.ADMIN) {
      await this.assertNotLastActiveAdmin(id);
    }

    const result = await this.accountLifecycle.executePermanentDeletion(id, {
      skipBlockerRecheck: true,
    });

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
      after: result,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: `User deleted (${result.mode}, ${result.deletedProducts} product(s) removed).`,
      result,
    };
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
      // If approved, grant the user full access, assign SELLER role, and unlock store orders
      ...(dto.status === 'APPROVED'
        ? [
            this.prisma.user.update({
              where: { id: approval.user_id },
              data: { is_verified: true, role: Role.SELLER },
            }),
            this.prisma.sellerProfile.updateMany({
              where: { user_id: approval.user_id },
              data: { is_seller_verified: true },
            }),
          ]
        : [
            this.prisma.sellerProfile.updateMany({
              where: { user_id: approval.user_id },
              data: { is_seller_verified: false },
            }),
          ]),
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
        dto.status === 'APPROVED' ? 'approval.approve' : 'approval.reject',
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
    const user = (await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        full_name: true,
        email: true,
        school: true,
        role: true,
        is_verified: true,
        is_suspended: true,
        disabled_at: true,
        deletion_requested_at: true,
        deletion_scheduled_for: true,
        warnings: true,
        created_at: true,
        updated_at: true,
        verification_doc: true,
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
        addresses: {
          orderBy: { is_default: 'desc' },
          take: 10,
        },
        admin_approvals: {
          orderBy: { created_at: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            type: true,
            verification_data: true,
            reviewed_at: true,
            created_at: true,
          },
        },
        seller_profile: {
          include: {
            structured_location: true,
            balance_snapshot: true,
          },
        },
      } as any,
    })) as any;

    if (!user) throw new NotFoundException('User not found');

    const [
      buyerOrders,
      buyerOrderTotal,
      reportsFiled,
      sellerProducts,
      sellerOrderItems,
      sellerReports,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { buyer_id: id },
        orderBy: { created_at: 'desc' },
        take: 15,
        select: {
          id: true,
          total_amount: true,
          status: true,
          delivery_method: true,
          created_at: true,
          items: {
            take: 3,
            select: {
              quantity: true,
              product_title: true,
              product: { select: { title: true } },
            },
          },
        },
      }),
      this.prisma.order.aggregate({
        where: { buyer_id: id, status: { not: 'CANCELLED' } },
        _sum: { total_amount: true },
        _count: { _all: true },
      }),
      this.prisma.report.findMany({
        where: { reporter_id: id },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          target_type: true,
          reason: true,
          status: true,
          created_at: true,
        },
      }),
      user.seller_profile
        ? this.prisma.product.findMany({
            where: { seller_id: user.seller_profile.id },
            orderBy: { created_at: 'desc' },
            take: 25,
            select: {
              id: true,
              title: true,
              price: true,
              currency: true,
              status: true,
              quantity_available: true,
              category: true,
              views_count: true,
              image_urls: true,
              created_at: true,
            },
          })
        : Promise.resolve([]),
      user.seller_profile
        ? this.prisma.orderItem.findMany({
            where: { product: { seller_id: user.seller_profile.id } },
            include: {
              order: true,
              product: { select: { title: true } },
            },
            orderBy: { order: { created_at: 'desc' } },
            take: 50,
          })
        : Promise.resolve([] as any[]),
      user.seller_profile
        ? this.prisma.report.findMany({
            where: { seller_id: user.seller_profile.id },
            orderBy: { created_at: 'desc' },
            take: 15,
            select: {
              id: true,
              target_type: true,
              reason: true,
              status: true,
              resolution_action: true,
              created_at: true,
            },
          })
        : Promise.resolve([]),
    ]);

    let stats: any = null;
    if (user.seller_profile) {
      const productCount = await this.prisma.product.count({
        where: { seller_id: user.seller_profile.id },
      });
      const totalSales = sellerOrderItems.reduce(
        (acc, item) => acc + Number(item.price) * item.quantity,
        0,
      );
      const uniqueOrders = new Set(
        sellerOrderItems.map((item) => item.order_id.toString()),
      ).size;

      stats = {
        productCount,
        totalOrders: uniqueOrders,
        totalSales,
        recentOrders: sellerOrderItems.slice(0, 12).map((item) => ({
          id: item.order_id.toString(),
          product:
            item.product?.title || item.product_title || 'Removed product',
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
              balance_snapshot: user.seller_profile.balance_snapshot
                ? {
                    available_balance: Number(
                      user.seller_profile.balance_snapshot.available_balance ||
                        0,
                    ),
                    pending_balance: Number(
                      user.seller_profile.balance_snapshot.pending_balance || 0,
                    ),
                    total_earned: Number(
                      user.seller_profile.balance_snapshot.total_earned || 0,
                    ),
                    total_withdrawn: Number(
                      user.seller_profile.balance_snapshot.total_withdrawn || 0,
                    ),
                  }
                : null,
            }
          : null,
      },
      stats,
      buyerStats: {
        totalOrders: buyerOrderTotal._count._all,
        totalSpent: Number(buyerOrderTotal._sum.total_amount || 0),
        recentOrders: buyerOrders.map((o) => ({
          id: o.id.toString(),
          total_amount: Number(o.total_amount || 0),
          status: o.status,
          delivery_method: o.delivery_method,
          created_at: o.created_at,
          items_summary: o.items
            .map(
              (i) =>
                `${i.quantity}x ${i.product?.title || i.product_title || 'Item'}`,
            )
            .join(', '),
        })),
      },
      products: sellerProducts.map((p) => ({
        ...p,
        id: p.id.toString(),
        price: Number(p.price || 0),
      })),
      reportsFiled,
      reportsReceived: sellerReports,
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

    const [
      payoutAggregate,
      pendingPayoutAggregate,
      pendingApprovalsCount,
      pendingReturnsCount,
      flaggedReviewsCount,
      openReportsCount,
    ] = await Promise.all([
      this.prisma.payout.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.payout.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.adminApproval.count({ where: { status: 'PENDING' } }),
      this.prisma.returnRequest.count({
        where: { status: { in: ['PENDING', 'ESCALATED'] } },
      }),
      this.prisma.review.count({ where: { status: 'FLAGGED' } }),
      this.prisma.report.count({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
    ]);

    const gmv = Number(transactionAggregate._sum.amount || 0);
    const platformRevenue = Number((gmv * 0.04).toFixed(2));
    const netVendorVolume = Number((gmv * 0.96).toFixed(2));

    return {
      revenue: platformRevenue,
      gmv,
      netVendorVolume,
      totalPayoutsSettled: Number(payoutAggregate._sum.amount || 0),
      pendingPayoutsVolume: Number(pendingPayoutAggregate._sum.amount || 0),
      transactionCount: transactionCount || 0,
      productCount: productCount || 0,
      sellerCount: sellerCount || 0,
      pendingApprovalsCount,
      pendingReturnsCount,
      flaggedReviewsCount,
      openReportsCount,
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
  async forceDisable2fa(userId: string, actor?: Actor) {
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
    if (actor) {
      this.auditLogs.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'user.disable_2fa',
        entityType: 'user',
        entityId: userId,
        before: { totp_enabled: (u as any).totp_enabled },
        after: { totp_enabled: false },
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
    }
    return {
      message: '2FA disabled. The user should re-enroll on their next sign-in.',
    };
  }

  async setProStatus(
    userId: string,
    args: { is_pro: boolean; duration_days?: number },
    actor?: Actor,
  ) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');

    if (!args.is_pro) {
      const updated = await (this.prisma.user as any).update({
        where: { id: userId },
        data: { is_pro: false, pro_expires_at: null },
        select: { id: true, is_pro: true, pro_expires_at: true },
      });
      if (actor) {
        this.auditLogs.record({
          actorId: actor.id,
          actorRole: actor.role,
          action: 'user.pro_update',
          entityType: 'user',
          entityId: userId,
          before: {
            is_pro: (u as any).is_pro,
            pro_expires_at: (u as any).pro_expires_at,
          },
          after: { is_pro: false, pro_expires_at: null },
          ip: actor.ip,
          userAgent: actor.userAgent,
        });
      }
      return { ...updated, id: updated.id.toString() };
    }

    const days = Math.max(1, Math.floor(args.duration_days ?? 30));
    const now = new Date();
    const baseDate =
      (u as any).pro_expires_at &&
      (u as any).pro_expires_at.getTime() > now.getTime()
        ? (u as any).pro_expires_at
        : now;
    const nextExpiry = new Date(
      baseDate.getTime() + days * 24 * 60 * 60 * 1000,
    );
    const updated = await (this.prisma.user as any).update({
      where: { id: userId },
      data: { is_pro: true, pro_expires_at: nextExpiry },
      select: { id: true, is_pro: true, pro_expires_at: true },
    });
    if (actor) {
      this.auditLogs.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'user.pro_update',
        entityType: 'user',
        entityId: userId,
        before: {
          is_pro: (u as any).is_pro,
          pro_expires_at: (u as any).pro_expires_at,
        },
        after: {
          is_pro: true,
          pro_expires_at: nextExpiry,
          duration_days: days,
        },
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
    }
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
              transaction: {
                select: {
                  id: true,
                  reference: true,
                  amount: true,
                  status: true,
                  provider: true,
                  provider_ref: true,
                  payout_status: true,
                },
              },
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
    args: {
      status: 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'ESCALATED' | 'REFUNDED';
      admin_note?: string;
    },
    actor?: Actor,
  ) {
    const ret = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!ret) throw new NotFoundException('Return request not found');

    if (args.status === 'REFUNDED') {
      return this.refundReturnRequest(
        id,
        { admin_note: args.admin_note },
        actor || { id: 'admin', role: 'ADMIN' },
      );
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: {
        status: args.status as any,
        ...(args.admin_note ? { admin_notes: args.admin_note } : {}),
      } as any,
    });
    return updated;
  }

  async refundReturnRequest(
    id: string,
    args: {
      amount?: number;
      reason?: string;
      admin_note?: string;
    },
    actor: Actor,
  ) {
    const ret = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!ret) throw new NotFoundException('Return request not found');

    const result = await this.paymentsService.refundTransaction({
      orderId: ret.order_id,
      amount: args.amount,
      reason:
        args.reason ||
        args.admin_note ||
        'Return request approved and refunded by Admin',
      customerNote: args.admin_note,
      merchantNote: args.reason,
      actor,
    });

    if (args.admin_note) {
      await this.prisma.returnRequest.update({
        where: { id },
        data: { admin_notes: args.admin_note },
      });
    }

    return result;
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
