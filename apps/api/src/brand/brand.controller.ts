import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('brands')
export class BrandPublicController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  async list(
    @Query('category') categoryName?: string,
    @Query('category_id') categoryId?: string,
  ) {
    return this.brandService.list({ categoryName, categoryId });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.brandService.getById(id);
  }
}

@Controller('admin/brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BrandAdminController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  async list() {
    return this.brandService.list();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.brandService.getById(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Body() dto: CreateBrandDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.brandService.create(dto, logo);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.brandService.update(id, dto, logo);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.brandService.remove(id);
  }
}
