import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { VariantController } from './variant.controller';
import { VariantService } from './variant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../common/cloudinary.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, CloudinaryModule, PaymentsModule],
  providers: [ProductService, AdminProductService, VariantService],
  controllers: [ProductController, AdminProductController, VariantController],
})
export class ProductModule {}
