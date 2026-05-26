import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
// SmsClient (Arkesel) is declared in AuthModule; we re-provide it here
// instead of pulling AuthModule in to avoid a circular import.
import { SmsClient } from '../auth/arkesel.client';

@Module({
  imports: [PrismaModule, PaymentsModule, EmailModule, NotificationModule],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderService, AdminOrderService, SmsClient],
  exports: [OrderService],
})
export class OrderModule {}
