import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveVerificationDto } from './dto/approve-verification.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getPendingApprovals() {
    const approvals = await this.prisma.adminApproval.findMany({
      where: { status: 'PENDING' },
      orderBy: { created_at: 'desc' },
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
      },
    });

    return approvals.map(a => ({
      id: a.id.toString(),
      user: {
        id: a.user.id.toString(),
        full_name: a.user.full_name,
        email: a.user.email,
        school: a.user.school,
        verification_doc: a.user.verification_doc,
      },
      status: a.status,
      created_at: a.created_at,
    }));
  }

  async approveOrReject(approvalId: bigint, adminId: bigint, dto: ApproveVerificationDto) {
    const approval = await this.prisma.adminApproval.findUnique({
      where: { id: approvalId },
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (approval.status !== 'PENDING') {
      throw new BadRequestException('This verification has already been reviewed');
    }

    const updated = await this.prisma.adminApproval.update({
      where: { id: approvalId },
      data: {
        status: dto.status,
        reviewed_by: adminId,
        reviewed_at: new Date(),
      },
    });

    return {
      id: updated.id.toString(),
      status: updated.status,
      reviewed_at: updated.reviewed_at,
      message: `Verification ${dto.status.toLowerCase()} successfully`,
    };
  }
}
