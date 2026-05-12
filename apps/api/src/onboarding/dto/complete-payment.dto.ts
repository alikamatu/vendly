import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  ArrayMinSize,
  IsString,
} from 'class-validator';

export enum PaymentTimingEnum {
  UPFRONT_ONLY = 'UPFRONT_ONLY',
  DELIVERY_ONLY = 'DELIVERY_ONLY',
  BOTH = 'BOTH',
}

export class CompletePaymentDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one payment method is required' })
  @IsString({ each: true })
  accepted_payment_methods: string[];

  @IsEnum(PaymentTimingEnum, {
    message: 'Payment timing must be UPFRONT_ONLY, DELIVERY_ONLY, or BOTH',
  })
  @IsNotEmpty({ message: 'Payment timing is required' })
  payment_timing: PaymentTimingEnum;

  @IsString()
  @IsNotEmpty({ message: 'Bank name is required' })
  bank_name: string;

  @IsString()
  @IsNotEmpty({ message: 'Bank code is required' })
  bank_code: string;

  @IsString()
  @IsNotEmpty({ message: 'Account number is required' })
  account_number: string;
}
