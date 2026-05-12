import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CompleteStoreProfileDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  whatsapp_number?: string;

  @IsString()
  @IsOptional()
  business_hours?: string;

  @IsString()
  @IsOptional()
  delivery_policies?: string;
}
