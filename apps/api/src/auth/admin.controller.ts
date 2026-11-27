import {
  Controller,
  Get,
  Patch,
  Post,
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
  SetVerificationDto,
  ResetWarningsDto,
  AdminUpdateProfileDto,
  AdminUpdateStoreDto,
  AdminNotifyUserDto,
  AdminExecuteDeletionDto,
} from './dto/admin-user-actions.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './guards/roles.decorator';
import { actorFromReq } from '../audit/audit-log.service';

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
    @Req() req: any,
  ) {
    return this.adminService.approveOrReject(
      id,
      req.user.id,
      dto,
      actorFromReq(req),
    );
  }

  @Get('users')
  async getUsers(@Query() query: AdminQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('stores')
  async getStores(@Query() query: AdminQueryDto) {
    return this.adminService.getStores(query);
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserRole(id, dto, actorFromReq(req));
  }

  @Patch('users/:id/toggle-suspension')
  async toggleSuspension(
    @Param('id') id: string,
    @Body() dto: ToggleSuspensionDto,
    @Req() req: any,
  ) {
    return this.adminService.toggleUserSuspension(id, dto, actorFromReq(req));
  }

  @Patch('users/:id/warn')
  async warn(
    @Param('id') id: string,
    @Body() dto: WarnUserDto,
    @Req() req: any,
  ) {
    return this.adminService.warnUser(id, dto, actorFromReq(req));
  }

  @Patch('users/:id/warnings/reset')
  async resetWarnings(
    @Param('id') id: string,
    @Body() dto: ResetWarningsDto,
    @Req() req: any,
  ) {
    return this.adminService.resetUserWarnings(id, dto, actorFromReq(req));
  }

  @Patch('users/:id/verify')
  async setVerification(
    @Param('id') id: string,
    @Body() dto: SetVerificationDto,
    @Req() req: any,
  ) {
    return this.adminService.setUserVerification(id, dto, actorFromReq(req));
  }

  @Patch('users/:id/profile')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProfileDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserProfile(id, dto, actorFromReq(req));
  }

  @Patch('users/:id/store')
  async updateStore(
    @Param('id') id: string,
    @Body() dto: AdminUpdateStoreDto,
    @Req() req: any,
  ) {
    return this.adminService.updateUserStore(id, dto, actorFromReq(req));
  }

  @Post('users/:id/store/subaccount')
  async retryStoreSubaccount(@Param('id') id: string, @Req() req: any) {
    return this.adminService.retryStoreSubaccount(id, actorFromReq(req));
  }

  @Patch('users/:id/reactivate')
  async reactivateUser(@Param('id') id: string, @Req() req: any) {
    return this.adminService.reactivateUser(id, actorFromReq(req));
  }

  @Patch('users/:id/cancel-deletion')
  async cancelScheduledDeletion(@Param('id') id: string, @Req() req: any) {
    return this.adminService.cancelUserScheduledDeletion(id, actorFromReq(req));
  }

  @Post('users/:id/execute-deletion')
  async executeScheduledDeletion(
    @Param('id') id: string,
    @Body() dto: AdminExecuteDeletionDto,
    @Req() req: any,
  ) {
    return this.adminService.forceExecuteDeletion(id, dto, actorFromReq(req));
  }

  @Post('users/:id/reset-password')
  async sendPasswordReset(@Param('id') id: string, @Req() req: any) {
    return this.adminService.triggerPasswordReset(id, actorFromReq(req));
  }

  @Post('users/:id/notify')
  async notifyUser(
    @Param('id') id: string,
    @Body() dto: AdminNotifyUserDto,
    @Req() req: any,
  ) {
    return this.adminService.sendDirectNotification(id, dto, actorFromReq(req));
  }

  @Patch('users/:id/delete')
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteUser(id, actorFromReq(req));
  }

  // ───────────────── 2FA reset + Pro management ─────────────────

  @Patch('users/:id/disable-2fa')
  async forceDisable2fa(@Param('id') id: string, @Req() req: any) {
    return this.adminService.forceDisable2fa(id, actorFromReq(req));
  }

  @Patch('users/:id/pro')
  async setProStatus(
    @Param('id') id: string,
    @Body() body: { is_pro: boolean; duration_days?: number },
    @Req() req: any,
  ) {
    return this.adminService.setProStatus(id, body, actorFromReq(req));
  }

  // ───────────────── Returns ─────────────────

  @Get('returns')
  async listReturns(@Query() query: any) {
    return this.adminService.listReturns(query);
  }

  @Patch('returns/:id')
  async updateReturn(
    @Param('id') id: string,
    @Body()
    body: {
      status: 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'ESCALATED' | 'REFUNDED';
      admin_note?: string;
    },
    @Req() req: any,
  ) {
    return this.adminService.updateReturnStatus(id, body, actorFromReq(req));
  }

  @Post('returns/:id/refund')
  async refundReturn(
    @Param('id') id: string,
    @Body() body: { amount?: number; reason?: string; admin_note?: string },
    @Req() req: any,
  ) {
    return this.adminService.refundReturnRequest(id, body, actorFromReq(req));
  }

  // ───────────────── Reviews ─────────────────

  @Get('reviews')
  async listReviews(@Query() query: any) {
    return this.adminService.listReviews(query);
  }

  @Patch('reviews/:id/moderate')
  async moderateReview(
    @Param('id') id: string,
    @Body() body: { action: 'hide' | 'show' | 'delete' | 'dismiss_flags' },
  ) {
    return this.adminService.moderateReview(id, body);
  }
}
