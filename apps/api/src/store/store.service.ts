import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { CloudinaryService } from '../common/cloudinary.service';

@Injectable()
export class StoreService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async createStore(userId: bigint, dto: CreateStoreDto, logoFile?: Express.Multer.File) {
    // Check if user already has a store
    const existingStore = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (existingStore) {
      throw new ConflictException('You already have a store');
    }

    // Check if store link is unique
    const linkExists = await this.prisma.sellerProfile.findUnique({
      where: { store_link: dto.store_link },
    });

    if (linkExists) {
      throw new ConflictException('Store link is already taken');
    }

    let logo_url = null;
    if (logoFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(logoFile, 'store-logos');
      logo_url = uploadResult.secure_url;
    }

    const store = await this.prisma.sellerProfile.create({
      data: {
        user_id: userId,
        store_name: dto.store_name,
        store_link: dto.store_link,
        bio: dto.bio,
        whatsapp_number: dto.whatsapp_number,
        logo_url: logo_url,
      },
    });

    return {
      message: 'Store created successfully',
      store: {
        id: store.id.toString(),
        store_name: store.store_name,
        store_link: store.store_link,
        logo_url: store.logo_url,
      },
    };
  }

  async updateStore(userId: bigint, dto: any, logoFile?: Express.Multer.File) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!store) {
      throw new ConflictException('Store not found');
    }

    const data: any = { ...dto };

    if (logoFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(logoFile, 'store-logos');
      data.logo_url = uploadResult.secure_url;
    }

    const updated = await this.prisma.sellerProfile.update({
      where: { user_id: userId },
      data,
    });

    return {
      message: 'Store updated successfully',
      store: {
        id: updated.id.toString(),
        store_name: updated.store_name,
        store_link: updated.store_link,
        logo_url: updated.logo_url,
        bio: updated.bio,
        whatsapp_number: updated.whatsapp_number,
      },
    };
  }
}
