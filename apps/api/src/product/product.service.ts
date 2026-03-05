import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CloudinaryService } from '../common/cloudinary.service';
import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
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
      throw new NotFoundException('Seller profile not found. Please create a store first.');
    }

    // 2. Upload images to Cloudinary (Max 3)
    if (images.length > 3) {
      throw new BadRequestException('Maximum 3 images allowed');
    }

    const image_urls: string[] = [];
    for (const file of images) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'products', { quality: 'auto' });
      image_urls.push(uploadResult.secure_url);
    }

    // 3. Optional short video upload (max ~5 seconds)
    let video_url: string | undefined;
    if (video) {
      // Hard size guard so very long/high-res videos are rejected before upload work
      const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // ~15 MB
      if (video.size > MAX_VIDEO_BYTES) {
        throw new BadRequestException('Product video is too large. Please upload a short clip (max ~5 seconds).');
      }

      let videoResult: any;
      try {
        videoResult = await this.cloudinaryService.uploadVideo(video, 'products');
      } catch (err: any) {
        // Normalize common upload failures into a user-facing validation error
        const message = (err && err.message) || '';
        if (message.toLowerCase().includes('file size too large') || message.toLowerCase().includes('timeout')) {
          throw new BadRequestException('Product video is too long or too large. Please upload a clip up to 5 seconds.');
        }
        throw err;
      }

      const duration = videoResult.duration;
      if (typeof duration === 'number' && duration > 5.1) {
        throw new BadRequestException('Product video must be 5 seconds or less.');
      }
      video_url = videoResult.secure_url;
    }

    // 5. Parse attributes if provided
    let parsedAttributes = {};
    if (dto.attributes) {
      try {
        parsedAttributes = typeof dto.attributes === 'string' ? JSON.parse(dto.attributes) : dto.attributes;
      } catch (err) {
        console.warn('Failed to parse product attributes', err);
      }
    }

    // 6. Create product
    const product = await this.prisma.product.create({
      data: {
        seller_id: seller.id,
        title: dto.title,
        description: dto.description,
        price: new Decimal(dto.price) as any,
        currency: dto.currency || 'GHS',
        condition: dto.condition || 'new',
        quantity_available: dto.quantity_available ? parseInt(dto.quantity_available, 10) : 1,
        status: dto.status || 'draft',
        category: dto.category,
        image_urls,
        video_url,
        tags: dto.tags || [],
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

  async getProducts() {
    return (this.prisma.product as any).findMany({
      include: {
        seller: {
          select: {
            store_name: true,
            logo_url: true,
            store_link: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc',
      }
    });
  }

  async getProductById(id: bigint) {
    const product = await (this.prisma.product as any).findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            store_name: true,
            logo_url: true,
            store_link: true,
            bio: true,
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }



  async getProductsByStoreLink(link: string) {
    return (this.prisma.product as any).findMany({
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
          }
        }
      },
      orderBy: {
        created_at: 'desc',
      }
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
}
