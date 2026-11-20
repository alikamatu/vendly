import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminProductService } from './admin-product.service';
import { actorFromReq } from '../audit/audit-log.service';
import {
  AdminFeatureDto,
  AdminProductListQueryDto,
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

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.adminProductService.getById(id);
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
}
