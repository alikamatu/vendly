import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class WarnUserDto {
  @IsString()
  reason: string;
}

export class ToggleSuspensionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
