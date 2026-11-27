import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import paystackConfig from './config/paystack.config';

import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';
import { SmsClient } from '../auth/arkesel.client';

@Module({
  imports: [
    ConfigModule.forFeature(paystackConfig),
    PrismaModule,
    EmailModule,
    NotificationModule,
    HttpModule.registerAsync({
      imports: [ConfigModule.forFeature(paystackConfig)],
      inject: [paystackConfig.KEY],
      useFactory: (cfg: ConfigType<typeof paystackConfig>) => ({
        baseURL: cfg.baseUrl,
        headers: {
          Authorization: `Bearer ${cfg.secretKey}`,
          'Content-Type': 'application/json',
        },
      }),
    }),
  ],
  controllers: [PaymentsController, PaystackWebhookController],
  providers: [PaymentsService, PaymentsRepository, SmsClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
