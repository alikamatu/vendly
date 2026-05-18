import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ServiceAreaDto {
  SAME_CITY = 'SAME_CITY',
  NEARBY_STATES = 'NEARBY_STATES',
  NATIONWIDE = 'NATIONWIDE',
}

export enum DeliveryTimeDto {
  SAME_DAY = 'SAME_DAY',
  NEXT_DAY = 'NEXT_DAY',
  TWO_TO_THREE_DAYS = 'TWO_TO_THREE_DAYS',
  FOUR_TO_SEVEN_DAYS = 'FOUR_TO_SEVEN_DAYS',
  MORE_THAN_ONE_WEEK = 'MORE_THAN_ONE_WEEK',
}

export class CompleteLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  location_id: string;

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

  @IsEnum(ServiceAreaDto, { message: 'Invalid service area' })
  @IsNotEmpty({ message: 'Service area is required' })
  service_area: ServiceAreaDto;

  @IsEnum(DeliveryTimeDto, { message: 'Invalid delivery time' })
  @IsNotEmpty({ message: 'Average delivery time is required' })
  avg_delivery_time: DeliveryTimeDto;
}
