import { IsBoolean } from 'class-validator';

export class ToggleHotSalesDto {
  @IsBoolean()
  is_featured: boolean;
}
