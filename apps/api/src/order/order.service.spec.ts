import { ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';

describe('OrderService self-purchase protection', () => {
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
});
