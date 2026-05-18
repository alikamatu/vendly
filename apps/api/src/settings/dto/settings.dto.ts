import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSettingDto {
  // value can be any JSON-serializable value; validate at runtime.
  value!: any;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkSettingItemDto {
  @IsString()
  key!: string;

  value!: any;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkSettingItemDto)
  items!: BulkSettingItemDto[];
}
