import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { CloudinaryService } from '../common/cloudinary.service';

@Injectable()
export class StoreService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async createStore(
    userId: string,
    dto: CreateStoreDto,
    logoFile?: Express.Multer.File,
  ) {
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
      const uploadResult = await this.cloudinaryService.uploadImage(
        logoFile,
        'store-logos',
        { vectorize: true },
      );
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

  async updateStore(userId: string, dto: any, logoFile?: Express.Multer.File) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!store) {
      throw new ConflictException('Store not found');
    }

    const data: any = { ...dto };

    if (logoFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        logoFile,
        'store-logos',
        { vectorize: true },
      );
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
        location_id: updated.location_id?.toString(),
        area: updated.area,
        delivery_policies: updated.delivery_policies,
        business_hours: updated.business_hours,
        social_links: updated.social_links,
        accepted_payment_methods: updated.accepted_payment_methods,
        payment_timing: updated.payment_timing,
        bank_name: updated.bank_name,
        bank_code: updated.bank_code,
        account_number: updated.account_number,
      },
    };
  }

  async getStoreStats(userId: string) {
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
    const totalSales = orderItems.reduce(
      (acc, item) => acc + Number(item.price) * item.quantity,
      0,
    );
    const uniqueOrders = Array.from(
      new Set(orderItems.map((item) => item.order_id.toString())),
    );

    // Map recent orders for the dashboard
    const recentOrders = orderItems.slice(0, 5).map((item) => ({
      id: `${item.order_id.toString()}-${item.id.toString()}`,
      displayId: `#ORD-${item.order_id.toString().slice(-4)}`,
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

  async getTopProVendors(limit = 6) {
    const now = new Date();
    const stores = await this.prisma.sellerProfile.findMany({
      where: {
        user: {
          is_pro: true,
          OR: [
            { pro_expires_at: null },
            { pro_expires_at: { gt: now } },
          ],
        },
      },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: {
        products: { _count: 'desc' },
      },
      take: limit,
    });

    return stores.map((s) => ({
      id: s.id,
      store_name: s.store_name,
      store_link: s.store_link,
      logo_url: s.logo_url,
      bio: s.bio,
      location: s.location,
      products_count: s._count.products,
      is_pro: true,
    }));
  }

  async getStoreByLink(link: string) {
    const store = await this.prisma.sellerProfile.findUnique({
      where: { store_link: link },
      include: {
        user: {
          select: {
            is_pro: true,
            pro_expires_at: true,
            is_verified: true,
            created_at: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const now = new Date();
    const proActive =
      !!store.user?.is_pro &&
      (!store.user.pro_expires_at || store.user.pro_expires_at > now);

    return {
      id: store.id.toString(),
      store_name: store.store_name,
      store_link: store.store_link,
      logo_url: store.logo_url,
      bio: store.bio,
      whatsapp_number: store.whatsapp_number,
      location: store.location,
      area: store.area,
      delivery_policies: store.delivery_policies,
      business_hours: store.business_hours,
      social_links: store.social_links,
      payment_timing: store.payment_timing,
      accepted_payment_methods: store.accepted_payment_methods,
      service_area: store.service_area,
      avg_delivery_time: store.avg_delivery_time,
      is_pro: proActive,
      pro_expires_at: store.user?.pro_expires_at ?? null,
      is_verified: store.user?.is_verified ?? false,
      member_since: store.user?.created_at ?? store.created_at,
      products_count: store._count.products,
    };
  }
}
