import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  UseGuards, 
  UseInterceptors, 
  UploadedFiles, 
  ParseFilePipe, 
  MaxFileSizeValidator, 
  FileTypeValidator, 
  Request,
  Param
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
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
    @UploadedFiles() files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    return this.productService.createProduct(
      BigInt(req.user.id),
      dto,
      files.images || [],
      files.video?.[0],
    );
  }

  @Get('categories')
  async getCategories() {
    return this.productService.getCategories();
  }

  @Get()
  async getProducts() {
    return this.productService.getProducts();
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(BigInt(id));
  }

  @Get('store/:link')
  async getProductsByStore(@Param('link') link: string) {
    return this.productService.getProductsByStoreLink(link);
  }
}
