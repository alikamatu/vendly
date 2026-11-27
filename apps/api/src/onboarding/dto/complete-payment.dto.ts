import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ArrayMinSize,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum PaymentTimingEnum {
  UPFRONT_ONLY = 'UPFRONT_ONLY',
  DELIVERY_ONLY = 'DELIVERY_ONLY',
  BOTH = 'BOTH',
}

export class CompletePaymentDto {
  @IsOptional()
  @IsBoolean()
  skip_payout?: boolean;

  @ValidateIf((o) => !o.skip_payout)
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one payment method is required' })
  @IsString({ each: true })
  accepted_payment_methods?: string[];

  @ValidateIf((o) => !o.skip_payout)
  @IsEnum(PaymentTimingEnum, {
    message: 'Payment timing must be UPFRONT_ONLY, DELIVERY_ONLY, or BOTH',
  })
  @IsNotEmpty({ message: 'Payment timing is required' })
  payment_timing?: PaymentTimingEnum;

  @ValidateIf((o) => !o.skip_payout)
  @IsString()
  @IsNotEmpty({ message: 'Bank name is required' })
  bank_name?: string;

  @ValidateIf((o) => !o.skip_payout)
  @IsString()
  @IsNotEmpty({ message: 'Bank code is required' })
  bank_code?: string;

  @ValidateIf((o) => !o.skip_payout)
  @IsString()
  @IsNotEmpty({ message: 'Account number is required' })
  account_number?: string;
}
