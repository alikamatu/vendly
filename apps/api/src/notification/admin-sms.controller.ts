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
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { actorFromReq } from '../audit/audit-log.service';
import { AdminSmsService, type SmsRecipientSegment } from './admin-sms.service';

class SendAdminSmsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(960)
  message!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customNumbers?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  templateId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  senderId?: string;
}

@Controller('admin/sms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminSmsController {
  constructor(private readonly smsService: AdminSmsService) {}

  @Get('status')
  getStatus() {
    return this.smsService.getStatus();
  }

  @Get('recipients')
  listRecipients(
    @Query('search') search?: string,
    @Query('segment') segment?: SmsRecipientSegment,
    @Query('onlyWithPhone') onlyWithPhone?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
  ) {
    return this.smsService.listRecipients({
      search,
      segment,
      onlyWithPhone: onlyWithPhone !== 'false',
      page,
      limit,
    });
  }

  @Post('send')
  sendSms(@Body() dto: SendAdminSmsDto, @Req() req: any) {
    return this.smsService.sendSms(dto, actorFromReq(req));
  }

  @Get('history')
  getHistory(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit?: number,
  ) {
    return this.smsService.getHistory(page, limit);
  }
}
