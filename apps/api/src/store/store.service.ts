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

    const data: any = {};

    // Copy simple string fields
    const stringFields = [
      'store_name',
      'store_link',
      'bio',
      'whatsapp_number',
      'location',
      'area',
      'delivery_policies',
      'business_hours',
      'bank_name',
      'bank_code',
      'account_number',
      'payment_timing',
      'service_area',
      'avg_delivery_time',
    ];
    for (const key of stringFields) {
      if (dto[key] !== undefined && dto[key] !== '') {
        data[key] = dto[key];
      }
    }

    // Parse location_id (comes as string from FormData)
    if (dto.location_id !== undefined && dto.location_id !== '') {
      data.location_id = String(dto.location_id);
    }

    // Parse social_links (may arrive as JSON string from FormData)
    if (dto.social_links !== undefined) {
      data.social_links =
        typeof dto.social_links === 'string'
          ? JSON.parse(dto.social_links)
          : dto.social_links;
    }

    // Parse accepted_payment_methods (may arrive as JSON string from FormData)
    if (dto.accepted_payment_methods !== undefined) {
      if (typeof dto.accepted_payment_methods === 'string') {
        try {
          data.accepted_payment_methods = JSON.parse(
            dto.accepted_payment_methods,
          );
        } catch {
          data.accepted_payment_methods = dto.accepted_payment_methods
            .split(',')
            .filter(Boolean);
        }
      } else {
        data.accepted_payment_methods = dto.accepted_payment_methods;
      }
    }

    if (logoFile) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        logoFile,
        'store-logos',
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
        service_area: updated.service_area,
        avg_delivery_time: updated.avg_delivery_time,
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
          OR: [{ pro_expires_at: null }, { pro_expires_at: { gt: now } }],
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

  async getPublicStores(query: {
    search?: string;
    location?: string;
    is_pro?: boolean;
    sort?: 'newest' | 'products' | 'alphabetical' | 'default';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 12));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    // Search query on store_name or bio
    if (query.search) {
      whereClause.OR = [
        { store_name: { contains: query.search, mode: 'insensitive' } },
        { bio: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filter by location or area
    if (query.location) {
      whereClause.OR = [
        ...(whereClause.OR || []),
        { location: { contains: query.location, mode: 'insensitive' } },
        { area: { contains: query.location, mode: 'insensitive' } },
      ];
    }

    // Filter by pro status
    if (query.is_pro !== undefined) {
      const now = new Date();
      if (query.is_pro) {
        whereClause.user = {
          is_pro: true,
          OR: [{ pro_expires_at: null }, { pro_expires_at: { gt: now } }],
        };
      } else {
        whereClause.user = {
          OR: [{ is_pro: false }, { pro_expires_at: { lt: now } }],
        };
      }
    }

    // Determine ordering
    let orderBy: any = {};
    if (query.sort === 'newest') {
      orderBy = { created_at: 'desc' };
    } else if (query.sort === 'products') {
      orderBy = { products: { _count: 'desc' } };
    } else if (query.sort === 'alphabetical') {
      orderBy = { store_name: 'asc' };
    } else {
      // Default: Pro first, then products count descending
      // Prisma does not support multi-level sorting by complex relation count natively in a single object in some versions,
      // so sorting by products count is a solid default.
      orderBy = { products: { _count: 'desc' } };
    }

    const [stores, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              is_pro: true,
              pro_expires_at: true,
              is_verified: true,
            },
          },
          _count: {
            select: { products: true },
          },
          products: {
            where: {
              status: { in: ['active', 'published'] },
            },
            select: {
              id: true,
              title: true,
              price: true,
              image_urls: true,
            },
            take: 3,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.sellerProfile.count({
        where: whereClause,
      }),
    ]);

    const now = new Date();
    const mappedStores = stores.map((s) => {
      const proActive =
        !!s.user?.is_pro &&
        (!s.user.pro_expires_at || s.user.pro_expires_at > now);

      return {
        id: s.id.toString(),
        store_name: s.store_name,
        store_link: s.store_link,
        logo_url: s.logo_url,
        bio: s.bio,
        location: s.location,
        area: s.area,
        products_count: s._count.products,
        is_pro: proActive,
        is_verified: s.user?.is_verified ?? false,
        products: s.products.map((p) => ({
          id: p.id.toString(),
          title: p.title,
          price: Number(p.price),
          image_url: p.image_urls?.[0] || null,
        })),
      };
    });

    return {
      stores: mappedStores,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
