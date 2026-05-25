import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email: string;

  @IsString({ message: 'Please enter your password.' })
  password: string;

  /** TOTP 6-digit code when 2FA is enabled. */
  @IsOptional()
  @IsString()
  totp_code?: string;

  /** One-time backup code (XXXX-XXXX) when the authenticator isn't available. */
  @IsOptional()
  @IsString()
  totp_backup_code?: string;
}
