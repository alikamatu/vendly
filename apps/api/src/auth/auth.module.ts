import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  AuthController,
  AccountLifecycleCronController,
} from './auth.controller';
import { AccountLifecycleService } from './account-lifecycle.service';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { CloudinaryModule } from '../common/cloudinary.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PaymentsModule } from '../payments/payments.module';
import { SmsClient } from './arkesel.client';
import { OAuthService } from './oauth.service';
import { LoopsModule } from '../loops/loops.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EmailModule,
    LoopsModule,
    CloudinaryModule,
    NotificationModule,
    PassportModule,
    PaymentsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [
    AuthController,
    AccountLifecycleCronController,
    AdminController,
  ],
  providers: [
    AuthService,
    AccountLifecycleService,
    AdminService,
    JwtStrategy,
    SmsClient,
    OAuthService,
  ],
  exports: [AuthService, AccountLifecycleService, JwtStrategy],
})
export class AuthModule {}
