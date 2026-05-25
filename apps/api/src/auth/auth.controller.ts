import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Query,
  UnauthorizedException,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { FindAccountDto } from './dto/find-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private oauthService: OAuthService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  // Hard ceiling enforced by @nestjs/throttler — 10 login attempts per IP per
  // minute (it tracks request.ip out of the box). Failed-attempt lockout is a
  // separate, stricter layer enforced inside AuthService.login.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req) {
    return this.authService.getMe(req.user.id);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  /**
   * "I forgot which email I registered with." File a support ticket with any
   * details the user can give us. Tight rate limit — 2 per 5 min per IP.
   */
  @Post('find-account')
  @Throttle({ default: { limit: 2, ttl: 5 * 60_000 } })
  @HttpCode(HttpStatus.OK)
  async findAccount(@Body() dto: FindAccountDto) {
    return this.authService.findAccount(dto);
  }

  // ───────────────── OAuth (Google) ─────────────────

  @Get('oauth/google/start')
  startGoogleOAuth(@Query('next') next: string | undefined, @Res() res: Response) {
    const { url } = this.oauthService.getAuthorizationUrl({ next });
    res.redirect(url);
  }

  @Get('oauth/google/callback')
  async googleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.oauthService.handleCallback(code, state);
      // Redirect back to the frontend with a one-time token in the URL hash.
      // The frontend reads the hash, stores the token, then strips the URL.
      const dest = new URL(result.frontend_success_url);
      const params = new URLSearchParams();
      params.set('token', result.access_token);
      if (result.next) params.set('next', result.next);
      dest.hash = params.toString();
      return res.redirect(dest.toString());
    } catch (err: any) {
      const fe = process.env.FRONTEND_URL || 'http://localhost:3000';
      const url = new URL(`${fe}/login`);
      url.searchParams.set('oauth_error', err?.message || 'Sign-in failed.');
      return res.redirect(url.toString());
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('submit-verification')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idImage', maxCount: 1 },
      { name: 'salesProof', maxCount: 1 },
    ]),
  )
  async submitVerification(
    @Req() req,
    @Body() dto: SubmitVerificationDto,
    @UploadedFiles()
    files: {
      idImage?: Express.Multer.File[];
      salesProof?: Express.Multer.File[];
    },
  ) {
    return this.authService.submitVerification(req.user.id, dto, {
      idImage: files?.idImage?.[0],
      salesProof: files?.salesProof?.[0],
    });
  }

  @Get('approval-status')
  @UseGuards(JwtAuthGuard)
  async getApprovalStatus(@Req() req) {
    return this.authService.getApprovalStatus(req.user.id);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) throw new UnauthorizedException();
    return this.authService.logout(token);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Get('export-data')
  @UseGuards(JwtAuthGuard)
  async exportData(@Req() req) {
    return this.authService.exportData(req.user.id);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req) {
    // Optionally we could invalidate the token here as well
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token) {
      await this.authService.logout(token);
    }
    return this.authService.deleteAccount(req.user.id);
  }

  // ───────────────── 2FA ─────────────────

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  async twoFactorStatus(@Req() req) {
    return this.authService.getTwoFactorStatus(req.user.id);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async twoFactorSetup(@Req() req) {
    return this.authService.setup2fa(req.user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async twoFactorEnable(@Req() req, @Body('code') code: string) {
    return this.authService.enable2fa(req.user.id, code);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async twoFactorDisable(
    @Req() req,
    @Body() body: { password: string; totp_code?: string; backup_code?: string },
  ) {
    return this.authService.disable2fa(req.user.id, body);
  }

  @Post('2fa/backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(@Req() req, @Body('password') password: string) {
    return this.authService.regenerateBackupCodes(req.user.id, password);
  }

  // ───────────────── 2FA via SMS ─────────────────

  @Post('2fa/sms/setup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async twoFactorSmsSetup(@Req() req, @Body('phone') phone: string) {
    return this.authService.setup2faSms(req.user.id, phone);
  }

  @Post('2fa/sms/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async twoFactorSmsEnable(@Req() req, @Body('code') code: string) {
    return this.authService.enable2faSms(req.user.id, code);
  }

  /**
   * Unauthenticated: re-issues an SMS login code after the user has entered
   * a valid email+password but lost / dismissed the first SMS.
   */
  @Post('2fa/sms/resend')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async twoFactorSmsResend(
    @Body() body: { email: string; password: string },
  ) {
    return this.authService.resendSmsLoginCode(body.email, body.password);
  }
}
