import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

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
}
