import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    // If setting as default, unset other defaults
    if (createAddressDto.is_default) {
      await this.prisma.address.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      });
    } else {
      // If no addresses exist, make this the default
      const count = await this.prisma.address.count({
        where: { user_id: userId },
      });
      if (count === 0) {
        createAddressDto.is_default = true;
      }
    }

    const { latitude, longitude, ...rest } = createAddressDto;
    const coords = this.coords(latitude, longitude);
    const created = await this.prisma.address.create({
      data: {
        ...rest,
        ...coords,
        user_id: userId,
      },
    });
    return this.present(created);
  }

  async findAll(userId: string) {
    const rows = await this.prisma.address.findMany({
      where: { user_id: userId },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });
    return rows.map((row) => this.present(row));
  }

  async update(userId: string, id: string, updateAddressDto: UpdateAddressDto) {
    // Ensure address belongs to user
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // If setting to default, unset other defaults
    if (updateAddressDto.is_default) {
      await this.prisma.address.updateMany({
        where: { user_id: userId, is_default: true, id: { not: id } },
        data: { is_default: false },
      });
    }

    const { latitude, longitude, ...rest } = updateAddressDto;
    const coords =
      latitude !== undefined || longitude !== undefined
        ? this.coords(latitude, longitude)
        : {};
    const updated = await this.prisma.address.update({
      where: { id },
      data: { ...rest, ...coords },
    });
    return this.present(updated);
  }

  async remove(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, user_id: userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({
      where: { id },
    });

    // If we deleted the default address, and there are others, make the newest one default
    if (address.is_default) {
      const remaining = await this.prisma.address.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      });

      if (remaining) {
        await this.prisma.address.update({
          where: { id: remaining.id },
          data: { is_default: true },
        });
      }
    }

    return { success: true };
  }

  private coords(latitude?: number, longitude?: number) {
    if (latitude == null && longitude == null) return {};
    if (latitude == null || longitude == null) {
      throw new BadRequestException(
        'Location needs both latitude and longitude.',
      );
    }
    return { latitude, longitude };
  }

  private present<T extends { latitude: unknown; longitude: unknown }>(
    address: T,
  ) {
    const has_location = address.latitude != null && address.longitude != null;
    const { latitude: _lat, longitude: _lng, ...rest } = address;
    return { ...rest, has_location };
  }
}
