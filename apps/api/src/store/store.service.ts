import {
  Injectable,
  Inject,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { NotificationType, Role, ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { CloudinaryService } from '../common/cloudinary.service';
import { attachProductSlugs } from '../product/product-slug';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../email/email.service';
import { NotificationService } from '../notification/notification.service';
import { Actor, AuditLogService } from '../audit/audit-log.service';
import { verifyCode } from '../auth/totp.util';

interface PendingPayoutChangeChallenge {
  otpHash: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  attempts: number;
  expiresAt: number;
}

const PAYOUT_OTP_TTL_MS = 10 * 60 * 1000;
const PAYOUT_OTP_COOLDOWN_MS = 60 * 1000;
const PAYOUT_OTP_MAX_ATTEMPTS = 5;

function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

function safeHashEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function maskAccountNumber(acct: string | null | undefined): string {
  const clean = (acct || '').trim();
  if (!clean) return 'Not set';
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

function maskEmailAddress(email: string): string {
  const [local, domain] = (email || '').split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

@Injectable()
export class StoreService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private paymentsService: PaymentsService,
    private emailService: EmailService,
    private notifications: NotificationService,
    private auditLogs: AuditLogService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createStore(
    userId: string,
    dto: CreateStoreDto,
    logoFile?: Express.Multer.File,
  ) {
    // 1. Verify user exists and has seller verification approved
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        admin_approvals: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_suspended || user.disabled_at || user.deletion_scheduled_for) {
      throw new ForbiddenException(
        'Your account is not eligible to create a store right now.',
      );
    }

    const isVerifiedSeller =
      user.role === Role.ADMIN ||
      user.admin_approvals[0]?.status === ApprovalStatus.APPROVED;

    // 2. Check if user already has a store
    const existingStore = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (existingStore) {
      throw new ConflictException('You already have a store');
    }

    // Check if store link is unique
    const linkExists = await this.prisma.sellerProfile.findUnique({
      where: { store_link: dto.store_link },
    });

    if (linkExists) {
      throw new ConflictException('Store link is already taken');
    }

    let logo_url = null;
    if (logoFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        logoFile,
        'store-logos',
      );
      logo_url = uploadResult.secure_url;
    }

    if (user.role === Role.USER) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.SELLER },
      });
    }

    const store = await this.prisma.sellerProfile.create({
      data: {
        user_id: userId,
        store_name: dto.store_name,
        store_link: dto.store_link,
        bio: dto.bio,
        whatsapp_number: dto.whatsapp_number,
        location: dto.location,
        delivery_policies: dto.delivery_policies,
        business_hours: dto.business_hours,
        social_links: dto.social_links || {},
        logo_url: logo_url,
        store_profile_completed: true,
        is_seller_verified: isVerifiedSeller,
      },
    });

    return {
      message: isVerifiedSeller
        ? 'Store created successfully'
        : 'Store created. Complete seller verification to start receiving orders.',
      store: {
        id: store.id.toString(),
        store_name: store.store_name,
        store_link: store.store_link,
        logo_url: store.logo_url,
        is_seller_verified: store.is_seller_verified,
        can_receive_orders: store.is_seller_verified,
      },
    };
  }

  async updateStore(userId: string, dto: any, logoFile?: Express.Multer.File) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!store) {
      throw new ConflictException('Store not found');
    }

    // Hard-coded security lock: once payout details exist, they CANNOT be altered via
    // generic PATCH /stores — the seller MUST go through the verified OTP / 2FA flow.
    const hasExistingPayout = Boolean(store.bank_code && store.account_number);
    const incomingBankCode =
      typeof dto.bank_code === 'string' ? dto.bank_code.trim() : '';
    const incomingAccount =
      typeof dto.account_number === 'string'
        ? dto.account_number.replace(/[\s-]/g, '').trim()
        : '';
    const incomingBankName =
      typeof dto.bank_name === 'string' ? dto.bank_name.trim() : '';

    const isChangingBankCode =
      Boolean(incomingBankCode) && incomingBankCode !== (store.bank_code || '');
    const isChangingAccount =
      Boolean(incomingAccount) &&
      incomingAccount !==
        (store.account_number || '').replace(/[\s-]/g, '').trim();
    const isChangingBankName =
      Boolean(incomingBankName) && incomingBankName !== (store.bank_name || '');

    if (
      hasExistingPayout &&
      (isChangingBankCode || isChangingAccount || isChangingBankName)
    ) {
      throw new ForbiddenException(
        'Changing payout details requires verification. Please verify via email code or 2FA in the Payout Destination section.',
      );
    }

    const isSettingInitialPayout =
      !hasExistingPayout && Boolean(incomingBankCode && incomingAccount);

    if (isSettingInitialPayout && !/^\d{9,16}$/.test(incomingAccount)) {
      throw new BadRequestException(
        'Account or Mobile Money number must contain 9 to 16 digits.',
      );
    }

    const data: any = {};

    // Copy simple string fields (bank fields only allowed on initial setup when unset)
    const stringFields = [
      'store_name',
      'store_link',
      'bio',
      'whatsapp_number',
      'location',
      'area',
      'delivery_policies',
      'business_hours',
      'payment_timing',
      'service_area',
      'avg_delivery_time',
    ];
    for (const key of stringFields) {
      if (dto[key] !== undefined && dto[key] !== '') {
        data[key] = dto[key];
      }
    }
    if (isSettingInitialPayout) {
      data.bank_name = incomingBankName || incomingBankCode;
      data.bank_code = incomingBankCode;
      data.account_number = incomingAccount;
      data.payment_setup_completed = true;
    }

    // Parse location_id (comes as string from FormData)
    if (dto.location_id !== undefined && dto.location_id !== '') {
      data.location_id = String(dto.location_id);
    }

    if (dto.latitude !== undefined && dto.latitude !== '') {
      const latitude = Number(dto.latitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        throw new BadRequestException('That location is not valid.');
      }
      data.latitude = latitude;
    }
    if (dto.longitude !== undefined && dto.longitude !== '') {
      const longitude = Number(dto.longitude);
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new BadRequestException('That location is not valid.');
      }
      data.longitude = longitude;
    }

    // Parse social_links (may arrive as JSON string from FormData)
    if (dto.social_links !== undefined) {
      data.social_links =
        typeof dto.social_links === 'string'
          ? JSON.parse(dto.social_links)
          : dto.social_links;
    }

    // Parse accepted_payment_methods (may arrive as JSON string from FormData)
    if (dto.accepted_payment_methods !== undefined) {
      if (typeof dto.accepted_payment_methods === 'string') {
        try {
          data.accepted_payment_methods = JSON.parse(
            dto.accepted_payment_methods,
          );
        } catch {
          data.accepted_payment_methods = dto.accepted_payment_methods
            .split(',')
            .filter(Boolean);
        }
      } else {
        data.accepted_payment_methods = dto.accepted_payment_methods;
      }
    }

    const nextArea = data.service_area ?? store.service_area;
    const nextLat = data.latitude ?? store.latitude;
    const nextLng = data.longitude ?? store.longitude;
    if (
      (nextArea === 'SAME_CITY' || nextArea === 'NEARBY_STATES') &&
      (nextLat == null || nextLng == null)
    ) {
      throw new BadRequestException(
        'Share your current location before saving. This store delivers nearby, so buyers are matched by distance.',
      );
    }

    if (logoFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        logoFile,
        'store-logos',
      );
      data.logo_url = uploadResult.secure_url;
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { user_id: userId },
      data,
    });

    // If the seller just added initial payout details (after skipping during onboarding),
    // immediately create their Paystack subaccount with validation error handling.
    let subaccountStatus: string | undefined;
    if (isSettingInitialPayout) {
      try {
        const subRes = await this.paymentsService.createSubaccount(updated.id, {
          forceUpdate: true,
          throwOnError: true,
        });
        subaccountStatus = subRes.ok ? 'ACTIVE' : 'PENDING_RETRY';
      } catch (err) {
        await this.prisma.sellerProfile.update({
          where: { user_id: userId },
          data: {
            bank_name: null,
            bank_code: null,
            account_number: null,
          },
        });
        throw err;
      }
    }

    return {
      message: isSettingInitialPayout
        ? 'Store and payout details saved.'
        : 'Store updated successfully',
      ...(subaccountStatus ? { subaccount_status: subaccountStatus } : {}),
      store: {
        id: updated.id.toString(),
        store_name: updated.store_name,
        store_link: updated.store_link,
        logo_url: updated.logo_url,
        bio: updated.bio,
        whatsapp_number: updated.whatsapp_number,
        location: updated.location,
        location_id: updated.location_id?.toString(),
        area: updated.area,
        delivery_policies: updated.delivery_policies,
        business_hours: updated.business_hours,
        social_links: updated.social_links,
        accepted_payment_methods: updated.accepted_payment_methods,
        payment_timing: updated.payment_timing,
        service_area: updated.service_area,
        avg_delivery_time: updated.avg_delivery_time,
        bank_name: updated.bank_name,
        bank_code: updated.bank_code,
        account_number: updated.account_number,
        paystack_subaccount_code: updated.paystack_subaccount_code,
      },
    };
  }

  private payoutOtpKey(userId: string) {
    return `payout_change_otp:${userId}`;
  }

  private payoutCooldownKey(userId: string) {
    return `payout_change_cooldown:${userId}`;
  }

  /**
   * Step 1 of verified payout details update:
   * Validates new bank/MoMo details, optionally resolves account holder name via Paystack,
   * binds a single-use SHA-256 hashed 6-digit OTP to the exact target payload, and emails it.
   */
  async requestPayoutChangeVerification(
    userId: string,
    dto: { bank_name?: string; bank_code: string; account_number: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller_profile: true },
    });
    if (!user || !user.seller_profile) {
      throw new NotFoundException('Seller store not found.');
    }

    const cleanBankCode = (dto.bank_code || '').trim();
    const cleanAccount = (dto.account_number || '')
      .replace(/[\s-]/g, '')
      .trim();
    const cleanBankName = (dto.bank_name || '').trim() || cleanBankCode;

    if (!cleanBankCode || !cleanAccount) {
      throw new BadRequestException(
        'Bank/provider code and account/MoMo number are required.',
      );
    }
    if (!/^\d{9,16}$/.test(cleanAccount)) {
      throw new BadRequestException(
        'Account or Mobile Money number must contain 9 to 16 digits.',
      );
    }

    const cooldown = await this.cacheManager.get<number>(
      this.payoutCooldownKey(userId),
    );
    if (cooldown && Date.now() < cooldown) {
      const waitSec = Math.ceil((cooldown - Date.now()) / 1000);
      throw new BadRequestException(
        `Please wait ${waitSec}s before requesting another verification code.`,
      );
    }

    // Best-effort account holder name check with Paystack (throws on 4xx invalid bank account)
    let resolvedAccountName: string | null = null;
    try {
      const resolved = await this.paymentsService.resolveBankAccount(
        cleanBankCode,
        cleanAccount,
      );
      resolvedAccountName = resolved?.account_name || null;
    } catch (err) {
      if (err instanceof BadRequestException) {
        // Only surface clear bank-account validation errors for commercial banks;
        // MoMo codes (MTN/VOD/ATL) may not support /bank/resolve on all Paystack accounts.
        if (
          !['MTN', 'VOD', 'ATL', 'TGO', 'MOMO'].includes(
            cleanBankCode.toUpperCase(),
          )
        ) {
          throw err;
        }
      }
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const challenge: PendingPayoutChangeChallenge = {
      otpHash: hashOtp(code),
      bank_name: cleanBankName,
      bank_code: cleanBankCode,
      account_number: cleanAccount,
      attempts: 0,
      expiresAt: Date.now() + PAYOUT_OTP_TTL_MS,
    };

    await this.cacheManager.set(
      this.payoutOtpKey(userId),
      challenge,
      PAYOUT_OTP_TTL_MS,
    );
    await this.cacheManager.set(
      this.payoutCooldownKey(userId),
      Date.now() + PAYOUT_OTP_COOLDOWN_MS,
      PAYOUT_OTP_COOLDOWN_MS,
    );

    await this.emailService.sendPayoutChangeOtpEmail({
      to: user.email,
      fullName: user.full_name,
      storeName: user.seller_profile.store_name,
      code,
      bankName: cleanBankName,
      maskedAccount: maskAccountNumber(cleanAccount),
      expiresMinutes: 10,
    });

    return {
      sent: true,
      masked_email: maskEmailAddress(user.email),
      expires_in_seconds: 600,
      totp_available: Boolean(user.totp_enabled && user.totp_secret),
      resolved_account_name: resolvedAccountName,
      message: `Verification code sent to ${maskEmailAddress(user.email)}.`,
    };
  }

  /**
   * Step 2 of verified payout details update:
   * Verifies either the single-use Email OTP (bound to exact new bank/account)
   * OR the user's TOTP 2FA authenticator code, updates the store, immediately syncs
   * Paystack's subaccount, writes an audit log, and sends a security alert email.
   */
  async confirmPayoutDetailsChange(
    userId: string,
    dto: {
      code: string;
      method?: 'EMAIL_OTP' | 'TOTP';
      bank_name?: string;
      bank_code?: string;
      account_number?: string;
    },
    actor?: Actor,
  ) {
    const cleanCode = (dto.code || '').replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new BadRequestException(
        'Please enter the 6-digit verification code.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { seller_profile: true },
    });
    if (!user || !user.seller_profile) {
      throw new NotFoundException('Seller store not found.');
    }

    const store = user.seller_profile;
    let targetBankName = '';
    let targetBankCode = '';
    let targetAccount = '';
    const method = dto.method === 'TOTP' ? 'TOTP' : 'EMAIL_OTP';

    if (method === 'TOTP') {
      if (!user.totp_enabled || !user.totp_secret) {
        throw new BadRequestException(
          'Authenticator 2FA is not enabled on this account. Please verify with your email code.',
        );
      }
      if (!verifyCode(user.totp_secret, cleanCode)) {
        throw new ForbiddenException('Invalid 2FA authenticator code.');
      }
      targetBankCode = (dto.bank_code || '').trim();
      targetAccount = (dto.account_number || '').replace(/[\s-]/g, '').trim();
      targetBankName = (dto.bank_name || '').trim() || targetBankCode;
      if (!targetBankCode || !/^\d{9,16}$/.test(targetAccount)) {
        throw new BadRequestException(
          'Valid bank/provider code and 9–16 digit account/MoMo number are required.',
        );
      }
    } else {
      const challenge =
        await this.cacheManager.get<PendingPayoutChangeChallenge>(
          this.payoutOtpKey(userId),
        );
      if (!challenge || Date.now() > challenge.expiresAt) {
        await this.cacheManager.del(this.payoutOtpKey(userId));
        throw new BadRequestException(
          'Verification code expired or not found. Please request a new code.',
        );
      }

      if (!safeHashEqual(hashOtp(cleanCode), challenge.otpHash)) {
        const nextAttempts = challenge.attempts + 1;
        if (nextAttempts >= PAYOUT_OTP_MAX_ATTEMPTS) {
          await this.cacheManager.del(this.payoutOtpKey(userId));
          throw new ForbiddenException(
            'Too many incorrect attempts. Please request a fresh verification code.',
          );
        }
        await this.cacheManager.set(
          this.payoutOtpKey(userId),
          { ...challenge, attempts: nextAttempts },
          Math.max(1000, challenge.expiresAt - Date.now()),
        );
        throw new ForbiddenException(
          `Incorrect verification code (${PAYOUT_OTP_MAX_ATTEMPTS - nextAttempts} attempts remaining).`,
        );
      }

      // Single-use: burn OTP immediately upon match
      await this.cacheManager.del(this.payoutOtpKey(userId));
      targetBankName = challenge.bank_name;
      targetBankCode = challenge.bank_code;
      targetAccount = challenge.account_number;
    }

    const previous = {
      bank_name: store.bank_name,
      bank_code: store.bank_code,
      account_number: store.account_number,
    };

    await this.prisma.sellerProfile.update({
      where: { user_id: userId },
      data: {
        bank_name: targetBankName,
        bank_code: targetBankCode,
        account_number: targetAccount,
        payment_setup_completed: true,
      },
    });

    // Immediately sync Paystack subaccount (updates in-place or creates fresh)
    let subRes: {
      ok: boolean;
      subaccount_code: string | null;
      action: string;
      error?: string;
    };
    try {
      subRes = await this.paymentsService.createSubaccount(store.id, {
        forceUpdate: true,
        throwOnError: true,
        actor,
      });
    } catch (err) {
      // Revert to previous known-good bank account if Paystack rejects the new one
      await this.prisma.sellerProfile.update({
        where: { user_id: userId },
        data: previous,
      });
      throw err;
    }

    this.auditLogs.record({
      actorId: actor?.id ?? userId,
      actorRole: actor?.role ?? user.role,
      action: 'store.payout_details_changed',
      entityType: 'seller_profile',
      entityId: store.id,
      before: {
        bank_name: previous.bank_name,
        bank_code: previous.bank_code,
        account_masked: maskAccountNumber(previous.account_number),
      },
      after: {
        bank_name: targetBankName,
        bank_code: targetBankCode,
        account_masked: maskAccountNumber(targetAccount),
        paystack_subaccount_code: subRes.subaccount_code,
        verification_method: method,
      },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });

    void this.notifications.create({
      userId,
      type: NotificationType.SYSTEM,
      title: 'Payout account updated',
      body: `Your payout destination is now ${targetBankName} (${maskAccountNumber(targetAccount)}).`,
      link: '/dashboard/settings/store',
    });

    void this.emailService.sendPayoutDetailsChangedAlertEmail({
      to: user.email,
      fullName: user.full_name,
      storeName: store.store_name,
      bankName: targetBankName,
      maskedAccount: maskAccountNumber(targetAccount),
      subaccountSynced: subRes.ok,
    });

    return {
      message: subRes.ok
        ? 'Payout details verified, updated, and synced with Paystack.'
        : 'Payout details verified and saved. Paystack subaccount sync is queued for automatic retry.',
      bank_name: targetBankName,
      bank_code: targetBankCode,
      account_number: targetAccount,
      paystack_subaccount_code: subRes.subaccount_code,
      subaccount_status: subRes.ok ? 'ACTIVE' : 'PENDING_RETRY',
      subaccount_warning: subRes.ok ? null : subRes.error || null,
    };
  }

  async getStoreStats(userId: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const [productCount, orderItems, balanceSnapshot] = await Promise.all([
      this.prisma.product.count({
        where: { seller_id: store.id },
      }),
      this.prisma.orderItem.findMany({
        where: {
          product: {
            seller_id: store.id,
          },
        },
        include: {
          order: {
            include: {
              buyer: {
                select: {
                  full_name: true,
                },
              },
            },
          },
          product: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          order: {
            created_at: 'desc',
          },
        },
        take: 50, // Get last 50 items for aggregation
      }),
      this.prisma.vendorBalanceSnapshot.findUnique({
        where: { seller_id: store.id },
      }),
    ]);

    // Calculate total sales and orders
    const grossSales = orderItems.reduce(
      (acc, item) => acc + Number(item.price) * item.quantity,
      0,
    );
    const platformFee = Number((grossSales * 0.04).toFixed(2));
    const netEarnings = Number((grossSales - platformFee).toFixed(2));
    const availableBalance = Number(balanceSnapshot?.available_balance || 0);
    const totalWithdrawn = Number(balanceSnapshot?.total_withdrawn || 0);

    const uniqueOrders = Array.from(
      new Set(orderItems.map((item) => item.order_id.toString())),
    );

    // Map recent orders for the dashboard
    const recentOrders = orderItems.slice(0, 5).map((item) => ({
      id: `${item.order_id.toString()}-${item.id.toString()}`,
      displayId: `#ORD-${item.order_id.toString().slice(-4)}`,
      customer: item.order.buyer?.full_name || 'Customer',
      product: item.product?.title || item.product_title || 'Removed product',
      status: item.order.status,
      amount: `GH₵${(Number(item.price) * item.quantity).toLocaleString()}`,
      date: item.order.created_at,
    }));

    return {
      financials: {
        gross_sales: grossSales,
        platform_fee_percent: 4,
        total_platform_fees: platformFee,
        net_earnings: netEarnings,
        available_balance: availableBalance,
        total_withdrawn: totalWithdrawn,
      },
      stats: [
        {
          label: 'Net Earnings',
          value: `GH₵${netEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: '96% Net',
          isPositive: true,
          icon: 'TrendingUp',
          color: 'bg-emerald-500/10 text-emerald-500',
        },
        {
          label: 'Gross Sales',
          value: `GH₵${grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: '+0%',
          isPositive: true,
          icon: 'ShoppingBag',
          color: 'bg-blue-500/10 text-blue-500',
        },
        {
          label: 'Platform Fee (4%)',
          value: `GH₵${platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: '4% Fee',
          isPositive: true,
          icon: 'TrendingUp',
          color: 'bg-purple-500/10 text-purple-500',
        },
        {
          label: 'Total Orders',
          value: uniqueOrders.length.toString(),
          change: `${productCount} items`,
          isPositive: true,
          icon: 'Package',
          color: 'bg-amber-500/10 text-amber-500',
        },
      ],
      recentOrders,
    };
  }

  async getTopProVendors(limit = 6) {
    const now = new Date();
    const stores = await this.prisma.sellerProfile.findMany({
      where: {
        // ST-04: Do not show logo-less stores in Featured modules.
        logo_url: { not: null },
        NOT: { logo_url: '' },
        user: {
          is_pro: true,
          is_suspended: false,
          disabled_at: null,
          deletion_scheduled_for: null,
          OR: [{ pro_expires_at: null }, { pro_expires_at: { gt: now } }],
        },
      },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: {
        products: { _count: 'desc' },
      },
      take: limit,
    });

    return stores.map((s) => ({
      id: s.id,
      store_name: s.store_name,
      store_link: s.store_link,
      logo_url: s.logo_url,
      bio: s.bio,
      location: s.location,
      products_count: s._count.products,
      is_pro: true,
    }));
  }

  async getPublicStores(query: {
    search?: string;
    location?: string;
    is_pro?: boolean;
    sort?: 'newest' | 'products' | 'alphabetical' | 'default';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(500, Math.max(1, query.limit || 12));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      user: {
        is_suspended: false,
        disabled_at: null,
        deletion_scheduled_for: null,
      },
    };

    // Search query on store_name or bio
    if (query.search) {
      whereClause.OR = [
        { store_name: { contains: query.search, mode: 'insensitive' } },
        { bio: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filter by location or area
    if (query.location) {
      whereClause.OR = [
        ...(whereClause.OR || []),
        { location: { contains: query.location, mode: 'insensitive' } },
        { area: { contains: query.location, mode: 'insensitive' } },
      ];
    }

    // Filter by pro status
    if (query.is_pro !== undefined) {
      const now = new Date();
      if (query.is_pro) {
        whereClause.user = {
          ...whereClause.user,
          is_pro: true,
          OR: [{ pro_expires_at: null }, { pro_expires_at: { gt: now } }],
        };
      } else {
        whereClause.user = {
          ...whereClause.user,
          OR: [{ is_pro: false }, { pro_expires_at: { lt: now } }],
        };
      }
    }

    // Determine ordering
    let orderBy: any = {};
    if (query.sort === 'newest') {
      orderBy = { created_at: 'desc' };
    } else if (query.sort === 'products') {
      orderBy = { products: { _count: 'desc' } };
    } else if (query.sort === 'alphabetical') {
      orderBy = { store_name: 'asc' };
    } else {
      // Default: Pro first, then products count descending
      // Prisma does not support multi-level sorting by complex relation count natively in a single object in some versions,
      // so sorting by products count is a solid default.
      orderBy = { products: { _count: 'desc' } };
    }

    const [stores, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              is_pro: true,
              pro_expires_at: true,
              is_verified: true,
            },
          },
          _count: {
            select: { products: true },
          },
          products: {
            where: {
              status: { in: ['active', 'published'] },
            },
            select: {
              id: true,
              title: true,
              price: true,
              image_urls: true,
            },
            take: 3,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.sellerProfile.count({
        where: whereClause,
      }),
    ]);

    const now = new Date();
    const mappedStores = stores.map((s) => {
      const proActive =
        !!s.user?.is_pro &&
        (!s.user.pro_expires_at || s.user.pro_expires_at > now);

      return {
        id: s.id.toString(),
        store_name: s.store_name,
        store_link: s.store_link,
        logo_url: s.logo_url,
        bio: s.bio,
        location: s.location,
        area: s.area,
        products_count: s._count.products,
        is_pro: proActive,
        is_verified: Boolean(s.is_seller_verified),
        is_seller_verified: Boolean(s.is_seller_verified),
        can_receive_orders: Boolean(s.is_seller_verified),
        products: attachProductSlugs(
          s.products.map((p) => ({
            id: p.id.toString(),
            title: p.title,
            price: Number(p.price),
            image_url: p.image_urls?.[0] || null,
            seller: { store_link: s.store_link, store_name: s.store_name },
          })),
        ).map(({ seller: _seller, ...rest }) => rest),
      };
    });

    return {
      stores: mappedStores,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStoreByLink(link: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { store_link: link },
      include: {
        user: {
          select: {
            is_pro: true,
            pro_expires_at: true,
            is_verified: true,
            is_suspended: true,
            disabled_at: true,
            deletion_scheduled_for: true,
            created_at: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (
      !store ||
      store.user?.is_suspended ||
      store.user?.disabled_at ||
      store.user?.deletion_scheduled_for
    ) {
      throw new NotFoundException('Store not found');
    }

    const now = new Date();
    const proActive =
      !!store.user?.is_pro &&
      (!store.user.pro_expires_at || store.user.pro_expires_at > now);

    const sellerVerified = Boolean(store.is_seller_verified);

    return {
      id: store.id.toString(),
      user_id: store.user_id,
      store_name: store.store_name,
      store_link: store.store_link,
      logo_url: store.logo_url,
      bio: store.bio,
      // Hide direct WhatsApp & social contact on unverified stores to prevent off-platform orders
      whatsapp_number: sellerVerified ? store.whatsapp_number : null,
      location: store.location,
      area: store.area,
      delivery_policies: store.delivery_policies,
      business_hours: store.business_hours,
      social_links: sellerVerified ? store.social_links : {},
      payment_timing: store.payment_timing,
      accepted_payment_methods: store.accepted_payment_methods,
      service_area: store.service_area,
      avg_delivery_time: store.avg_delivery_time,
      is_pro: proActive,
      pro_expires_at: store.user?.pro_expires_at ?? null,
      is_verified: sellerVerified,
      is_seller_verified: sellerVerified,
      can_receive_orders: sellerVerified,
      member_since: store.user?.created_at ?? store.created_at,
      products_count: store._count.products,
    };
  }
}
