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
import { FilesInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FilesInterceptor('images', 3))
  async createProduct(
    @Request() req,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productService.createProduct(BigInt(req.user.id), dto, files);
  }

  @Get()
  async getProducts() {
    return this.productService.getProducts();
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(BigInt(id));
  }

  @Get('categories')
  async getCategories() {
    return this.productService.getCategories();
  }
}
