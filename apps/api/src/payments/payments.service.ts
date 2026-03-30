import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import paystackConfig from './config/paystack.config';
import { PaymentsRepository } from './payments.repository';
import { InitializePaymentDto } from './dto/initialize-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(paystackConfig.KEY)
    private readonly paystackCfg: ConfigType<typeof paystackConfig>,
  ) {}

  /**
   * Initialize a Paystack transaction.
   * Amount is converted to kobo (Paystack expects amount in smallest currency unit).
   */
  async initializeTransaction(dto: InitializePaymentDto) {
    const payload = {
      email: dto.email,
      amount: Math.round(dto.amount * 100), // Convert to kobo
      ...(dto.reference && { reference: dto.reference }),
      ...(dto.callbackUrl && { callback_url: dto.callbackUrl }),
    };

    const { data } = await firstValueFrom(
      this.httpService.post('/transaction/initialize', payload),
    );

    this.logger.log(`Payment initialized for ${dto.email}`);

    return data;
  }

  /**
   * Verify a Paystack transaction by reference.
   */
  async verifyTransaction(reference: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(`/transaction/verify/${reference}`),
    );

    this.logger.log(`Payment verified: ${reference}`);

    return data;
  }

  /**
   * Handle Paystack webhook events.
   */
  async handleWebhook(payload: any, signature: string) {
    // 1. Verify Paystack signature
    if (!this.verifySignature(payload, signature)) {
      this.logger.error('Invalid Paystack signature');
      throw new BadRequestException('Invalid signature');
    }

    const { event, data } = payload;
    this.logger.log(`Received Paystack webhook: ${event}`);

    // 2. Log every webhook for transparency/debugging
    await this.paymentsRepository.createPaymentLog(event, payload);

    // 3. Process the event (currently focusing on charge.success)
    if (event === 'charge.success') {
      await this.processChargeSuccess(data);
    }

    return { received: true };
  }

  /**
   * Verifies the HMAC-SHA512 signature from Paystack.
   */
  private verifySignature(payload: any, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.paystackCfg.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  /**
   * Logic to update transaction and order when charge is successful.
   * Idempotency is handled by checking the current transaction status.
   */
  private async processChargeSuccess(data: any) {
    const reference = data.reference;
    const transaction =
      await this.paymentsRepository.findTransactionByReference(reference);

    if (!transaction) {
      this.logger.warn(`Transaction not found for reference: ${reference}`);
      return;
    }

    // Idempotency: skip if already successful
    if (transaction.status === 'SUCCESS') {
      this.logger.log(`Transaction already marked as SUCCESS: ${reference}`);
      return;
    }

    // Update statuses
    await this.paymentsRepository.updateTransactionStatus(
      transaction.id,
      'SUCCESS',
      data.id.toString(),
    );

    await this.paymentsRepository.updateOrderStatus(
      transaction.order_id,
      'PAID',
    );

    this.logger.log(
      `Transaction and Order updated successfully for reference: ${reference}`,
    );
  }

  /**
   * Create a Paystack subaccount for a vendor.
   */
  async createSubaccount(sellerId: bigint) {
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
  private async handleSubaccountFailure(sellerId: bigint, errorMsg: string) {
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

  /**
   * Health check — confirms Paystack config is loaded.
   */
  getStatus() {
    return {
      status: 'active',
      provider: 'paystack',
      baseUrl: this.paystackCfg.baseUrl,
    };
  }
}
