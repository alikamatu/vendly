import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveVerificationDto } from './dto/approve-verification.dto';
import { AdminQueryDto, ApprovalStatusFilter } from './dto/admin-query.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
      this.prisma.adminApproval.count({ where: { status: 'PENDING' } }),
      this.prisma.adminApproval.count({ where: { status: 'APPROVED' } }),
      this.prisma.adminApproval.count({ where: { status: 'REJECTED' } }),
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

    if (approval.status !== 'PENDING') {
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
      // If approved, grant the user full access
      ...(dto.status === 'APPROVED'
        ? [
            this.prisma.user.update({
              where: { id: approval.user_id },
              data: { is_verified: true },
            }),
          ]
        : []),
    ]);

    return {
      id: updated.id.toString(),
      status: updated.status,
      reviewed_at: updated.reviewed_at,
      message: `Verification ${dto.status.toLowerCase()} successfully`,
    };
  }
}
