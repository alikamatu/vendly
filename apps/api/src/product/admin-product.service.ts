import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, AuditLogService } from '../audit/audit-log.service';
import { CloudinaryService } from '../common/cloudinary.service';
import {
  AdminBulkAction,
  AdminBulkActionDto,
  AdminCreateProductDto,
  AdminFeatureDto,
  AdminProductListQueryDto,
  AdminProductStatus,
  AdminUpdateProductDto,
  AdminUpdateStatusDto,
  AdminUpdateStockDto,
} from './dto/admin-product.dto';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

const PRODUCT_ADMIN_INCLUDE = {
  seller: {
    select: {
      id: true,
      store_name: true,
      store_link: true,
      logo_url: true,
      is_seller_verified: true,
      user: {
        select: {
          id: true,
          full_name: true,
          email: true,
        },
      },
    },
  },
  _count: {
    select: {
      order_items: true,
      reviews: true,
      reports: true,
      favorited_by: true,
      variants: true,
    },
  },
} as const;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class AdminProductService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogService,
    private cloudinary: CloudinaryService,
  ) {}

  async list(query: AdminProductListQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(500, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (query.status && query.status !== 'ALL') {
      where.status = query.status.toLowerCase();
    }
    if (query.category && query.category !== 'ALL') {
      where.category = query.category;
    }
    if (query.seller_id && query.seller_id !== 'ALL') {
      where.seller_id = query.seller_id;
    }
    if (query.is_featured !== undefined) {
      where.is_featured = query.is_featured;
    }
    if (query.stock === 'out_of_stock') {
      where.quantity_available = { lte: 0 };
    } else if (query.stock === 'low_stock') {
      where.quantity_available = { gt: 0, lte: 5 };
    } else if (query.stock === 'in_stock') {
      where.quantity_available = { gt: 0 };
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      const orClauses: Prisma.ProductWhereInput[] = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
        { seller: { store_name: { contains: q, mode: 'insensitive' } } },
        {
          seller: {
            user: { email: { contains: q, mode: 'insensitive' } },
          },
        },
      ];
      if (UUID_REGEX.test(q)) {
        orClauses.push({ id: q });
      }
      where.OR = orClauses;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (query.sort) {
        case 'oldest':
          return { created_at: 'asc' };
        case 'price_asc':
          return { price: 'asc' };
        case 'price_desc':
          return { price: 'desc' };
        case 'views_desc':
          return { views_count: 'desc' };
        case 'stock_asc':
          return { quantity_available: 'asc' };
        case 'title_asc':
          return { title: 'asc' };
        case 'newest':
        default:
          return { created_at: 'desc' };
      }
    })();

    const [summary, categoriesRaw] = await Promise.all([
      this.getSummary(),
      this.prisma.product.findMany({
        select: { category: true },
        distinct: ['category'],
        orderBy: { category: 'asc' },
      }),
    ]);
    const categories = categoriesRaw
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c));

    const hasDiscountFilter =
      typeof query.min_discount === 'number' &&
      !Number.isNaN(query.min_discount) &&
      query.min_discount > 0;

    if (hasDiscountFilter) {
      const allMatching = await this.prisma.product.findMany({
        where: { ...where, original_price: { not: null } },
        include: PRODUCT_ADMIN_INCLUDE,
        orderBy,
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
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        summary,
        categories,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_ADMIN_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary,
      categories,
    };
  }

  async getSummary() {
    const [
      total,
      active,
      draft,
      archived,
      rejected,
      featured,
      outOfStock,
      lowStock,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'active' } }),
      this.prisma.product.count({ where: { status: 'draft' } }),
      this.prisma.product.count({ where: { status: 'archived' } }),
      this.prisma.product.count({ where: { status: 'rejected' } }),
      this.prisma.product.count({ where: { is_featured: true } }),
      this.prisma.product.count({ where: { quantity_available: { lte: 0 } } }),
      this.prisma.product.count({
        where: { quantity_available: { gt: 0, lte: 5 } },
      }),
    ]);

    return {
      total,
      active,
      draft,
      archived,
      rejected,
      featured,
      out_of_stock: outOfStock,
      low_stock: lowStock,
    };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        ...PRODUCT_ADMIN_INCLUDE,
        variants: true,
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: AdminCreateProductDto, actor: Actor) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: dto.seller_id },
    });
    if (!seller) {
      throw new NotFoundException('Target seller store not found');
    }

    const price = new Decimal(dto.price);
    if (price.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Price must be greater than 0');
    }

    let originalPrice: Decimal | null = null;
    if (
      dto.original_price !== undefined &&
      dto.original_price !== null &&
      dto.original_price !== ''
    ) {
      const op = new Decimal(dto.original_price);
      if (op.lessThanOrEqualTo(price)) {
        throw new BadRequestException(
          'original_price must be greater than price',
        );
      }
      originalPrice = op;
    }

    const created = await this.prisma.product.create({
      data: {
        seller_id: dto.seller_id,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        price: price as any,
        original_price: originalPrice as any,
        currency: (dto.currency || 'GHS').toUpperCase(),
        condition: dto.condition || 'new',
        quantity_available: dto.quantity_available ?? 1,
        status: dto.status || AdminProductStatus.ACTIVE,
        is_featured: dto.is_featured ?? false,
        category: dto.category.trim(),
        brand: dto.brand?.trim() || null,
        attributes: (dto.attributes || {}) as Prisma.InputJsonValue,
        image_urls: dto.image_urls || [],
        video_url: dto.video_url?.trim() || null,
        tags: dto.tags || [],
      },
      include: PRODUCT_ADMIN_INCLUDE,
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'product.admin_create',
      entityType: 'product',
      entityId: created.id,
      after: {
        title: created.title,
        price: created.price.toString(),
        status: created.status,
        seller_id: created.seller_id,
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return created;
  }

  async update(id: string, dto: AdminUpdateProductDto, actor: Actor) {
    const existing = await this.getById(id);

    if (dto.seller_id && dto.seller_id !== existing.seller_id) {
      const targetSeller = await this.prisma.sellerProfile.findUnique({
        where: { id: dto.seller_id },
      });
      if (!targetSeller) {
        throw new NotFoundException('Target seller store not found');
      }
    }

    const nextPrice =
      dto.price !== undefined ? new Decimal(dto.price) : existing.price;
    if (nextPrice.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Price must be greater than 0');
    }

    let originalPriceUpdate: Decimal | null | undefined = undefined;
    if (dto.original_price !== undefined) {
      if (dto.original_price === null || dto.original_price === '') {
        originalPriceUpdate = null;
      } else {
        const op = new Decimal(dto.original_price);
        if (op.lessThanOrEqualTo(nextPrice)) {
          throw new BadRequestException(
            'original_price must be greater than price',
          );
        }
        originalPriceUpdate = op;
      }
    } else if (
      dto.price !== undefined &&
      existing.original_price &&
      new Decimal(existing.original_price).lessThanOrEqualTo(nextPrice)
    ) {
      // Auto-clear stale original_price if admin raises price above it
      originalPriceUpdate = null;
    }

    const data: Prisma.ProductUpdateInput = {
      ...(dto.seller_id ? { seller: { connect: { id: dto.seller_id } } } : {}),
      title: dto.title !== undefined ? dto.title.trim() : undefined,
      description:
        dto.description !== undefined
          ? dto.description === null
            ? null
            : dto.description.trim()
          : undefined,
      price: dto.price !== undefined ? nextPrice : undefined,
      original_price: originalPriceUpdate,
      currency: dto.currency ? dto.currency.toUpperCase() : undefined,
      condition: dto.condition,
      quantity_available: dto.quantity_available,
      status: dto.status ? dto.status.toLowerCase() : undefined,
      is_featured: dto.is_featured,
      category: dto.category !== undefined ? dto.category.trim() : undefined,
      brand:
        dto.brand !== undefined
          ? dto.brand === null
            ? null
            : dto.brand.trim() || null
          : undefined,
      attributes:
        dto.attributes !== undefined
          ? (dto.attributes as Prisma.InputJsonValue)
          : undefined,
      image_urls: dto.image_urls,
      video_url:
        dto.video_url !== undefined
          ? dto.video_url === null
            ? null
            : dto.video_url.trim() || null
          : undefined,
      tags: dto.tags,
    };

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: PRODUCT_ADMIN_INCLUDE,
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'product.admin_update',
      entityType: 'product',
      entityId: id,
      reason: dto.reason,
      before: {
        title: existing.title,
        price: existing.price.toString(),
        quantity_available: existing.quantity_available,
        status: existing.status,
        category: existing.category,
        seller_id: existing.seller_id,
      },
      after: {
        title: updated.title,
        price: updated.price.toString(),
        quantity_available: updated.quantity_available,
        status: updated.status,
        category: updated.category,
        seller_id: updated.seller_id,
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async uploadMedia(id: string, files: Express.Multer.File[], actor: Actor) {
    const existing = await this.getById(id);
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const res = await this.cloudinary.uploadImage(file, 'products');
      if (res?.secure_url) {
        uploadedUrls.push(res.secure_url);
      }
    }

    const nextImages = [...(existing.image_urls || []), ...uploadedUrls];
    const updated = await this.prisma.product.update({
      where: { id },
      data: { image_urls: nextImages },
      include: PRODUCT_ADMIN_INCLUDE,
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'product.admin_upload_media',
      entityType: 'product',
      entityId: id,
      metadata: { added_count: uploadedUrls.length },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async duplicate(id: string, actor: Actor, targetSellerId?: string) {
    const existing = await this.getById(id);
    const sellerId = targetSellerId || existing.seller_id;

    if (targetSellerId) {
      const seller = await this.prisma.sellerProfile.findUnique({
        where: { id: targetSellerId },
      });
      if (!seller) {
        throw new NotFoundException('Target seller store not found');
      }
    }

    const cloned = await this.prisma.product.create({
      data: {
        seller_id: sellerId,
        title: `${existing.title} (Copy)`,
        description: existing.description,
        price: existing.price,
        original_price: existing.original_price,
        currency: existing.currency,
        condition: existing.condition,
        quantity_available: existing.quantity_available,
        status: 'draft',
        is_featured: false,
        category: existing.category,
        brand: existing.brand,
        attributes: existing.attributes || {},
        image_urls: existing.image_urls,
        video_url: existing.video_url,
        tags: existing.tags,
      },
      include: PRODUCT_ADMIN_INCLUDE,
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'product.admin_duplicate',
      entityType: 'product',
      entityId: cloned.id,
      metadata: { source_product_id: existing.id, seller_id: sellerId },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return cloned;
  }

  async updateStock(id: string, dto: AdminUpdateStockDto, actor: Actor) {
    const before = await this.getById(id);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { quantity_available: dto.quantity_available },
      include: PRODUCT_ADMIN_INCLUDE,
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'product.admin_stock_update',
      entityType: 'product',
      entityId: id,
      reason: dto.reason,
      before: { quantity_available: before.quantity_available },
      after: { quantity_available: dto.quantity_available },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  async updateStatus(id: string, dto: AdminUpdateStatusDto, actor: Actor) {
    const before = await this.getById(id);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
      include: PRODUCT_ADMIN_INCLUDE,
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

  async setFeatured(
    id: string,
    dto: Partial<AdminFeatureDto> | undefined,
    actor: Actor,
  ) {
    const before = await this.getById(id);
    const nextFeatured =
      typeof dto?.is_featured === 'boolean'
        ? dto.is_featured
        : !before.is_featured;

    const updated = await this.prisma.product.update({
      where: { id },
      data: { is_featured: nextFeatured },
      include: PRODUCT_ADMIN_INCLUDE,
    });
    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: nextFeatured ? 'product.feature' : 'product.unfeature',
      entityType: 'product',
      entityId: id,
      before: { is_featured: before.is_featured },
      after: { is_featured: nextFeatured },
      metadata: { seller_id: before.seller_id, title: before.title },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return updated;
  }

  async remove(id: string, actor: Actor, force = false) {
    const before = await this.getById(id);

    const orderItemCount = await this.prisma.orderItem.count({
      where: { product_id: id },
    });
    if (orderItemCount > 0 && !force) {
      throw new BadRequestException(
        `Product is referenced in ${orderItemCount} order item(s). Archive it instead, or use Force Delete to permanently remove it while preserving order history.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (orderItemCount > 0) {
        // Preserve item title snapshots on historical orders before unlinking
        await tx.orderItem.updateMany({
          where: { product_id: id, product_title: null },
          data: { product_title: before.title },
        });
        await tx.orderItem.updateMany({
          where: { product_id: id },
          data: { product_id: null },
        });
      }
      await tx.favorite.deleteMany({ where: { product_id: id } });
      await tx.product.delete({ where: { id } });
    });

    this.auditLogs.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: force ? 'product.force_delete' : 'product.delete',
      entityType: 'product',
      entityId: id,
      before: {
        title: before.title,
        status: before.status,
        seller_id: before.seller_id,
        had_orders: orderItemCount,
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return {
      message: force
        ? 'Product permanently deleted (order history preserved)'
        : 'Product deleted successfully',
    };
  }

  async bulk(dto: AdminBulkActionDto, actor: Actor) {
    const ids = Array.from(new Set(dto.ids));

    if (dto.action === AdminBulkAction.DELETE) {
      const blocked = await this.prisma.orderItem.findMany({
        where: { product_id: { in: ids } },
        select: { product_id: true },
        distinct: ['product_id'],
      });
      if (blocked.length > 0 && !dto.force) {
        throw new BadRequestException(
          `Cannot delete: ${blocked.length} selected product(s) have existing orders. Enable Force Delete to remove them while preserving order history.`,
        );
      }

      const deletedCount = await this.prisma.$transaction(async (tx) => {
        if (blocked.length > 0) {
          const products = await tx.product.findMany({
            where: { id: { in: ids } },
            select: { id: true, title: true },
          });
          for (const prod of products) {
            await tx.orderItem.updateMany({
              where: { product_id: prod.id, product_title: null },
              data: { product_title: prod.title },
            });
          }
          await tx.orderItem.updateMany({
            where: { product_id: { in: ids } },
            data: { product_id: null },
          });
        }
        await tx.favorite.deleteMany({ where: { product_id: { in: ids } } });
        const del = await tx.product.deleteMany({ where: { id: { in: ids } } });
        return del.count;
      });

      this.auditBulk(actor, dto.force ? 'force_delete' : 'delete', ids, {
        reason: dto.reason,
      });
      return { updated: deletedCount };
    }

    if (dto.action === AdminBulkAction.STATUS) {
      const value = dto.value;
      if (
        typeof value !== 'string' ||
        !Object.values(AdminProductStatus).includes(value as AdminProductStatus)
      ) {
        throw new BadRequestException('Invalid status value');
      }
      const result = await this.prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { status: value },
      });
      this.auditBulk(actor, 'status_change', ids, {
        status: value,
        reason: dto.reason,
      });
      return { updated: result.count };
    }

    if (dto.action === AdminBulkAction.FEATURE) {
      if (typeof dto.value !== 'boolean') {
        throw new BadRequestException('Feature action requires boolean value');
      }
      const result = await this.prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { is_featured: dto.value },
      });
      this.auditBulk(actor, dto.value ? 'feature' : 'unfeature', ids);
      return { updated: result.count };
    }

    if (dto.action === AdminBulkAction.CATEGORY) {
      if (typeof dto.value !== 'string' || !dto.value.trim()) {
        throw new BadRequestException(
          'Category bulk action requires a non-empty category name',
        );
      }
      const category = dto.value.trim();
      const result = await this.prisma.product.updateMany({
        where: { id: { in: ids } },
        data: { category },
      });
      this.auditBulk(actor, 'category_change', ids, { category });
      return { updated: result.count };
    }

    throw new BadRequestException('Unknown bulk action');
  }

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
