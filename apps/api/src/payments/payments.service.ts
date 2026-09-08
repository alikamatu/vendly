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
    this.triggerOrderRealtimeAndNotifications(orderId, reference).catch((err) => {
      this.logger.error(
        `Failed to trigger order real-time events for order ${orderId}`,
        err,
      );
    });

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
        type: 'ORDER_STATUS_CHANGED' as any,
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
        type: 'ORDER_STATUS_CHANGED' as any,
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
    const low = await this.paymentsRepository.findLowStockProductsForOrder(
      orderId,
    );
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

    const orderNumber = `ORD-${order.id.toString().slice(-6).toUpperCase()}`;
    const customerName =
      order.customer_name || order.buyer?.full_name || 'Customer';

    const formatVariantDesc = (variant: any): string | null => {
      if (!variant || !variant.attributes) return null;
      try {
        const attrs =
          typeof variant.attributes === 'string'
            ? JSON.parse(variant.attributes)
            : variant.attributes;
        if (attrs && typeof attrs === 'object') {
          const entries = Object.entries(attrs).filter(
            ([, v]) => v != null && String(v).trim() !== '',
          );
          if (entries.length > 0) {
            return entries.map(([k, v]) => `${k}: ${v}`).join(' • ');
          }
        }
      } catch {}
      return null;
    };

    // Buyer-facing items: all line items
    const buyerItems = order.items.map((item: any) => ({
      title: item.product?.title || 'Unknown Product',
      quantity: item.quantity,
      price: item.price.toString(),
      image_url:
        item.variant?.image_url ||
        item.product?.image_urls?.[0] ||
        null,
      variantDescription: formatVariantDesc(item.variant),
    }));

    const buyerOrderData = {
      orderNumber,
      date: order.created_at,
      customerName,
      customerEmail: order.buyer?.email,
      customerPhone: order.customer_phone || undefined,
      deliveryMethod: order.delivery_method || undefined,
      deliveryLocation: order.delivery_location || undefined,
      deliveryNotes: order.delivery_notes || undefined,
      storeName:
        // Buyer may have items from multiple stores; surface the first seller name
        order.items[0]?.product?.seller?.store_name || 'Verndly seller',
      storeLink: order.items[0]?.product?.seller?.store_link || undefined,
      items: buyerItems,
      subtotal: order.total_amount.toString(),
      total: order.total_amount.toString(),
      paymentMethod: order.transaction?.provider || 'Paystack',
      paymentReference: order.transaction?.reference || undefined,
      isPaid: true,
    };

    // 1. Buyer order confirmation & payment receipt
    if (order.buyer?.email) {
      this.emailService
        .sendOrderConfirmation(order.buyer.email, buyerOrderData)
        .catch((err) =>
          this.logger.error(
            `Failed to send order confirmation to ${order.buyer?.email}`,
            err,
          ),
        );

      this.emailService
        .sendPaymentReceiptEmail(order.buyer.email, {
          ...buyerOrderData,
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
    const sellerGroups = new Map<
      string,
      {
        email: string;
        storeName: string;
        storeLink?: string;
        items: typeof buyerItems;
      }
    >();

    for (const item of order.items as any[]) {
      const seller = item.product?.seller;
      const sellerUser = seller?.user;
      if (!sellerUser?.email) continue;

      const key = sellerUser.email;
      let group = sellerGroups.get(key);
      if (!group) {
        group = {
          email: sellerUser.email,
          storeName: seller?.store_name || 'Your store',
          storeLink: seller?.store_link,
          items: [],
        };
        sellerGroups.set(key, group);
      }
      group.items.push({
        title: item.product?.title || 'Unknown Product',
        quantity: item.quantity,
        price: item.price.toString(),
        image_url:
          item.variant?.image_url ||
          item.product?.image_urls?.[0] ||
          null,
        variantDescription: formatVariantDesc(item.variant),
      });
    }

    for (const group of sellerGroups.values()) {
      const sellerTotal = group.items.reduce(
        (sum, it) => sum + Number(it.price) * it.quantity,
        0,
      );
      this.emailService
        .sendSellerOrderNotification(group.email, {
          ...buyerOrderData,
          storeName: group.storeName,
          storeLink: group.storeLink,
          items: group.items,
          subtotal: sellerTotal.toFixed(2),
          total: sellerTotal.toFixed(2),
        })
        .catch((err) =>
          this.logger.error(
            `Failed to send seller notification to ${group.email}`,
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
          payout = await this.paymentsRepository.getPayoutById(part).catch(() => null);
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
          payout = await this.paymentsRepository.getPayoutById(part).catch(() => null);
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

  async createOrderSettlementRecords(
    transactionId: string,
    reference: string,
  ) {
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
      availableDelta: net,
      earnedDelta: gross,
    });

    await this.createPayoutFromTransaction(
      transactionId,
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
      await this.finalizePayoutSuccess(payout.id, {
        processed_at: new Date(),
      });
    }

    return payout;
  }

  async createSubaccount(sellerId: string) {
    const seller = await this.paymentsRepository.getSellerProfile(sellerId);

    if (!seller) {
      this.logger.error(`Seller not found: ${sellerId}`);
      return;
    }

    if (seller.paystack_subaccount_code) {
      this.logger.log(
        `Seller ${sellerId} already has a subaccount: ${seller.paystack_subaccount_code}`,
      );
      return;
    }

    // Check for missing bank details
    if (!seller.bank_code || !seller.account_number) {
      const errorMsg = 'Missing bank details (bank_code or account_number)';
      this.logger.warn(
        `Cannot create subaccount for seller ${sellerId}: ${errorMsg}`,
      );
      await this.handleSubaccountFailure(sellerId, errorMsg);
      return;
    }

    try {
      const payload = {
        business_name: seller.store_name,
        settlement_bank: seller.bank_code,
        account_number: seller.account_number,
        percentage_charge: this.platformFeePercent,
        description: `Subaccount for ${seller.store_name}`,
      };

      const { data } = await firstValueFrom(
        this.httpService.post('/subaccount', payload),
      );

      const subaccountCode = data.data.subaccount_code;
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

      this.logger.log(
        `Paystack subaccount created for seller ${sellerId}: ${subaccountCode}`,
      );
      return subaccountCode;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      this.logger.error(
        `Failed to create Paystack subaccount for seller ${sellerId}: ${errorMsg}`,
      );
      await this.handleSubaccountFailure(sellerId, errorMsg);
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

  async runManualPayoutQueue(actor?: Actor) {
    const queue = await this.paymentsRepository.listPayouts({
      status: 'PENDING',
      page: 1,
      limit: 100,
    });
    const results = await Promise.all(
      queue.items.map((item) =>
        this.finalizePayoutSuccess(item.id, {
          processed_at: new Date(),
        }),
      ),
    );
    this.auditLogs.record({
      actorId: actor?.id,
      actorRole: actor?.role,
      action: 'payout.run_queue',
      entityType: 'payout',
      entityId: null,
      metadata: {
        processed: results.length,
        ids: queue.items.map((i: any) => i.id),
      },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    return {
      processed: results.length,
    };
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
      const payout =
        preloadedPayout?.seller?.user
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
          type: 'PAYMENT_RECEIVED' as any,
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
      throw new BadRequestException('This order has already been fully refunded');
    }

    const transaction = order.transaction;
    if (!transaction) {
      throw new BadRequestException('No transaction record found for this order');
    }

    const txnAmount = Number(transaction.amount);
    const refundAmount =
      params.amount && params.amount > 0 && params.amount <= txnAmount
        ? Number(params.amount)
        : txnAmount;

    const isFullRefund = refundAmount >= txnAmount;
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
          paystackData?.data?.id?.toString() ||
          paystackData?.data?.reference;
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
    await this.paymentsRepository.restoreOrderInventory(orderId).catch((err) => {
      this.logger.error(`Failed to restore inventory for refunded order ${orderId}`, err);
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
        availableDelta: net.negated(),
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
      customerName:
        order.customer_name || order.buyer?.full_name || 'Customer',
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
      customerName:
        order.customer_name || order.buyer?.full_name || 'Customer',
      customerPhone: order.customer_phone || undefined,
      storeName:
        order.items[0]?.product?.seller?.store_name || 'Verndly Store',
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
}
