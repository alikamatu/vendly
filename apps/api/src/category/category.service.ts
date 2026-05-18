import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  description: true,
  image_url: true,
  fields: true,
  created_at: true,
  updated_at: true,
} as const;

function serializeCategory<T extends { id: string }>(category: T) {
  return { ...category, id: category.id.toString() };
}

function slugifyKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeFields(fields: any[] | undefined): any[] {
  if (!fields) return [];
  return fields.map((f) => {
    const { name, key, ...rest } = f || {};
    const resolvedKey = (key || name || slugifyKey(rest.label || '')) as string;
    return { ...rest, key: resolvedKey };
  });
}

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.category.findMany({
      select: CATEGORY_SELECT,
      orderBy: { name: 'asc' },
    });
    return categories.map(serializeCategory);
  }

  async getById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: CATEGORY_SELECT,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return serializeCategory(category);
  }

  async create(dto: CreateCategoryDto) {
    try {
      const category = await this.prisma.category.create({
        data: {
          name: dto.name,
          description: dto.description,
          image_url: dto.image_url,
          fields: normalizeFields(dto.fields ?? []) as unknown as Prisma.InputJsonValue,
        },
        select: CATEGORY_SELECT,
      });
      return serializeCategory(category);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Category name already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.getById(id);
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          image_url: dto.image_url,
          fields:
            dto.fields !== undefined
              ? (normalizeFields(dto.fields) as unknown as Prisma.InputJsonValue)
              : undefined,
        },
        select: CATEGORY_SELECT,
      });
      return serializeCategory(category);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Category name already exists');
      }
      throw err;
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const productCount = await this.prisma.product.count({
      where: { category: existing.name },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${productCount} product(s) reference it`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}
