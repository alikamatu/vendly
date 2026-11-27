import { BadRequestException } from '@nestjs/common';
import { AdminProductService } from './admin-product.service';
import { AdminBulkAction } from './dto/admin-product.dto';

describe('AdminProductService (Full Super Admin Control)', () => {
  const actor = {
    id: 'admin-1',
    role: 'ADMIN' as const,
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  function createHarness() {
    const sampleProduct = {
      id: 'prod-1',
      seller_id: 'seller-1',
      title: 'iPhone 15 Pro',
      description: '256GB Titanium',
      price: '12000',
      original_price: '13500',
      currency: 'GHS',
      condition: 'new',
      quantity_available: 4,
      status: 'active',
      is_featured: false,
      category: 'Electronics',
      brand: 'Apple',
      attributes: { subcategory: 'Phones' },
      image_urls: ['https://cdn.example.com/1.jpg'],
      video_url: null,
      tags: ['iphone', 'apple'],
    };

    const txMock = {
      orderItem: { updateMany: jest.fn(async () => ({ count: 1 })) },
      favorite: { deleteMany: jest.fn(async () => ({ count: 2 })) },
      product: {
        findMany: jest.fn(async () => [
          { id: 'prod-1', title: 'iPhone 15 Pro' },
        ]),
        delete: jest.fn(async () => sampleProduct),
        deleteMany: jest.fn(async () => ({ count: 1 })),
      },
    };

    const prisma: any = {
      product: {
        findMany: jest.fn(async () => [sampleProduct]),
        findUnique: jest.fn(async () => ({ ...sampleProduct })),
        count: jest.fn(async () => 1),
        create: jest.fn(async ({ data }: any) => ({ id: 'prod-new', ...data })),
        update: jest.fn(async ({ data }: any) => ({
          ...sampleProduct,
          ...data,
        })),
        updateMany: jest.fn(async () => ({ count: 2 })),
      },
      sellerProfile: {
        findUnique: jest.fn(async () => ({
          id: 'seller-1',
          store_name: 'Kofi Tech',
        })),
      },
      orderItem: {
        count: jest.fn(async () => 0),
        findMany: jest.fn(async () => []),
      },
      $transaction: jest.fn(async (fn: any) => fn(txMock)),
    };

    const auditLogs: any = { record: jest.fn() };
    const cloudinary: any = {
      uploadImage: jest.fn(async () => ({
        secure_url: 'https://cdn.example.com/uploaded.jpg',
      })),
    };

    const service = new AdminProductService(prisma, auditLogs, cloudinary);
    return { service, prisma, txMock, auditLogs, cloudinary };
  }

  it('lists products with full catalog summary, pagination metadata, and search across stores/titles', async () => {
    const { service, prisma } = createHarness();
    const res = await service.list({
      page: 1,
      limit: 50,
      search: 'iPhone',
      stock: 'low_stock',
    });

    expect(res.data).toHaveLength(1);
    expect(res.totalPages).toBe(1);
    expect(res.summary.total).toBe(1);
    expect(prisma.product.findMany).toHaveBeenCalled();
  });

  it('toggles featured cleanly even when dto.is_featured is omitted', async () => {
    const { service, prisma, auditLogs } = createHarness();
    const updated = await service.setFeatured('prod-1', {}, actor);

    expect(updated.is_featured).toBe(true);
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { is_featured: true } }),
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'product.feature' }),
    );
  });

  it('blocks normal delete when orders exist, but force-deletes while preserving OrderItem.product_title', async () => {
    const { service, prisma, txMock, auditLogs } = createHarness();
    prisma.orderItem.count.mockResolvedValueOnce(3);

    await expect(service.remove('prod-1', actor, false)).rejects.toThrow(
      BadRequestException,
    );

    prisma.orderItem.count.mockResolvedValueOnce(3);
    const res = await service.remove('prod-1', actor, true);
    expect(res.message).toContain('order history preserved');
    expect(txMock.orderItem.updateMany).toHaveBeenCalledWith({
      where: { product_id: 'prod-1', product_title: null },
      data: { product_title: 'iPhone 15 Pro' },
    });
    expect(txMock.product.delete).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
    });
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'product.force_delete' }),
    );
  });

  it('supports bulk category update and bulk force delete', async () => {
    const { service, prisma, txMock } = createHarness();

    const catRes = await service.bulk(
      {
        ids: ['prod-1', 'prod-2'],
        action: AdminBulkAction.CATEGORY,
        value: 'Phones',
      },
      actor,
    );
    expect(catRes.updated).toBe(2);
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['prod-1', 'prod-2'] } },
      data: { category: 'Phones' },
    });

    prisma.orderItem.findMany.mockResolvedValueOnce([{ product_id: 'prod-1' }]);
    const delRes = await service.bulk(
      { ids: ['prod-1'], action: AdminBulkAction.DELETE, force: true },
      actor,
    );
    expect(delRes.updated).toBe(1);
    expect(txMock.product.deleteMany).toHaveBeenCalled();
  });
});
