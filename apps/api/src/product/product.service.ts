import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CloudinaryService } from '../common/cloudinary.service';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';

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
  ) {}

  async createProduct(
    userId: bigint,
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

    // 6. Create product
    const product = await this.prisma.product.create({
      data: {
        seller_id: seller.id,
        title: normalizedTitle,
        description: dto.description,
        price: new Decimal(dto.price) as any,
        currency: dto.currency || 'GHS',
        condition: dto.condition || 'new',
        quantity_available: dto.quantity_available
          ? parseInt(dto.quantity_available, 10)
          : 1,
        status: dto.status || 'draft',
        category: dto.category,
        image_urls,
        video_url,
        tags: normalizedTags,
        is_featured: false,
        attributes: parsedAttributes,
      } as any,
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
      sellerId?: string | bigint;
      status?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, category, sellerId, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(category && { category }),
      ...(sellerId && { seller_id: BigInt(sellerId) }),
      ...(status
        ? { status }
        : { status: { in: ['published', 'active', 'draft'] } }),
    };

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
        orderBy: {
          created_at: 'desc',
        },
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

  async getProductById(id: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            store_name: true,
            logo_url: true,
            store_link: true,
            bio: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
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
        fields: true,
      },
    });
  }

  async getProductsBySeller(userId: bigint) {
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
    userId: bigint,
    id: bigint,
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

    // 5. Update product
    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        title: normalizedTitle,
        description: dto.description,
        price: dto.price ? new Decimal(dto.price) : undefined,
        currency: dto.currency,
        condition: dto.condition,
        quantity_available: dto.quantity_available
          ? parseInt(dto.quantity_available, 10)
          : undefined,
        status: dto.status,
        category: dto.category,
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

    return {
      message: 'Product updated successfully',
      product: {
        id: updatedProduct.id.toString(),
        title: updatedProduct.title,
        price: updatedProduct.price.toString(),
      },
    };
  }

  async deleteProduct(userId: bigint, id: bigint) {
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

    return { message: 'Product deleted successfully' };
  }

  async toggleHotSales(userId: bigint, id: bigint, isFeatured: boolean) {
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

  async initializeHotSalesPayment(userId: bigint, productId: bigint) {
    return this.initializePromotionPayment(userId, productId, 'BOOST');
  }

  async initializePromotionPayment(
    userId: bigint,
    productId: bigint,
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
    userId: bigint,
    reference: string,
    productId: bigint,
  ) {
    return this.verifyPromotionPayment(userId, reference, productId);
  }

  async verifyPromotionPayment(
    userId: bigint,
    reference: string,
    productId: bigint,
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

  async getPromotionPaymentsHistory(userId: bigint) {
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
}
