import { NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';
import {
  PUBLIC_PRODUCT_STATUSES,
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
          status: { in: [...PUBLIC_PRODUCT_STATUSES] },
          seller: expect.objectContaining({
            store_link: 'kitchenhub-application',
            user: { is_suspended: false },
          }),
        }),
      }),
    );
  });
});
