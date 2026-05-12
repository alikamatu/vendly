import {
  IsString,
  IsOptional,
  MaxLength,
  IsUrl,
  IsNumber,
  IsArray,
} from 'class-validator';

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  store_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  store_link?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  bio?: string;

  @IsString()
  @IsOptional()
  whatsapp_number?: string;

  @IsUrl()
  @IsOptional()
  logo_url?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  delivery_policies?: string;

  @IsString()
  @IsOptional()
  business_hours?: string;

  @IsOptional()
  social_links?: any;

  @IsString()
  @IsOptional()
  bank_name?: string;

  @IsString()
  @IsOptional()
  bank_code?: string;

  @IsString()
  @IsOptional()
  account_number?: string;

  @IsNumber()
  @IsOptional()
  location_id?: number;

  @IsString()
  @IsOptional()
  area?: string;

  @IsArray()
  @IsOptional()
  accepted_payment_methods?: string[];

  @IsString()
  @IsOptional()
  payment_timing?: any;
}
