import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, PaymentsModule, EmailModule],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderService, AdminOrderService],
  exports: [OrderService],
})
export class OrderModule {}
