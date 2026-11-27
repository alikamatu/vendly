import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import paystackConfig from './config/paystack.config';
import { PaymentsRepository } from './payments.repository';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { EmailService } from '../email/email.service';
import { buildOrderEmailPayloads } from '../email/order-email-payload';
import { Actor, AuditLogService } from '../audit/audit-log.service';
import { OrderEventsService } from '../events/order-events.service';
import { NotificationService } from '../notification/notification.service';

interface PaymentProvider {
  initializeTransaction(dto: InitializePaymentDto): Promise<any>;
  verifyTransaction(reference: string): Promise<any>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly platformFeePercent = Number(
    process.env.PLATFORM_FEE_PERCENT || 4,
  );

  constructor(
    private readonly httpService: HttpService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly emailService: EmailService,
    private readonly auditLogs: AuditLogService,
    private readonly orderEvents: OrderEventsService,
    private readonly notifications: NotificationService,
    @Inject(paystackConfig.KEY)
    private readonly paystackCfg: ConfigType<typeof paystackConfig>,
  ) {}

  private getProvider(provider = 'PAYSTACK'): PaymentProvider {
    if (provider !== 'PAYSTACK') {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
    return {
      initializeTransaction: this.initializePaystackTransaction.bind(this),
      verifyTransaction: this.verifyPaystackTransaction.bind(this),
    };
  }

  private async initializePaystackTransaction(dto: InitializePaymentDto) {
    const payload = {
      email: dto.email,
      amount: Math.round(dto.amount * 100),
      ...(dto.reference && { reference: dto.reference }),
      ...(dto.callbackUrl && { callback_url: dto.callbackUrl }),
      ...(dto.subaccount && { subaccount: dto.subaccount }),
      ...(dto.bearer && { bearer: dto.bearer }),
    };

    const { data } = await firstValueFrom(
      this.httpService.post('/transaction/initialize', payload),
    );

    this.logger.log(`Payment initialized for ${dto.email}`);
    return data;
  }

  async initializeTransaction(
    dto: InitializePaymentDto,
    provider = 'PAYSTACK',
  ) {
    return this.getProvider(provider).initializeTransaction(dto);
  }

  private async verifyPaystackTransaction(reference: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(`/transaction/verify/${reference}`),
    );
    this.logger.log(`Payment verified: ${reference}`);
    return data;
  }

  async verifyTransaction(reference: string, provider = 'PAYSTACK') {
    const data = await this.getProvider(provider).verifyTransaction(reference);
    const verifyData = data?.data;
    const isSuccess = data?.status === true && verifyData?.status === 'success';

    if (isSuccess) {
      if (reference?.startsWith('hotsales_')) {
        await this.paymentsRepository.markPromotionPaymentSuccessful(
          reference,
          verifyData?.id?.toString(),
        );
      }

      if (reference?.startsWith('ORD_')) {
        const transaction =
          await this.paymentsRepository.findTransactionByReference(reference);
        if (transaction && transaction.status !== 'SUCCESS') {
          await this.settlePaidOrder(
            transaction.order_id,
            transaction.id,
            verifyData?.id?.toString(),
            reference,
          );
        }
      }
    }

    return data;
  }

  async handleWebhook(payload: any, signature: string, rawBody?: Buffer) {
    // Paystack signs the exact bytes it sent. Re-serialising the parsed JSON
    // is brittle (key order, escaping) and silently flips signatures from
    // valid to invalid, so refuse to verify without the raw body.
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      this.logger.error('Paystack webhook missing raw body — refusing');
      throw new BadRequestException('Raw body required');
    }
    if (!this.verifySignature(signature, rawBody)) {
      this.logger.error('Invalid Paystack signature');
      throw new BadRequestException('Invalid signature');
    }

    const { event, data } = payload;
    // The dedupe key has to be deterministic across replays — falling back
    // to `Date.now()`/`Math.random()` defeated the whole protection. If
    // Paystack can't give us a stable id we bail out loudly instead of
    // silently re-processing.
    const eventId: string | null =
      (data?.id != null ? String(data.id) : null) ??
      (data?.reference ? String(data.reference) : null);
    if (!eventId) {
      this.logger.error(
        `Paystack webhook missing stable event id (event=${event}); cannot dedupe`,
      );
      throw new BadRequestException('Missing event id');
    }

    this.logger.log(`Received Paystack webhook: ${event} id=${eventId}`);

    // Atomic dedupe: rely on the unique constraint on payment_logs.event_id
    // so concurrent duplicate deliveries can't both pass the pre-check and
    // then both run the side effects.
    try {
      await this.paymentsRepository.createPaymentLog(event, payload, eventId);
    } catch (err: any) {
      // Prisma P2002 = unique constraint violation → we've already seen it.
      if (err?.code === 'P2002') {
        this.logger.log(`Duplicate Paystack webhook ignored: ${eventId}`);
        return { received: true, duplicate: true };
      }
      throw err;
    }

    if (event === 'charge.success') {
      await this.processChargeSuccess(data);
    } else if (event === 'charge.failed') {
      await this.processChargeFailed(data);
    } else if (event === 'transfer.success') {
      await this.processTransferSuccess(data);
    } else if (event === 'transfer.failed') {
      await this.processTransferFailed(data);
    } else if (event === 'refund.processed') {
      await this.processRefundProcessed(data);
    } else if (event === 'refund.failed') {
      await this.processRefundFailed(data);
    }

    return { received: true };
  }

  private verifySignature(signature: string, rawBody: Buffer): boolean {
    if (!signature || typeof signature !== 'string') return false;
    const expected = crypto
      .createHmac('sha512', this.paystackCfg.secretKey)
      .update(rawBody)
      .digest('hex');

    // Constant-time compare guards against signature-oracle timing attacks.
    // Buffers must be equal length or timingSafeEqual throws.
    const a = Buffer.from(expected, 'hex');
    let b: Buffer;
    try {
      b = Buffer.from(signature, 'hex');
    } catch {
      return false;
    }
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  private async processChargeSuccess(data: any) {
    const reference = data.reference;

    if (reference?.startsWith('pro_')) {
      const email: string | undefined =
        data?.customer?.email || data?.customer_email || data?.email;
      if (!email) {
        this.logger.warn(
          `Pro webhook missing email for reference: ${reference}`,
        );
        return;
      }
      const user = await this.paymentsRepository.findUserByEmail(email);
      if (!user) {
        this.logger.warn(
          `Pro webhook: user not found for email=${email} ref=${reference}`,
        );
        return;
      }
      // PRO_DURATION_DAYS lives in subscription module; avoid import cycle by hardcoding 30 here.
      const PRO_DURATION_DAYS = 30;
      const wasPro =
        !!user.is_pro &&
        !!user.pro_expires_at &&
        user.pro_expires_at.getTime() > Date.now();
      const updated = await this.paymentsRepository.upgradeUserToPro(
        user.id,
        PRO_DURATION_DAYS,
      );
      this.logger.log(
        `Pro subscription activated via webhook for user=${user.id} ref=${reference}`,
      );
      // Fire-and-forget activation email
      this.emailService
        .sendProActivatedEmail(user.email, {
          name: user.full_name || 'there',
          proExpiresAt: updated.pro_expires_at ?? new Date(),
          amountPaid: Number(data?.amount ?? 0) / 100 || 57,
          reference,
          isExtension: wasPro,
        })
        .catch((err) =>
          this.logger.error(`Failed to send Pro activation email: ${err}`),
        );
      return;
    }

    const transaction =
      await this.paymentsRepository.findTransactionByReference(reference);

    if (!transaction) {
      const promotionPayment =
        await this.paymentsRepository.findPromotionPaymentByReference(
          reference,
        );

      if (!promotionPayment) {
        this.logger.warn(`Transaction not found for reference: ${reference}`);
        return;
      }

      const paidAmount = Number(data.amount || 0) / 100;
      const requiredAmount = Number(promotionPayment.amount);

      if (Math.abs(paidAmount - requiredAmount) > 0.001) {
        this.logger.warn(
          `Promotion payment amount mismatch for ${reference}: expected ${requiredAmount}, got ${paidAmount}`,
        );
        return;
      }

      await this.paymentsRepository.markPromotionPaymentSuccessful(
        reference,
        data.id?.toString(),
      );
      await this.paymentsRepository.createLedgerEntry({
        seller_id: promotionPayment.seller_id,
        reference: `LEDGER_PROMO_${reference}`,
        type: 'DEBIT',
        source_type: 'PROMOTION',
        amount: new Prisma.Decimal(promotionPayment.amount),
        description: 'Promotion payment settled',
      });
      this.logger.log(
        `Promotion payment completed for reference: ${reference}`,
      );
      return;
    }

    if (transaction.status === 'SUCCESS') {
      this.logger.log(`Transaction already marked as SUCCESS: ${reference}`);
      return;
    }

    await this.settlePaidOrder(
      transaction.order_id,
      transaction.id,
      data.id?.toString(),
      reference,
    );

    this.logger.log(
      `Transaction and Order updated successfully for reference: ${reference}`,
    );
  }

  private async settlePaidOrder(
    orderId: string,
    transactionId: string,
    paystackTransactionId: string | undefined,
    reference: string,
  ) {
    await this.paymentsRepository.updateTransactionStatus(
      transactionId,
      'SUCCESS',
      paystackTransactionId,
    );

    await this.paymentsRepository.finalizeOrderInventory(orderId);
    await this.createOrderSettlementRecords(transactionId, reference);

    // Trigger Order Confirmation & Payment Receipt Emails
    this.triggerOrderEmails(orderId).catch((err) => {
      this.logger.error(
        `Failed to trigger order emails for order ${orderId}`,
        err,
      );
    });

    // Real-time synchronization event across system & in-app notifications
    this.triggerOrderRealtimeAndNotifications(orderId, reference).catch(
      (err) => {
        this.logger.error(
          `Failed to trigger order real-time events for order ${orderId}`,
          err,
        );
      },
    );

    // Low-stock alerts (fire-and-forget)
    this.triggerLowStockAlerts(orderId).catch((err) => {
      this.logger.error(
        `Failed to send low-stock alerts for order ${orderId}`,
        err,
      );
    });
  }

  private async triggerOrderRealtimeAndNotifications(
    orderId: string,
    reference: string,
  ) {
    const order = await this.paymentsRepository.findOrderWithDetails(orderId);
    if (!order) return;

    const orderNumber = `ORD-${order.id.slice(-6).toUpperCase()}`;
    const sellerUserIds = Array.from(
      new Set(
        order.items
          .map((i: any) => i.product?.seller?.user_id)
          .filter((x): x is string => Boolean(x)),
      ),
    );

    // In-app notifications for sellers
    for (const sellerUserId of sellerUserIds) {
      await this.notifications.create({
        userId: sellerUserId,
        type: 'ORDER_STATUS_CHANGED',
        title: `Order ${orderNumber} paid`,
        body: `Order ${orderNumber} has been paid and is ready for fulfillment.`,
        link: '/dashboard/orders',
        data: { orderId, reference },
      });
    }

    // In-app notification for buyer
    if (order.buyer_id) {
      await this.notifications.create({
        userId: order.buyer_id,
        type: 'ORDER_STATUS_CHANGED',
        title: `Payment received for ${orderNumber}`,
        body: `Your payment for order ${orderNumber} was successfully processed.`,
        link: `/orders/${orderId}`,
        data: { orderId, reference },
      });
    }

    // Real-time synchronization event across system (Admin, Seller, Buyer)
    this.orderEvents.emit({
      type: 'order.paid',
      orderId: order.id,
      orderNumber,
      status: 'PAID',
      buyerId: order.buyer_id,
      sellerUserIds,
      total: order.total_amount ? order.total_amount.toString() : '0',
      customerName: order.customer_name || order.buyer?.full_name || 'Customer',
      reference,
      timestamp: new Date().toISOString(),
    });
  }

  private async triggerLowStockAlerts(orderId: string) {
    const low =
      await this.paymentsRepository.findLowStockProductsForOrder(orderId);
    for (const product of low) {
      const email = product.seller?.user?.email;
      if (!email) continue;
      this.emailService
        .sendLowStockEmail(email, product.seller?.store_name || 'Your store', {
          id: product.id,
          title: product.title,
          quantity: product.quantity_available,
          image_url: product.image_urls?.[0] || null,
        })
        .catch((err) =>
          this.logger.error(`Failed to send low-stock email: ${err}`),
        );
    }
  }

  private async triggerOrderEmails(orderId: string) {
    const order = await this.paymentsRepository.findOrderWithDetails(orderId);
    if (!order) return;

    const { buyerOrder, sellerOrders } = buildOrderEmailPayloads(order, {
      itemTitleFallback: 'Unknown Product',
      buyerStoreFallback: 'Verndly seller',
      sellerStoreFallback: 'Your store',
      paymentMethod: order.transaction?.provider || 'Paystack',
      isPaid: true,
      currency: null,
    });

    // 1. Buyer order confirmation & payment receipt
    if (order.buyer?.email) {
      this.emailService
        .sendOrderConfirmation(order.buyer.email, buyerOrder)
        .catch((err) =>
          this.logger.error(
            `Failed to send order confirmation to ${order.buyer?.email}`,
            err,
          ),
        );

      this.emailService
        .sendPaymentReceiptEmail(order.buyer.email, {
          ...buyerOrder,
          orderId: order.id,
          transactionId: order.transaction?.id,
        })
        .catch((err) =>
          this.logger.error(
            `Failed to send payment receipt to ${order.buyer?.email}`,
            err,
          ),
        );
    }

    // 2. Per-seller alerts — each seller sees only their items + a per-store
    //    total, so the email reads as a real order to that store.
    for (const sellerOrder of sellerOrders) {
      this.emailService
        .sendSellerOrderNotification(sellerOrder.email, sellerOrder.order)
        .catch((err) =>
          this.logger.error(
            `Failed to send seller notification to ${sellerOrder.email}`,
            err,
          ),
        );
    }
  }

  private async processChargeFailed(data: any) {
    const reference = data.reference;
    const transaction =
      await this.paymentsRepository.findTransactionByReference(reference);
    if (transaction && transaction.status !== 'FAILED') {
      await this.paymentsRepository.updateTransactionStatus(
        transaction.id,
        'FAILED',
        data.id?.toString(),
      );
      await this.paymentsRepository.updateOrderStatus(
        transaction.order_id,
        'PENDING',
      );
    } else {
      await this.paymentsRepository.markPromotionPaymentFailed(
        reference,
        data.id?.toString(),
      );
    }
  }

  private async processTransferSuccess(data: any) {
    const reference = data.reference as string;
    if (!reference?.startsWith('PAYOUT_')) return;

    let payout = await this.paymentsRepository.getPayoutByReference(reference);
    if (!payout && reference.includes('_')) {
      const parts = reference.split('_');
      for (const part of parts) {
        if (part !== 'PAYOUT' && part !== 'TXN' && part.length > 10) {
          payout = await this.paymentsRepository
            .getPayoutById(part)
            .catch(() => null);
          if (payout) break;
        }
      }
    }

    if (!payout) {
      this.logger.warn(
        `processTransferSuccess: Payout not found for reference ${reference}`,
      );
      return;
    }

    await this.finalizePayoutSuccess(payout.id, {
      provider_ref: data.transfer_code?.toString() || data.id?.toString(),
      processed_at: new Date(),
    });
  }

  private async processTransferFailed(data: any) {
    const reference = data.reference as string;
    if (!reference?.startsWith('PAYOUT_')) return;

    let payout = await this.paymentsRepository.getPayoutByReference(reference);
    if (!payout && reference.includes('_')) {
      const parts = reference.split('_');
      for (const part of parts) {
        if (part !== 'PAYOUT' && part !== 'TXN' && part.length > 10) {
          payout = await this.paymentsRepository
            .getPayoutById(part)
            .catch(() => null);
          if (payout) break;
        }
      }
    }

    if (!payout) return;

    await this.paymentsRepository.updatePayoutStatus(payout.id, 'FAILED', {
      failure_reason: data.reason || 'Transfer failed',
      processed_at: new Date(),
    });
  }

  async createOrderSettlementRecords(transactionId: string, reference: string) {
    const transaction =
      await this.paymentsRepository.findTransactionByReference(reference);
    if (!transaction) return;
    const sellerId = await this.paymentsRepository.findSellerByOrder(
      transaction.order_id,
    );
    if (!sellerId) return;

    const gross = new Prisma.Decimal(transaction.amount);
    const fee = gross.mul(this.platformFeePercent).div(100);
    const net = gross.sub(fee);

    await this.paymentsRepository.createLedgerEntry({
      seller_id: sellerId,
      transaction_id: transactionId,
      reference: `LEDGER_ORDER_CREDIT_${reference}`,
      type: 'CREDIT',
      source_type: 'ORDER',
      amount: gross,
      description: 'Order payment received',
    });
    await this.paymentsRepository.createLedgerEntry({
      seller_id: sellerId,
      transaction_id: transactionId,
      reference: `LEDGER_FEE_${reference}`,
      type: 'DEBIT',
      source_type: 'FEE',
      amount: fee,
      description: 'Platform fee',
    });

    await this.paymentsRepository.upsertVendorBalanceSnapshot({
      sellerId,
      pendingDelta: net,
      earnedDelta: gross,
    });
  }

  async getOrCreateTransferRecipient(sellerId: string) {
    const seller = await this.paymentsRepository.getSellerProfile(sellerId);
    if (!seller || !seller.bank_code || !seller.account_number) {
      throw new BadRequestException('Seller bank details incomplete');
    }

    // In a real app we'd store recipient_code on the seller profile to avoid recreating it
    // But Paystack's /transferrecipient is idempotent for the same account details
    try {
      const payload = {
        type: 'nuban',
        name: seller.store_name,
        account_number: seller.account_number,
        bank_code: seller.bank_code,
        currency: 'GHS',
      };
      const { data } = await firstValueFrom(
        this.httpService.post('/transferrecipient', payload),
      );
      return data.data.recipient_code;
    } catch (error: any) {
      this.logger.error(
        `Failed to create transfer recipient for ${sellerId}: ${error.response?.data?.message || error.message}`,
      );
      throw new BadRequestException('Failed to create transfer recipient');
    }
  }

  async processTransferToSeller(
    sellerId: string,
    amount: Prisma.Decimal,
    reference: string,
    reason: string,
  ) {
    const recipientCode = await this.getOrCreateTransferRecipient(sellerId);
    try {
      const payload = {
        source: 'balance',
        amount: Math.round(Number(amount) * 100),
        reference,
        recipient: recipientCode,
        reason,
      };
      const { data } = await firstValueFrom(
        this.httpService.post('/transfer', payload),
      );
      return data.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to initiate transfer ${reference}: ${error.response?.data?.message || error.message}`,
      );
      throw new BadRequestException(
        `Transfer failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  async releaseEscrowForOrder(orderId: string) {
    const order = await this.paymentsRepository.findOrderWithDetails(orderId);
    if (!order || !order.transaction) {
      this.logger.warn(
        `Cannot release escrow: Order ${orderId} or its transaction not found`,
      );
      return;
    }
    if (order.transaction.status !== 'SUCCESS') {
      this.logger.warn(
        `Cannot release escrow: Transaction for order ${orderId} is not SUCCESS`,
      );
      return;
    }

    const sellerId = await this.paymentsRepository.findSellerByOrder(orderId);
    if (!sellerId) return;

    // Check if payout already exists for this transaction
    const existingPayout = await this.paymentsRepository.listPayouts({
      sellerId,
      page: 1,
      limit: 100,
    });
    const payoutExists = existingPayout.items.some(
      (p: any) => p.transaction_id === order.transaction!.id,
    );
    if (payoutExists) {
      this.logger.log(`Escrow already released for order ${orderId}`);
      return;
    }

    const gross = new Prisma.Decimal(order.transaction.amount);
    const fee = gross.mul(this.platformFeePercent).div(100);
    const net = gross.sub(fee);

    // Move funds from pending to available
    await this.paymentsRepository.upsertVendorBalanceSnapshot({
      sellerId,
      pendingDelta: net.mul(-1),
      availableDelta: net,
    });

    // We can auto-process the transfer or queue it. Let's do it automatically based on payout mode.
    // The previous flow used `AUTO` if eligible.
    await this.createPayoutFromTransaction(
      order.transaction.id,
      sellerId,
      net,
      'AUTO',
    );
  }

  private async createPayoutFromTransaction(
    transactionId: string,
    sellerId: string,
    amount: Prisma.Decimal,
    mode: 'AUTO' | 'MANUAL',
  ) {
    const seller = await this.paymentsRepository.getSellerProfile(sellerId);
    const isEligibleForAuto =
      mode === 'AUTO' &&
      Boolean(
        seller?.paystack_subaccount_code &&
        seller?.bank_code &&
        seller?.account_number,
      );

    const payout = await this.paymentsRepository.createPayout({
      seller_id: sellerId,
      transaction_id: transactionId,
      reference: `PAYOUT_TXN_${transactionId.toString()}_${Date.now()}`,
      amount,
      mode: isEligibleForAuto ? 'AUTO' : 'MANUAL',
      status: isEligibleForAuto ? 'PROCESSING' : 'PENDING',
      ...(isEligibleForAuto
        ? {}
        : {
            failure_reason:
              'Seller payout setup incomplete; queued for manual processing',
          }),
    });

    if (isEligibleForAuto) {
      try {
        await this.processTransferToSeller(
          sellerId,
          amount,
          payout.reference,
          'Order Payout',
        );
        // Let the webhook handle marking it as SUCCESS
      } catch (error: any) {
        await this.paymentsRepository.updatePayoutStatus(payout.id, 'FAILED', {
          failure_reason: error.message,
          processed_at: new Date(),
        });
      }
    }

    return payout;
  }

  async resolveBankAccount(bankCode: string, accountNumber: string) {
    const cleanBank = (bankCode || '').trim().toUpperCase();
    const cleanAcct = (accountNumber || '').replace(/[\s-]/g, '').trim();

    if (!cleanBank) {
      throw new BadRequestException(
        'Bank or Mobile Money provider code is required.',
      );
    }
    if (!/^\d{9,16}$/.test(cleanAcct)) {
      throw new BadRequestException(
        'Account or Mobile Money number must contain 9 to 16 digits.',
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get('/bank/resolve', {
          params: {
            account_number: cleanAcct,
            bank_code: cleanBank,
          },
        }),
      );
      if (data?.status === true && data?.data?.account_name) {
        return {
          verified: true,
          account_name: String(data.data.account_name),
          account_number: String(data.data.account_number || cleanAcct),
          bank_code: cleanBank,
        };
      }
      throw new BadRequestException(
        data?.message || 'Could not resolve this account with Paystack.',
      );
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      const status = error?.response?.status;
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to verify account with Paystack.';
      if (status && status >= 400 && status < 500) {
        throw new BadRequestException(msg);
      }
      this.logger.warn(
        `Paystack account resolution unavailable (${cleanBank}): ${msg}`,
      );
      return {
        verified: false,
        account_name: null,
        account_number: cleanAcct,
        bank_code: cleanBank,
        warning: msg,
      };
    }
  }

  async createSubaccount(
    sellerId: string,
    opts?: { forceUpdate?: boolean; throwOnError?: boolean; actor?: Actor },
  ): Promise<{
    ok: boolean;
    subaccount_code: string | null;
    action: 'created' | 'updated' | 'existing' | 'failed';
    error?: string;
  }> {
    const seller = await this.paymentsRepository.getSellerProfile(sellerId);

    if (!seller) {
      const msg = `Seller profile not found: ${sellerId}`;
      this.logger.error(msg);
      if (opts?.throwOnError) throw new NotFoundException(msg);
      return { ok: false, subaccount_code: null, action: 'failed', error: msg };
    }

    if (seller.paystack_subaccount_code && !opts?.forceUpdate) {
      this.logger.log(
        `Seller ${sellerId} already has a subaccount: ${seller.paystack_subaccount_code}`,
      );
      return {
        ok: true,
        subaccount_code: seller.paystack_subaccount_code,
        action: 'existing',
      };
    }

    const cleanBank = (seller.bank_code || '').trim();
    const cleanAcct = (seller.account_number || '')
      .replace(/[\s-]/g, '')
      .trim();

    if (!cleanBank || !cleanAcct) {
      const errorMsg = 'Missing payout details (bank_code or account_number)';
      this.logger.warn(
        `Cannot sync subaccount for seller ${sellerId}: ${errorMsg}`,
      );
      await this.handleSubaccountFailure(sellerId, errorMsg);
      if (opts?.throwOnError) throw new BadRequestException(errorMsg);
      return {
        ok: false,
        subaccount_code: null,
        action: 'failed',
        error: errorMsg,
      };
    }

    if (!/^\d{9,16}$/.test(cleanAcct)) {
      const errorMsg =
        'Account / Mobile Money number must contain 9 to 16 digits with no letters.';
      await this.handleSubaccountFailure(sellerId, errorMsg);
      if (opts?.throwOnError) throw new BadRequestException(errorMsg);
      return {
        ok: false,
        subaccount_code: null,
        action: 'failed',
        error: errorMsg,
      };
    }

    const payload = {
      business_name: seller.store_name,
      settlement_bank: cleanBank,
      account_number: cleanAcct,
      percentage_charge: this.platformFeePercent,
      description: `Subaccount for ${seller.store_name}`,
    };

    // If a subaccount already exists and forceUpdate is requested, update it in place on Paystack
    if (seller.paystack_subaccount_code && opts?.forceUpdate) {
      try {
        await firstValueFrom(
          this.httpService.put(
            `/subaccount/${seller.paystack_subaccount_code}`,
            payload,
          ),
        );
        const retry =
          await this.paymentsRepository.findPendingSubaccountRetry(sellerId);
        if (retry) {
          await this.paymentsRepository.updateSubaccountRetry(retry.id, {
            status: 'COMPLETED',
          });
        }
        this.auditLogs.record({
          actorId: opts?.actor?.id,
          actorRole: opts?.actor?.role,
          action: 'subaccount.updated',
          entityType: 'seller_profile',
          entityId: sellerId,
          after: {
            paystack_subaccount_code: seller.paystack_subaccount_code,
            bank_code: cleanBank,
            account_last4: cleanAcct.slice(-4),
          },
          ip: opts?.actor?.ip,
          userAgent: opts?.actor?.userAgent,
        });
        this.logger.log(
          `Paystack subaccount updated for seller ${sellerId}: ${seller.paystack_subaccount_code}`,
        );
        return {
          ok: true,
          subaccount_code: seller.paystack_subaccount_code,
          action: 'updated',
        };
      } catch (updateErr: any) {
        const status = updateErr?.response?.status;
        const msg =
          updateErr?.response?.data?.message ||
          updateErr?.message ||
          'Update failed';
        // If Paystack reports invalid bank/account (400/422), surface it instead of masking
        if (status && status >= 400 && status < 500 && status !== 404) {
          await this.handleSubaccountFailure(sellerId, msg);
          if (opts?.throwOnError) {
            throw new BadRequestException(
              `Paystack rejected these payout details: ${msg}`,
            );
          }
          return {
            ok: false,
            subaccount_code: null,
            action: 'failed',
            error: msg,
          };
        }
        this.logger.warn(
          `In-place Paystack subaccount update failed for ${sellerId} (${msg}); attempting fresh creation`,
        );
      }
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post('/subaccount', payload),
      );

      const subaccountCode = data?.data?.subaccount_code;
      if (!subaccountCode) {
        throw new Error('Paystack did not return a subaccount_code');
      }

      await this.paymentsRepository.updateSellerSubaccount(
        sellerId,
        subaccountCode,
      );

      // If there was a pending retry, mark it as completed
      const retry =
        await this.paymentsRepository.findPendingSubaccountRetry(sellerId);
      if (retry) {
        await this.paymentsRepository.updateSubaccountRetry(retry.id, {
          status: 'COMPLETED',
        });
      }

      this.auditLogs.record({
        actorId: opts?.actor?.id,
        actorRole: opts?.actor?.role,
        action: 'subaccount.created',
        entityType: 'seller_profile',
        entityId: sellerId,
        after: {
          paystack_subaccount_code: subaccountCode,
          bank_code: cleanBank,
          account_last4: cleanAcct.slice(-4),
        },
        ip: opts?.actor?.ip,
        userAgent: opts?.actor?.userAgent,
      });

      this.logger.log(
        `Paystack subaccount created for seller ${sellerId}: ${subaccountCode}`,
      );
      return {
        ok: true,
        subaccount_code: subaccountCode,
        action: 'created',
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Paystack subaccount error';
      this.logger.error(
        `Failed to create Paystack subaccount for seller ${sellerId}: ${errorMsg}`,
      );
      await this.handleSubaccountFailure(sellerId, errorMsg);

      // Surface Paystack 4xx validation errors when requested so onboarding/settings can fix typos immediately
      if (opts?.throwOnError && status && status >= 400 && status < 500) {
        throw new BadRequestException(
          `Paystack could not verify your payout account: ${errorMsg}`,
        );
      }

      return {
        ok: false,
        subaccount_code: null,
        action: 'failed',
        error: errorMsg,
      };
    }
  }

  /**
   * Handle subaccount creation failure by logging and updating retry record.
   */
  private async handleSubaccountFailure(sellerId: string, errorMsg: string) {
    const existingRetry =
      await this.paymentsRepository.findPendingSubaccountRetry(sellerId);

    if (existingRetry) {
      await this.paymentsRepository.updateSubaccountRetry(existingRetry.id, {
        attempts: existingRetry.attempts + 1,
        last_error: errorMsg,
        status: existingRetry.attempts + 1 >= 5 ? 'FAILED' : 'PENDING',
      });
    } else {
      await this.paymentsRepository.createSubaccountRetry(sellerId, errorMsg);
    }
  }

  async listTransactions(params: {
    userRole: string;
    userId: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    let sellerId: string | undefined = undefined;

    if (params.userRole === 'SELLER') {
      const seller = await this.paymentsRepository.getSellerProfileByUserId(
        params.userId,
      );
      if (!seller) throw new NotFoundException('Seller profile not found');
      sellerId = seller.id;
    }

    return this.paymentsRepository.listTransactions({
      sellerId,
      status: params.status,
      page,
      limit,
    });
  }

  async getTransactionDetails(id: string) {
    const transaction = await this.paymentsRepository.getTransactionById(id);
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async reconcileTransaction(id: string, status: string) {
    return this.paymentsRepository.reconcileTransaction(id, status);
  }

  async listPayouts(params: {
    userRole: string;
    userId: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    let sellerId: string | undefined = undefined;
    if (params.userRole === 'SELLER') {
      const seller = await this.paymentsRepository.getSellerProfileByUserId(
        params.userId,
      );
      if (!seller) throw new NotFoundException('Seller profile not found');
      sellerId = seller.id;
    }
    return this.paymentsRepository.listPayouts({
      sellerId,
      status: params.status,
      page,
      limit,
    });
  }

  async retryPayout(id: string, actor?: Actor) {
    const payout = await this.paymentsRepository.getPayoutById(id);
    if (!payout) throw new NotFoundException('Payout not found');
    const updated = await this.paymentsRepository.updatePayoutStatus(
      id,
      'PROCESSING',
    );
    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.retry',
      entityType: 'payout',
      entityId: id,
      before: { status: (payout as any).status },
      after: { status: 'PROCESSING' },
      metadata: {
        amount: (payout as any).amount?.toString?.(),
        seller_id: (payout as any).seller_id,
      },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return updated;
  }

  async processManualPayout(id: string, actor?: Actor) {
    const payout = await this.paymentsRepository.getPayoutById(id);
    if (!payout) throw new NotFoundException('Payout not found');
    const meta = ((payout as any).metadata || {}) as Record<string, any>;
    if (meta.on_hold) {
      throw new BadRequestException(
        'This payout is currently on hold. Release the hold before processing.',
      );
    }
    if (meta.cancelled) {
      throw new BadRequestException(
        'This payout was cancelled and cannot be processed.',
      );
    }
    if (
      (payout as any).status === 'SUCCESS' ||
      (payout as any).status === 'PROCESSING'
    ) {
      throw new BadRequestException(
        'Payout is already processed or processing',
      );
    }

    // Attempt transfer
    await this.paymentsRepository.updatePayoutStatus(id, 'PROCESSING');

    try {
      await this.processTransferToSeller(
        (payout as any).seller_id,
        (payout as any).amount,
        payout.reference,
        'Manual Payout',
      );

      this.auditLogs.record({
        actorId: actor?.id,
        actorRole: actor?.role,
        action: 'payout.process_manual',
        entityType: 'payout',
        entityId: id,
        before: { status: (payout as any).status },
        after: { status: 'PROCESSING' },
        metadata: { amount: (payout as any).amount?.toString() },
        ip: actor?.ip,
        userAgent: actor?.userAgent,
      });

      return { status: 'PROCESSING', message: 'Transfer initiated' };
    } catch (error: any) {
      await this.paymentsRepository.updatePayoutStatus(id, 'FAILED', {
        failure_reason: error.message,
      });
      throw new BadRequestException(error.message);
    }
  }

  async runManualPayoutQueue(actor?: Actor) {
    const queue = await this.paymentsRepository.listPayouts({
      status: 'PENDING',
      page: 1,
      limit: 100,
    });

    let processed = 0;
    let skippedOnHold = 0;
    for (const item of queue.items) {
      const meta = ((item as any).metadata || {}) as Record<string, any>;
      if (meta.on_hold || meta.cancelled) {
        skippedOnHold++;
        continue;
      }
      try {
        await this.processManualPayout(item.id, actor);
        processed++;
      } catch (err) {
        this.logger.error(
          `Failed to process manual payout ${item.id} from queue`,
          err,
        );
      }
    }

    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.run_queue',
      entityType: 'payout',
      entityId: null,
      metadata: {
        processed,
        skippedOnHold,
        ids: queue.items.map((i: any) => i.id),
      },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return { processed, skippedOnHold };
  }

  async holdPayout(id: string, reason: string, actor?: Actor) {
    const payout = await this.paymentsRepository.getPayoutById(id);
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'SUCCESS') {
      throw new BadRequestException(
        'Completed payouts cannot be placed on hold.',
      );
    }
    const cleanReason =
      (reason || '').trim() || 'Placed on administrative hold';
    const nextMeta = {
      ...(((payout as any).metadata || {}) as Record<string, any>),
      on_hold: true,
      hold_reason: cleanReason,
      held_at: new Date().toISOString(),
      held_by: actor?.id || 'ADMIN',
    };
    const updated = await this.paymentsRepository.updatePayoutStatus(
      id,
      payout.status === 'FAILED' ? 'FAILED' : 'PENDING',
      {
        failure_reason: `ON HOLD: ${cleanReason}`,
        metadata: nextMeta,
      },
    );
    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.hold',
      entityType: 'payout',
      entityId: id,
      reason: cleanReason,
      before: { status: payout.status, on_hold: false },
      after: { status: updated.status, on_hold: true },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return updated;
  }

  async releasePayoutHold(id: string, actor?: Actor) {
    const payout = await this.paymentsRepository.getPayoutById(id);
    if (!payout) throw new NotFoundException('Payout not found');
    const prevMeta = ((payout as any).metadata || {}) as Record<string, any>;
    const nextMeta = {
      ...prevMeta,
      on_hold: false,
      released_at: new Date().toISOString(),
      released_by: actor?.id || 'ADMIN',
    };
    const updated = await this.paymentsRepository.updatePayoutStatus(
      id,
      payout.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
      {
        failure_reason: null,
        metadata: nextMeta,
      },
    );
    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.release_hold',
      entityType: 'payout',
      entityId: id,
      before: { status: payout.status, on_hold: Boolean(prevMeta.on_hold) },
      after: { status: updated.status, on_hold: false },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return updated;
  }

  async cancelPayout(id: string, reason: string, actor?: Actor) {
    const payout = await this.paymentsRepository.getPayoutById(id);
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'SUCCESS') {
      throw new BadRequestException('Completed payouts cannot be cancelled.');
    }
    const cleanReason = (reason || '').trim();
    if (!cleanReason) {
      throw new BadRequestException('A cancellation reason is required.');
    }
    const nextMeta = {
      ...(((payout as any).metadata || {}) as Record<string, any>),
      on_hold: false,
      cancelled: true,
      cancel_reason: cleanReason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: actor?.id || 'ADMIN',
    };
    const updated = await this.paymentsRepository.updatePayoutStatus(
      id,
      'FAILED',
      {
        failure_reason: `CANCELLED: ${cleanReason}`,
        metadata: nextMeta,
      },
    );
    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.cancel',
      entityType: 'payout',
      entityId: id,
      reason: cleanReason,
      before: { status: payout.status },
      after: { status: 'FAILED', cancelled: true },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return updated;
  }

  async markPayoutSettledOffline(
    id: string,
    payload: { external_ref?: string; note?: string },
    actor?: Actor,
  ) {
    const payout = await this.paymentsRepository.getPayoutById(id);
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === 'SUCCESS') {
      throw new BadRequestException(
        'This payout is already marked as settled.',
      );
    }
    const ref = (payload?.external_ref || '').trim() || `OFFLINE_${Date.now()}`;
    const nextMeta = {
      ...(((payout as any).metadata || {}) as Record<string, any>),
      on_hold: false,
      settled_offline: true,
      settled_offline_ref: ref,
      settled_offline_note: (payload?.note || '').trim() || undefined,
      settled_by: actor?.id || 'ADMIN',
    };
    await this.paymentsRepository.updatePayoutStatus(id, 'PROCESSING', {
      provider_ref: ref,
      failure_reason: null,
      metadata: nextMeta,
    });
    const finalized = await this.finalizePayoutSuccess(id, {
      provider_ref: ref,
      processed_at: new Date(),
    });
    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.mark_settled_offline',
      entityType: 'payout',
      entityId: id,
      reason: payload?.note,
      before: { status: payout.status },
      after: { status: 'SUCCESS', provider_ref: ref },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return finalized;
  }

  async createManualAdminPayout(
    input: {
      seller_id: string;
      amount: number;
      reason: string;
      execute_now?: boolean;
    },
    actor?: Actor,
  ) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Payout amount must be a positive number.');
    }
    const reason = (input.reason || '').trim();
    if (!reason) {
      throw new BadRequestException(
        'Please provide a reason/note for this manual payout.',
      );
    }
    const seller = await this.paymentsRepository.getSellerProfile(
      input.seller_id,
    );
    if (!seller) {
      throw new NotFoundException('Seller store not found.');
    }
    if (!seller.bank_code || !seller.account_number) {
      throw new BadRequestException(
        `${seller.store_name} does not have bank/MoMo payout details configured yet.`,
      );
    }

    const reference = `MAN_PAY_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const payout = await this.paymentsRepository.createPayout({
      seller_id: seller.id,
      reference,
      amount: new Prisma.Decimal(amount.toFixed(2)),
      mode: 'MANUAL',
      status: 'PENDING',
      metadata: {
        created_by_admin: actor?.id || 'ADMIN',
        admin_reason: reason,
        ad_hoc: true,
      },
    });

    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.create_manual',
      entityType: 'payout',
      entityId: payout.id,
      reason,
      after: {
        seller_id: seller.id,
        store_name: seller.store_name,
        amount: amount.toFixed(2),
        reference,
        execute_now: Boolean(input.execute_now),
      },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });

    if (input.execute_now) {
      const execResult = await this.processManualPayout(payout.id, actor);
      return { payout, execution: execResult };
    }
    return { payout };
  }

  async resendPayoutReceipt(id: string, actor?: Actor) {
    const payout = await this.paymentsRepository.getPayoutById(id);
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'SUCCESS') {
      throw new BadRequestException(
        'Receipts can only be resent for completed payouts.',
      );
    }
    await this.sendPayoutReceipt(id, payout);
    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.resend_receipt',
      entityType: 'payout',
      entityId: id,
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return {
      success: true,
      message: 'Payout receipt email re-sent to the seller.',
    };
  }

  async listSubaccounts(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.paymentsRepository.listSellerSubaccounts({
      search: params.search,
      status: params.status,
      page: params.page || 1,
      limit: params.limit || 50,
    });
  }

  async retryAllFailedSubaccounts(actor?: Actor) {
    const candidates = await this.paymentsRepository.findRetryableSubaccounts();
    let synced = 0;
    let failed = 0;
    const errors: Array<{
      seller_id: string;
      store_name: string;
      error: string;
    }> = [];

    for (const s of candidates) {
      const res = await this.createSubaccount(s.id, {
        forceUpdate: true,
        throwOnError: false,
        actor,
      });
      if (res.ok) {
        synced++;
      } else {
        failed++;
        errors.push({
          seller_id: s.id,
          store_name: s.store_name,
          error: res.error || 'Unknown error',
        });
      }
    }

    return {
      total: candidates.length,
      synced,
      failed,
      errors,
    };
  }

  async refundByTransactionId(
    transactionId: string,
    body: { amount?: number; reason?: string },
    actor?: Actor,
  ) {
    const txn = await this.paymentsRepository.getTransactionById(transactionId);
    if (!txn) {
      throw new NotFoundException('Transaction not found.');
    }
    return this.refundTransaction({
      orderId: txn.order_id,
      amount: body?.amount,
      reason: body?.reason || 'Refund initiated by Super Admin',
      actor,
    });
  }

  async finalizePayoutSuccess(
    payoutId: string,
    details?: { provider_ref?: string; processed_at?: Date },
  ) {
    const payout = await this.paymentsRepository.getPayoutById(payoutId);
    if (!payout) {
      this.logger.warn(`finalizePayoutSuccess: Payout not found ${payoutId}`);
      return null;
    }

    const processedAt = details?.processed_at || new Date();
    const providerRef = details?.provider_ref || payout.provider_ref;

    const updatedPayout = await this.paymentsRepository.updatePayoutStatus(
      payoutId,
      'SUCCESS',
      {
        provider_ref: providerRef || undefined,
        processed_at: processedAt,
      },
    );

    // Ledger debit entry if not already recorded
    const ledgerRef = `LEDGER_PAYOUT_${payout.reference}`;
    const existingLedger =
      await this.paymentsRepository.findLedgerEntryByReference(ledgerRef);

    if (!existingLedger) {
      const decimalAmount = new Prisma.Decimal(payout.amount);
      await this.paymentsRepository.createLedgerEntry({
        seller_id: payout.seller_id,
        payout_id: payout.id,
        transaction_id: payout.transaction_id || undefined,
        reference: ledgerRef,
        type: 'DEBIT',
        source_type: 'PAYOUT',
        amount: decimalAmount,
        description: 'Payout disbursement processed',
      });
      await this.paymentsRepository.upsertVendorBalanceSnapshot({
        sellerId: payout.seller_id,
        availableDelta: decimalAmount.negated(),
        withdrawnDelta: decimalAmount,
      });
    }

    // Send receipt email & in-app notification to the seller
    await this.sendPayoutReceipt(payoutId, {
      ...payout,
      provider_ref: providerRef,
      processed_at: processedAt,
    });

    return updatedPayout;
  }

  async sendPayoutReceipt(payoutId: string, preloadedPayout?: any) {
    try {
      const payout = preloadedPayout?.seller?.user
        ? preloadedPayout
        : await this.paymentsRepository.getPayoutById(payoutId);

      if (!payout) {
        this.logger.warn(
          `Cannot send payout receipt: payout ${payoutId} not found`,
        );
        return;
      }

      const seller = payout.seller;
      if (!seller) {
        this.logger.warn(
          `Cannot send payout receipt: seller not found for payout ${payoutId}`,
        );
        return;
      }

      const sellerUser =
        seller.user ||
        (await this.paymentsRepository.findUserById(seller.user_id));

      const recipientEmail = sellerUser?.email;
      if (!recipientEmail) {
        this.logger.warn(
          `Cannot send payout receipt: no email found for seller user ${seller.user_id}`,
        );
        return;
      }

      const netAmount = Number(payout.amount || 0);
      const grossAmount = payout.transaction?.amount
        ? Number(payout.transaction.amount)
        : Number((netAmount / 0.96).toFixed(2));
      const platformFee = Number((grossAmount * 0.04).toFixed(2));

      const orderNumber = payout.transaction?.order?.id
        ? `ORD-${payout.transaction.order.id.slice(-6).toUpperCase()}`
        : undefined;

      await this.emailService.sendPayoutSentEmail(recipientEmail, {
        storeName: seller.store_name,
        sellerName: sellerUser?.full_name || seller.store_name,
        amount: netAmount.toFixed(2),
        currency: payout.currency || 'GHS',
        reference: payout.reference,
        providerRef: payout.provider_ref || undefined,
        bankName: seller.bank_name || undefined,
        accountNumber: seller.account_number || undefined,
        accountLastFour: seller.account_number?.slice(-4) || undefined,
        mode: payout.mode,
        grossAmount: grossAmount.toFixed(2),
        platformFee: platformFee.toFixed(2),
        orderNumber,
        orderId: payout.transaction?.order?.id,
        storeLink: seller.store_link,
        processedAt: payout.processed_at ?? new Date(),
      });

      this.logger.log(
        `Payout receipt email successfully sent to ${recipientEmail} for reference ${payout.reference}`,
      );

      // In-app dashboard notification for the seller
      if (seller.user_id) {
        const symbol =
          payout.currency === 'GHS' ? 'GH¢' : payout.currency || 'GH¢';
        const formattedAmount = `${symbol} ${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        await this.notifications.create({
          userId: seller.user_id,
          type: 'PAYMENT_RECEIVED',
          title: `Payout of ${formattedAmount} sent`,
          body: `Your payout of ${formattedAmount} for ${seller.store_name} has been disbursed to your account.`,
          link: '/dashboard/transactions',
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to send payout receipt email for ${payoutId}: ${err}`,
      );
    }
  }

  async getUnifiedHistory(params: {
    userRole: string;
    userId: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    let sellerId: string | undefined = undefined;

    if (params.userRole === 'SELLER') {
      const seller = await this.paymentsRepository.getSellerProfileByUserId(
        params.userId,
      );
      if (!seller) throw new NotFoundException('Seller profile not found');
      sellerId = seller.id;
    }
    return this.paymentsRepository.listHistory({
      sellerId,
      page,
      limit,
    });
  }

  async listPromotionPayments(params: {
    userRole: string;
    userId: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    let sellerId: string | undefined = undefined;

    if (params.userRole === 'SELLER') {
      const seller = await this.paymentsRepository.getSellerProfileByUserId(
        params.userId,
      );
      if (!seller) throw new NotFoundException('Seller profile not found');
      sellerId = seller.id;
    }

    return this.paymentsRepository.listPromotionPayments({
      sellerId,
      status: params.status,
      page,
      limit,
    });
  }

  getStatus() {
    return {
      status: 'active',
      provider: 'paystack',
      baseUrl: this.paystackCfg.baseUrl,
    };
  }

  private async processRefundProcessed(data: any) {
    const reference = data.reference;
    if (reference) {
      await this.paymentsRepository
        .updateRefundStatus(reference, 'SUCCESS', data.id?.toString())
        .catch(() => {});
    }
  }

  private async processRefundFailed(data: any) {
    const reference = data.reference;
    if (reference) {
      await this.paymentsRepository
        .updateRefundStatus(reference, 'FAILED', data.id?.toString())
        .catch(() => {});
    }
  }

  async refundTransaction(params: {
    orderId: string;
    amount?: number;
    reason?: string;
    customerNote?: string;
    merchantNote?: string;
    actor?: Actor;
  }) {
    const { orderId, reason, customerNote, merchantNote, actor } = params;
    const order = await this.paymentsRepository.findOrderWithDetails(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status === 'REFUNDED') {
      throw new BadRequestException(
        'This order has already been fully refunded',
      );
    }

    const transaction = order.transaction;
    if (!transaction) {
      throw new BadRequestException(
        'No transaction record found for this order',
      );
    }

    const txnAmount = Number(transaction.amount);
    const refundAmount =
      params.amount && params.amount > 0 && params.amount <= txnAmount
        ? Number(params.amount)
        : txnAmount;

    const isFullRefund = refundAmount >= txnAmount;
    const hadReleasedEscrow = Boolean((transaction as any).payout);
    const refundRef = `REF_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    let providerRef: string | undefined;

    // Trigger Paystack Refund API if online payment via Paystack
    if (
      transaction.provider === 'PAYSTACK' &&
      transaction.status === 'SUCCESS'
    ) {
      try {
        const payload = {
          transaction: transaction.provider_ref || transaction.reference,
          amount: Math.round(refundAmount * 100), // amount in pesewas
          customer_note:
            customerNote || reason || 'Refund issued for your order',
          merchant_note:
            merchantNote ||
            reason ||
            `Refund issued by ${actor?.role || 'SYSTEM'}`,
        };

        const response = await firstValueFrom(
          this.httpService.post('/refund', payload),
        );
        const paystackData = response?.data;
        providerRef =
          paystackData?.data?.id?.toString() || paystackData?.data?.reference;
        this.logger.log(
          `Paystack refund initiated for order ${orderId}: ref=${refundRef} provider_ref=${providerRef || 'success'}`,
        );
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          err?.message ||
          'Paystack refund request failed';
        this.logger.error(
          `Paystack refund request returned error for order ${orderId}: ${errorMsg}`,
          err?.stack,
        );
        providerRef = `LOCAL_EXEC_${Date.now()}`;
      }
    }

    // 1. Record Refund
    const refundRecord = await this.paymentsRepository.createRefund({
      order_id: orderId,
      transaction_id: transaction.id,
      reference: refundRef,
      amount: refundAmount,
      status: 'SUCCESS',
      reason: reason || 'Order refunded',
      provider: transaction.provider || 'PAYSTACK',
      provider_ref: providerRef,
      customer_note: customerNote,
      merchant_note: merchantNote,
    });

    // 2. Cancel pending payouts for this transaction
    await this.paymentsRepository.cancelPendingPayoutsForTransaction(
      transaction.id,
      reason || 'Order refunded',
    );

    // 3. Update Order and Transaction statuses
    const newOrderStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    await this.paymentsRepository.updateOrderStatus(orderId, newOrderStatus);
    await this.paymentsRepository.updateTransactionRefund(
      transaction.id,
      newOrderStatus,
    );

    // 4. Update ReturnRequest if linked
    await this.paymentsRepository.updateReturnRequestOnRefund(
      orderId,
      refundAmount,
      refundRef,
    );

    // 5. Restore inventory
    await this.paymentsRepository
      .restoreOrderInventory(orderId)
      .catch((err) => {
        this.logger.error(
          `Failed to restore inventory for refunded order ${orderId}`,
          err,
        );
      });

    // 6. Reverse Seller ledger & balance
    const sellerId = await this.paymentsRepository.findSellerByOrder(orderId);
    if (sellerId) {
      const gross = new Prisma.Decimal(refundAmount);
      const fee = gross.mul(this.platformFeePercent).div(100);
      const net = gross.sub(fee);

      await this.paymentsRepository.createLedgerEntry({
        seller_id: sellerId,
        transaction_id: transaction.id,
        reference: `LEDGER_REFUND_DEBIT_${refundRef}`,
        type: 'DEBIT',
        source_type: 'REFUND',
        amount: gross,
        description: `Order refund debit: ORD-${order.id.slice(-6).toUpperCase()}`,
      });

      await this.paymentsRepository.createLedgerEntry({
        seller_id: sellerId,
        transaction_id: transaction.id,
        reference: `LEDGER_REFUND_FEE_REVERSAL_${refundRef}`,
        type: 'CREDIT',
        source_type: 'FEE',
        amount: fee,
        description: `Platform fee reversal: ORD-${order.id.slice(-6).toUpperCase()}`,
      });

      await this.paymentsRepository.upsertVendorBalanceSnapshot({
        sellerId,
        ...(hadReleasedEscrow
          ? { availableDelta: net.negated() }
          : { pendingDelta: net.negated() }),
        earnedDelta: gross.negated(),
      });
    }

    // 7. Audit log
    await this.auditLogs
      .record({
        actorId: actor?.id,
        actorRole: actor?.role,
        ip: actor?.ip,
        userAgent: actor?.userAgent,
        entityType: 'order',
        entityId: orderId,
        action: 'order.refund',
        reason: reason || 'Refund issued to buyer',
        before: { status: order.status },
        after: {
          status: newOrderStatus,
          refund_amount: refundAmount,
          refund_ref: refundRef,
        },
        metadata: {
          refundAmount,
          refundRef,
          isFullRefund,
          providerRef,
        },
      })
      .catch((err) =>
        this.logger.error('Failed to write audit log for refund', err),
      );

    // 8. Notifications & Realtime
    const orderNumber = `ORD-${order.id.slice(-6).toUpperCase()}`;
    const sellerUserIds = Array.from(
      new Set(
        order.items
          .map((i: any) => i.product?.seller?.user_id)
          .filter((x): x is string => Boolean(x)),
      ),
    );

    if (order.buyer_id) {
      await this.notifications
        .create({
          userId: order.buyer_id,
          type: 'REFUND_PROCESSED' as any,
          title: `Refund processed for ${orderNumber}`,
          body: `A refund of GH₵ ${refundAmount.toFixed(2)} has been issued for order ${orderNumber}.`,
          link: `/orders/${orderId}`,
          data: { orderId, refundAmount, refundRef },
        })
        .catch(() => {});
    }

    for (const sellerUserId of sellerUserIds) {
      await this.notifications
        .create({
          userId: sellerUserId,
          type: 'ORDER_STATUS_CHANGED' as any,
          title: `Refund issued for ${orderNumber}`,
          body: `A refund of GH₵ ${refundAmount.toFixed(2)} was issued for ${orderNumber}. Balance adjusted accordingly.`,
          link: `/dashboard/orders/${orderId}`,
          data: { orderId, refundAmount, refundRef },
        })
        .catch(() => {});
    }

    this.orderEvents.emit({
      type: 'order.refunded',
      orderId: order.id,
      orderNumber,
      status: newOrderStatus,
      buyerId: order.buyer_id,
      sellerUserIds,
      total: order.total_amount ? order.total_amount.toString() : '0',
      customerName: order.customer_name || order.buyer?.full_name || 'Customer',
      reference: refundRef,
      timestamp: new Date().toISOString(),
    });

    // 9. Emails
    this.triggerRefundEmails(order, refundAmount, reason).catch((err) => {
      this.logger.error(
        `Failed to send refund emails for order ${orderId}: ${err?.message}`,
      );
    });

    return {
      success: true,
      message: `Refund of GH₵ ${refundAmount.toFixed(2)} processed successfully`,
      refund: refundRecord,
      orderStatus: newOrderStatus,
    };
  }

  private async triggerRefundEmails(
    order: any,
    refundAmount: number,
    reason?: string,
  ) {
    const orderNumber = `ORD-${order.id.slice(-6).toUpperCase()}`;
    const items = order.items.map((item: any) => ({
      title: item.product?.title || 'Product',
      quantity: item.quantity,
      price: item.price.toString(),
      image_url:
        item.variant?.image_url || item.product?.image_urls?.[0] || null,
    }));

    const statusData = {
      orderNumber,
      date: order.created_at,
      customerName: order.customer_name || order.buyer?.full_name || 'Customer',
      customerPhone: order.customer_phone || undefined,
      storeName: order.items[0]?.product?.seller?.store_name || 'Verndly Store',
      status: 'REFUNDED',
      items,
      subtotal: order.total_amount.toString(),
      total: order.total_amount.toString(),
      currency: 'GHS',
      deliveryMethod: order.delivery_method || undefined,
      deliveryLocation: order.delivery_location || undefined,
      reason:
        reason ||
        `Refund of GH₵ ${refundAmount.toFixed(2)} processed to original payment method`,
      cancelledBy: 'admin' as const,
    };

    if (order.buyer?.email) {
      await this.emailService
        .sendOrderStatusUpdate(order.buyer.email, statusData)
        .catch(() => {});
    }

    const sellerEmails: string[] = Array.from(
      new Set(
        order.items
          .map((i: any) => i.product?.seller?.user?.email as string | undefined)
          .filter((e: any): e is string => Boolean(e)),
      ),
    );
    for (const email of sellerEmails) {
      await this.emailService
        .sendSellerOrderStatusNotification(email, statusData)
        .catch(() => {});
    }
  }

  /* ─── Super Admin Full Payment Control Suite ─────────────────────────── */

  async getPaystackBalance() {
    try {
      const { data } = await firstValueFrom(this.httpService.get('/balance'));
      const rawBalances: Array<{ currency: string; balance: number }> =
        Array.isArray(data?.data) ? data.data : [];
      const balances = rawBalances.map((b) => ({
        currency: b.currency || 'GHS',
        amount: Number((Number(b.balance || 0) / 100).toFixed(2)),
      }));
      const ghs = balances.find((b) => b.currency === 'GHS') || balances[0];
      return {
        live: true,
        currency: ghs?.currency || 'GHS',
        available: ghs?.amount ?? 0,
        balances,
        checked_at: new Date().toISOString(),
      };
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not reach Paystack balance API';
      this.logger.warn(`Paystack balance fetch unavailable: ${msg}`);
      return {
        live: false,
        currency: 'GHS',
        available: null,
        balances: [],
        error: msg,
        checked_at: new Date().toISOString(),
      };
    }
  }

  async adminVerifyTransactionWithPaystack(
    transactionId: string,
    actor?: Actor,
  ) {
    const tx = await this.paymentsRepository.getTransactionById(transactionId);
    if (!tx) throw new NotFoundException('Transaction not found');

    const verification = await this.verifyTransaction(
      tx.reference,
      tx.provider,
    );

    this.auditLogs
      .record({
        actorId: actor?.id,
        actorRole: actor?.role,
        action: 'transaction.admin_verify_paystack',
        entityType: 'transaction',
        entityId: tx.id,
        metadata: {
          reference: tx.reference,
          gateway_status: verification?.status,
        },
        ip: actor?.ip,
        userAgent: actor?.userAgent,
      })
      .catch(() => {});

    return {
      success: true,
      reference: tx.reference,
      verification,
    };
  }

  async adminReleaseEscrowForOrder(orderId: string, actor?: Actor) {
    const order = await this.paymentsRepository.findOrderWithDetails(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (!order.transaction) {
      throw new BadRequestException('Order has no payment transaction');
    }
    if (order.transaction.status !== 'SUCCESS') {
      throw new BadRequestException(
        `Cannot release escrow while transaction status is ${order.transaction.status}`,
      );
    }

    await this.releaseEscrowForOrder(orderId);

    if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      await this.paymentsRepository.updateOrderStatus(orderId, 'COMPLETED');
    }

    this.auditLogs
      .record({
        actorId: actor?.id,
        actorRole: actor?.role,
        action: 'escrow.admin_release',
        entityType: 'order',
        entityId: orderId,
        before: { order_status: order.status },
        after: { order_status: 'COMPLETED', escrow_released: true },
        metadata: { transaction_id: order.transaction.id },
        ip: actor?.ip,
        userAgent: actor?.userAgent,
      })
      .catch(() => {});

    return {
      success: true,
      message: 'Escrow released to seller balance and payout queued.',
      order_id: orderId,
    };
  }

  async listRefunds(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.paymentsRepository.listRefunds({
      status: params.status,
      search: params.search,
      page: Math.max(1, params.page || 1),
      limit: Math.min(200, Math.max(1, params.limit || 50)),
    });
  }

  async listVendorWallets(params: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.paymentsRepository.listVendorWallets({
      search: params.search,
      page: Math.max(1, params.page || 1),
      limit: Math.min(200, Math.max(1, params.limit || 50)),
    });
  }

  async listLedgerEntries(params: {
    sellerId?: string;
    type?: string;
    sourceType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.paymentsRepository.listLedgerEntries({
      sellerId: params.sellerId,
      type: params.type,
      sourceType: params.sourceType,
      search: params.search,
      page: Math.max(1, params.page || 1),
      limit: Math.min(200, Math.max(1, params.limit || 50)),
    });
  }

  async adjustVendorWallet(
    sellerId: string,
    payload: {
      type: 'CREDIT' | 'DEBIT';
      bucket: 'available' | 'pending';
      amount: number;
      reason: string;
    },
    actor?: Actor,
  ) {
    const seller =
      await this.paymentsRepository.findSellerByProfileId(sellerId);
    if (!seller) throw new NotFoundException('Seller store not found');

    const amt = Number(payload.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new BadRequestException('Adjustment amount must be greater than 0');
    }
    const cleanReason = (payload.reason || '').trim();
    if (!cleanReason) {
      throw new BadRequestException(
        'An audit reason is required for wallet adjustments',
      );
    }

    const type = payload.type === 'DEBIT' ? 'DEBIT' : 'CREDIT';
    const bucket = payload.bucket === 'pending' ? 'pending' : 'available';
    const decAmt = new Prisma.Decimal(amt.toFixed(2));
    const signedDelta = type === 'CREDIT' ? decAmt : decAmt.negated();
    const ref = `ADJ_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    await this.paymentsRepository.createLedgerEntry({
      seller_id: sellerId,
      reference: ref,
      type,
      source_type: 'ADJUSTMENT',
      amount: decAmt,
      description: `Admin ${type.toLowerCase()} (${bucket}): ${cleanReason}`,
      metadata: {
        bucket,
        reason: cleanReason,
        actor_id: actor?.id,
      },
    });

    const snapshot = await this.paymentsRepository.upsertVendorBalanceSnapshot({
      sellerId,
      ...(bucket === 'available'
        ? { availableDelta: signedDelta }
        : { pendingDelta: signedDelta }),
      ...(type === 'CREDIT' ? { earnedDelta: decAmt } : {}),
    });

    this.auditLogs
      .record({
        actorId: actor?.id,
        actorRole: actor?.role,
        action: 'wallet.admin_adjust',
        entityType: 'seller_wallet',
        entityId: sellerId,
        reason: cleanReason,
        after: {
          type,
          bucket,
          amount: amt,
          reference: ref,
          available_balance: Number(snapshot.available_balance),
          pending_balance: Number(snapshot.pending_balance),
        },
        ip: actor?.ip,
        userAgent: actor?.userAgent,
      })
      .catch(() => {});

    if (seller.user_id) {
      this.notifications
        .create({
          userId: seller.user_id,
          type: 'SYSTEM' as any,
          title: `Wallet ${type === 'CREDIT' ? 'credited' : 'adjusted'} by Admin`,
          body: `Your ${bucket} balance was ${type === 'CREDIT' ? 'credited' : 'debited'} by GH₵ ${amt.toFixed(2)}. Reason: ${cleanReason}`,
          link: '/dashboard/transactions',
        })
        .catch(() => {});
    }

    return {
      success: true,
      reference: ref,
      snapshot: {
        available_balance: Number(snapshot.available_balance),
        pending_balance: Number(snapshot.pending_balance),
        total_earned: Number(snapshot.total_earned),
        total_withdrawn: Number(snapshot.total_withdrawn),
      },
    };
  }

  async releaseVendorPendingBalance(
    sellerId: string,
    payload: { amount?: number; reason?: string },
    actor?: Actor,
  ) {
    const seller =
      await this.paymentsRepository.findSellerByProfileId(sellerId);
    if (!seller) throw new NotFoundException('Seller store not found');

    const walletsRes = await this.paymentsRepository.listVendorWallets({
      page: 1,
      limit: 1,
      search: seller.store_name,
    });
    const current = walletsRes.items.find((w) => w.seller_id === sellerId);
    const pendingNow = current?.pending_balance ?? 0;

    if (pendingNow <= 0) {
      throw new BadRequestException(
        'Seller has no pending escrow balance to release.',
      );
    }

    const releaseAmt =
      payload.amount && payload.amount > 0
        ? Math.min(Number(payload.amount), pendingNow)
        : pendingNow;

    const decAmt = new Prisma.Decimal(releaseAmt.toFixed(2));
    const cleanReason =
      (payload.reason || '').trim() || 'Super Admin early escrow release';
    const ref = `REL_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    await this.paymentsRepository.createLedgerEntry({
      seller_id: sellerId,
      reference: ref,
      type: 'CREDIT',
      source_type: 'ADJUSTMENT',
      amount: decAmt,
      description: `Pending escrow released to available: ${cleanReason}`,
      metadata: { action: 'release_pending', reason: cleanReason },
    });

    const snapshot = await this.paymentsRepository.upsertVendorBalanceSnapshot({
      sellerId,
      pendingDelta: decAmt.negated(),
      availableDelta: decAmt,
    });

    this.auditLogs
      .record({
        actorId: actor?.id,
        actorRole: actor?.role,
        action: 'wallet.admin_release_pending',
        entityType: 'seller_wallet',
        entityId: sellerId,
        reason: cleanReason,
        after: {
          released_amount: releaseAmt,
          available_balance: Number(snapshot.available_balance),
          pending_balance: Number(snapshot.pending_balance),
        },
        ip: actor?.ip,
        userAgent: actor?.userAgent,
      })
      .catch(() => {});

    return {
      success: true,
      released_amount: releaseAmt,
      snapshot: {
        available_balance: Number(snapshot.available_balance),
        pending_balance: Number(snapshot.pending_balance),
      },
    };
  }

  async adminOverrideSellerBankAndSync(
    sellerId: string,
    payload: {
      bank_name?: string;
      bank_code: string;
      account_number: string;
      reason?: string;
    },
    actor?: Actor,
  ) {
    const seller =
      await this.paymentsRepository.findSellerByProfileId(sellerId);
    if (!seller) throw new NotFoundException('Seller store not found');

    const cleanBankCode = (payload.bank_code || '').trim();
    const cleanAccount = (payload.account_number || '')
      .replace(/[\s-]/g, '')
      .trim();
    const cleanBankName = (payload.bank_name || '').trim() || cleanBankCode;

    if (!cleanBankCode || !/^\d{9,16}$/.test(cleanAccount)) {
      throw new BadRequestException(
        'Valid bank/provider code and 9–16 digit account/MoMo number are required.',
      );
    }

    const prevBank = {
      bank_name: seller.bank_name,
      bank_code: seller.bank_code,
      account_number: seller.account_number,
    };

    await this.paymentsRepository.updateSellerBankDetails(sellerId, {
      bank_name: cleanBankName,
      bank_code: cleanBankCode,
      account_number: cleanAccount,
    });

    let subResult: {
      ok: boolean;
      subaccount_code: string | null;
      action: string;
      error?: string;
    };
    try {
      subResult = await this.createSubaccount(sellerId, {
        forceUpdate: true,
        throwOnError: true,
        actor,
      });
    } catch (err) {
      await this.paymentsRepository.updateSellerBankDetails(sellerId, prevBank);
      throw err;
    }

    const reason =
      (payload.reason || '').trim() || 'Super Admin payout account update';
    this.auditLogs
      .record({
        actorId: actor?.id,
        actorRole: actor?.role,
        action: 'subaccount.admin_bank_override',
        entityType: 'seller_profile',
        entityId: sellerId,
        reason,
        before: {
          bank_code: prevBank.bank_code,
          account_tail: prevBank.account_number?.slice(-4) || null,
        },
        after: {
          bank_code: cleanBankCode,
          account_tail: cleanAccount.slice(-4),
          subaccount_code: subResult.subaccount_code,
        },
        ip: actor?.ip,
        userAgent: actor?.userAgent,
      })
      .catch(() => {});

    if (seller.user?.email) {
      const mask = (a: string | null | undefined) =>
        !a ? 'Not set' : `****${a.slice(-4)}`;
      this.emailService
        .sendPayoutDetailsChangedAlertEmail({
          to: seller.user.email,
          fullName: seller.user.full_name || 'Seller',
          storeName: seller.store_name,
          bankName: cleanBankName,
          maskedAccount: mask(cleanAccount),
          subaccountSynced: subResult.ok,
        })
        .catch(() => {});
    }

    return {
      success: true,
      bank_name: cleanBankName,
      bank_code: cleanBankCode,
      account_number: cleanAccount,
      subaccount_code: subResult.subaccount_code,
      subaccount_status: subResult.ok ? 'ACTIVE' : 'PENDING_RETRY',
    };
  }

  async reconcilePromotionPayment(
    id: string,
    status: 'SUCCESS' | 'FAILED',
    reason: string | undefined,
    actor?: Actor,
  ) {
    const promo = await this.paymentsRepository.getPromotionPaymentById(id);
    if (!promo) throw new NotFoundException('Promotion payment not found');

    if (status !== 'SUCCESS' && status !== 'FAILED') {
      throw new BadRequestException('Status must be SUCCESS or FAILED');
    }

    const updated = await this.paymentsRepository.updatePromotionPaymentById(
      id,
      status,
      `ADMIN_RECON_${Date.now()}`,
    );

    if (status === 'SUCCESS') {
      if (promo.category === 'BOOST' && promo.product_id) {
        await this.paymentsRepository
          .featureProductById(promo.product_id)
          .catch(() => {});
      } else if (promo.category === 'PLAN' && promo.seller?.user_id) {
        await this.paymentsRepository
          .upgradeUserToPro(promo.seller.user_id, 30)
          .catch(() => {});
      }
    }

    this.auditLogs
      .record({
        actorId: actor?.id,
        actorRole: actor?.role,
        action: 'promotion.admin_reconcile',
        entityType: 'promotion_payment',
        entityId: id,
        reason: reason || `Admin reconciled promotion payment to ${status}`,
        before: { status: promo.status },
        after: { status },
        metadata: { category: promo.category, product_id: promo.product_id },
        ip: actor?.ip,
        userAgent: actor?.userAgent,
      })
      .catch(() => {});

    return {
      success: true,
      promotion: updated,
      message:
        status === 'SUCCESS'
          ? 'Promotion payment confirmed and benefits activated.'
          : 'Promotion payment marked as FAILED.',
    };
  }

  async listPaymentLogs(params: {
    event?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return this.paymentsRepository.listPaymentLogs({
      event: params.event,
      search: params.search,
      page: Math.max(1, params.page || 1),
      limit: Math.min(200, Math.max(1, params.limit || 50)),
    });
  }
}
