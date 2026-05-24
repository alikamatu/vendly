import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, AuditLogService } from '../audit/audit-log.service';
import {
  AdminBulkAction,
  AdminBulkActionDto,
  AdminFeatureDto,
  AdminProductListQueryDto,
  AdminProductStatus,
  AdminUpdateProductDto,
  AdminUpdateStatusDto,
} from './dto/admin-product.dto';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

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

  async update(id: string, dto: AdminUpdateProductDto) {
    const existing = await this.getById(id);

    let originalPriceUpdate: Decimal | null | undefined = undefined;
    if (dto.original_price !== undefined) {
      if (dto.original_price === null || dto.original_price === '') {
        originalPriceUpdate = null;
      } else {
        const op = new Decimal(dto.original_price);
        const pr = dto.price ? new Decimal(dto.price) : existing.price;
        if (op.lessThanOrEqualTo(pr)) {
          throw new BadRequestException(
            'original_price must be greater than price',
          );
        }
        originalPriceUpdate = op;
      }
    }

    const data: Prisma.ProductUpdateInput = {
      title: dto.title,
      description: dto.description,
      price: dto.price ? (new Decimal(dto.price) as any) : undefined,
      original_price: originalPriceUpdate as any,
      currency: dto.currency,
      condition: dto.condition,
      quantity_available: dto.quantity_available,
      status: dto.status,
      is_featured: dto.is_featured,
      category: dto.category,
      attributes:
        dto.attributes !== undefined
          ? (dto.attributes as Prisma.InputJsonValue)
          : undefined,
      image_urls: dto.image_urls,
      video_url: dto.video_url,
      tags: dto.tags,
    };
    return this.prisma.product.update({
      where: { id },
      data,
      include: SELLER_INCLUDE,
    });
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

  async remove(id: string, actor: Actor) {
    const before = await this.getById(id);

    const orderItemCount = await this.prisma.orderItem.count({
      where: { product_id: id },
    });
    if (orderItemCount > 0) {
      throw new BadRequestException('Product has orders; archive instead');
    }

    await this.prisma.$transaction([
      this.prisma.favorite.deleteMany({ where: { product_id: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'product.delete',
      entityType: 'product',
      entityId: id,
      before: {
        title: before.title,
        status: before.status,
        seller_id: before.seller_id,
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { message: 'Product deleted successfully' };
  }

  async bulk(dto: AdminBulkActionDto, actor: Actor) {
    const ids = dto.ids.map((id) => id);

    if (dto.action === AdminBulkAction.DELETE) {
      const blocked = await this.prisma.orderItem.findMany({
        where: { product_id: { in: ids } },
        select: { product_id: true },
        distinct: ['product_id'],
      });
      if (blocked.length > 0) {
        throw new BadRequestException(
          `Cannot delete: ${blocked.length} product(s) have orders`,
        );
      }
      const result = await this.prisma.$transaction([
        this.prisma.favorite.deleteMany({ where: { product_id: { in: ids } } }),
        this.prisma.product.deleteMany({ where: { id: { in: ids } } }),
      ]);
      this.auditBulk(actor, 'delete', ids);
      return { updated: result[1].count };
    }

    if (dto.action === AdminBulkAction.STATUS) {
      const value = dto.value;
      if (
        typeof value !== 'string' ||
        !Object.values(AdminProductStatus).includes(value as AdminProductStatus)
      ) {
        throw new BadRequestException('Invalid status value');
      }
      const result = await this.prisma.$transaction([
        this.prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { status: value },
        }),
      ]);
      this.auditBulk(actor, 'status_change', ids, { status: value });
      return { updated: result[0].count };
    }

    if (dto.action === AdminBulkAction.FEATURE) {
      if (typeof dto.value !== 'boolean') {
        throw new BadRequestException('Feature action requires boolean value');
      }
      const result = await this.prisma.$transaction([
        this.prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { is_featured: dto.value },
        }),
      ]);
      this.auditBulk(actor, dto.value ? 'feature' : 'unfeature', ids);
      return { updated: result[0].count };
    }

    throw new BadRequestException('Unknown bulk action');
  }

  /** Internal helper. Bulk operations don't currently audit per-row to keep
   *  table volume reasonable — we log one row per bulk call instead. */
  private auditBulk(actor: Actor, action: string, ids: string[], extra?: any) {
    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: `product.bulk_${action}`,
      entityType: 'product',
      entityId: null,
      metadata: { ids, count: ids.length, ...extra },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  }
}
