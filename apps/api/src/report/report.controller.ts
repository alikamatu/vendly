import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { actorFromReq } from '../audit/audit-log.service';
import { ReportService } from './report.service';
import {
  AdminReportQueryDto,
  CreateReportDto,
  ResolveReportDto,
} from './dto/report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateReportDto) {
    return this.reportService.createReport(req.user.id, dto);
  }

  @Get('mine')
  async mine(@Req() req: any) {
    return this.reportService.getMyReports(req.user.id);
  }
}

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  async list(@Query() query: AdminReportQueryDto) {
    return this.reportService.listAdminReports(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.reportService.getAdminReportById(id);
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @Req() req: any,
  ) {
    return this.reportService.resolveAdminReport(id, dto, actorFromReq(req));
  }
}
