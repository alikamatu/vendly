import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { StoreModule } from './store/store.module';
import { ProductModule } from './product/product.module';
import { CloudinaryModule } from './common/cloudinary.module';

import { OrderModule } from './order/order.module';
import { FavoriteModule } from './favorite/favorite.module';
import { PaymentsModule } from './payments/payments.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { CategoryModule } from './category/category.module';
import { BrandModule } from './brand/brand.module';
import { SettingsModule } from './settings/settings.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ReviewModule } from './review/review.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const url = process.env.REDIS_URL;
        // No Redis configured → use the built-in in-memory store. Fine for
        // single-instance deploys; lossy across restarts.
        if (!url) {
          console.warn(
            '[cache] REDIS_URL not set — falling back to in-memory cache',
          );
          return { ttl: 600000 };
        }
        try {
          const store = await redisStore({ url, ttl: 600000 });
          return { store, ttl: 600000 };
        } catch (err) {
          // Don't take the whole API down if Redis is unreachable at boot.

          console.error(
            '[cache] Redis unreachable, falling back to in-memory:',
            (err as Error)?.message,
          );
          return { ttl: 600000 };
        }
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 10 }], // ttl in milliseconds
    }),
    AuthModule,
    StoreModule,
    ProductModule,
    CloudinaryModule,
    OrderModule,
    FavoriteModule,
    PaymentsModule,
    OnboardingModule,
    CategoryModule,
    BrandModule,
    SettingsModule,
    SubscriptionModule,
    ReviewModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ApiResponseInterceptor,
    },
  ],
})
export class AppModule {}
