import {
  IsInt,
  Min,
  Max,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CreateReviewDto {
  /** The buyer's purchased item that proves eligibility. */
  @IsUUID()
  order_item_id!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;
}
