import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

const BRAND_SELECT = {
  id: true,
  name: true,
  image_url: true,
  category_id: true,
  created_at: true,
  updated_at: true,
  category: {
    select: {
      name: true,
    },
  },
} as const;

function serializeBrand<T extends { id: string; category_id: string }>(brand: T) {
  return {
    ...brand,
    id: brand.id.toString(),
    category_id: brand.category_id.toString(),
  };
}

@Injectable()
export class BrandService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async list(filters: { categoryName?: string; categoryId?: string } = {}) {
    const where: Prisma.BrandWhereInput = {};

    if (filters.categoryId) {
      where.category_id = filters.categoryId;
    } else if (filters.categoryName) {
      where.category = {
        name: {
          equals: filters.categoryName,
          mode: 'insensitive',
        },
      };
    }

    const brands = await this.prisma.brand.findMany({
      where,
      select: BRAND_SELECT,
      orderBy: { name: 'asc' },
    });

    return brands.map(serializeBrand);
  }

  async getById(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: BRAND_SELECT,
    });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    return serializeBrand(brand);
  }

  async create(dto: CreateBrandDto, logoFile?: Express.Multer.File) {
    const categoryId = dto.category_id;

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Selected category does not exist');
    }

    // Check for duplicate name in category
    const duplicate = await this.prisma.brand.findFirst({
      where: {
        name: { equals: dto.name.trim(), mode: 'insensitive' },
        category_id: categoryId,
      },
    });
    if (duplicate) {
      throw new ConflictException('A brand with this name already exists in this category');
    }

    let imageUrl = dto.image_url || null;
    if (logoFile) {
      const upload = await this.cloudinaryService.uploadImage(logoFile, 'brands');
      imageUrl = upload.secure_url;
    }

    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name.trim(),
        image_url: imageUrl,
        category_id: categoryId,
      },
      select: BRAND_SELECT,
    });

    return serializeBrand(brand);
  }

  async update(id: string, dto: UpdateBrandDto, logoFile?: Express.Multer.File) {
    const existing = await this.getById(id);

    const categoryId = dto.category_id ? dto.category_id : existing.category_id;

    if (dto.category_id) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) {
        throw new NotFoundException('Selected category does not exist');
      }
    }

    if (dto.name || dto.category_id) {
      const nameToCheck = dto.name ? dto.name.trim() : existing.name;
      const duplicate = await this.prisma.brand.findFirst({
        where: {
          id: { not: id },
          name: { equals: nameToCheck, mode: 'insensitive' },
          category_id: categoryId,
        },
      });
      if (duplicate) {
        throw new ConflictException('A brand with this name already exists in this category');
      }
    }

    let imageUrl = dto.image_url !== undefined ? dto.image_url : existing.image_url;
    if (logoFile) {
      const upload = await this.cloudinaryService.uploadImage(logoFile, 'brands');
      imageUrl = upload.secure_url;
    }

    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        category_id: dto.category_id ? categoryId : undefined,
        image_url: imageUrl,
      },
      select: BRAND_SELECT,
    });

    return serializeBrand(brand);
  }

  async remove(id: string) {
    const existing = await this.prisma.brand.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Brand not found');
    }

    await this.prisma.brand.delete({ where: { id } });
    return { message: 'Brand deleted successfully' };
  }
}
