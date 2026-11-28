import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AdminNotificationController } from './admin-notification.controller';
import { AdminSmsController } from './admin-sms.controller';
import { AdminSmsService } from './admin-sms.service';
import { AdminEmailController } from './admin-email.controller';
import { AdminEmailService } from './admin-email.service';
import { SmsClient } from '../auth/arkesel.client';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [
    NotificationController,
    AdminNotificationController,
    AdminSmsController,
    AdminEmailController,
  ],
  providers: [
    NotificationService,
    AdminSmsService,
    AdminEmailService,
    SmsClient,
  ],
  exports: [NotificationService, AdminSmsService, AdminEmailService],
})
export class NotificationModule {}
