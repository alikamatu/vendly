import { IsString, IsNotEmpty, IsNumberString, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

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
}
