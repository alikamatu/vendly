import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ToggleHotSalesDto } from './dto/toggle-hot-sales.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 3 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  async createProduct(
    @Request() req,
    @Body() dto: CreateProductDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    return this.productService.createProduct(
      req.user.id,
      dto,
      files.images || [],
      files.video?.[0],
    );
  }

  @Get('categories')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('product_categories')
  @CacheTTL(3600000) // 1 hour
  async getCategories() {
    return this.productService.getCategories();
  }

  @Get('search')
  @UseInterceptors(CacheInterceptor)
  async searchProducts(@Query('q') q: string) {
    return this.productService.searchProducts(q);
  }

  @Get('hot-sales/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async verifyHotSalesPayment(
    @Request() req,
    @Query('reference') reference: string,
    @Query('product_id') productId: string,
  ) {
    return this.productService.verifyHotSalesPayment(
      req.user.id,
      reference,
      productId,
    );
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('min_discount') minDiscount?: string,
    @Query('search') search?: string,
    @Query('brand') brand?: string,
    @Query('min_price') minPrice?: string,
    @Query('max_price') maxPrice?: string,
    @Query('condition') condition?: string,
    @Query('has_video') hasVideo?: string,
    @Query('in_stock') inStock?: string,
    @Query('is_featured') isFeatured?: string,
    @Query('sort') sort?: string,
    @Query('status') status?: string,
    @Query('seller_id') sellerId?: string,
    @Query('region') region?: string,
    @Query('city_id') cityId?: string,
    @Query('service_area') serviceArea?: string,
    @Query('avg_delivery_time') avgDeliveryTime?: string,
  ) {
    const parseOptionalNumber = (value: string | undefined): number | undefined => {
      if (value === undefined || value === '') return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    };

    const parseOptionalBool = (value: string | undefined): boolean | undefined => {
      if (value === undefined || value === '') return undefined;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return undefined;
    };

    let parsedMinDiscount: number | undefined;
    if (minDiscount !== undefined && minDiscount !== '') {
      const n = Number(minDiscount);
      if (Number.isFinite(n) && n >= 0 && n <= 100) {
        parsedMinDiscount = n;
      }
    }

    const allowedSorts = [
      'newest',
      'oldest',
      'price_asc',
      'price_desc',
      'popular',
      'discount_desc',
    ] as const;
    type SortKey = (typeof allowedSorts)[number];
    const parsedSort: SortKey | undefined =
      sort && (allowedSorts as readonly string[]).includes(sort)
        ? (sort as SortKey)
        : undefined;

    const allowedServiceAreas = ['SAME_CITY', 'NEARBY_STATES', 'NATIONWIDE'] as const;
    const allowedDeliveryTimes = [
      'SAME_DAY',
      'NEXT_DAY',
      'TWO_TO_THREE_DAYS',
      'FOUR_TO_SEVEN_DAYS',
      'MORE_THAN_ONE_WEEK',
    ] as const;
    const parsedServiceArea =
      serviceArea &&
      (allowedServiceAreas as readonly string[]).includes(serviceArea)
        ? (serviceArea as (typeof allowedServiceAreas)[number])
        : undefined;
    const parsedDeliveryTime =
      avgDeliveryTime &&
      (allowedDeliveryTimes as readonly string[]).includes(avgDeliveryTime)
        ? (avgDeliveryTime as (typeof allowedDeliveryTimes)[number])
        : undefined;

    return this.productService.getProducts({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      category,
      minDiscount: parsedMinDiscount,
      search: search && search.trim().length > 0 ? search : undefined,
      brand,
      minPrice: parseOptionalNumber(minPrice),
      maxPrice: parseOptionalNumber(maxPrice),
      condition,
      hasVideo: parseOptionalBool(hasVideo),
      inStock: parseOptionalBool(inStock),
      isFeatured: parseOptionalBool(isFeatured),
      sort: parsedSort,
      status,
      sellerId,
      region: region || undefined,
      cityId: cityId || undefined,
      serviceArea: parsedServiceArea,
      avgDeliveryTime: parsedDeliveryTime,
    });
  }

  @Get('recent')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('products_recent')
  @CacheTTL(60000)
  async getRecentProducts() {
    return this.productService.getRecentProducts();
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Get('store/:link')
  async getProductsByStore(@Param('link') link: string) {
    return this.productService.getProductsByStoreLink(link);
  }

  @Get('seller/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async getMyProducts(@Request() req) {
    return this.productService.getProductsBySeller(req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'images', maxCount: 3 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  async updateProduct(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    return this.productService.updateProduct(
      req.user.id,
      id,
      dto,
      files.images || [],
      files.video?.[0],
    );
  }

  @Patch(':id/hot-sales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async toggleHotSales(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ToggleHotSalesDto,
  ) {
    return this.productService.toggleHotSales(
      req.user.id,
      id,
      dto.is_featured,
    );
  }

  @Post(':id/hot-sales/initialize-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async initializeHotSalesPayment(@Request() req, @Param('id') id: string) {
    return this.productService.initializeHotSalesPayment(
      req.user.id,
      id,
    );
  }

  @Post(':id/promotions/initialize-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async initializePromotionPayment(
    @Request() req,
    @Param('id') id: string,
    @Body('category') category?: string,
  ) {
    return this.productService.initializePromotionPayment(
      req.user.id,
      id,
      category || 'BOOST',
    );
  }

  @Get('promotions/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async verifyPromotionPayment(
    @Request() req,
    @Query('reference') reference: string,
    @Query('product_id') productId: string,
  ) {
    return this.productService.verifyPromotionPayment(
      req.user.id,
      reference,
      productId,
    );
  }

  @Get('promotions/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async getPromotionPaymentsHistory(@Request() req) {
    return this.productService.getPromotionPaymentsHistory(req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async deleteProduct(@Request() req, @Param('id') id: string) {
    return this.productService.deleteProduct(req.user.id, id);
  }
}
