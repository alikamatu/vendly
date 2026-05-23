import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewFlagReason } from '@prisma/client';

export class FlagReviewDto {
  @IsEnum(ReviewFlagReason)
  reason!: ReviewFlagReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
