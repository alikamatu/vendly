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
import { actorFromReq } from '../audit/audit-log.service';

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

  /** Verify bank / Mobile Money account holder name via Paystack before saving payout details. */
  @Get('resolve-account')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'SELLER', 'ADMIN')
  async resolveAccount(
    @Query('bank_code') bankCode: string,
    @Query('account_number') accountNumber: string,
  ) {
    return this.paymentsService.resolveBankAccount(bankCode, accountNumber);
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
      userId: req.user.id,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async getTransactionById(@Param('id') id: string) {
    return this.paymentsService.getTransactionDetails(id);
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

  @Post('transactions/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async refundTransactionById(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string },
    @Req() req: any,
  ) {
    return this.paymentsService.refundByTransactionId(
      id,
      body || {},
      actorFromReq(req),
    );
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

  @Post('payouts/:id/hold')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async holdPayout(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.paymentsService.holdPayout(id, reason, actorFromReq(req));
  }

  @Post('payouts/:id/release-hold')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async releasePayoutHold(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.releasePayoutHold(id, actorFromReq(req));
  }

  @Post('payouts/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async cancelPayout(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.paymentsService.cancelPayout(id, reason, actorFromReq(req));
  }

  @Post('payouts/:id/mark-settled')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async markPayoutSettledOffline(
    @Param('id') id: string,
    @Body() body: { external_ref?: string; note?: string },
    @Req() req: any,
  ) {
    return this.paymentsService.markPayoutSettledOffline(
      id,
      body || {},
      actorFromReq(req),
    );
  }

  @Post('payouts/:id/resend-receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async resendPayoutReceipt(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.resendPayoutReceipt(id, actorFromReq(req));
  }

  @Post('payouts/manual-create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createManualPayout(
    @Body()
    body: {
      seller_id: string;
      amount: number;
      reason: string;
      execute_now?: boolean;
    },
    @Req() req: any,
  ) {
    return this.paymentsService.createManualAdminPayout(
      body,
      actorFromReq(req),
    );
  }

  @Get('subaccounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listSubaccounts(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listSubaccounts({
      search,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('subaccounts/:sellerId/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async syncSubaccount(@Param('sellerId') sellerId: string, @Req() req: any) {
    return this.paymentsService.createSubaccount(sellerId, {
      forceUpdate: true,
      throwOnError: true,
      actor: actorFromReq(req),
    });
  }

  @Post('subaccounts/retry-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async retryAllSubaccounts(@Req() req: any) {
    return this.paymentsService.retryAllFailedSubaccounts(actorFromReq(req));
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
      userId: req.user.id,
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
      userId: req.user.id,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /* ─── Super Admin Full Financial Command Endpoints ──────────────────── */

  @Get('paystack-balance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getPaystackBalance() {
    return this.paymentsService.getPaystackBalance();
  }

  @Post('transactions/:id/verify-paystack')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminVerifyTransaction(@Param('id') id: string, @Req() req: any) {
    return this.paymentsService.adminVerifyTransactionWithPaystack(
      id,
      actorFromReq(req),
    );
  }

  @Post('orders/:orderId/release-escrow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminReleaseEscrow(@Param('orderId') orderId: string, @Req() req: any) {
    return this.paymentsService.adminReleaseEscrowForOrder(
      orderId,
      actorFromReq(req),
    );
  }

  @Get('refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listRefunds(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listRefunds({
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('wallets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listVendorWallets(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listVendorWallets({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('wallets/:sellerId/adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adjustVendorWallet(
    @Param('sellerId') sellerId: string,
    @Body()
    body: {
      type: 'CREDIT' | 'DEBIT';
      bucket: 'available' | 'pending';
      amount: number;
      reason: string;
    },
    @Req() req: any,
  ) {
    return this.paymentsService.adjustVendorWallet(
      sellerId,
      body,
      actorFromReq(req),
    );
  }

  @Post('wallets/:sellerId/release-pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async releaseVendorPending(
    @Param('sellerId') sellerId: string,
    @Body() body: { amount?: number; reason?: string },
    @Req() req: any,
  ) {
    return this.paymentsService.releaseVendorPendingBalance(
      sellerId,
      body || {},
      actorFromReq(req),
    );
  }

  @Get('ledger')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listLedgerEntries(
    @Query('seller_id') sellerId?: string,
    @Query('type') type?: string,
    @Query('source_type') sourceType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listLedgerEntries({
      sellerId,
      type,
      sourceType,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('subaccounts/:sellerId/bank')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async overrideSellerBank(
    @Param('sellerId') sellerId: string,
    @Body()
    body: {
      bank_name?: string;
      bank_code: string;
      account_number: string;
      reason?: string;
    },
    @Req() req: any,
  ) {
    return this.paymentsService.adminOverrideSellerBankAndSync(
      sellerId,
      body,
      actorFromReq(req),
    );
  }

  @Post('promotions/:id/reconcile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async reconcilePromotion(
    @Param('id') id: string,
    @Body() body: { status: 'SUCCESS' | 'FAILED'; reason?: string },
    @Req() req: any,
  ) {
    return this.paymentsService.reconcilePromotionPayment(
      id,
      body.status,
      body.reason,
      actorFromReq(req),
    );
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listPaymentLogs(
    @Query('event') event?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.listPaymentLogs({
      event,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
