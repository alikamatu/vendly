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
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Health check — confirms the payments module is wired correctly. */
  @Get('status')
  getStatus() {
    return this.paymentsService.getStatus();
  }

  /** Initialize a new Paystack transaction. */
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  async initializePayment(@Body() dto: InitializePaymentDto) {
    return this.paymentsService.initializeTransaction(dto);
  }

  /** Verify a Paystack transaction by reference. */
  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyTransaction(reference);
  }

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
      userId: BigInt(req.user.id),
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async getTransactionById(@Param('id') id: string) {
    return this.paymentsService.getTransactionDetails(BigInt(id));
  }

  @Post('transactions/:id/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reconcileTransaction(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.paymentsService.reconcileTransaction(BigInt(id), status);
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
      userId: BigInt(req.user.id),
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('payouts/run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async runManualQueue() {
    return this.paymentsService.runManualPayoutQueue();
  }

  @Post('payouts/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async retryPayout(@Param('id') id: string) {
    return this.paymentsService.retryPayout(BigInt(id));
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async getPaymentHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.getUnifiedHistory({
      userRole: req.user.role,
      userId: BigInt(req.user.id),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
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
      userId: BigInt(req.user.id),
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
