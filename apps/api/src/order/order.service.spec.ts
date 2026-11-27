import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
          is_seller_verified: true,
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

  describe('stock quantity enforcement', () => {
    const baseDto = {
      storeLink: 'test-store',
      customerName: 'Ama',
      customerPhone: '0244123456',
      deliveryMethod: 'DELIVERY',
      deliveryLocation: 'East Legon, Accra',
      paymentMethod: 'CASH_ON_DELIVERY',
    };

    function makeOrderService(opts: {
      products: Array<{
        id: string;
        title: string;
        price: any;
        status: string;
        quantity_available: number;
      }>;
      variants?: Array<{
        id: string;
        product_id: string;
        is_active: boolean;
        quantity_available: number;
        price?: any;
      }>;
    }) {
      const prismaMock = {
        sellerProfile: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'seller-1',
            user_id: 'seller-owner',
            store_name: 'Test Store',
            store_link: 'test-store',
            payment_timing: 'BOTH',
            is_seller_verified: true,
            user: {
              is_suspended: false,
              disabled_at: null,
              deletion_scheduled_for: null,
            },
          }),
        },
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'buyer-1', email: 'ama@example.com' }),
        },
        product: {
          findMany: jest.fn().mockResolvedValue(opts.products),
        },
        productVariant: {
          findMany: jest.fn().mockResolvedValue(opts.variants ?? []),
          findFirst: jest.fn().mockResolvedValue(null),
        },
        $transaction: jest.fn(),
      };
      return new OrderService(
        prismaMock as never,
        {} as never,
        { create: jest.fn() } as never,
        {} as never,
        {} as never,
        { emit: jest.fn() } as never,
      );
    }

    it('rejects single item requesting more than available product stock', async () => {
      const service = makeOrderService({
        products: [
          {
            id: 'prod-1',
            title: 'Chill Hoodie',
            price: new Prisma.Decimal(450),
            status: 'active',
            quantity_available: 2,
          },
        ],
      });

      await expect(
        service.createOrder('buyer-1', {
          ...baseDto,
          items: [{ productId: 'prod-1', quantity: 3 }],
        }),
      ).rejects.toThrow(/Only 2 of "Chill Hoodie" available in stock/);
    });

    it('rejects duplicate lines whose combined quantity exceeds available stock', async () => {
      const service = makeOrderService({
        products: [
          {
            id: 'prod-1',
            title: 'Chill Hoodie',
            price: new Prisma.Decimal(450),
            status: 'active',
            quantity_available: 3,
          },
        ],
      });

      await expect(
        service.createOrder('buyer-1', {
          ...baseDto,
          items: [
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-1', quantity: 2 },
          ],
        }),
      ).rejects.toThrow(/Only 3 of "Chill Hoodie" available in stock/);
    });

    it('rejects duplicate variant lines whose combined quantity exceeds variant stock and blocks zero/negative quantities', async () => {
      const service = makeOrderService({
        products: [
          {
            id: 'prod-1',
            title: 'Sneaker',
            price: new Prisma.Decimal(500),
            status: 'active',
            quantity_available: 10,
          },
        ],
        variants: [
          {
            id: 'var-42',
            product_id: 'prod-1',
            is_active: true,
            quantity_available: 2,
          },
        ],
      });

      await expect(
        service.createOrder('buyer-1', {
          ...baseDto,
          items: [
            { productId: 'prod-1', variantId: 'var-42', quantity: 2 },
            { productId: 'prod-1', variantId: 'var-42', quantity: 1 },
          ],
        }),
      ).rejects.toThrow(/Only 2 of "Sneaker" available in stock/);

      await expect(
        service.createOrder('buyer-1', {
          ...baseDto,
          items: [{ productId: 'prod-1', variantId: 'var-42', quantity: 0 }],
        }),
      ).rejects.toThrow(/whole number of at least 1/);
    });
  });

  describe('unverified seller order hard-block', () => {
    it('hard-blocks createOrder with ForbiddenException when seller verification is not complete', async () => {
      const prismaMock = {
        sellerProfile: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'seller-unverified',
            user_id: 'seller-owner-2',
            store_name: 'Preview Shop',
            store_link: 'preview-shop',
            payment_timing: 'BOTH',
            is_seller_verified: false,
            user: {
              is_suspended: false,
              disabled_at: null,
              deletion_scheduled_for: null,
            },
          }),
        },
        product: { findMany: jest.fn() },
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
        service.createOrder('buyer-9', {
          storeLink: 'preview-shop',
          items: [{ productId: 'prod-1', quantity: 1 }],
          customerName: 'Kofi Mensah',
          customerPhone: '+233240000001',
          deliveryMethod: 'PICKUP',
          deliveryLocation: 'Store Pickup',
          paymentMethod: 'PAYSTACK',
        }),
      ).rejects.toThrow(
        new ForbiddenException(
          'This store has not completed seller verification and cannot receive orders yet.',
        ),
      );
      expect(prismaMock.product.findMany).not.toHaveBeenCalled();
    });

    it('hard-blocks reinitializeOrderPayment when store is unverified', async () => {
      const prismaMock = {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'order-stale',
            buyer_id: 'buyer-9',
            status: 'AWAITING_PAYMENT',
            total_amount: new Prisma.Decimal(150),
            buyer: { email: 'kofi@example.com' },
            items: [
              {
                product: {
                  seller: {
                    id: 'seller-unverified',
                    is_seller_verified: false,
                  },
                },
              },
            ],
          }),
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
        service.reinitializeOrderPayment('buyer-9', 'order-stale'),
      ).rejects.toThrow(
        new ForbiddenException(
          'This store has not completed seller verification and cannot receive orders yet.',
        ),
      );
    });
  });

  describe('all-seller SMS order alerts', () => {
    it('sends SMS and in-app notification to non-Pro sellers on new order', async () => {
      const sendSms = jest.fn().mockResolvedValue({ sent: true, id: 'msg-1' });
      const createNotification = jest.fn().mockResolvedValue(undefined);
      const prismaMock = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            phone_e164: '+233244123456',
            full_name: 'Ama Seller',
            seller_profile: { whatsapp_number: null },
          }),
        },
      };

      const service = new OrderService(
        prismaMock as never,
        {} as never,
        { create: createNotification } as never,
        { sendSms } as never,
        {} as never,
        {} as never,
      );

      await (service as any).notifySellerOfNewOrder({
        sellerUserId: 'seller-free-1',
        orderId: 'order-abc123',
        orderNumber: 'ORD-ABC123',
        buyerName: 'Kwame Mensah',
        buyerId: 'buyer-1',
        totalAmount: '250',
      });

      expect(createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'seller-free-1',
          type: 'ORDER_PLACED',
        }),
      );
      expect(sendSms).toHaveBeenCalledWith(
        '+233244123456',
        expect.stringContaining('ORD-ABC123'),
      );
      expect(sendSms.mock.calls[0][1]).toContain('GHS 250');
      expect(sendSms.mock.calls[0][1]).toContain('Kwame');
    });

    it('falls back to storefront whatsapp_number when user.phone_e164 is missing', async () => {
      const sendSms = jest.fn().mockResolvedValue({ sent: true, id: 'msg-2' });
      const prismaMock = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            phone_e164: null,
            full_name: 'Legacy Seller',
            seller_profile: { whatsapp_number: '0244999888' },
          }),
        },
      };

      const service = new OrderService(
        prismaMock as never,
        {} as never,
        { create: jest.fn().mockResolvedValue(undefined) } as never,
        { sendSms } as never,
        {} as never,
        {} as never,
      );

      await (service as any).notifySellerOfNewOrder({
        sellerUserId: 'seller-legacy-1',
        orderId: 'order-def456',
        orderNumber: 'ORD-DEF456',
        buyerName: 'Efua',
        buyerId: 'buyer-2',
      });

      expect(sendSms).toHaveBeenCalledWith(
        '0244999888',
        expect.stringContaining('ORD-DEF456'),
      );
    });
  });
});
