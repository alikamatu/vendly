import { IsOptional, IsString, IsEnum, IsNumberString } from 'class-validator';
import { Role } from '@prisma/client';

export enum ApprovalStatusFilter {
  ALL = 'ALL',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum UserAccountStatusFilter {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
  DELETING = 'DELETING',
  VERIFIED = 'VERIFIED',
  UNVERIFIED = 'UNVERIFIED',
}

export class AdminQueryDto {
  @IsOptional()
  @IsEnum(ApprovalStatusFilter)
  status?: ApprovalStatusFilter = ApprovalStatusFilter.ALL;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserAccountStatusFilter)
  accountStatus?: UserAccountStatusFilter = UserAccountStatusFilter.ALL;

  @IsOptional()
  @IsString()
  hasStore?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '20';
}
