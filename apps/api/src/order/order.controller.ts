import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

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
    @Body() dto: { status: 'APPROVED' | 'REJECTED'; sellerResponse?: string },
  ) {
    return this.orderService.updateReturnRequestStatus(
      req.user.id,
      id,
      dto.status,
      dto.sellerResponse,
    );
  }
}
