import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}
