import {
  IsString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsArray,
  IsBooleanString,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsNumberString()
  @IsOptional()
  quantity_available?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumberString()
  @IsNotEmpty()
  price: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBooleanString()
  is_featured?: string;

  @IsOptional()
  attributes?: string; // Will be parsed in service if sent as string
}
