import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../common/cloudinary.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, CloudinaryModule, PaymentsModule],
  providers: [ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
