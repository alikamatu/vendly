import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteLocationDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty({ message: 'Location is required' })
  location_id: number;

  @IsString()
  @IsOptional()
  area?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
