import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
