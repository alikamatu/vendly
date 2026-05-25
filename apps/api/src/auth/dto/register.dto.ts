import {
  Equals,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
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

  @IsString({ message: 'Please tell us your business name.' })
  @MinLength(2, { message: 'Business name needs at least 2 characters.' })
  school: string;

  /**
   * Must be `true` for a registration to go through. The frontend renders
   * this as a Terms & Privacy checkbox.
   */
  @IsBoolean({ message: 'You must agree to the Terms of Service and Privacy Policy to create an account.' })
  @Equals(true, {
    message: 'You must agree to the Terms of Service and Privacy Policy to create an account.',
  })
  accept_terms: boolean;

  /** Optional marketing opt-in. */
  @IsOptional()
  @IsBoolean()
  marketing_opt_in?: boolean;
}
