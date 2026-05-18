import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApproveVerificationDto } from './dto/approve-verification.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import {
  UpdateUserRoleDto,
  WarnUserDto,
  ToggleSuspensionDto,
} from './dto/admin-user-actions.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './guards/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('transactions')
  async getTransactions(@Query() query: AdminQueryDto) {
    return this.adminService.getAllTransactions(query);
  }

  @Get('approvals')
  async getApprovals(@Query() query: AdminQueryDto) {
    return this.adminService.getApprovals(query);
  }

  @Get('approvals/:id')
  async getApprovalById(@Param('id') id: string) {
    console.log('Fetching approval by ID:', id);
    return this.adminService.getApprovalById(id);
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('overview')
  async getOverview() {
    return this.adminService.getGlobalOverview();
  }

  @Get('hot-sales/stats')
  async getHotSalesStats() {
    return this.adminService.getHotSalesStats();
  }

  @Get('hot-sales/subscriptions')
  async getHotSalesSubscriptions(@Query() query: AdminQueryDto) {
    return this.adminService.getHotSalesSubscriptions(query);
  }

  @Patch('approve/:id')
  async approveOrReject(
    @Param('id') id: string,
    @Body() dto: ApproveVerificationDto,
    @Req() req,
  ) {
    return this.adminService.approveOrReject(id, req.user.id, dto);
  }

  @Get('users')
  async getUsers(@Query() query: AdminQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto);
  }

  @Patch('users/:id/toggle-suspension')
  async toggleSuspension(
    @Param('id') id: string,
    @Body() dto: ToggleSuspensionDto,
  ) {
    return this.adminService.toggleUserSuspension(id, dto);
  }

  @Patch('users/:id/warn')
  async warn(@Param('id') id: string, @Body() dto: WarnUserDto) {
    return this.adminService.warnUser(id, dto);
  }

  @Patch('users/:id/delete') // Or @Delete, but using Patch for soft-admin actions if preferred, though actual delete is implemented
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
