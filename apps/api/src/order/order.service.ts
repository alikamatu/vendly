import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    // 1. Get seller/store
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { store_link: dto.storeLink },
    });

    if (!seller) {
      throw new NotFoundException('Store not found');
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    // Determine if we need upfront payment
    const isUpfrontRequired = seller.payment_timing === 'UPFRONT_ONLY';
    const isUpfrontRequested = dto.paymentMethod === 'PAYSTACK';

    if (isUpfrontRequired && !isUpfrontRequested) {
      throw new BadRequestException(
        'This store requires Upfront Payment via Paystack.',
      );
    }

    const requiresPaystack = isUpfrontRequired || isUpfrontRequested;

    // 2. Fetch products and calculate total
    const productIds = dto.items.map((item) => item.productId);
    const products = await (this.prisma.product as any).findMany({
      where: {
        id: { in: productIds },
        seller_id: seller.id,
      },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException(
        'One or more products not found or do not belong to this store',
      );
    }

    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      const subtotal = product.price.mul(item.quantity);
      totalAmount = totalAmount.add(subtotal);

      orderItemsData.push({
        product_id: product.id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // 3. Create order in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          buyer_id: userId,
          total_amount: totalAmount,
          status: requiresPaystack ? 'AWAITING_PAYMENT' : 'PENDING',
          customer_name: dto.customerName,
          customer_phone: dto.customerPhone,
          delivery_method: dto.deliveryMethod,
          delivery_location: dto.deliveryLocation,
          delivery_notes: dto.deliveryNotes,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // Update quantity available only if it's NOT a Paystack order (e.g. COD)
      // For Paystack, we deduct ONLY after successful payment verification.
      if (!requiresPaystack) {
        for (const item of dto.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity_available: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return newOrder;
    });

    let authorization_url = null;

    if (requiresPaystack) {
      // Create a Transaction record
      const reference = `ORD_${order.id}_${Date.now()}`;
      await this.prisma.transaction.create({
        data: {
          order_id: order.id,
          reference,
          amount: totalAmount,
          provider: 'PAYSTACK',
        },
      });

      const webBaseUrl =
        process.env.WEB_APP_URL ||
        process.env.FRONTEND_URL ||
        'http://localhost:3000';
      const callbackUrl = `${webBaseUrl}/orders?order_payment=1&reference=${reference}&order_id=${order.id.toString()}`;

      // Call Paystack
      const paystackData = await this.paymentsService.initializeTransaction({
        email: buyer.email,
        amount: totalAmount.toNumber(),
        reference,
        callbackUrl,
        subaccount: seller.paystack_subaccount_code || undefined,
        // Since we are applying a percentage charge (in Subaccount),
        // the default bearer is 'account' (platform). Let's explicitly set it.
        bearer: 'account',
      });

      if (paystackData && paystackData.data) {
        authorization_url = paystackData.data.authorization_url;
      }
    }

    return {
      message: requiresPaystack
        ? 'Order initiated. Complete payment to finalize.'
        : 'Order placed successfully',
      orderId: order.id.toString(),
      total: order.total_amount.toString(),
      authorization_url,
    };
  }

  async getBuyerOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyer_id: userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                title: true,
                image_urls: true,
                video_url: true,
                seller: {
                  select: {
                    store_name: true,
                    store_link: true,
                    logo_url: true,
                  },
                },
              },
            },
          },
        },
        transaction: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((o) => ({
      ...o,
      id: o.id.toString(),
      buyer_id: o.buyer_id.toString(),
      total_amount: o.total_amount.toString(),
      items: o.items.map((i) => ({
        ...i,
        id: i.id.toString(),
        order_id: i.order_id.toString(),
        product_id: i.product_id.toString(),
        price: i.price.toString(),
      })),
      payment_info: o.transaction
        ? {
            status: o.transaction.status,
            provider: o.transaction.provider,
            reference: o.transaction.reference,
            amount: o.transaction.amount?.toString(),
          }
        : {
            status: o.status === 'PAID' ? 'SUCCESS' : 'PENDING',
            provider: 'CASH_ON_DELIVERY',
          },
    }));
  }

  async getSellerOrders(userId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Find orders containing items from this seller
    // Note: The schema has Order -> OrderItem -> Product -> Seller
    const orders = await this.prisma.order.findMany({
      where: {
        status: { not: 'AWAITING_PAYMENT' }, // Sellers only see orders ready to be processed
        items: {
          some: {
            product: {
              seller_id: seller.id,
            },
          },
        },
      },
      include: {
        items: {
          where: {
            product: {
              seller_id: seller.id,
            },
          },
          include: {
            product: {
              select: {
                title: true,
                image_urls: true,
                video_url: true,
              },
            },
          },
        },
        buyer: {
          select: {
            full_name: true,
            email: true,
          },
        },
        transaction: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return orders.map((o) => ({
      ...o,
      id: o.id.toString(),
      buyer_id: o.buyer_id.toString(),
      total_amount: o.total_amount.toString(),
      items: o.items.map((i) => ({
        ...i,
        id: i.id.toString(),
        order_id: i.order_id.toString(),
        product_id: i.product_id.toString(),
        price: i.price.toString(),
      })),
      payment_info: o.transaction
        ? {
            status: o.transaction.status,
            provider: o.transaction.provider,
            reference: o.transaction.reference,
            amount: o.transaction.amount?.toString(),
          }
        : {
            status: o.status === 'PAID' ? 'SUCCESS' : 'PENDING',
            provider: 'CASH_ON_DELIVERY',
          },
    }));
  }

  async getOrderById(userId: string, orderId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: {
            product: {
              seller_id: seller.id,
            },
          },
          include: {
            product: true,
          },
        },
        buyer: {
          select: {
            full_name: true,
            email: true,
            school: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify ownership (at least one item belongs to seller)
    if (order.items.length === 0) {
      throw new BadRequestException('Unauthorized access to this order');
    }

    return {
      ...order,
      id: order.id.toString(),
      buyer_id: order.buyer_id.toString(),
      total_amount: order.total_amount.toString(),
      items: order.items.map((i) => ({
        ...i,
        id: i.id.toString(),
        order_id: i.order_id.toString(),
        product_id: i.product_id.toString(),
        price: i.price.toString(),
      })),
    };
  }

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Check if order exists and belongs to seller
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: {
            product: {
              seller_id: seller.id,
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.items.length === 0) {
      throw new BadRequestException('Unauthorized access to this order');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    return {
      message: 'Order status updated successfully',
      status: updatedOrder.status,
    };
  }

  async verifyOrderPayment(userId: string, reference: string, orderId: string) {
    if (!reference || !orderId) {
      throw new BadRequestException('reference and order_id are required');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                seller: {
                  select: { user_id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isBuyer = order.buyer_id === userId;
    const isSeller = order.items.some(
      (item: any) => item.product?.seller?.user_id === userId,
    );
    if (!isBuyer && !isSeller) {
      throw new BadRequestException('You are not authorized for this order');
    }

    await this.paymentsService.verifyTransaction(reference);

    const transaction = await this.prisma.transaction.findUnique({
      where: { reference },
      select: { status: true },
    });

    const freshOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    return {
      verified: transaction?.status === 'SUCCESS',
      payment_status: transaction?.status || 'PENDING',
      order_status: freshOrder?.status || order.status,
    };
  }

  async reinitializeOrderPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        items: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyer_id !== userId) {
      throw new BadRequestException('Unauthorized access to this order');
    }

    if (order.status !== 'AWAITING_PAYMENT') {
      throw new BadRequestException('This order is not awaiting payment');
    }

    // Get the seller (assuming all items in an order belong to the same seller context in this flow)
    const seller = order.items[0]?.product?.seller;
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const reference = `ORD_${order.id}_${Date.now()}`;

    // Update or Create Transaction record
    await this.prisma.transaction.upsert({
      where: { order_id: order.id },
      create: {
        order_id: order.id,
        reference,
        amount: order.total_amount,
        provider: 'PAYSTACK',
        status: 'PENDING',
      },
      update: {
        reference,
        status: 'PENDING',
      },
    });

    const webBaseUrl =
      process.env.WEB_APP_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';
    const callbackUrl = `${webBaseUrl}/orders?order_payment=1&reference=${reference}&order_id=${order.id.toString()}`;

    // Call Paystack
    const paystackData = await this.paymentsService.initializeTransaction({
      email: order.buyer.email,
      amount: order.total_amount.toNumber(),
      reference,
      callbackUrl,
      subaccount: seller.paystack_subaccount_code || undefined,
      bearer: 'account',
    });

    if (!paystackData || !paystackData.data) {
      throw new BadRequestException(
        'Failed to initialize payment with Paystack',
      );
    }

    return {
      authorization_url: paystackData.data.authorization_url,
      reference,
    };
  }

  /**
   * Deducts inventory for an order. Called when an order is paid.
   */
  async finalizeOrderInventory(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return;

    // Check if inventory was already deducted (to prevent double deduction)
    // We can use a flag or check if the order status was AWAITING_PAYMENT
    if (order.status !== 'AWAITING_PAYMENT') return;

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.product_id },
          data: {
            quantity_available: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Update status to PAID or PENDING (if it was AWAITING_PAYMENT)
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
    });
  }
}
