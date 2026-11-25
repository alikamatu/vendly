import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiController } from './ai.controller';
import { GeminiService } from './gemini.service';
import { BuyerSearchService } from './buyer-search.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [GeminiService, BuyerSearchService],
  exports: [GeminiService, BuyerSearchService],
})
export class AiModule {}
