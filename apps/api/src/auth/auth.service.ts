import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { VerificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CloudinaryService } from '../common/cloudinary.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import {
  buildOtpAuthUrl,
  generateBackupCodes,
  generateSecret,
  verifyCode,
} from './totp.util';
import { SmsClient } from './arkesel.client';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private cloudinary: CloudinaryService,
    // Field kept named `twilio` for diff minimalism, but it's now Arkesel.
    // Rename if you do a sweep — every call site uses `this.twilio.sendSms`.
    private twilio: SmsClient,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Failed-login lockout. Tracks both `email:` and `ip:` counters in cache
   * (Redis when available, in-memory fallback). After MAX failures within
   * WINDOW we lock for the rest of the window. Lockout is per-IP AND per
   * targeted email so a single compromised IP can't lock out unrelated
   * users, and a single targeted account is still protected if the attack
   * is distributed.
   */
  private static readonly LOCKOUT_MAX = 8;
  private static readonly LOCKOUT_WINDOW_MS = 15 * 60_000;

  private failKey(kind: 'ip' | 'email', value: string) {
    return `auth:fail:${kind}:${value.toLowerCase()}`;
  }

  private async getFailCount(kind: 'ip' | 'email', value: string): Promise<number> {
    if (!value) return 0;
    const v = await this.cache.get<number>(this.failKey(kind, value));
    return typeof v === 'number' ? v : 0;
  }

  private async bumpFail(kind: 'ip' | 'email', value: string): Promise<number> {
    if (!value) return 0;
    const key = this.failKey(kind, value);
    const current = (await this.cache.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.cache.set(key, next, AuthService.LOCKOUT_WINDOW_MS);
    return next;
  }

  private async clearFails(email: string, ip: string) {
    await Promise.all([
      this.cache.del(this.failKey('email', email)),
      this.cache.del(this.failKey('ip', ip)),
    ]);
  }

  private async assertNotLockedOut(email: string, ip: string) {
    const [emailFails, ipFails] = await Promise.all([
      this.getFailCount('email', email),
      this.getFailCount('ip', ip),
    ]);
    if (
      emailFails >= AuthService.LOCKOUT_MAX ||
      ipFails >= AuthService.LOCKOUT_MAX
    ) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'Too many failed sign-in attempts. Please wait 15 minutes and try again, or reset your password.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Hint at the right next step instead of just "exists".
      if (existing.oauth_provider) {
        throw new ConflictException(
          `An account with this email already exists — please sign in with ${existing.oauth_provider === 'google' ? 'Google' : existing.oauth_provider}.`,
        );
      }
      throw new ConflictException(
        'An account with this email already exists. Try signing in, or use “Forgot password” to reset it.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        full_name: dto.full_name.trim(),
        email,
        password_hash: hashedPassword,
        school: dto.school.trim(),
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires,
        terms_accepted_at: new Date(),
      },
    });

    this.emailService
      .sendVerificationEmail(user.email, verificationToken)
      .catch((err) => {
        console.error('Failed to send verification email', err);
      });

    return {
      message:
        'Account created! Check your inbox to verify your email — the link is good for 24 hours.',
    };
  }

  /**
   * "Forgot which email?" support flow. We never tell the requester what
   * matched — we just acknowledge and forward the request (plus any matching
   * account hints, masked) to the support inbox. Rate-limited at the route
   * layer to prevent abuse.
   */
  async findAccount(dto: {
    full_name: string;
    business_name?: string;
    phone?: string;
    contact_email?: string;
    note?: string;
  }) {
    const fullName = dto.full_name.trim();
    const business = dto.business_name?.trim();
    const phone = dto.phone?.trim();
    const contactEmail = dto.contact_email?.trim().toLowerCase();
    const note = dto.note?.trim();

    // Best-effort search for likely matches. All optional — if none of the
    // hints land we still file the ticket with no matches.
    const orFilters: any[] = [];
    if (fullName) {
      orFilters.push({ full_name: { equals: fullName, mode: 'insensitive' } });
    }
    if (business) {
      orFilters.push({ school: { equals: business, mode: 'insensitive' } });
    }
    if (phone) {
      orFilters.push({ phone_e164: phone });
    }
    const matches = orFilters.length
      ? await this.prisma.user.findMany({
          where: { OR: orFilters },
          select: { id: true, email: true, created_at: true },
          take: 5,
        })
      : [];

    await this.emailService.sendAccountLookupSupportTicket({
      fullName,
      businessName: business,
      phone,
      knownEmail: contactEmail,
      note,
      matches,
    });

    return {
      message:
        "Got it — we've sent the details to our support team. We'll reach out shortly.",
    };
  }

  /**
   * Resends the email verification link. Always returns success (no account
   * enumeration) so attackers can't probe which emails are registered.
   */
  async resendVerification(emailRaw: string) {
    const ok = { message: "If that email is registered and unverified, we've sent a new verification link." };
    const email = (emailRaw || '').trim().toLowerCase();
    if (!email) return ok;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.is_verified) return ok;

    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires,
      },
    });
    this.emailService
      .sendVerificationEmail(user.email, verificationToken)
      .catch((err) => console.error('Failed to resend verification email', err));
    return ok;
  }

  async login(dto: LoginDto, ip = 'unknown') {
    const email = (dto.email || '').trim().toLowerCase();

    // Enforce lockout before doing any expensive work (DB hit, bcrypt).
    await this.assertNotLockedOut(email, ip);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        seller_profile: true,
        admin_approvals: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
    if (!user) {
      await this.bumpFail('email', email);
      await this.bumpFail('ip', ip);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException(
        `This account uses ${user.oauth_provider === 'google' ? 'Google sign-in' : 'social sign-in'}. Sign in with that provider, or use "Forgot password" to set a password first.`,
      );
    }
    const passwordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordValid) {
      await this.bumpFail('email', email);
      await this.bumpFail('ip', ip);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_verified) {
      throw new UnauthorizedException(
        'Please verify your email before signing in. Check your inbox — or request a new link.',
      );
    }
    if (user.is_suspended) {
      throw new UnauthorizedException(
        'This account has been suspended. Contact support if you think this is a mistake.',
      );
    }

    // ───── 2FA challenge ─────
    // Supports two methods: TOTP (authenticator app) and SMS (one-time code
    // texted to the user's verified phone). When no code is supplied and 2FA
    // is enabled, we signal `totp_required` so the client can prompt. For SMS
    // we also dispatch a code now so the user has something to enter.
    if ((user as any).totp_enabled) {
      const code = dto.totp_code?.trim();
      const backup = dto.totp_backup_code?.trim();
      const method = (user as any).totp_method as 'TOTP' | 'SMS';

      if (!code && !backup) {
        if (method === 'SMS') {
          await this.dispatchSmsLoginCode(user as any).catch((e) => {
            // Don't leak provider failures; log and let user request resend.
            console.error('[2fa-sms] send failed:', e?.message || e);
          });
        }
        return {
          totp_required: true,
          method,
          phone_hint:
            method === 'SMS' && (user as any).phone_e164
              ? `***${(user as any).phone_e164.slice(-4)}`
              : null,
          message: 'Two-factor authentication code required.',
        } as any;
      }

      let ok = false;
      if (method === 'SMS' && code) {
        ok = await this.consumeSmsCode(user as any, code);
      }
      if (!ok) {
        // Fall back to TOTP / backup-code paths (covers both methods).
        ok = await this.consumeTotpForLogin(user as any, code, backup);
      }
      if (!ok) {
        await this.bumpFail('email', email);
        await this.bumpFail('ip', ip);
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    // Successful login — wipe any stored failure counters for this user/IP.
    await this.clearFails(email, ip);

    const payload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };
    const latestApproval = user.admin_approvals[0] || null;

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        approval_status: latestApproval?.status || null,
        has_verification_doc: !!user.verification_doc,
        seller_profile: user.seller_profile
          ? {
              id: user.seller_profile.id.toString(),
              store_name: user.seller_profile.store_name,
              store_link: user.seller_profile.store_link,
              bio: user.seller_profile.bio,
              logo_url: user.seller_profile.logo_url,
              onboarding_completed: user.seller_profile.onboarding_completed,
            }
          : null,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        seller_profile: {
          include: {
            structured_location: true,
          },
        },
        admin_approvals: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const latestApproval = user.admin_approvals[0] || null;

    return {
      id: user.id.toString(),
      full_name: user.full_name,
      email: user.email,
      school: user.school,
      role: user.role,
      is_verified: user.is_verified,
      has_verification_doc: !!user.verification_doc,
      approval_status: latestApproval?.status || null,
      seller_profile: user.seller_profile
        ? {
            id: user.seller_profile.id.toString(),
            store_name: user.seller_profile.store_name,
            store_link: user.seller_profile.store_link,
            bio: user.seller_profile.bio,
            logo_url: user.seller_profile.logo_url,
            location: user.seller_profile.location,
            location_id: user.seller_profile.location_id,
            area: user.seller_profile.area,
            delivery_policies: user.seller_profile.delivery_policies,
            business_hours: user.seller_profile.business_hours,
            whatsapp_number: user.seller_profile.whatsapp_number,
            social_links: user.seller_profile.social_links,
            accepted_payment_methods:
              user.seller_profile.accepted_payment_methods,
            payment_timing: user.seller_profile.payment_timing,
            service_area: user.seller_profile.service_area,
            avg_delivery_time: user.seller_profile.avg_delivery_time,
            bank_name: user.seller_profile.bank_name,
            bank_code: user.seller_profile.bank_code,
            account_number: user.seller_profile.account_number,
            onboarding_completed: user.seller_profile.onboarding_completed,
            structured_location: user.seller_profile.structured_location
              ? {
                  id: user.seller_profile.structured_location.id,
                  region: user.seller_profile.structured_location.region,
                  city: user.seller_profile.structured_location.city,
                }
              : null,
          }
        : null,
      created_at: user.created_at,
    };
  }

  async submitVerification(
    userId: string,
    dto: SubmitVerificationDto,
    files?: { idImage?: Express.Multer.File; salesProof?: Express.Multer.File },
  ) {
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

    if (!user.is_verified) {
      throw new BadRequestException('Please verify your email first');
    }

    // Check if there's already a pending approval
    const latestApproval = user.admin_approvals[0];
    if (latestApproval && latestApproval.status === 'PENDING') {
      throw new BadRequestException(
        'You already have a pending verification request',
      );
    }

    let verificationData = '';

    if (dto.type === 'URL') {
      verificationData = dto.verification_doc || '';
    } else if (dto.type === 'CONTACT') {
      verificationData = `CONTACT:${dto.contact_method}`;
    } else if (dto.type === 'FILES') {
      const urls: string[] = [];
      if (files?.idImage) {
        const res = await this.cloudinary.uploadImage(
          files.idImage,
          'verifications/ids',
        );
        urls.push(`ID:${res.secure_url}`);
      }
      if (files?.salesProof) {
        const res = await this.cloudinary.uploadImage(
          files.salesProof,
          'verifications/sales',
        );
        urls.push(`PROOF:${res.secure_url}`);
      }
      verificationData =
        urls.length > 0 ? urls.join(',') : dto.verification_doc || '';
    }

    // Update user's verification doc and create approval record
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { verification_doc: verificationData },
      }),
      this.prisma.adminApproval.create({
        data: {
          user_id: userId,
          status: 'PENDING',
          type: dto.type as VerificationType,
          verification_data: verificationData,
        },
      }),
    ]);

    // Fire-and-forget admin notifications (email + SMS).
    const adminPhone = this.configService.get<string>('ADMIN_NOTIFY_PHONE');
    const submittedAt = new Date();
    this.emailService
      .sendSellerVerificationAdminAlert({
        userName: user.full_name,
        userEmail: user.email,
        userPhone: (user as any).phone || null,
        type: dto.type,
        verificationData,
        submittedAt,
      })
      .catch((err) =>
        console.error('Failed to send admin verification email', err),
      );
    if (adminPhone) {
      this.twilio
        .sendSms(
          adminPhone,
          `Vendly: new seller verification from ${user.full_name} (${user.email}) via ${dto.type}. Review in dashboard.`,
        )
        .catch((err) =>
          console.error('Failed to send admin verification SMS', err),
        );
    }

    return {
      message:
        'Verification request submitted successfully. An admin will review your submission.',
    };
  }

  async getApprovalStatus(userId: string) {
    const approval = await this.prisma.adminApproval.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return {
      status: approval?.status || null,
      reviewed_at: approval?.reviewed_at || null,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email_verification_token: dto.token,
        email_verification_expires: { gt: new Date() },
      },
      include: {
        seller_profile: true,
        admin_approvals: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'This verification link is invalid or has expired. Request a new one from the sign-in page.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        is_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
      },
    });

    // Trigger Welcome Email after successful verification
    this.emailService
      .sendWelcomeEmail(user.email, user.full_name)
      .catch((err) => {
        console.error('Failed to send welcome email after verification', err);
      });

    const payload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
    };
    const latestApproval = user.admin_approvals[0] || null;

    return {
      message: 'Email verified successfully. You can now log in.',
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id.toString(),
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_verified: true,
        approval_status: latestApproval?.status || null,
        has_verification_doc: !!user.verification_doc,
        seller_profile: user.seller_profile
          ? {
              id: user.seller_profile.id.toString(),
              store_name: user.seller_profile.store_name,
              store_link: user.seller_profile.store_link,
              bio: user.seller_profile.bio,
              logo_url: user.seller_profile.logo_url,
              onboarding_completed: user.seller_profile.onboarding_completed,
            }
          : null,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      return {
        message:
          'If a user with that email exists, a password reset link has been sent.',
      };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      },
    });

    this.emailService
      .sendPasswordResetEmail(user.email, resetToken)
      .catch(console.error);

    return {
      message:
        'If a user with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        password_reset_token: dto.token,
        password_reset_expires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired. Request a new one and try again.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    // Security notice — fire & forget so the response isn't blocked.
    this.emailService
      .sendPasswordChangedEmail(user.email, user.full_name)
      .catch((err) =>
        console.error('Failed to send password-changed email:', err),
      );

    return {
      message:
        'Password reset successful. You can now log in with your new password.',
    };
  }

  // In-memory token blacklist (use Redis in production)
  private tokenBlacklist = new Set<string>();

  async logout(token: string) {
    this.tokenBlacklist.add(token);
    return { message: 'Logged out successfully' };
  }

  async updateProfile(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: any = {};
    if (dto.full_name) data.full_name = dto.full_name;
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException('Email already in use');
      data.email = dto.email;
    }

    if (dto.new_password) {
      // OAuth-only users don't have a current password — let them set one
      // without the check (they verified via OAuth).
      if (user.password_hash) {
        if (!dto.current_password) {
          throw new BadRequestException(
            'Current password is required to set a new one',
          );
        }
        const isMatch = await bcrypt.compare(
          dto.current_password,
          user.password_hash,
        );
        if (!isMatch) throw new UnauthorizedException('Invalid current password');
      }
      data.password_hash = await bcrypt.hash(dto.new_password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return {
      message: 'Profile updated successfully',
      user: {
        id: updated.id.toString(),
        full_name: updated.full_name,
        email: updated.email,
      },
    };
  }

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        seller_profile: true,
        favorites: { include: { product: { select: { title: true } } } },
        orders: true,
        reviews: true,
        return_requests: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Remove sensitive fields
    const { password_hash, password_reset_token, email_verification_token, ...safeData } = user;
    return safeData;
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: { take: 1 },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const hasOrders = user.orders.length > 0;
    
    // Check if seller has orders
    let hasSales = false;
    if (user.role === 'SELLER') {
      const sellerProfile = await this.prisma.sellerProfile.findUnique({
        where: { user_id: userId },
        include: { products: { include: { order_items: { take: 1 } } } }
      });
      if (sellerProfile) {
         hasSales = sellerProfile.products.some(p => p.order_items.length > 0);
      }
    }

    if (hasOrders || hasSales) {
      // Anonymize account instead of hard delete to preserve order history
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          full_name: 'Deleted User',
          email: `deleted_${userId}@vendly.com`,
          password_hash: '',
          school: 'Unknown',
          is_suspended: true,
          email_verification_token: null,
          password_reset_token: null,
          verification_doc: null,
        },
      });

      // Clear addresses
      await this.prisma.address.deleteMany({
        where: { user_id: userId }
      });
    } else {
      // Hard delete
      await this.prisma.user.delete({
        where: { id: userId },
      });
    }

    return { message: 'Account deleted successfully' };
  }

  // ───────────────────────── 2FA (TOTP) ─────────────────────────

  /**
   * Step 1 of enrolment. Generates a fresh secret, stores it on the user
   * record (but doesn't flip `totp_enabled` yet), and returns the
   * `otpauth://` URL the frontend renders as a QR code.
   *
   * Re-running this overwrites any in-progress secret — that's the intended
   * recovery path if a user lost their phone mid-setup.
   */
  async setup2fa(userId: string) {
    const user: any = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        email: true,
        full_name: true,
        totp_enabled: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.totp_enabled) {
      throw new BadRequestException(
        '2FA is already enabled. Disable it first to re-enroll.',
      );
    }
    const secret = generateSecret();
    await (this.prisma.user as any).update({
      where: { id: userId },
      data: { totp_secret: secret },
    });
    const issuer = this.configService.get<string>('APP_NAME') || 'Vendly';
    return {
      secret, // shown once; user can also paste manually if QR fails
      otpauth_url: buildOtpAuthUrl({
        secret,
        issuer,
        accountName: user.email,
      }),
    };
  }

  /**
   * Step 2 of enrolment. Verifies the first 6-digit code, flips the flag,
   * and issues 10 single-use backup codes. The backup codes are returned in
   * plaintext exactly once — we store only their bcrypt hashes.
   */
  async enable2fa(userId: string, code: string) {
    const user = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: { totp_secret: true, totp_enabled: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.totp_enabled) {
      throw new BadRequestException('2FA is already enabled.');
    }
    if (!user.totp_secret) {
      throw new BadRequestException(
        'No 2FA setup in progress. Call /auth/2fa/setup first.',
      );
    }
    if (!verifyCode(user.totp_secret, code)) {
      throw new UnauthorizedException('Invalid 2FA code');
    }
    const backupCodes = generateBackupCodes(10);
    const hashes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, 10)),
    );
    await (this.prisma.user as any).update({
      where: { id: userId },
      data: {
        totp_enabled: true,
        totp_verified_at: new Date(),
        totp_backup_codes: hashes,
      },
    });
    return {
      message: 'Two-factor authentication enabled.',
      backup_codes: backupCodes,
    };
  }

  /**
   * Disable 2FA. Requires the current password AND a valid TOTP/backup code
   * so a stolen session can't trivially turn the protection off.
   */
  async disable2fa(
    userId: string,
    args: { password: string; totp_code?: string; backup_code?: string },
  ) {
    const user: any = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        id: true,
        password_hash: true,
        totp_secret: true,
        totp_enabled: true,
        totp_method: true,
        totp_backup_codes: true,
        sms_code_hash: true,
        sms_code_expires_at: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.totp_enabled) {
      throw new BadRequestException('2FA is not enabled.');
    }
    const passwordOk = await bcrypt.compare(args.password, user.password_hash);
    if (!passwordOk) throw new UnauthorizedException('Invalid password');

    // For SMS-method users, the supplied code is checked against the active
    // SMS challenge (issuing one if missing is the caller's job — see the
    // SMS resend endpoint). For TOTP users, fall through to the standard path.
    let ok = false;
    if (
      user.totp_method === 'SMS' &&
      args.totp_code &&
      user.sms_code_hash
    ) {
      ok = await this.consumeSmsCode(user, args.totp_code);
    }
    if (!ok) {
      ok = await this.consumeTotpForLogin(
        user,
        args.totp_code,
        args.backup_code,
      );
    }
    if (!ok) throw new UnauthorizedException('Invalid 2FA code');
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
    return { message: 'Two-factor authentication disabled.' };
  }

  async getTwoFactorStatus(userId: string) {
    const user = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        totp_enabled: true,
        totp_verified_at: true,
        totp_backup_codes: true,
        totp_method: true,
        phone_e164: true,
        phone_verified_at: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      enabled: !!user.totp_enabled,
      method: user.totp_method as 'TOTP' | 'SMS',
      verified_at: user.totp_verified_at,
      backup_codes_remaining: (user.totp_backup_codes || []).length,
      phone_hint:
        user.phone_e164 && user.phone_verified_at
          ? `***${user.phone_e164.slice(-4)}`
          : null,
    };
  }

  /**
   * Issues a fresh set of backup codes, invalidating the old ones. Requires
   * the current password.
   */
  async regenerateBackupCodes(userId: string, password: string) {
    const user = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: { password_hash: true, totp_enabled: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.totp_enabled) throw new BadRequestException('2FA is not enabled.');
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid password');
    const codes = generateBackupCodes(10);
    const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
    await (this.prisma.user as any).update({
      where: { id: userId },
      data: { totp_backup_codes: hashes },
    });
    return { backup_codes: codes };
  }

  /**
   * Internal: verifies a TOTP or backup code and, on a backup-code hit,
   * removes that code from the stored set (single-use). Returns true on
   * success.
   */
  private async consumeTotpForLogin(
    user: {
      id?: string;
      totp_secret: string | null;
      totp_backup_codes: string[];
    },
    code?: string,
    backup?: string,
  ): Promise<boolean> {
    if (code && user.totp_secret) {
      if (verifyCode(user.totp_secret, code)) return true;
    }
    if (backup) {
      const trimmed = backup.trim();
      const hashes = user.totp_backup_codes || [];
      for (let i = 0; i < hashes.length; i++) {
        if (await bcrypt.compare(trimmed, hashes[i])) {
          if (user.id) {
            const remaining = hashes.filter((_, idx) => idx !== i);
            await (this.prisma.user as any).update({
              where: { id: user.id },
              data: { totp_backup_codes: remaining },
            });
          }
          return true;
        }
      }
    }
    return false;
  }

  // ───────────────── 2FA via SMS ─────────────────

  /**
   * Begin SMS enrolment. Stores the (pending) phone number, generates a
   * 6-digit verification code, and texts it via Twilio. The number isn't
   * trusted (`phone_verified_at` stays null) until `enable2faSms` succeeds.
   */
  async setup2faSms(userId: string, phoneRaw: string) {
    const phone = normalizePhone(phoneRaw);
    if (!phone) {
      throw new BadRequestException(
        'Phone must be in E.164 format, e.g. +233201234567',
      );
    }
    const user: any = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: { totp_enabled: true, totp_method: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.totp_enabled && user.totp_method === 'SMS') {
      throw new BadRequestException(
        'SMS 2FA is already enabled. Disable it first to change number.',
      );
    }

    const code = generateSmsCode();
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60_000); // 5 minutes

    await (this.prisma.user as any).update({
      where: { id: userId },
      data: {
        phone_e164: phone,
        phone_verified_at: null,
        sms_code_hash: hash,
        sms_code_expires_at: expiresAt,
      },
    });

    const send = await this.twilio.sendSms(
      phone,
      `Your Vendly verification code is ${code}. It expires in 5 minutes.`,
    );

    return {
      message: send.sent
        ? `Code sent to ${maskPhone(phone)}.`
        : 'Code generated but SMS provider is not configured. Contact support.',
      sent: send.sent,
      phone_hint: maskPhone(phone),
    };
  }

  /**
   * Step 2 of SMS enrolment. Verifies the code, marks phone verified, and
   * flips the active 2FA method to SMS. Issues backup codes (same as TOTP).
   */
  async enable2faSms(userId: string, code: string) {
    const user: any = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        phone_e164: true,
        sms_code_hash: true,
        sms_code_expires_at: true,
        totp_enabled: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.phone_e164 || !user.sms_code_hash) {
      throw new BadRequestException(
        'No SMS setup in progress. Call /auth/2fa/sms/setup first.',
      );
    }
    if (
      !user.sms_code_expires_at ||
      user.sms_code_expires_at.getTime() < Date.now()
    ) {
      throw new BadRequestException('Verification code expired. Request a new one.');
    }
    const ok = await bcrypt.compare(code.trim(), user.sms_code_hash);
    if (!ok) throw new UnauthorizedException('Invalid code');

    const backupCodes = generateBackupCodes(10);
    const hashes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, 10)),
    );

    await (this.prisma.user as any).update({
      where: { id: userId },
      data: {
        totp_enabled: true,
        totp_method: 'SMS',
        totp_verified_at: new Date(),
        phone_verified_at: new Date(),
        totp_backup_codes: hashes,
        sms_code_hash: null,
        sms_code_expires_at: null,
        // Clear any half-finished TOTP enrolment.
        totp_secret: null,
      },
    });

    return {
      message: 'Two-factor authentication (SMS) enabled.',
      backup_codes: backupCodes,
    };
  }

  /**
   * Used during login (and also exposable as a "resend" endpoint) to dispatch
   * a fresh code to the user's verified phone. Re-keys the stored hash so
   * older codes are invalidated.
   */
  async dispatchSmsLoginCode(user: {
    id: string;
    phone_e164: string | null;
  }) {
    if (!user.phone_e164) {
      throw new BadRequestException('No verified phone on file.');
    }
    const code = generateSmsCode();
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await (this.prisma.user as any).update({
      where: { id: user.id },
      data: { sms_code_hash: hash, sms_code_expires_at: expiresAt },
    });
    await this.twilio.sendSms(
      user.phone_e164,
      `Your Vendly login code is ${code}. It expires in 5 minutes.`,
    );
    return { sent: true, phone_hint: maskPhone(user.phone_e164) };
  }

  /**
   * Public "resend" — looks up by email+password to avoid leaking which
   * accounts have SMS enrolment. Same shape as the login endpoint.
   */
  async resendSmsLoginCode(email: string, password: string) {
    const user: any = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) throw new UnauthorizedException('Invalid email or password');
    if (!user.totp_enabled || user.totp_method !== 'SMS') {
      throw new BadRequestException('SMS 2FA is not enabled on this account.');
    }
    return this.dispatchSmsLoginCode(user);
  }

  private async consumeSmsCode(
    user: { id: string; sms_code_hash: string | null; sms_code_expires_at: Date | null },
    code: string,
  ): Promise<boolean> {
    if (!user.sms_code_hash || !user.sms_code_expires_at) return false;
    if (user.sms_code_expires_at.getTime() < Date.now()) return false;
    const ok = await bcrypt.compare(code.trim(), user.sms_code_hash);
    if (!ok) return false;
    // Single-use: clear after success.
    await (this.prisma.user as any).update({
      where: { id: user.id },
      data: { sms_code_hash: null, sms_code_expires_at: null },
    });
    return true;
  }
}

// ───────────────── helpers ─────────────────

function generateSmsCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\-()]/g, '');
  // E.164: leading +, then 8–15 digits.
  if (!/^\+\d{8,15}$/.test(cleaned)) return null;
  return cleaned;
}

function maskPhone(p: string): string {
  if (!p || p.length < 4) return '***';
  return `***${p.slice(-4)}`;
}
