import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { CloudinaryModule } from '../common/cloudinary.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PaymentsModule } from '../payments/payments.module';
import { SmsClient } from './arkesel.client';
import { OAuthService } from './oauth.service';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    CloudinaryModule,
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
  controllers: [AuthController, AdminController],
  providers: [AuthService, AdminService, JwtStrategy, SmsClient, OAuthService],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
