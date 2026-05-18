import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';

interface InitializeProBody {
  callback_url?: string;
}

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

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
