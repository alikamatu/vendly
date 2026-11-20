import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { VariantService } from './variant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

interface UpsertVariantBody {
  id?: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  quantity_available: number;
  image_url?: string | null;
  is_active?: boolean;
}

@Controller('products/:productId/variants')
export class VariantController {
  constructor(private readonly variants: VariantService) {}

  /** Public — buyers fetch variants for a product detail page. */
  @Get()
  list(@Param('productId') productId: string) {
    return this.variants.list(productId);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  bulkReplace(
    @Request() req: any,
    @Param('productId') productId: string,
    @Body() body: { variants: UpsertVariantBody[] },
  ) {
    return this.variants.replaceAll(
      req.user.id,
      productId,
      body.variants || [],
    );
  }
}
