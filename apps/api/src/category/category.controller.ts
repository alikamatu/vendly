import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  async list() {
    return this.categoryService.list();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.categoryService.getById(id);
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}

@Controller('categories')
export class CategoryPublicController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  async list() {
    return this.categoryService.list();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.categoryService.getById(id);
  }
}
