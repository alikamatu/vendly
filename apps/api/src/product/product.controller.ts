import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
  Param,
  Query,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
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

  @Get()
  @UseInterceptors(CacheInterceptor)
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async deleteProduct(@Request() req, @Param('id') id: string) {
    return this.productService.deleteProduct(BigInt(req.user.id), BigInt(id));
  }
}
