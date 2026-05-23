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

interface PaymentProvider {
  initializeTransaction(dto: InitializePaymentDto): Promise<any>;
  verifyTransaction(reference: string): Promise<any>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly platformFeePercent = Number(
    process.env.PLATFORM_FEE_PERCENT || 10,
  );

  constructor(
    private readonly httpService: HttpService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly emailService: EmailService,
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
          await this.paymentsRepository.updateTransactionStatus(
            transaction.id,
            'SUCCESS',
            verifyData?.id?.toString(),
          );
          await this.paymentsRepository.finalizeOrderInventory(
            transaction.order_id,
          );

          // Trigger Order Confirmation Emails
          this.triggerOrderEmails(transaction.order_id).catch((err) => {
            this.logger.error(
              `Failed to trigger order emails for order ${transaction.order_id}`,
              err,
            );
          });
        }
      }
    }

    return data;
  }

  async handleWebhook(payload: any, signature: string, rawBody?: Buffer) {
    if (!this.verifySignature(payload, signature, rawBody)) {
      this.logger.error('Invalid Paystack signature');
      throw new BadRequestException('Invalid signature');
    }

    const { event, data } = payload;
    const eventId =
      data?.id?.toString() ??
      data?.reference ??
      `${event}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.logger.log(`Received Paystack webhook: ${event}`);

    const existingLog =
      await this.paymentsRepository.findPaymentLogByEventId(eventId);
    if (existingLog) {
      return { received: true, duplicate: true };
    }

    await this.paymentsRepository.createPaymentLog(event, payload, eventId);

    if (event === 'charge.success') {
      await this.processChargeSuccess(data);
    } else if (event === 'charge.failed') {
      await this.processChargeFailed(data);
    } else if (event === 'transfer.success') {
      await this.processTransferSuccess(data);
    } else if (event === 'transfer.failed') {
      await this.processTransferFailed(data);
    }

    return { received: true };
  }

  private verifySignature(
    payload: any,
    signature: string,
    rawBody?: Buffer,
  ): boolean {
    const bodyPayload = rawBody ?? Buffer.from(JSON.stringify(payload));
    const hash = crypto
      .createHmac('sha512', this.paystackCfg.secretKey)
      .update(bodyPayload)
      .digest('hex');

    return hash === signature;
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

    await this.paymentsRepository.updateTransactionStatus(
      transaction.id,
      'SUCCESS',
      data.id.toString(),
    );

    await this.paymentsRepository.finalizeOrderInventory(transaction.order_id);
    await this.createOrderSettlementRecords(transaction.id, reference);

    // Trigger Order Confirmation Emails
    this.triggerOrderEmails(transaction.order_id).catch((err) => {
      this.logger.error(
        `Failed to trigger order emails for order ${transaction.order_id}`,
        err,
      );
    });

    this.logger.log(
      `Transaction and Order updated successfully for reference: ${reference}`,
    );
  }

  private async triggerOrderEmails(orderId: string) {
    const order = await this.paymentsRepository.findOrderWithDetails(orderId);
    if (!order) return;

    const orderNumber = `ORD-${order.id.toString().slice(-6).toUpperCase()}`;
    const customerName =
      order.customer_name || order.buyer?.full_name || 'Customer';

    // Buyer-facing items: all line items
    const buyerItems = order.items.map((item) => ({
      title: item.product?.title || 'Unknown Product',
      quantity: item.quantity,
      price: item.price.toString(),
      image_url: item.product?.image_urls?.[0] || null,
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
        order.items[0]?.product?.seller?.store_name || 'Vendly seller',
      storeLink: order.items[0]?.product?.seller?.store_link || undefined,
      items: buyerItems,
      subtotal: order.total_amount.toString(),
      total: order.total_amount.toString(),
      paymentMethod: order.transaction?.provider || 'Paystack',
      paymentReference: order.transaction?.reference || undefined,
    };

    // 1. Buyer order confirmation
    if (order.buyer?.email) {
      this.emailService
        .sendOrderConfirmation(order.buyer.email, buyerOrderData)
        .catch((err) =>
          this.logger.error(
            `Failed to send order confirmation to ${order.buyer?.email}`,
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

    for (const item of order.items) {
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
        image_url: item.product?.image_urls?.[0] || null,
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
    const payoutId = reference.split('_')[1];
    await this.paymentsRepository.updatePayoutStatus(payoutId, 'SUCCESS', {
      provider_ref: data.transfer_code?.toString(),
      processed_at: new Date(),
    });
  }

  private async processTransferFailed(data: any) {
    const reference = data.reference as string;
    if (!reference?.startsWith('PAYOUT_')) return;
    const payoutId = reference.split('_')[1];
    await this.paymentsRepository.updatePayoutStatus(payoutId, 'FAILED', {
      failure_reason: data.reason || 'Transfer failed',
      processed_at: new Date(),
    });
  }

  private async createOrderSettlementRecords(
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
      await this.paymentsRepository.updatePayoutStatus(payout.id, 'SUCCESS', {
        processed_at: new Date(),
      });
      await this.paymentsRepository.createLedgerEntry({
        seller_id: sellerId,
        payout_id: payout.id,
        transaction_id: transactionId,
        reference: `LEDGER_PAYOUT_${payout.reference}`,
        type: 'DEBIT',
        source_type: 'PAYOUT',
        amount,
        description: 'Automatic payout sent',
      });
      await this.paymentsRepository.upsertVendorBalanceSnapshot({
        sellerId,
        availableDelta: amount.negated(),
        withdrawnDelta: amount,
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
        percentage_charge: 0.5, // Default charge, can be made configurable
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

  async retryPayout(id: string) {
    const payout = await this.paymentsRepository.getPayoutById(id);
    if (!payout) throw new NotFoundException('Payout not found');
    return this.paymentsRepository.updatePayoutStatus(id, 'PROCESSING');
  }

  async runManualPayoutQueue() {
    const queue = await this.paymentsRepository.listPayouts({
      status: 'PENDING',
      page: 1,
      limit: 100,
    });
    const results = await Promise.all(
      queue.items.map((item) =>
        this.paymentsRepository.updatePayoutStatus(item.id, 'SUCCESS', {
          processed_at: new Date(),
        }),
      ),
    );
    return {
      processed: results.length,
    };
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
}
