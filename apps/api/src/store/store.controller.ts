import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
  Patch,
  Get,
  Param,
} from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @UseInterceptors(FileInterceptor('logo'))
  async createStore(
    @Request() req,
    @Body() dto: CreateStoreDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
        fileIsRequired: false,
      }),
    )
    logo?: Express.Multer.File,
  ) {
    return this.storeService.createStore(req.user.id, dto, logo);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @UseInterceptors(FileInterceptor('logo'))
  async updateStore(
    @Request() req,
    @Body() dto: UpdateStoreDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
        fileIsRequired: false,
      }),
    )
    logo?: Express.Multer.File,
  ) {
    return this.storeService.updateStore(req.user.id, dto, logo);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  async getStoreStats(@Request() req) {
    return this.storeService.getStoreStats(req.user.id);
  }

  @Get('link/:link')
  @UseInterceptors(CacheInterceptor)
  // Public endpoint
  async getStoreByLink(@Param('link') link: string) {
    return this.storeService.getStoreByLink(link);
  }

  @Get('top-pro')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('stores_top_pro')
  @CacheTTL(60_000)
  // Public endpoint - top pro vendors ordered by product count
  async getTopProVendors(@Query('limit') limit?: string) {
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 6, 1), 24) : 6;
    return this.storeService.getTopProVendors(n);
  }

  @Get()
  // Public endpoint - list and filter all public stores
  async getPublicStores(
    @Query('search') search?: string,
    @Query('location') location?: string,
    @Query('is_pro') is_pro?: string,
    @Query('sort') sort?: 'newest' | 'products' | 'alphabetical' | 'default',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const isProBool =
      is_pro === 'true' ? true : is_pro === 'false' ? false : undefined;
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 12 : 12;

    return this.storeService.getPublicStores({
      search,
      location,
      is_pro: isProBool,
      sort,
      page: pageNum,
      limit: limitNum,
    });
  }
}
