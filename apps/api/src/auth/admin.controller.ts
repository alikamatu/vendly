import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApproveVerificationDto } from './dto/approve-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './guards/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('pending-approvals')
  async getPendingApprovals() {
    return this.adminService.getPendingApprovals();
  }

  @Patch('approve/:id')
  async approveOrReject(
    @Param('id') id: string,
    @Body() dto: ApproveVerificationDto,
    @Req() req,
  ) {
    return this.adminService.approveOrReject(BigInt(id), req.user.id, dto);
  }
}
