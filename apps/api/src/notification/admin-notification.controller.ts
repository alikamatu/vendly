import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';
import { IsIn, IsOptional, IsString as IsString, MaxLength } from 'class-validator';

class BroadcastDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @IsOptional()
  @IsIn(['USER', 'SELLER', 'ADMIN'])
  role?: 'USER' | 'SELLER' | 'ADMIN';
}

class DirectDto {
  @IsString()
  userId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(2000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;
}

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminNotificationController {
  constructor(private readonly service: NotificationService) {}

  @Get('stats')
  stats() {
    return this.service.adminStats();
  }

  @Get()
  list(
    @Query('cursor') cursor?: string,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
    @Query('userId') userId?: string,
  ) {
    return this.service.adminList({ cursor, take, userId });
  }

  @Post('broadcast')
  broadcast(@Body() dto: BroadcastDto) {
    return this.service.broadcast(dto);
  }

  @Post('direct')
  direct(@Body() dto: DirectDto) {
    return this.service.create({
      userId: dto.userId,
      type: 'ADMIN_BROADCAST' as any,
      title: dto.title,
      body: dto.body,
      link: dto.link,
    });
  }
}
