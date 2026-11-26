import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DEFAULT_ESCROW_RELEASE_DAYS, OrderService } from './order.service';

describe('OrderService', () => {
  it('defaults escrow release window to 3 days', async () => {
    const service = new OrderService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    expect(DEFAULT_ESCROW_RELEASE_DAYS).toBe(3);
    await expect(service.getEscrowReleaseDays()).resolves.toBe(3);
  });

  it('blocks a seller from creating an order for their own store/products', async () => {
    const prismaMock = {
      sellerProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'seller-1',
          user_id: 'user-123',
          store_link: 'my-store',
          payment_timing: 'FLEXIBLE',
        }),
      },
      user: {
        findUnique: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
    };

    const service = new OrderService(
      prismaMock as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.createOrder('user-123', {
        storeLink: 'my-store',
        items: [{ productId: 'prod-1', quantity: 1 }],
        customerName: 'Seller Self',
        customerPhone: '+233240000000',
        deliveryMethod: 'PICKUP',
        deliveryLocation: 'Store Pickup',
        paymentMethod: 'CASH_ON_DELIVERY',
      }),
    ).rejects.toThrow(
      new ForbiddenException('You cannot purchase your own products.'),
    );

    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  describe('3-day escrow & return window', () => {
    it('allows return requests within 3 days of delivery and rejects after 3 days', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

      const prismaMock = {
        platformSetting: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
        order: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              id: 'order-ok',
              buyer_id: 'buyer-1',
              status: 'DELIVERED',
              created_at: fourDaysAgo,
              updated_at: twoDaysAgo,
              return_request: null,
            })
            .mockResolvedValueOnce({
              id: 'order-expired',
              buyer_id: 'buyer-1',
              status: 'DELIVERED',
              created_at: fourDaysAgo,
              updated_at: fourDaysAgo,
              return_request: null,
            }),
        },
        returnRequest: {
          create: jest.fn().mockResolvedValue({ id: 'ret-1' }),
        },
      };

      const service = new OrderService(
        prismaMock as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await expect(
        service.createReturnRequest('buyer-1', 'order-ok', {
          reason: 'DEFECTIVE',
          description: 'Screen flickers on startup',
        }),
      ).resolves.toMatchObject({
        message: 'Return request submitted successfully',
      });

      await expect(
        service.createReturnRequest('buyer-1', 'order-expired', {
          reason: 'DEFECTIVE',
          description: 'Filed after 3-day window',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Return requests must be submitted within 3 days of delivery',
        ),
      );
    });

    it('holds escrow on DELIVERED and blocks seller from prematurely marking COMPLETED', async () => {
      const releaseEscrowForOrder = jest.fn().mockResolvedValue(undefined);
      const prismaMock = {
        platformSetting: { findUnique: jest.fn().mockResolvedValue(null) },
        sellerProfile: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'seller-1', user_id: 'seller-user-1' }),
        },
        order: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({
              id: 'order-escrow-1',
              buyer_id: 'buyer-1',
              status: 'SHIPPED',
              total_amount: '250.00',
              customer_name: 'Ama',
              updated_at: new Date(),
              items: [{ id: 'item-1' }],
              transaction: {
                provider: 'PAYSTACK',
                status: 'SUCCESS',
                payout: null,
              },
              return_request: null,
            })
            .mockResolvedValueOnce({
              id: 'order-escrow-1',
              buyer_id: 'buyer-1',
              status: 'DELIVERED',
              total_amount: '250.00',
              customer_name: 'Ama',
              updated_at: new Date(), // just delivered — 3-day window has not matured
              items: [{ id: 'item-1' }],
              transaction: {
                provider: 'PAYSTACK',
                status: 'SUCCESS',
                payout: null,
              },
              return_request: null,
            }),
          update: jest.fn().mockResolvedValue({ status: 'DELIVERED' }),
        },
      };

      const service = new OrderService(
        prismaMock as never,
        { releaseEscrowForOrder } as never,
        { create: jest.fn().mockResolvedValue(undefined) } as never,
        {} as never,
        {} as never,
        { emit: jest.fn() } as never,
      );
      jest
        .spyOn(service as any, 'sendOrderStatusEmails')
        .mockResolvedValue(undefined);

      const deliveredRes = await service.updateOrderStatus(
        'seller-user-1',
        'order-escrow-1',
        'DELIVERED',
      );
      expect(deliveredRes.status).toBe('DELIVERED');
      expect(releaseEscrowForOrder).not.toHaveBeenCalled();

      await expect(
        service.updateOrderStatus(
          'seller-user-1',
          'order-escrow-1',
          'COMPLETED',
        ),
      ).rejects.toThrow(/3-day buyer inspection window/);
      expect(releaseEscrowForOrder).not.toHaveBeenCalled();
    });

    it('releases escrow immediately when buyer confirms delivery or when 3-day sweep matures', async () => {
      const releaseEscrowForOrder = jest.fn().mockResolvedValue(undefined);
      const prismaMock = {
        platformSetting: { findUnique: jest.fn().mockResolvedValue(null) },
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'order-confirm-1',
            buyer_id: 'buyer-1',
            status: 'DELIVERED',
            total_amount: '400.00',
            customer_name: 'Kojo',
            items: [
              {
                product: {
                  seller: {
                    id: 'seller-1',
                    user_id: 'seller-user-1',
                    store_name: 'Kojo Tech',
                  },
                },
              },
            ],
            transaction: {
              provider: 'PAYSTACK',
              status: 'SUCCESS',
              payout: null,
            },
            return_request: null,
          }),
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'order-matured-1',
              items: [{ product: { seller: { user_id: 'seller-user-1' } } }],
            },
          ]),
          update: jest.fn().mockResolvedValue({ status: 'COMPLETED' }),
        },
      };

      const service = new OrderService(
        prismaMock as never,
        { releaseEscrowForOrder } as never,
        { create: jest.fn().mockResolvedValue(undefined) } as never,
        {} as never,
        {} as never,
        { emit: jest.fn() } as never,
      );

      const confirmRes = await service.confirmDeliveryByBuyer(
        'buyer-1',
        'order-confirm-1',
      );
      expect(confirmRes.status).toBe('COMPLETED');
      expect(releaseEscrowForOrder).toHaveBeenCalledWith('order-confirm-1');

      const sweepRes = await service.sweepMaturedEscrowOrders();
      expect(sweepRes).toEqual({ checked: 1, released: 1, releaseDays: 3 });
      expect(releaseEscrowForOrder).toHaveBeenCalledWith('order-matured-1');
    });
  });
});
