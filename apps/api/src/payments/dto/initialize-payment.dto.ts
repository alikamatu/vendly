import {
  IsEmail,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
} from 'class-validator';

export class InitializePaymentDto {
  @IsEmail()
  email: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @IsOptional()
  @IsString()
  subaccount?: string;

  @IsOptional()
  @IsString()
  bearer?: string;
}
