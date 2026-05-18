import {
  IsOptional,
  IsString,
  IsNumberString,
  IsIn,
} from 'class-validator';

export const ADMIN_ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export type AdminOrderStatus = (typeof ADMIN_ORDER_STATUSES)[number];

export class AdminOrderListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  buyer_id?: string;

  @IsOptional()
  @IsString()
  seller_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class AdminUpdateOrderStatusDto {
  @IsIn(ADMIN_ORDER_STATUSES as unknown as string[])
  status!: AdminOrderStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
