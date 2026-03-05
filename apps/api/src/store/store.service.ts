import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
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
      const uploadResult = await this.cloudinaryService.uploadImage(logoFile, 'store-logos', { vectorize: true });
      logo_url = uploadResult.secure_url;
    }

    const store = await this.prisma.sellerProfile.create({
      data: {
        user_id: userId,
        store_name: dto.store_name,
        store_link: dto.store_link,
        bio: dto.bio,
        whatsapp_number: dto.whatsapp_number,
        location: dto.location,
        delivery_policies: dto.delivery_policies,
        business_hours: dto.business_hours,
        social_links: dto.social_links || {},
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
      const uploadResult = await this.cloudinaryService.uploadImage(logoFile, 'store-logos', { vectorize: true });
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
        location: updated.location,
        delivery_policies: updated.delivery_policies,
        business_hours: updated.business_hours,
        social_links: updated.social_links,
      },
    };
  }

  async getStoreStats(userId: bigint) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const [productCount, orderItems] = await Promise.all([
      this.prisma.product.count({
        where: { seller_id: store.id },
      }),
      this.prisma.orderItem.findMany({
        where: {
          product: {
            seller_id: store.id,
          },
        },
        include: {
          order: {
            include: {
              buyer: {
                select: {
                  full_name: true,
                },
              },
            },
          },
          product: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          order: {
            created_at: 'desc',
          },
        },
        take: 50, // Get last 50 items for aggregation
      }),
    ]);

    // Calculate total sales and orders
    const totalSales = orderItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);
    const uniqueOrders = Array.from(new Set(orderItems.map(item => item.order_id.toString())));
    
    // Map recent orders for the dashboard
    const recentOrders = orderItems.slice(0, 5).map(item => ({
      id: `#ORD-${item.order_id.toString().slice(-4)}`,
      customer: item.order.buyer.full_name,
      product: item.product.title,
      status: item.order.status,
      amount: `GH₵${(Number(item.price) * item.quantity).toLocaleString()}`,
      date: item.order.created_at,
    }));

    return {
      stats: [
        {
          label: 'Total Sales',
          value: `GH₵${totalSales.toLocaleString()}`,
          change: '+0%',
          isPositive: true,
          icon: 'ShoppingBag',
          color: 'bg-emerald-500/10 text-emerald-500',
        },
        {
          label: 'Total Orders',
          value: uniqueOrders.length.toString(),
          change: '+0%',
          isPositive: true,
          icon: 'ShoppingBag',
          color: 'bg-blue-500/10 text-blue-500',
        },
        {
          label: 'Products',
          value: productCount.toString(),
          change: '0%',
          isPositive: true,
          icon: 'Package',
          color: 'bg-amber-500/10 text-amber-500',
        },
        {
          label: 'Store Views',
          value: '0', // Placeholder
          change: '0%',
          isPositive: true,
          icon: 'Users',
          color: 'bg-purple-500/10 text-purple-500',
        },
      ],
      recentOrders,
    };
  }

  async getStoreByLink(link: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { store_link: link },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return {
      id: store.id.toString(),
      store_name: store.store_name,
      store_link: store.store_link,
      logo_url: store.logo_url,
      bio: store.bio,
      whatsapp_number: store.whatsapp_number,
      location: store.location,
      delivery_policies: store.delivery_policies,
      business_hours: store.business_hours,
      social_links: store.social_links,
    };
  }
}
