import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminProductService } from './admin-product.service';
import { actorFromReq } from '../audit/audit-log.service';
import {
  AdminBulkActionDto,
  AdminCreateProductDto,
  AdminFeatureDto,
  AdminProductListQueryDto,
  AdminUpdateProductDto,
  AdminUpdateStatusDto,
  AdminUpdateStockDto,
} from './dto/admin-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminProductController {
  constructor(private adminProductService: AdminProductService) {}

  @Get()
  async list(@Query() query: AdminProductListQueryDto) {
    return this.adminProductService.list(query);
  }

  @Get('summary')
  async summary() {
    return this.adminProductService.getSummary();
  }

  @Post()
  async create(@Body() dto: AdminCreateProductDto, @Req() req) {
    return this.adminProductService.create(dto, actorFromReq(req));
  }

  @Post('bulk')
  async bulk(@Body() dto: AdminBulkActionDto, @Req() req) {
    return this.adminProductService.bulk(dto, actorFromReq(req));
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.adminProductService.getById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProductDto,
    @Req() req,
  ) {
    return this.adminProductService.update(id, dto, actorFromReq(req));
  }

  @Post(':id/media')
  @UseInterceptors(FilesInterceptor('images', 8))
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ) {
    return this.adminProductService.uploadMedia(id, files, actorFromReq(req));
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @Body() body: { seller_id?: string },
    @Req() req,
  ) {
    return this.adminProductService.duplicate(
      id,
      actorFromReq(req),
      body?.seller_id,
    );
  }

  @Patch(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body() dto: AdminUpdateStockDto,
    @Req() req,
  ) {
    return this.adminProductService.updateStock(id, dto, actorFromReq(req));
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateStatusDto,
    @Req() req,
  ) {
    return this.adminProductService.updateStatus(id, dto, actorFromReq(req));
  }

  @Patch(':id/feature')
  async feature(
    @Param('id') id: string,
    @Body() dto: AdminFeatureDto,
    @Req() req,
  ) {
    return this.adminProductService.setFeatured(id, dto, actorFromReq(req));
  }

  /** Backward-compatible toggle endpoint */
  @Patch(':id/featured')
  async toggleFeatured(
    @Param('id') id: string,
    @Body() dto: Partial<AdminFeatureDto>,
    @Req() req,
  ) {
    return this.adminProductService.setFeatured(id, dto, actorFromReq(req));
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @Req() req,
  ) {
    return this.adminProductService.remove(
      id,
      actorFromReq(req),
      force === 'true' || force === '1',
    );
  }
}
