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
      BigInt(req.user.id),
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
      BigInt(req.user.id),
      reference,
      BigInt(productId),
    );
  }

  @Get()
  async getProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.productService.getProducts({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      category,
    });
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(BigInt(id));
  }

  @Get('store/:link')
  async getProductsByStore(@Param('link') link: string) {
    return this.productService.getProductsByStoreLink(link);
  }

  @Get('seller/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async getMyProducts(@Request() req) {
    return this.productService.getProductsBySeller(BigInt(req.user.id));
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
      BigInt(req.user.id),
      BigInt(id),
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
      BigInt(req.user.id),
      BigInt(id),
      dto.is_featured,
    );
  }

  @Post(':id/hot-sales/initialize-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async initializeHotSalesPayment(@Request() req, @Param('id') id: string) {
    return this.productService.initializeHotSalesPayment(
      BigInt(req.user.id),
      BigInt(id),
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
      BigInt(req.user.id),
      BigInt(id),
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
      BigInt(req.user.id),
      reference,
      BigInt(productId),
    );
  }

  @Get('promotions/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async getPromotionPaymentsHistory(@Request() req) {
    return this.productService.getPromotionPaymentsHistory(BigInt(req.user.id));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async deleteProduct(@Request() req, @Param('id') id: string) {
    return this.productService.deleteProduct(BigInt(req.user.id), BigInt(id));
  }
}
