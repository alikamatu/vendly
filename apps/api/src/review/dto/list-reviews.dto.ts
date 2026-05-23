import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

export class ListReviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cursor?: number = 0;

  @IsOptional()
  @IsIn(['newest', 'oldest', 'highest', 'lowest', 'helpful'])
  sort?: ReviewSort = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
