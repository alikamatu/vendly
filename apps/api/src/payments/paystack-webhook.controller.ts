import { Controller, Post, Body, Headers, Logger, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('webhooks')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Paystack webhook endpoint.
   * This is the source of truth for payment confirmation.
   * Path: POST /webhooks/paystack
   */
  @Post('paystack')
  async handlePaystackWebhook(
    @Req() req: any,
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    this.logger.log('Paystack webhook received');
    return this.paymentsService.handleWebhook(payload, signature, req.rawBody);
  }
}
