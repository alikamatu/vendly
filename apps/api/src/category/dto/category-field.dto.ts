import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateIf,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CategoryFieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  SELECT = 'select',
  BOOLEAN = 'boolean',
}

export class CategoryFieldDto {
  // `key` is canonical; `name` is accepted as a legacy alias and normalized in the service.
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  label!: string;

  @IsEnum(CategoryFieldType)
  type!: CategoryFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ValidateIf((o) => o.type === CategoryFieldType.SELECT)
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  defaultValue?: any;
}

export class CategoryFieldsWrapper {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryFieldDto)
  fields?: CategoryFieldDto[];
}
