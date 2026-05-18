import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoryService } from './category.service';
import {
  CategoryController,
  CategoryPublicController,
} from './category.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController, CategoryPublicController],
  providers: [CategoryService],
})
export class CategoryModule {}
