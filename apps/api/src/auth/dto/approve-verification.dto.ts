import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ApprovalAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ApproveVerificationDto {
  @IsEnum(ApprovalAction, { message: 'Status must be APPROVED or REJECTED' })
  status: ApprovalAction;

  @IsOptional()
  @IsString()
  reason?: string;
}
