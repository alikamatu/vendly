import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  Sse,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderEventsService } from '../events/order-events.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderEvents: OrderEventsService,
  ) {}

  @Sse('stream')
  streamOrders(@Req() req: any) {
    return this.orderEvents.subscribeForUser(req.user.id, req.user.role);
  }

  @Post()
  async createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(req.user.id, dto);
  }

  @Get('buyer')
  async getBuyerOrders(@Req() req: any) {
    return this.orderService.getBuyerOrders(req.user.id);
  }

  @Get('buyer/:id')
  async getBuyerOrderDetails(@Req() req: any, @Param('id') id: string) {
    return this.orderService.getBuyerOrderById(req.user.id, id);
  }

  @Get('seller')
  async getSellerOrders(@Req() req: any) {
    return this.orderService.getSellerOrders(req.user.id);
  }

  @Get('verify/payment')
  async verifyOrderPayment(
    @Req() req: any,
    @Query('reference') reference: string,
    @Query('order_id') orderId: string,
  ) {
    return this.orderService.verifyOrderPayment(
      req.user.id,
      reference,
      orderId,
    );
  }

  @Get(':id')
  async getOrderDetails(@Req() req: any, @Param('id') id: string) {
    return this.orderService.getOrderById(req.user.id, id);
  }

  @Post(':id/status')
  async updateOrderStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.orderService.updateOrderStatus(req.user.id, id, status);
  }

  @Post(':id/payment-status')
  async updateOrderPaymentStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      payment_status: 'PAID' | 'PENDING' | 'FAILED';
      payment_method: 'PAYSTACK' | 'CASH' | 'CASH_ON_DELIVERY';
      reference?: string;
    },
  ) {
    return this.orderService.updateOrderPaymentStatus(req.user.id, id, dto);
  }

  @Post(':id/retry-payment')
  async retryPayment(@Req() req: any, @Param('id') id: string) {
    return this.orderService.reinitializeOrderPayment(req.user.id, id);
  }

  @Post(':id/cancel')
  async cancelOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.orderService.cancelOrderByBuyer(req.user.id, id, reason);
  }

  @Post(':id/return')
  async createReturnRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { reason: string; description: string; photo_urls?: string[] },
  ) {
    return this.orderService.createReturnRequest(req.user.id, id, dto);
  }

  @Post(':id/return/status')
  async updateReturnRequestStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    dto: {
      status: 'APPROVED' | 'REJECTED' | 'REFUNDED';
      sellerResponse?: string;
      refundNow?: boolean;
    },
  ) {
    return this.orderService.updateReturnRequestStatus(
      req.user.id,
      id,
      dto.status,
      dto.sellerResponse,
      dto.refundNow,
    );
  }

  @Post(':id/return/escalate')
  async escalateReturnRequest(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.orderService.escalateReturnRequest(req.user.id, id, reason);
  }

  @Post(':id/return/confirm-refund')
  async confirmReturnReceivedAndRefund(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.orderService.confirmReturnReceivedAndRefund(
      req.user.id,
      id,
      note,
    );
  }
}
