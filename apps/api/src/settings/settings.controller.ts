import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  BulkSettingsDto,
  UpsertSettingDto,
} from './dto/settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.decorator';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  async list() {
    return this.settingsService.list();
  }

  @Post('bulk')
  async bulk(@Body() dto: BulkSettingsDto) {
    return this.settingsService.bulkUpsert(dto);
  }

  @Get(':key')
  async getByKey(@Param('key') key: string) {
    return this.settingsService.getByKey(key);
  }

  @Put(':key')
  async upsert(
    @Param('key') key: string,
    @Body() dto: UpsertSettingDto,
  ) {
    return this.settingsService.upsert(key, dto);
  }

  @Delete(':key')
  async remove(@Param('key') key: string) {
    return this.settingsService.remove(key);
  }
}

@Controller('settings')
export class SettingsPublicController {
  constructor(private settingsService: SettingsService) {}

  @Get(':key')
  async getByKey(@Param('key') key: string) {
    return this.settingsService.getByKey(key);
  }
}
