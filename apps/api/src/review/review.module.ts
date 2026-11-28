import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { SellerExperienceService } from './seller-experience.service';
import { SellerExperienceController } from './seller-experience.controller';
import { SellerExperienceAdminController } from './seller-experience-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    ReviewController,
    SellerExperienceController,
    SellerExperienceAdminController,
  ],
  providers: [ReviewService, SellerExperienceService],
  exports: [ReviewService, SellerExperienceService],
})
export class ReviewModule {}
