import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { actorFromReq } from '../audit/audit-log.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async getTransactions(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listTransactions({
      userRole: req.user.role,
      userId: req.user.id,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('transactions/:id/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reconcileTransaction(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.paymentsService.reconcileTransaction(id, status);
  }

  @Get('payouts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async getPayouts(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listPayouts({
      userRole: req.user.role,
      userId: req.user.id,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('payouts/run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async runManualQueue(@Req() req: any) {
    return this.paymentsService.runManualPayoutQueue(actorFromReq(req));
  }

  @Post('payouts/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async retryPayout(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.retryPayout(id, actorFromReq(req));
  }

  @Post('payouts/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async processPayout(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.processManualPayout(id, actorFromReq(req));
  }

  @Get('promotions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async getPromotionPayments(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listPromotionPayments({
      userRole: req.user.role,
      userId: req.user.id,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
