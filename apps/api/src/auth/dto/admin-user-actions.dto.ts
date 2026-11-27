import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DeliveryTime, PaymentTiming, Role, ServiceArea } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class WarnUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  reason: string;
}

export class ToggleSuspensionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class SetVerificationDto {
  @IsBoolean()
  is_verified: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ResetWarningsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdminUpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  full_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  school?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone_e164?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdminUpdateStoreDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  store_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  store_link?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsapp_number?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  area?: string | null;

  @IsOptional()
  @IsEnum(PaymentTiming)
  payment_timing?: PaymentTiming;

  @IsOptional()
  @IsEnum(ServiceArea)
  service_area?: ServiceArea;

  @IsOptional()
  @IsEnum(DeliveryTime)
  avg_delivery_time?: DeliveryTime;

  @IsOptional()
  @IsBoolean()
  onboarding_completed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdminNotifyUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  link?: string;
}

export class AdminExecuteDeletionDto {
  @IsString()
  confirmText: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
