import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ArrayMaxSize,
  IsUrl,
} from 'class-validator';
import {
  ReportReason,
  ReportResolutionAction,
  ReportStatus,
  ReportTargetType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  target_type!: ReportTargetType;

  @IsOptional()
  @IsUUID()
  product_id?: string;

  @IsOptional()
  @IsUUID()
  seller_id?: string;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  evidence_urls?: string[];
}

export class AdminReportQueryDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportTargetType)
  target_type?: ReportTargetType;

  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;
}

export class ResolveReportDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @IsOptional()
  @IsEnum(ReportResolutionAction)
  action?: ReportResolutionAction;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  admin_notes?: string;
}
