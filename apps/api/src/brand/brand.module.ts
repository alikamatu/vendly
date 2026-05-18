import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../common/cloudinary.module';
import { BrandService } from './brand.service';
import {
  BrandPublicController,
  BrandAdminController,
} from './brand.controller';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [BrandPublicController, BrandAdminController],
  providers: [BrandService],
  exports: [BrandService],
})
export class BrandModule {}
