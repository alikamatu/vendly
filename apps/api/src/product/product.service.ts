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

  async createProduct(userId: bigint, dto: CreateProductDto, files: Express.Multer.File[]) {
    // 1. Get seller profile
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found. Please create a store first.');
    }

    // 2. Upload images to Cloudinary (Max 3)
    if (files.length > 3) {
      throw new BadRequestException('Maximum 3 images allowed');
    }

    const image_urls: string[] = [];
    for (const file of files) {
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'products');
      image_urls.push(uploadResult.secure_url);
    }

    // 3. Create product
    const product = await this.prisma.product.create({
      data: {
        seller_id: seller.id,
        title: dto.title,
        description: dto.description,
        price: new Decimal(dto.price) as any,
        category: dto.category,
        image_urls,
        tags: dto.tags || [],
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

  async getCategories() {
    return this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }
}
