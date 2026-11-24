import {
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per uploaded image

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER', 'ADMIN')
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  private async getCategoryNames(): Promise<string[]> {
    const categories = await this.prisma.category.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const names = categories.map((c) => c.name).filter(Boolean);
    return names.length > 0 ? names : ['General'];
  }

  @Get('status')
  getStatus() {
    return this.geminiService.getStatus();
  }

  @Post('analyze-bulk-photos')
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      limits: { fileSize: MAX_IMAGE_BYTES },
    }),
  )
  async analyzeBulkPhotos(@UploadedFiles() files: Express.Multer.File[]) {
    const categoryNames = await this.getCategoryNames();
    return this.geminiService.analyzeBulkProductPhotos(
      files || [],
      categoryNames,
    );
  }

  @Post('analyze-product-photos')
  @UseInterceptors(
    FilesInterceptor('images', 3, {
      limits: { fileSize: MAX_IMAGE_BYTES },
    }),
  )
  async analyzeProductPhotos(@UploadedFiles() files: Express.Multer.File[]) {
    const categoryNames = await this.getCategoryNames();
    return this.geminiService.analyzeSingleProductPhotos(
      files || [],
      categoryNames,
    );
  }
}
