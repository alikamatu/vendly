import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  store_name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Store link can only contain lowercase letters, numbers, and hyphens',
  })
  store_link: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  whatsapp_number?: string;

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
