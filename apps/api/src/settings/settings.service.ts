import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BulkSettingsDto,
  UpsertSettingDto,
} from './dto/settings.dto';

const KEY_REGEX = /^[a-z][a-z0-9_.]*$/;

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private validateKey(key: string) {
    if (!key || typeof key !== 'string' || !KEY_REGEX.test(key)) {
      throw new BadRequestException(
        'Invalid setting key. Must match /^[a-z][a-z0-9_.]*$/',
      );
    }
  }

  async list() {
    return this.prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async getByKey(key: string) {
    this.validateKey(key);
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key },
    });
    if (!setting) {
      throw new NotFoundException('Setting not found');
    }
    return setting;
  }

  async upsert(key: string, dto: UpsertSettingDto) {
    this.validateKey(key);
    return this.prisma.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value: dto.value as Prisma.InputJsonValue,
        description: dto.description,
      },
      update: {
        value: dto.value as Prisma.InputJsonValue,
        description: dto.description,
      },
    });
  }

  async remove(key: string) {
    this.validateKey(key);
    const existing = await this.prisma.platformSetting.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new NotFoundException('Setting not found');
    }
    await this.prisma.platformSetting.delete({ where: { key } });
    return { message: 'Setting deleted successfully' };
  }

  async bulkUpsert(dto: BulkSettingsDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }

    for (const item of dto.items) {
      this.validateKey(item.key);
    }

    const ops = dto.items.map((item) =>
      this.prisma.platformSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          value: item.value as Prisma.InputJsonValue,
          description: item.description,
        },
        update: {
          value: item.value as Prisma.InputJsonValue,
          description: item.description,
        },
      }),
    );

    const results = await this.prisma.$transaction(ops);
    return { count: results.length, items: results };
  }
}
