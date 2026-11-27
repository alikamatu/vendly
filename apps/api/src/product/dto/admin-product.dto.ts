import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  IsNumberString,
  IsObject,
  ArrayNotEmpty,
  ValidateIf,
  IsNotEmpty,
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
  @IsString()
  stock?: 'in_stock' | 'out_of_stock' | 'low_stock';

  @IsOptional()
  @IsString()
  sort?:
    | 'newest'
    | 'oldest'
    | 'price_asc'
    | 'price_desc'
    | 'views_desc'
    | 'stock_asc'
    | 'title_asc';

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
  @Max(500)
  limit?: number = 50;
}

export class AdminCreateProductDto {
  @IsString()
  @IsNotEmpty()
  seller_id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumberString()
  price!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
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
  @IsEnum(AdminProductStatus)
  status?: AdminProductStatus;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  video_url?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AdminUpdateProductDto {
  @IsOptional()
  @IsString()
  seller_id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsNumberString()
  price?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
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
  @ValidateIf((_, value) => value !== null)
  @IsString()
  brand?: string | null;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  video_url?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminUpdateStatusDto {
  @IsEnum(AdminProductStatus)
  status!: AdminProductStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminUpdateStockDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity_available!: number;

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
  CATEGORY = 'category',
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

  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
