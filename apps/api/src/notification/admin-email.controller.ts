import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { actorFromReq } from '../audit/audit-log.service';
import { AdminEmailService } from './admin-email.service';

class SendAdminEmailDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  preheader?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  eyebrow?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  headline!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(800, { each: true })
  paragraphs!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  statusLabel?: string;

  @IsOptional()
  @IsIn(['success', 'pending', 'warning', 'error', 'info'])
  statusVariant?: 'success' | 'pending' | 'warning' | 'error' | 'info';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ctaLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ctaPath?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  userIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateId?: string;
}

@Controller('admin/email')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminEmailController {
  constructor(private readonly emails: AdminEmailService) {}

  @Get('status')
  status() {
    return this.emails.getStatus();
  }

  @Post('send')
  send(@Body() dto: SendAdminEmailDto, @Req() req: any) {
    return this.emails.send(dto, actorFromReq(req));
  }

  @Get('history')
  history(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit?: number,
  ) {
    return this.emails.getHistory(page, limit);
  }
}
