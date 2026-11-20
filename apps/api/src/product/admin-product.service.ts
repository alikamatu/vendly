import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, AuditLogService } from '../audit/audit-log.service';
import {
  AdminFeatureDto,
  AdminProductListQueryDto,
  AdminUpdateStatusDto,
} from './dto/admin-product.dto';

const SELLER_INCLUDE = {
  seller: {
    select: {
      id: true,
      store_name: true,
      store_link: true,
    },
  },
} as const;

@Injectable()
export class AdminProductService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogService,
  ) {}

  async list(query: AdminProductListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.seller_id) where.seller_id = query.seller_id;
    if (query.is_featured !== undefined) where.is_featured = query.is_featured;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { tags: { has: query.search } },
      ];
    }

    const hasDiscountFilter =
      typeof query.min_discount === 'number' &&
      !Number.isNaN(query.min_discount) &&
      query.min_discount > 0;

    if (hasDiscountFilter) {
      const allMatching = await this.prisma.product.findMany({
        where: { ...where, original_price: { not: null } },
        include: SELLER_INCLUDE,
        orderBy: { created_at: 'desc' },
      });

      const filtered = allMatching.filter((p) => {
        if (!p.original_price) return false;
        const op = Number(p.original_price);
        const pr = Number(p.price);
        if (op <= 0 || op <= pr) return false;
        const pct = ((op - pr) / op) * 100;
        return pct >= (query.min_discount as number);
      });

      const total = filtered.length;
      const data = filtered.slice(skip, skip + limit);
      return { data, total, page, limit };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: SELLER_INCLUDE,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: SELLER_INCLUDE,
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async updateStatus(id: string, dto: AdminUpdateStatusDto, actor: Actor) {
    const before = await this.getById(id);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
      include: SELLER_INCLUDE,
    });
    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'product.status_change',
      entityType: 'product',
      entityId: id,
      reason: dto.reason,
      before: { status: before.status },
      after: { status: dto.status },
      metadata: { seller_id: before.seller_id, title: before.title },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return updated;
  }

  async setFeatured(id: string, dto: AdminFeatureDto, actor: Actor) {
    const before = await this.getById(id);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { is_featured: dto.is_featured },
      include: SELLER_INCLUDE,
    });
    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: dto.is_featured ? 'product.feature' : 'product.unfeature',
      entityType: 'product',
      entityId: id,
      before: { is_featured: before.is_featured },
      after: { is_featured: dto.is_featured },
      metadata: { seller_id: before.seller_id, title: before.title },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return updated;
  }
}
