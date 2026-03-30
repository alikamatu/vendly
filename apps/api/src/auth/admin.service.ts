import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveVerificationDto } from './dto/approve-verification.dto';
import { AdminQueryDto, ApprovalStatusFilter } from './dto/admin-query.dto';
import { PaymentsService } from '../payments/payments.service';

import {
  UpdateUserRoleDto,
  WarnUserDto,
  ToggleSuspensionDto,
} from './dto/admin-user-actions.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  async getUsers(query: AdminQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    if (query.status && query.status !== ApprovalStatusFilter.ALL) {
      if (query.status === 'PENDING') where.is_verified = false;
      if (query.status === 'APPROVED') where.is_verified = true;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { full_name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true,
          is_verified: true,
          is_suspended: true,
          warnings: true,
          created_at: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({ ...u, id: u.id.toString() })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateUserRole(id: bigint, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
    });

    return { message: `User role updated to ${dto.role}` };
  }

  async toggleUserSuspension(id: bigint, dto: ToggleSuspensionDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { is_suspended: !user.is_suspended },
    });

    return {
      message: `User ${updated.is_suspended ? 'suspended' : 'unsuspended'} successfully`,
      is_suspended: updated.is_suspended,
    };
  }

  async warnUser(id: bigint, dto: WarnUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { warnings: { increment: 1 } },
    });

    return {
      message: `Warning issued. Total warnings: ${updated.warnings}`,
      warnings: updated.warnings,
    };
  }

  async deleteUser(id: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.adminApproval.deleteMany({ where: { user_id: id } }),
      this.prisma.sellerProfile.deleteMany({ where: { user_id: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return { message: 'User and associated data deleted successfully' };
  }

  async getApprovals(query: AdminQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};

    // Status filter
    if (query.status && query.status !== ApprovalStatusFilter.ALL) {
      where.status = query.status;
    }

    // Search filter (name or email)
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.user = {
        OR: [
          { full_name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const [approvals, total] = await Promise.all([
      this.prisma.adminApproval.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              school: true,
              verification_doc: true,
              created_at: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              full_name: true,
            },
          },
        },
      }),
      this.prisma.adminApproval.count({ where }),
    ]);

    return {
      data: approvals.map((a) => ({
        id: a.id.toString(),
        user: {
          id: a.user.id.toString(),
          full_name: a.user.full_name,
          email: a.user.email,
          school: a.user.school,
          verification_doc: a.user.verification_doc,
          created_at: a.user.created_at,
        },
        status: a.status,
        reviewed_by: a.reviewer
          ? { id: a.reviewer.id.toString(), full_name: a.reviewer.full_name }
          : null,
        reviewed_at: a.reviewed_at,
        created_at: a.created_at,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.adminApproval.count(),
      this.prisma.adminApproval.count({
        where: { status: ApprovalStatus.PENDING },
      }),
      this.prisma.adminApproval.count({
        where: { status: ApprovalStatus.APPROVED },
      }),
      this.prisma.adminApproval.count({
        where: { status: ApprovalStatus.REJECTED },
      }),
    ]);

    return { total, pending, approved, rejected };
  }

  async approveOrReject(
    approvalId: bigint,
    adminId: bigint,
    dto: ApproveVerificationDto,
  ) {
    const approval = await this.prisma.adminApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        'This verification has already been reviewed',
      );
    }

    // Update approval record and user verification status in a transaction
    const [updated] = await this.prisma.$transaction([
      this.prisma.adminApproval.update({
        where: { id: approvalId },
        data: {
          status: dto.status,
          reviewed_by: adminId,
          reviewed_at: new Date(),
        },
      }),
      // If approved, grant the user full access and assign SELLER role
      ...(dto.status === 'APPROVED'
        ? [
            this.prisma.user.update({
              where: { id: approval.user_id },
              data: { is_verified: true, role: Role.SELLER },
            }),
          ]
        : []),
    ]);

    // Automatically create Paystack subaccount if approved
    if (dto.status === 'APPROVED') {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { user_id: approval.user_id },
      });

      if (seller) {
        // Fire and forget or handle error? The task says "Failure does not crash system".
        // createSubaccount already handles its own errors and retries.
        this.paymentsService.createSubaccount(seller.id).catch((err) => {
          console.error('Failed to trigger subaccount creation:', err);
        });
      }
    }

    return {
      id: updated.id.toString(),
      status: updated.status,
      reviewed_at: updated.reviewed_at,
      message: `Verification ${dto.status.toLowerCase()} successfully`,
    };
  }
}
