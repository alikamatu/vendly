import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'Please enter your full name.' })
  @MinLength(2, { message: 'Your full name needs at least 2 characters.' })
  @MaxLength(100, { message: 'Full name is too long (max 100 characters).' })
  full_name: string;

  @IsEmail({}, { message: 'That email address doesn’t look right. Please double-check it.' })
  email: string;

  @IsString({ message: 'Please choose a password.' })
  @MinLength(8, { message: 'Your password needs at least 8 characters.' })
  @MaxLength(72, { message: 'Password is too long (max 72 characters).' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Make your password stronger: include an uppercase letter, a lowercase letter, and a number or symbol.',
  })
  password: string;

  /**
   * What the user is signing up to do. BUYER (default) goes straight to
   * shopping; SELLER additionally requires a business name so the future
   * SellerProfile can be pre-populated. Either way the user is created
   * with role=USER — SELLER role is only granted after the admin
   * approval flow completes. Treated as advisory metadata here.
   */
  @IsOptional()
  @IsIn(['BUYER', 'SELLER'], {
    message: 'Account type must be either BUYER or SELLER.',
  })
  account_type?: 'BUYER' | 'SELLER';

  /**
   * Business / store name. Required only when account_type === 'SELLER';
   * buyers can omit it entirely. Stored in the legacy `school` column.
   */
  @ValidateIf((o: RegisterDto) => o.account_type === 'SELLER')
  @IsString({ message: 'Please tell us your business name.' })
  @MinLength(2, { message: 'Business name needs at least 2 characters.' })
  @MaxLength(100, { message: 'Business name is too long (max 100 characters).' })
  school?: string;

  /**
   * Must be `true` for a registration to go through. The frontend renders
   * this as a Terms & Privacy checkbox.
   */
  @IsBoolean({ message: 'You must agree to the Terms of Service and Privacy Policy to create an account.' })
  @Equals(true, {
    message: 'You must agree to the Terms of Service and Privacy Policy to create an account.',
  })
  accept_terms: boolean;

  /**
   * Ghana phone number. Required at signup so that order alerts (Pro
   * sellers) and 2FA SMS work without forcing a follow-up profile step.
   * The frontend strips the leading "0" before submission, but the
   * server normalises again via parseGhanaPhone() because we cannot
   * trust client-side stripping (API clients, bulk imports, etc.).
   */
  @IsString({ message: 'Please enter your phone number.' })
  @MinLength(7, { message: 'Please enter a valid phone number.' })
  @MaxLength(20, { message: 'Phone number is too long.' })
  phone: string;

  /** Optional marketing opt-in. */
  @IsOptional()
  @IsBoolean()
  marketing_opt_in?: boolean;
}
