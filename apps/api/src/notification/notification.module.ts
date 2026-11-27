import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AdminNotificationController } from './admin-notification.controller';
import { AdminSmsController } from './admin-sms.controller';
import { AdminSmsService } from './admin-sms.service';
import { SmsClient } from '../auth/arkesel.client';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    NotificationController,
    AdminNotificationController,
    AdminSmsController,
  ],
  providers: [NotificationService, AdminSmsService, SmsClient],
  exports: [NotificationService, AdminSmsService],
})
export class NotificationModule {}
