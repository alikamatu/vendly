import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SubmitSellerExperienceDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @MinLength(20)
  @MaxLength(800)
  body!: string;
}

export class ModerateSellerExperienceDto {
  @IsIn(['PUBLISHED', 'REJECTED'])
  status!: 'PUBLISHED' | 'REJECTED';
}
