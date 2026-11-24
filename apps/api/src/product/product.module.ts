import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AdminProductController } from './admin-product.controller';
import { AdminProductService } from './admin-product.service';
import { VariantController } from './variant.controller';
import { VariantService } from './variant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../common/cloudinary.module';
import { PaymentsModule } from '../payments/payments.module';
import { AiModule } from '../ai/ai.module';
import { WhatsAppCatalogService } from './whatsapp-catalog.service';
import { WhatsAppCatalogController } from './whatsapp-catalog.controller';

@Module({
  imports: [
    PrismaModule,
    CloudinaryModule,
    PaymentsModule,
    AiModule,
    JwtModule.register({}),
  ],
  providers: [
    ProductService,
    AdminProductService,
    VariantService,
    WhatsAppCatalogService,
  ],
  controllers: [
    ProductController,
    AdminProductController,
    VariantController,
    WhatsAppCatalogController,
  ],
})
export class ProductModule {}
