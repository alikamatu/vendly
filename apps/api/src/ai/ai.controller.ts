import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { BuyerSearchService } from './buyer-search.service';
import {
  AiCardCopyInput,
  AiDraftStorefrontInput,
  AiOnboardingAssistantInput,
  AiPolishListingInput,
} from './gemini.types';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per uploaded image

@Controller('ai')
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly buyerSearchService: BuyerSearchService,
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

  /**
   * Public natural-language buyer search powered by Verndly AI.
   * Rate-limited to protect AI quota while staying open to all shoppers.
   */
  @Post('buyer-search')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async buyerSearch(@Body() body: { query?: string; limit?: number }) {
    return this.buyerSearchService.search(body?.query || '', body?.limit);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  getStatus() {
    return this.geminiService.getStatus();
  }

  @Post('analyze-bulk-photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
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

  @Post('polish-listing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async polishListing(@Body() body: AiPolishListingInput) {
    const categoryNames = await this.getCategoryNames();
    return this.geminiService.polishProductListing(body, categoryNames);
  }

  /**
   * AI Product Card Copywriter — crafts punchy Nike/Apple-grade headlines,
   * taglines, badges, and micro-descriptions for downloadable share cards.
   */
  @Post('card-copy')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  async generateCardCopy(@Body() body: AiCardCopyInput) {
    return this.geminiService.generateProductCardCopy(body);
  }

  @Post('draft-storefront')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  async draftStorefront(@Body() body: AiDraftStorefrontInput) {
    return this.geminiService.draftStorefrontSetup(body);
  }

  /**
   * AI Onboarding Copilot — available to any authenticated user setting up their store.
   * Drafts brand identity, bio, hours, policies, and matches their Ghana city/region.
   */
  @Post('onboarding-assistant')
  @UseGuards(JwtAuthGuard)
  async onboardingAssistant(@Body() body: AiOnboardingAssistantInput) {
    const locations = await this.prisma.location.findMany({
      select: { id: true, region: true, city: true },
      orderBy: [{ region: 'asc' }, { city: 'asc' }],
    });
    return this.geminiService.assistSellerOnboarding(
      body,
      locations.map((l) => ({
        id: l.id.toString(),
        region: l.region,
        city: l.city,
      })),
    );
  }
}
