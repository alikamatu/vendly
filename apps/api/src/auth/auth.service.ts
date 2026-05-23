import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private cloudinary: CloudinaryService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        full_name: dto.full_name,
        email: dto.email,
        password_hash: hashedPassword,
        school: dto.school,
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires,
      },
    });

    this.emailService
      .sendVerificationEmail(user.email, verificationToken)
      .catch((err) => {
        console.error('Failed to send verification email', err);
      });

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        seller_profile: true,
        admin_approvals: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_verified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

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
        seller_profile: true,
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
            onboarding_completed: user.seller_profile.onboarding_completed,
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
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
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

    return { message: 'Email verified successfully. You can now log in.' };
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
      throw new BadRequestException('Invalid or expired password reset token');
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
}
