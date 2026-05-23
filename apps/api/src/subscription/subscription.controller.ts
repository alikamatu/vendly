import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';

interface InitializeProBody {
  callback_url?: string;
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  @Get('me')
  async getMe(@Req() req: any) {
    return this.subscriptionService.getMe(req.user.id);
  }

  @Post('pro/initialize')
  async initializePro(@Req() req: any, @Body() body: InitializeProBody = {}) {
    return this.subscriptionService.initializePro(
      { id: req.user.id, email: req.user.email },
      body?.callback_url,
    );
  }

  @Get('pro/verify')
  async verifyPro(@Req() req: any, @Query('reference') reference: string) {
    return this.subscriptionService.verifyPro(reference, {
      id: req.user.id,
      email: req.user.email,
    });
  }
}

/**
 * Internal cron endpoints — gated by a shared secret rather than JWT so an
 * external scheduler (Render Cron, Cron-job.org, etc.) can ping us.
 * Required header: `X-Cron-Token` matching `CRON_SECRET` env var.
 */
@Controller('cron')
export class SubscriptionCronController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  private assertCronAuth(token?: string) {
    const expected = this.configService.get<string>('CRON_SECRET');
    if (!expected) {
      throw new UnauthorizedException(
        'CRON_SECRET is not configured on this environment',
      );
    }
    if (!token || token !== expected) {
      throw new UnauthorizedException('Invalid cron token');
    }
  }

  /** Sweep Pro memberships expiring within the next N days (default 3). */
  @Post('subscriptions/expiring')
  async runExpirySweep(
    @Headers('x-cron-token') token: string | undefined,
    @Query('days') days?: string,
  ) {
    this.assertCronAuth(token);
    const horizon = Math.min(Math.max(parseInt(days || '3', 10) || 3, 1), 30);
    return this.subscriptionService.sendExpiryReminders(horizon);
  }
}
