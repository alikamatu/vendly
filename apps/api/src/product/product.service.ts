import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CloudinaryService } from '../common/cloudinary.service';
import { Prisma, Role } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { AuditLogService } from '../audit/audit-log.service';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

function normalizeTextInput(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeTags(tags: string[] = []): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawTag of tags) {
    const tag = normalizeTextInput(rawTag);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(tag);
  }

  return normalized;
}

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private paymentsService: PaymentsService,
    private auditLogs: AuditLogService,
  ) {}

  async createProduct(
    userId: string,
    dto: CreateProductDto,
    images: Express.Multer.File[],
    video?: Express.Multer.File,
  ) {
    // 1. Get seller profile
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!seller) {
      throw new NotFoundException(
        'Seller profile not found. Please create a store first.',
      );
    }

    const normalizedTitle = normalizeTextInput(dto.title);
    const normalizedTags = normalizeTags(dto.tags || []);

    const existingProduct = await this.prisma.product.findFirst({
      where: {
        seller_id: seller.id,
        title: {
          equals: normalizedTitle,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existingProduct) {
      throw new BadRequestException(
        'You already have a product with this title. Please use a different title.',
      );
    }

    if (dto.is_featured === 'true') {
      throw new BadRequestException(
        'Hot Sales requires payment. Create the product first, then initialize Hot Sales payment.',
      );
    }

    // 2. Upload images to Cloudinary (Max 3)
    if (images.length > 3) {
      throw new BadRequestException('Maximum 3 images allowed');
    }

    const image_urls: string[] = [];
    for (const file of images) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        'products',
        { quality: 'auto' },
      );
      image_urls.push(uploadResult.secure_url);
    }

    // 3. Optional short video upload (max ~5 seconds)
    let video_url: string | undefined;
    if (video) {
      // Higher size guard for videos that will be trimmed to 5s (allowing ~60MB)
      const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
      if (video.size > MAX_VIDEO_BYTES) {
        throw new BadRequestException('Product video is too large. Max 60MB.');
      }

      let videoResult: any;
      try {
        videoResult = await this.cloudinaryService.uploadVideo(
          video,
          'products',
        );
      } catch (err: any) {
        // Normalize common upload failures into a user-facing validation error
        const message = (err && err.message) || '';
        if (
          message.toLowerCase().includes('file size too large') ||
          message.toLowerCase().includes('timeout')
        ) {
          throw new BadRequestException(
            'Product video is too large or processing failed. Max 60MB.',
          );
        }
        throw err;
      }

      video_url = videoResult.secure_url;
    }

    // 5. Parse attributes if provided
    let parsedAttributes = {};
    if (dto.attributes) {
      try {
        parsedAttributes =
          typeof dto.attributes === 'string'
            ? JSON.parse(dto.attributes)
            : dto.attributes;
      } catch (err) {
        console.warn('Failed to parse product attributes', err);
      }
    }

    // 6. Validate & normalize original_price
    let originalPriceCreate: Decimal | null | undefined = undefined;
    if (dto.original_price !== undefined) {
      if (dto.original_price === '' || dto.original_price === null) {
        originalPriceCreate = null;
      } else {
        const op = new Decimal(dto.original_price);
        const pr = new Decimal(dto.price);
        if (op.lessThanOrEqualTo(pr)) {
          throw new BadRequestException(
            'original_price must be greater than price',
          );
        }
        originalPriceCreate = op;
      }
    }

    // 7. Create product
    const product = await this.prisma.product.create({
      data: {
        seller_id: seller.id,
        title: normalizedTitle,
        description: dto.description,
        price: new Decimal(dto.price) as any,
        original_price: originalPriceCreate as any,
        currency: dto.currency || 'GHS',
        condition: dto.condition || 'new',
        quantity_available: dto.quantity_available
          ? parseInt(dto.quantity_available, 10)
          : 1,
        status: dto.status || 'draft',
        category: dto.category,
        brand: dto.brand,
        image_urls,
        video_url,
        tags: normalizedTags,
        is_featured: false,
        attributes: parsedAttributes,
      } as any,
    });

    this.auditLogs.record({
      actorId: userId,
      actorRole: Role.SELLER,
      action: 'product.create',
      entityType: 'product',
      entityId: (product as any).id.toString(),
      after: {
        title: (product as any).title,
        price: (product as any).price.toString(),
        status: (product as any).status,
      },
      metadata: { seller_id: seller.id },
    });

    return {
      message: 'Product created successfully',
      product: {
        id: (product as any).id.toString(),
        title: (product as any).title,
        price: (product as any).price.toString(),
        image_urls: (product as any).image_urls,
      },
    };
  }

  async getProducts(
    params: {
      page?: number;
      limit?: number;
      category?: string;
      sellerId?: string | string;
      status?: string;
      minDiscount?: number;
      search?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      condition?: string;
      hasVideo?: boolean;
      inStock?: boolean;
      isFeatured?: boolean;
      region?: string;
      cityId?: string;
      serviceArea?: 'SAME_CITY' | 'NEARBY_STATES' | 'NATIONWIDE';
      avgDeliveryTime?:
        | 'SAME_DAY'
        | 'NEXT_DAY'
        | 'TWO_TO_THREE_DAYS'
        | 'FOUR_TO_SEVEN_DAYS'
        | 'MORE_THAN_ONE_WEEK';
      sort?:
        | 'newest'
        | 'oldest'
        | 'price_asc'
        | 'price_desc'
        | 'popular'
        | 'discount_desc';
    } = {},
  ) {
    const {
      page = 1,
      limit = 20,
      category,
      sellerId,
      status,
      search,
      brand,
      minPrice,
      maxPrice,
      condition,
      hasVideo,
      inStock,
      isFeatured,
      region,
      cityId,
      serviceArea,
      avgDeliveryTime,
      sort = 'newest',
    } = params;
    let { minDiscount } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(category && { category }),
      ...(sellerId && { seller_id: sellerId }),
      ...(status
        ? { status }
        : { status: { in: ['published', 'active', 'draft'] } }),
      ...(brand && { brand }),
      ...(condition && { condition }),
      ...(hasVideo === true && { video_url: { not: null } }),
      ...(inStock === true && { quantity_available: { gt: 0 } }),
      ...(typeof isFeatured === 'boolean' && { is_featured: isFeatured }),
    };

    // Seller-scoped filters (region, city, service area, delivery time)
    const sellerFilter: Prisma.SellerProfileWhereInput = {};
    if (cityId) {
      sellerFilter.location_id = cityId;
    }
    if (region) {
      sellerFilter.structured_location = { region };
    }
    if (serviceArea) {
      sellerFilter.service_area = serviceArea as any;
    }
    if (avgDeliveryTime) {
      sellerFilter.avg_delivery_time = avgDeliveryTime as any;
    }
    if (Object.keys(sellerFilter).length > 0) {
      where.seller = sellerFilter;
    }

    if (typeof minPrice === 'number' || typeof maxPrice === 'number') {
      const priceFilter: Prisma.DecimalFilter = {};
      if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) {
        priceFilter.gte = new Decimal(minPrice) as any;
      }
      if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) {
        priceFilter.lte = new Decimal(maxPrice) as any;
      }
      if (Object.keys(priceFilter).length > 0) {
        where.price = priceFilter;
      }
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      const tokens = term
        .split(/\s+/)
        .map((t) => t.toLowerCase())
        .filter(Boolean);
      const or: Prisma.ProductWhereInput[] = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term.toLowerCase() } },
      ];
      if (tokens.length > 0) {
        or.push({ tags: { hasSome: tokens } });
      }
      where.OR = or;
    }

    if (sort === 'discount_desc') {
      const threshold =
        typeof minDiscount === 'number' && !Number.isNaN(minDiscount)
          ? Math.max(minDiscount, 0.01)
          : 0.01;
      minDiscount = threshold;
    }

    const hasDiscountFilter =
      typeof minDiscount === 'number' &&
      !Number.isNaN(minDiscount) &&
      minDiscount > 0;

    if (hasDiscountFilter) {
      const allMatching = await this.prisma.product.findMany({
        where: { ...where, original_price: { not: null } },
        include: {
          seller: {
            select: {
              store_name: true,
              logo_url: true,
              store_link: true,
            },
          },
        },
        orderBy: this.resolveOrderBy(sort === 'discount_desc' ? 'newest' : sort),
      });

      const withPct = allMatching
        .map((p) => {
          if (!p.original_price) return null;
          const op = Number(p.original_price);
          const pr = Number(p.price);
          if (op <= 0 || op <= pr) return null;
          const pct = ((op - pr) / op) * 100;
          return { product: p, pct };
        })
        .filter(
          (entry): entry is { product: (typeof allMatching)[number]; pct: number } =>
            entry !== null && entry.pct >= (minDiscount as number),
        );

      if (sort === 'discount_desc') {
        withPct.sort((a, b) => b.pct - a.pct);
      }

      const total = withPct.length;
      const data = withPct.slice(skip, skip + limit).map((e) => e.product);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          seller: {
            select: {
              store_name: true,
              logo_url: true,
              store_link: true,
            },
          },
        },
        orderBy: this.resolveOrderBy(sort),
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private resolveOrderBy(
    sort:
      | 'newest'
      | 'oldest'
      | 'price_asc'
      | 'price_desc'
      | 'popular'
      | 'discount_desc'
      | undefined,
  ): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'oldest':
        return { created_at: 'asc' };
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'popular':
        return { views_count: 'desc' };
      case 'newest':
      case 'discount_desc':
      default:
        return { created_at: 'desc' };
    }
  }

  async getRecentProducts() {
    return this.prisma.product.findMany({
      where: { status: 'active' },
      include: {
        seller: {
          select: {
            store_name: true,
            logo_url: true,
            store_link: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  }

  async getProductById(id: string) {
    const product: any = await (this.prisma.product as any).findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            // Needed by the seller dashboard's ownership check on the
            // manage page (/dashboard/products/[id]).
            user_id: true,
            store_name: true,
            logo_url: true,
            store_link: true,
            bio: true,
            location: true,
            service_area: true,
            avg_delivery_time: true,
            user: {
              select: {
                is_pro: true,
                pro_expires_at: true,
                is_verified: true,
                created_at: true,
              },
            },
          },
        },
        variants: {
          where: { is_active: true },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Bump views_count fire-and-forget (don't block the response)
    this.prisma.product
      .update({ where: { id }, data: { views_count: { increment: 1 } } })
      .catch(() => undefined);

    // Compute derived Pro flag (active subscription)
    const now = new Date();
    const proExpires = product.seller?.user?.pro_expires_at;
    const sellerIsPro =
      !!product.seller?.user?.is_pro && (!proExpires || proExpires > now);

    return {
      ...product,
      seller: product.seller
        ? {
            ...product.seller,
            is_pro: sellerIsPro,
            is_verified: product.seller.user?.is_verified ?? false,
          }
        : product.seller,
    };
  }

  async getProductsByStoreLink(link: string) {
    return this.prisma.product.findMany({
      where: {
        seller: {
          store_link: link,
        },
      },
      include: {
        seller: {
          select: {
            store_name: true,
            logo_url: true,
            store_link: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async getCategories() {
    return this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        image_url: true,
        fields: true,
      },
    });
  }

  async getProductsBySeller(userId: string) {
    return this.prisma.product.findMany({
      where: {
        seller: {
          user_id: userId,
        },
      },
      include: {
        seller: {
          select: {
            store_name: true,
            logo_url: true,
            store_link: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async updateProduct(
    userId: string,
    id: string,
    dto: UpdateProductDto,
    images: Express.Multer.File[],
    video?: Express.Multer.File,
  ) {
    // 1. Get product and check ownership
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.seller.user_id !== userId) {
      throw new BadRequestException(
        'You do not have permission to update this product',
      );
    }

    const normalizedTitle = dto.title
      ? normalizeTextInput(dto.title)
      : undefined;
    const normalizedTags = dto.tags ? normalizeTags(dto.tags) : undefined;

    if (normalizedTitle) {
      const conflictingProduct = await this.prisma.product.findFirst({
        where: {
          seller_id: product.seller_id,
          id: { not: id },
          title: {
            equals: normalizedTitle,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      if (conflictingProduct) {
        throw new BadRequestException(
          'You already have another product with this title.',
        );
      }
    }

    if (dto.is_featured === 'true') {
      throw new BadRequestException(
        'Hot Sales requires payment. Use the Hot Sales payment flow from product management.',
      );
    }

    // 2. Handle images
    const image_urls = dto.existing_images || product.image_urls || [];

    if (images && images.length > 0) {
      if (image_urls.length + images.length > 3) {
        throw new BadRequestException('Maximum 3 images allowed');
      }

      for (const file of images) {
        const uploadResult = await this.cloudinaryService.uploadImage(
          file,
          'products',
          { quality: 'auto' },
        );
        image_urls.push(uploadResult.secure_url);
      }
    }

    // 3. Handle video
    let video_url = product.video_url;
    if (video) {
      const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
      if (video.size > MAX_VIDEO_BYTES) {
        throw new BadRequestException('Product video is too large. Max 60MB.');
      }

      try {
        const videoResult = await this.cloudinaryService.uploadVideo(
          video,
          'products',
        );
        video_url = videoResult.secure_url;
      } catch (err: any) {
        throw new BadRequestException('Failed to upload product video.');
      }
    }

    // 4. Parse attributes
    let parsedAttributes = product.attributes;
    if (dto.attributes) {
      try {
        parsedAttributes =
          typeof dto.attributes === 'string'
            ? JSON.parse(dto.attributes)
            : dto.attributes;
      } catch (err) {
        console.warn('Failed to parse product attributes', err);
      }
    }

    // 5. Validate & normalize original_price for update
    let originalPriceUpdate: Decimal | null | undefined = undefined;
    if (dto.original_price !== undefined) {
      if (dto.original_price === '' || dto.original_price === null) {
        originalPriceUpdate = null;
      } else {
        const op = new Decimal(dto.original_price);
        const pr = dto.price ? new Decimal(dto.price) : product.price;
        if (op.lessThanOrEqualTo(pr)) {
          throw new BadRequestException(
            'original_price must be greater than price',
          );
        }
        originalPriceUpdate = op;
      }
    }

    // 6. Update product
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        title: normalizedTitle,
        description: dto.description,
        price: dto.price ? new Decimal(dto.price) : undefined,
        original_price: originalPriceUpdate as any,
        currency: dto.currency,
        condition: dto.condition,
        quantity_available: dto.quantity_available
          ? parseInt(dto.quantity_available, 10)
          : undefined,
        status: dto.status,
        category: dto.category,
        brand: dto.brand,
        image_urls,
        video_url,
        tags: normalizedTags,
        is_featured:
          dto.is_featured !== undefined
            ? dto.is_featured === 'true'
            : undefined,
        attributes: parsedAttributes as Prisma.InputJsonValue,
      },
    });

    this.auditLogs.record({
      actorId: userId,
      actorRole: Role.SELLER,
      action: 'product.update',
      entityType: 'product',
      entityId: id,
      before: {
        title: product.title,
        price: product.price.toString(),
        status: product.status,
        quantity_available: product.quantity_available,
      },
      after: {
        title: updatedProduct.title,
        price: updatedProduct.price.toString(),
        status: updatedProduct.status,
        quantity_available: updatedProduct.quantity_available,
      },
    });

    return {
      message: 'Product updated successfully',
      product: {
        id: updatedProduct.id.toString(),
        title: updatedProduct.title,
        price: updatedProduct.price.toString(),
      },
    };
  }

  /**
   * Clone a product. The copy is created as a draft with " (Copy)"
   * appended to the title (and "(Copy 2)", "(Copy 3)" etc. if the seller
   * keeps duplicating). Variants are intentionally NOT copied — duplicated
   * products are meant to be tweaked, and most sellers want a clean slate
   * for SKUs / stock.
   */
  async duplicateProduct(userId: string, id: string) {
    const source: any = await (this.prisma.product as any).findUnique({
      where: { id },
      include: { seller: true },
    });
    if (!source) throw new NotFoundException('Product not found');
    if (source.seller.user_id !== userId) {
      throw new BadRequestException(
        'You do not have permission to duplicate this product',
      );
    }

    // Generate a non-colliding "(Copy N)" title.
    const baseTitle = source.title.replace(/\s*\(Copy(?:\s+\d+)?\)\s*$/i, '');
    let nextTitle = `${baseTitle} (Copy)`;
    let n = 2;
    // Cap the loop just in case.
    while (
      (await this.prisma.product.findFirst({
        where: {
          seller_id: source.seller_id,
          title: { equals: nextTitle, mode: 'insensitive' },
        },
        select: { id: true },
      })) &&
      n < 50
    ) {
      nextTitle = `${baseTitle} (Copy ${n})`;
      n++;
    }

    const copy = await (this.prisma.product as any).create({
      data: {
        seller_id: source.seller_id,
        title: nextTitle,
        description: source.description,
        price: source.price,
        original_price: source.original_price,
        currency: source.currency,
        condition: source.condition,
        quantity_available: source.quantity_available,
        // Always draft so the seller reviews before going live.
        status: 'draft',
        category: source.category,
        brand: source.brand,
        image_urls: source.image_urls || [],
        video_url: source.video_url,
        tags: source.tags || [],
        is_featured: false,
        attributes: source.attributes || {},
      },
    });

    return {
      message: 'Product duplicated as draft. Edit it before publishing.',
      product: {
        id: copy.id.toString(),
        title: copy.title,
      },
    };
  }

  async deleteProduct(userId: string, id: string) {
    // 1. Get product and check ownership
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.seller.user_id !== userId) {
      throw new BadRequestException(
        'You do not have permission to delete this product',
      );
    }

    // 2. Delete product
    await this.prisma.product.delete({
      where: { id },
    });

    this.auditLogs.record({
      actorId: userId,
      actorRole: Role.SELLER,
      action: 'product.delete',
      entityType: 'product',
      entityId: id,
      before: {
        title: product.title,
        status: product.status,
        seller_id: product.seller_id,
      },
    });

    return { message: 'Product deleted successfully' };
  }

  async toggleHotSales(userId: string, id: string, isFeatured: boolean) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.seller.user_id !== userId) {
      throw new BadRequestException(
        'You do not have permission to update this product',
      );
    }

    if (isFeatured && product.is_featured) {
      return {
        message: 'Hot Sales already enabled for this product',
        product: {
          id: product.id.toString(),
          is_featured: true,
        },
      };
    }

    if (isFeatured) {
      const paidPromotion = await this.prisma.productPromotionPayment.findFirst(
        {
          where: {
            seller_id: product.seller_id,
            product_id: product.id,
            status: 'SUCCESS',
          },
          orderBy: { paid_at: 'desc' },
        },
      );

      if (!paidPromotion) {
        throw new BadRequestException(
          'Payment is required before enabling Hot Sales for this product.',
        );
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: { is_featured: isFeatured },
      select: { id: true, is_featured: true },
    });

    return {
      message: isFeatured
        ? 'Hot Sales enabled successfully'
        : 'Hot Sales disabled successfully',
      product: {
        id: updatedProduct.id.toString(),
        is_featured: updatedProduct.is_featured,
      },
    };
  }

  async initializeHotSalesPayment(userId: string, productId: string) {
    return this.initializePromotionPayment(userId, productId, 'BOOST');
  }

  async initializePromotionPayment(
    userId: string,
    productId: string,
    category: 'BOOST' | 'PLAN' | string = 'BOOST',
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.seller.user_id !== userId) {
      throw new BadRequestException(
        'You do not have permission to initialize payment for this product',
      );
    }

    if (product.is_featured) {
      throw new BadRequestException('Product is already in Hot Sales');
    }

    const successfulPayment =
      await this.prisma.productPromotionPayment.findFirst({
        where: {
          seller_id: product.seller_id,
          product_id: product.id,
          status: 'SUCCESS',
        },
        orderBy: { paid_at: 'desc' },
      });

    if (successfulPayment) {
      throw new BadRequestException(
        'This product has already been paid for Hot Sales. You can enable it directly.',
      );
    }

    const normalizedCategory = category === 'PLAN' ? 'PLAN' : 'BOOST';
    const fee =
      normalizedCategory === 'PLAN'
        ? Number(process.env.PROMOTION_PLAN_FEE_GHS || 25)
        : Number(process.env.HOT_SALES_FEE_GHS || 7);
    if (!Number.isFinite(fee) || fee <= 0) {
      throw new BadRequestException('Promotion fee configuration is invalid');
    }

    const reference = `hotsales_${productId.toString()}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const webBaseUrl =
      process.env.WEB_APP_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const callbackUrl = `${webBaseUrl}/dashboard/products?hot_sale_payment=1&reference=${reference}&product_id=${productId.toString()}`;

    await this.prisma.productPromotionPayment.create({
      data: {
        seller_id: product.seller_id,
        product_id: product.id,
        reference,
        category: normalizedCategory,
        amount: new Decimal(fee) as any,
        currency: 'GHS',
        status: 'PENDING',
      } as any,
    });

    const initRes = await this.paymentsService.initializeTransaction({
      email: product.seller.user.email,
      amount: fee,
      reference,
      callbackUrl,
    });

    return {
      message: `${normalizedCategory} payment initialized`,
      reference,
      amount: fee,
      category: normalizedCategory,
      checkout_url: initRes?.data?.authorization_url || null,
      access_code: initRes?.data?.access_code || null,
    };
  }

  async verifyHotSalesPayment(
    userId: string,
    reference: string,
    productId: string,
  ) {
    return this.verifyPromotionPayment(userId, reference, productId);
  }

  async verifyPromotionPayment(
    userId: string,
    reference: string,
    productId: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.seller.user_id !== userId) {
      throw new BadRequestException(
        'You do not have permission to verify payment for this product',
      );
    }

    if (!reference) {
      throw new BadRequestException('Payment reference is required');
    }

    await this.paymentsService.verifyTransaction(reference);

    const promotionPayment =
      await this.prisma.productPromotionPayment.findFirst({
        where: {
          reference,
          product_id: product.id,
          seller_id: product.seller_id,
        },
        orderBy: { created_at: 'desc' },
      });

    return {
      verified: promotionPayment?.status === 'SUCCESS',
      status: promotionPayment?.status || 'PENDING',
      category: promotionPayment?.category || 'BOOST',
      is_featured: Boolean(
        (
          await this.prisma.product.findUnique({
            where: { id: product.id },
            select: { is_featured: true },
          })
        )?.is_featured,
      ),
    };
  }

  async getPromotionPaymentsHistory(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    return this.prisma.productPromotionPayment.findMany({
      where: { seller_id: seller.id },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            is_featured: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async searchProducts(query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchLower = query.toLowerCase();

    // Simple autocomplete/suggestion search
    return this.prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: searchLower, mode: 'insensitive' } },
          { description: { contains: searchLower, mode: 'insensitive' } },
          { category: { contains: searchLower, mode: 'insensitive' } },
          {
            seller: {
              store_name: { contains: searchLower, mode: 'insensitive' },
            },
          },
          { tags: { has: searchLower } },
        ],
        status: { in: ['published', 'active', 'draft'] }, // Include drafts for testing/flexibility
      },
      include: {
        seller: {
          select: {
            store_name: true,
            store_link: true,
          },
        },
      },
      take: 20, // Limit suggestions
    });
  }

  /**
   * Bulk-import products from a CSV buffer. Sellers create products without
   * media; images are added later via the edit page. Returns row-level
   * results so the UI can show what landed and what was rejected.
   *
   * Expected columns (header row required):
   *   title, price, original_price, currency, condition,
   *   quantity_available, category, brand, tags, description, status
   * `tags` is pipe-separated (e.g. "red|cotton|summer").
   */
  async bulkImportFromCsv(userId: string, csvBuffer: Buffer) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found.');
    }

    const text = csvBuffer.toString('utf8').replace(/^﻿/, '');
    const rows = parseCsv(text);
    if (rows.length < 2) {
      throw new BadRequestException(
        'CSV must contain a header row and at least one product row.',
      );
    }

    const header = rows[0].map((c) => c.trim().toLowerCase());
    const REQUIRED = ['title', 'price', 'category'];
    const missing = REQUIRED.filter((c) => !header.includes(c));
    if (missing.length) {
      throw new BadRequestException(
        `CSV is missing required columns: ${missing.join(', ')}`,
      );
    }
    const idx = (name: string) => header.indexOf(name);

    const results: Array<{
      row: number;
      ok: boolean;
      productId?: string;
      title?: string;
      error?: string;
    }> = [];
    const seenTitles = new Set<string>();
    let created = 0;
    let failed = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.every((c) => !c || !c.trim())) continue; // skip blank rows
      const rowNum = r + 1; // header is row 1 in human-counted CSVs

      try {
        const title = normalizeTextInput(row[idx('title')] || '');
        if (!title) throw new Error('title is required');
        const priceStr = (row[idx('price')] || '').trim();
        if (!priceStr) throw new Error('price is required');
        const price = new Decimal(priceStr);
        if (price.lessThanOrEqualTo(0)) throw new Error('price must be > 0');

        const category = (row[idx('category')] || '').trim();
        if (!category) throw new Error('category is required');

        if (seenTitles.has(title.toLowerCase())) {
          throw new Error('duplicate title within the CSV');
        }
        seenTitles.add(title.toLowerCase());

        const existing = await this.prisma.product.findFirst({
          where: {
            seller_id: seller.id,
            title: { equals: title, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (existing) throw new Error('product with this title already exists');

        const originalPriceStr =
          idx('original_price') >= 0
            ? (row[idx('original_price')] || '').trim()
            : '';
        let originalPrice: Decimal | null = null;
        if (originalPriceStr) {
          const op = new Decimal(originalPriceStr);
          if (op.lessThanOrEqualTo(price)) {
            throw new Error('original_price must be greater than price');
          }
          originalPrice = op;
        }

        const tagsRaw =
          idx('tags') >= 0 ? (row[idx('tags')] || '').trim() : '';
        const tags = normalizeTags(
          tagsRaw ? tagsRaw.split(/[|;]/).map((s) => s) : [],
        );

        const qty =
          idx('quantity_available') >= 0
            ? parseInt(row[idx('quantity_available')] || '1', 10)
            : 1;

        const product = await this.prisma.product.create({
          data: {
            seller_id: seller.id,
            title,
            description:
              idx('description') >= 0
                ? (row[idx('description')] || '').trim() || null
                : null,
            price: price as any,
            original_price: originalPrice as any,
            currency:
              (idx('currency') >= 0 && (row[idx('currency')] || '').trim()) ||
              'GHS',
            condition:
              (idx('condition') >= 0 && (row[idx('condition')] || '').trim()) ||
              'new',
            quantity_available: isNaN(qty) || qty < 0 ? 1 : qty,
            status:
              (idx('status') >= 0 && (row[idx('status')] || '').trim()) ||
              'draft',
            category,
            brand:
              idx('brand') >= 0 ? (row[idx('brand')] || '').trim() || null : null,
            image_urls: [],
            tags,
            is_featured: false,
            attributes: {},
          } as any,
        });

        results.push({
          row: rowNum,
          ok: true,
          productId: (product as any).id.toString(),
          title,
        });
        created++;
      } catch (err: any) {
        results.push({
          row: rowNum,
          ok: false,
          error: err?.message || 'Unknown error',
        });
        failed++;
      }
    }

    return {
      summary: { created, failed, total: created + failed },
      results,
    };
  }
}

/**
 * Minimal RFC-4180-ish CSV parser. Handles double-quoted fields, escaped
 * quotes (""), commas inside quotes, and \r\n / \n line endings. No external
 * dependency.
 */
function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];

    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      // handle \r\n
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  // last field / row (no trailing newline)
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
