import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  IsNumberString,
  IsObject,
  ArrayNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum AdminProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  REJECTED = 'rejected',
}

export class AdminProductListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  seller_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === 'true' || value === true,
  )
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  min_discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class AdminUpdateProductDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumberString()
  original_price?: string | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity_available?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AdminUpdateStatusDto {
  @IsEnum(AdminProductStatus)
  status!: AdminProductStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminFeatureDto {
  @IsBoolean()
  is_featured!: boolean;
}

export enum AdminBulkAction {
  DELETE = 'delete',
  STATUS = 'status',
  FEATURE = 'feature',
}

export class AdminBulkActionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids!: string[];

  @IsEnum(AdminBulkAction)
  action!: AdminBulkAction;

  @IsOptional()
  value?: unknown;
}
