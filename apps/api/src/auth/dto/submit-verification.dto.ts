import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class SubmitVerificationDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['URL', 'FILES', 'CONTACT'])
  type: string;

  @IsString()
  @IsOptional()
  verification_doc?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['WHATSAPP', 'EMAIL', 'PHONE'])
  contact_method?: string;
}
