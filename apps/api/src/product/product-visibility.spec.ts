import { NotFoundException } from '@nestjs/common';
import {
  ProductService,
  interleaveProFirstProducts,
  isActiveProSeller,
} from './product.service';
import {
  PUBLIC_PRODUCT_STATUS_FILTER,
  isPubliclyVisibleProduct,
  isPubliclyVisibleInStock,
} from './product-visibility';

describe('Product public visibility & moderation (T04 / ST-03)', () => {
  const rejectedSobolo = {
    id: 'c3661485-6244-4db1-8fae-3c7713e1f52d',
    title: 'Sobolo',
    status: 'rejected',
    quantity_available: 0,
    description: null,
    seller: {
      id: 'seller-1',
      user_id: 'owner-user-1',
      store_name: 'KitchenHub Application',
      store_link: 'kitchenhub-application',
      user: {
        is_pro: false,
        pro_expires_at: null,
        is_verified: true,
        is_suspended: false,
        created_at: new Date(),
      },
    },
    variants: [],
  };

  function makeService(overrides: {
    findUnique?: jest.Mock;
    findMany?: jest.Mock;
  }) {
    const prisma = {
      product: {
        findUnique: overrides.findUnique ?? jest.fn(),
        findMany: overrides.findMany ?? jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const cloudinary = {} as any;
    const payments = {} as any;
    const auditLogs = { record: jest.fn() } as any;
    return {
      prisma,
      service: new ProductService(prisma, cloudinary, payments, auditLogs),
    };
  }

  it('rejects non-approved statuses in isPubliclyVisibleProduct', () => {
    expect(
      isPubliclyVisibleProduct({ status: 'rejected', quantity_available: 5 }),
    ).toBe(false);
    expect(
      isPubliclyVisibleProduct({ status: 'draft', quantity_available: 5 }),
    ).toBe(false);
    expect(
      isPubliclyVisibleProduct({ status: 'archived', quantity_available: 5 }),
    ).toBe(false);
    expect(
      isPubliclyVisibleProduct({
        status: 'active',
        seller: { user: { is_suspended: true } },
      }),
    ).toBe(false);
    expect(
      isPubliclyVisibleProduct({
        status: 'active',
        seller: { user: { disabled_at: new Date() } },
      }),
    ).toBe(false);
    expect(
      isPubliclyVisibleProduct({
        status: 'active',
        seller: { user: { deletion_scheduled_for: new Date() } },
      }),
    ).toBe(false);
    expect(
      isPubliclyVisibleProduct({ status: 'active', quantity_available: 1 }),
    ).toBe(true);
    expect(
      isPubliclyVisibleInStock({ status: 'active', quantity_available: 0 }),
    ).toBe(false);
    expect(
      isPubliclyVisibleInStock({ status: 'active', quantity_available: 2 }),
    ).toBe(true);
  });

  it('returns 404 (NotFoundException) for a rejected product when logged out', async () => {
    const { service } = makeService({
      findUnique: jest.fn().mockResolvedValue(rejectedSobolo),
    });

    await expect(
      service.getProductById(rejectedSobolo.id, null),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows the seller owner or an admin to preview a rejected product', async () => {
    const { service } = makeService({
      findUnique: jest.fn().mockResolvedValue(rejectedSobolo),
    });

    const ownerView = await service.getProductById(rejectedSobolo.id, {
      id: 'owner-user-1',
      role: 'SELLER',
    });
    expect(ownerView.id).toBe(rejectedSobolo.id);

    const adminView = await service.getProductById(rejectedSobolo.id, {
      id: 'admin-99',
      role: 'ADMIN',
    });
    expect(adminView.id).toBe(rejectedSobolo.id);
  });

  it('excludes rejected products from store listings (getProductsByStoreLink)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = makeService({ findMany });

    await service.getProductsByStoreLink('kitchenhub-application');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PUBLIC_PRODUCT_STATUS_FILTER,
          seller: expect.objectContaining({
            store_link: 'kitchenhub-application',
            user: {
              is_suspended: false,
              disabled_at: null,
              deletion_scheduled_for: null,
            },
          }),
        }),
      }),
    );
  });

  it('excludes qty 0 products from recent rails and search (T09 / HM-03 / PD-04)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      product: {
        findUnique: jest.fn(),
        findMany,
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const service = new ProductService(
      prisma,
      {} as any,
      {} as any,
      { record: jest.fn() } as any,
    );

    await service.getRecentProducts();
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PUBLIC_PRODUCT_STATUS_FILTER,
          quantity_available: { gt: 0 },
        }),
      }),
    );

    await service.searchProducts('jacket');
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PUBLIC_PRODUCT_STATUS_FILTER,
          quantity_available: { gt: 0 },
        }),
      }),
    );

    await service.getProducts({ search: 'jacket' });
    expect(findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          quantity_available: { gt: 0 },
        }),
      }),
    );
  });

  it('resolves products by human-readable slug and disambiguates collisions (T15 / PD-07)', async () => {
    const hoodie = {
      id: '240b8f0c-227c-414b-a6de-0a1b2c3d4e5f',
      seller_id: 'seller-hoodies',
      title: 'Chill Hoodie',
      status: 'active',
      quantity_available: 3,
      seller: {
        id: 'seller-hoodies',
        user_id: 'owner-2',
        store_name: 'The Hoodies',
        store_link: 'the-hoodies',
        user: {
          is_pro: true,
          pro_expires_at: null,
          is_verified: true,
          is_suspended: false,
          created_at: new Date(),
        },
      },
      variants: [],
    };

    const findMany = jest.fn().mockResolvedValue([hoodie]);
    const findUnique = jest.fn().mockResolvedValue(hoodie);
    const { service } = makeService({ findMany, findUnique });

    const result = await service.getProductById(
      'chill-hoodie-the-hoodies',
      null,
    );
    expect(result.id).toBe(hoodie.id);
    expect(result.slug).toBe('chill-hoodie-the-hoodies');
  });

  describe('Pro-first interleaved discovery ranking', () => {
    const now = new Date('2026-11-27T10:00:00Z');
    const futureDate = new Date('2026-12-27T10:00:00Z');
    const expiredDate = new Date('2026-10-01T10:00:00Z');

    function item(opts: {
      id: string;
      sellerId: string;
      isPro?: boolean;
      proExpiresAt?: Date | null;
      isFeatured?: boolean;
      qty?: number;
      minutesAgo: number;
    }) {
      return {
        id: opts.id,
        title: `Item ${opts.id}`,
        seller_id: opts.sellerId,
        is_featured: opts.isFeatured ?? false,
        quantity_available: opts.qty ?? 5,
        created_at: new Date(now.getTime() - opts.minutesAgo * 60_000),
        seller: {
          id: opts.sellerId,
          store_name: `Store ${opts.sellerId}`,
          store_link: `store-${opts.sellerId}`,
          user: {
            is_pro: opts.isPro ?? false,
            pro_expires_at: opts.proExpiresAt ?? null,
            is_verified: true,
          },
        },
      };
    }

    it('identifies active vs expired Pro sellers accurately', () => {
      expect(
        isActiveProSeller(
          { user: { is_pro: true, pro_expires_at: null } },
          now,
        ),
      ).toBe(true);
      expect(
        isActiveProSeller(
          { user: { is_pro: true, pro_expires_at: futureDate } },
          now,
        ),
      ).toBe(true);
      expect(
        isActiveProSeller(
          { user: { is_pro: true, pro_expires_at: expiredDate } },
          now,
        ),
      ).toBe(false);
      expect(
        isActiveProSeller(
          { user: { is_pro: false, pro_expires_at: null } },
          now,
        ),
      ).toBe(false);
    });

    it('ranks Pro sellers first interleaved 3:1 with Standard sellers and spreads stores via round-robin', () => {
      const catalog = [
        // Standard store S1 & S2 (even though newer than some Pro items, Pro leads 3:1)
        item({ id: 'std-1', sellerId: 's-std-1', isPro: false, minutesAgo: 1 }),
        item({ id: 'std-2', sellerId: 's-std-2', isPro: false, minutesAgo: 2 }),
        // Expired Pro seller -> treated as Standard
        item({
          id: 'expired-pro-1',
          sellerId: 's-exp',
          isPro: true,
          proExpiresAt: expiredDate,
          minutesAgo: 3,
        }),
        // Pro store A uploaded 3 consecutive items
        item({ id: 'pro-a1', sellerId: 's-pro-a', isPro: true, minutesAgo: 4 }),
        item({ id: 'pro-a2', sellerId: 's-pro-a', isPro: true, minutesAgo: 5 }),
        item({ id: 'pro-a3', sellerId: 's-pro-a', isPro: true, minutesAgo: 6 }),
        // Pro store B uploaded 2 items
        item({
          id: 'pro-b1',
          sellerId: 's-pro-b',
          isPro: true,
          proExpiresAt: futureDate,
          minutesAgo: 7,
        }),
        item({
          id: 'pro-b2',
          sellerId: 's-pro-b',
          isPro: true,
          proExpiresAt: futureDate,
          minutesAgo: 8,
        }),
        // Out-of-stock Pro item should sink below all in-stock items
        item({
          id: 'pro-oos',
          sellerId: 's-pro-a',
          isPro: true,
          qty: 0,
          minutesAgo: 0,
        }),
      ];

      const ranked = interleaveProFirstProducts(catalog, now, 3);
      expect(ranked.map((p) => p.id)).toEqual([
        // First 3 slots: Pro round-robin (pro-a1, pro-b1, then pro-a2)
        'pro-a1',
        'pro-b1',
        'pro-a2',
        // 4th slot: 1st Standard item mixed in
        'std-1',
        // Remaining Pro items (pro-b2, pro-a3)
        'pro-b2',
        'pro-a3',
        // Followed by remaining Standard items (std-2, expired-pro-1)
        'std-2',
        'expired-pro-1',
        // Out-of-stock item last
        'pro-oos',
      ]);
    });

    it('produces deterministic, duplicate-free page slices across endless scroll pages', async () => {
      const dataset = [
        item({ id: 'p1', sellerId: 'pro-1', isPro: true, minutesAgo: 10 }),
        item({ id: 'p2', sellerId: 'pro-2', isPro: true, minutesAgo: 20 }),
        item({ id: 'p3', sellerId: 'pro-3', isPro: true, minutesAgo: 30 }),
        item({ id: 'p4', sellerId: 'pro-1', isPro: true, minutesAgo: 40 }),
        item({ id: 's1', sellerId: 'std-1', isPro: false, minutesAgo: 5 }),
        item({ id: 's2', sellerId: 'std-2', isPro: false, minutesAgo: 15 }),
        item({ id: 's3', sellerId: 'std-3', isPro: false, minutesAgo: 25 }),
      ];

      const findMany = jest.fn().mockResolvedValue(dataset);
      const prisma = {
        product: {
          findUnique: jest.fn(),
          findMany,
          count: jest.fn().mockResolvedValue(dataset.length),
          update: jest.fn(),
        },
      } as any;

      const service = new ProductService(
        prisma,
        {} as any,
        {} as any,
        { record: jest.fn() } as any,
      );

      const page1 = await service.getProducts({ page: 1, limit: 3 });
      const page2 = await service.getProducts({ page: 2, limit: 3 });
      const page3 = await service.getProducts({ page: 3, limit: 3 });

      expect(page1.meta).toEqual({
        total: 7,
        page: 1,
        limit: 3,
        totalPages: 3,
      });
      expect(page1.data.map((x: any) => x.id)).toEqual(['p1', 'p2', 'p3']);
      expect(page2.data.map((x: any) => x.id)).toEqual(['s1', 'p4', 's2']);
      expect(page3.data.map((x: any) => x.id)).toEqual(['s3']);

      const combinedIds = [...page1.data, ...page2.data, ...page3.data].map(
        (x: any) => x.id,
      );
      expect(new Set(combinedIds).size).toBe(dataset.length);
    });
  });
});
