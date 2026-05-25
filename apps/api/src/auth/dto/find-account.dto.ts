import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class FindAccountDto {
  @IsString({ message: 'Please tell us your full name.' })
  @MinLength(2, { message: 'Your name needs at least 2 characters.' })
  @MaxLength(120)
  full_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  business_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40, { message: 'Phone number is too long.' })
  phone?: string;

  /** An address they can be reached on, even if it's not the one they used to sign up. */
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid contact email.' })
  contact_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Please keep the note under 500 characters.' })
  note?: string;
}
