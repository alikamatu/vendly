import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Profile patch DTO. The global ValidationPipe is configured with
 * `forbidNonWhitelisted: true`, so every editable field has to live on
 * this class — otherwise the request 400s with "property X should not
 * exist". Add new editable fields here as the profile form grows.
 */
export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  full_name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  current_password?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  new_password?: string;

  /**
   * Business name. UI labels it "Business Name"; DB column is the
   * legacy `school`. Allow empty string so buyers can clear it.
   */
  @IsString()
  @IsOptional()
  @MaxLength(200)
  school?: string;

  /**
   * Phone number in any human format ("0244...", "+233 244...",
   * "(024) 412-3456"). Server normalises via libphonenumber-js in
   * auth.service.updateProfile, so we only do a loose length check
   * here. Empty string is allowed — treated as "no change" by the
   * service to avoid wiping a saved number with a bad client patch.
   */
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;
}
