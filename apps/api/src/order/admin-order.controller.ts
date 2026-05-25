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
import { AdminOrderService } from './admin-order.service';
import { actorFromReq } from '../audit/audit-log.service';
import {
  AdminOrderListQueryDto,
  AdminUpdateOrderStatusDto,
} from './dto/admin-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminOrderController {
  constructor(private adminOrderService: AdminOrderService) {}

  @Get()
  async list(@Query() query: AdminOrderListQueryDto) {
    return this.adminOrderService.list(query);
  }

  @Get('stats/summary')
  async statsSummary() {
    return this.adminOrderService.statsSummary();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.adminOrderService.getById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateOrderStatusDto,
    @Req() req,
  ) {
    return this.adminOrderService.updateStatus(id, dto, actorFromReq(req));
  }
}
