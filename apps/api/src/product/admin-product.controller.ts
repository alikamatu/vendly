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
} from '@nestjs/common';
import { AdminProductService } from './admin-product.service';
import { actorFromReq } from '../audit/audit-log.service';
import {
  AdminBulkActionDto,
  AdminFeatureDto,
  AdminProductListQueryDto,
  AdminUpdateProductDto,
  AdminUpdateStatusDto,
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
  ) {
    return this.adminProductService.update(id, dto);
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

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    return this.adminProductService.remove(id, actorFromReq(req));
  }
}
