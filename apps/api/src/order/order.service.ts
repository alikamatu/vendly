import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private notifications: NotificationService,
  ) { }

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

    // 2. Fetch products + any referenced variants and calculate total.
    const productIds = dto.items.map((item) => item.productId);
    const variantIds = dto.items
      .map((i) => i.variantId)
      .filter((v): v is string => Boolean(v));

    const [products, variants] = await Promise.all([
      (this.prisma.product as any).findMany({
        where: { id: { in: productIds }, seller_id: seller.id },
      }),
      variantIds.length
        ? (this.prisma as any).productVariant.findMany({
            where: { id: { in: variantIds } },
          })
        : Promise.resolve([] as any[]),
    ]);

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more products not found or do not belong to this store',
      );
    }

    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      let unitPrice: Prisma.Decimal = product.price;
      let variantId: string | null = null;

      if (item.variantId) {
        const variant = variants.find((v: any) => v.id === item.variantId);
        if (!variant || variant.product_id !== product.id) {
          throw new BadRequestException(
            `Variant ${item.variantId} not found for product ${product.id}`,
          );
        }
        if (!variant.is_active) {
          throw new BadRequestException('Selected variant is no longer available');
        }
        if (variant.quantity_available < item.quantity) {
          throw new BadRequestException(
            `Only ${variant.quantity_available} of this variant available`,
          );
        }
        if (variant.price) unitPrice = variant.price;
        variantId = variant.id;
      } else {
        // No variant chosen — if product has active variants, require selection.
        const hasActiveVariants = variants.some(
          (v: any) => v.product_id === product.id && v.is_active,
        );
        // Fall back to a fresh check only when caller passed none for this product.
        if (!hasActiveVariants && variantIds.length === 0) {
          const anyVariant = await (this.prisma as any).productVariant.findFirst({
            where: { product_id: product.id, is_active: true },
            select: { id: true },
          });
          if (anyVariant) {
            throw new BadRequestException(
              `Product ${product.title} requires a variant selection`,
            );
          }
        }
      }

      const subtotal = unitPrice.mul(item.quantity);
      totalAmount = totalAmount.add(subtotal);

      orderItemsData.push({
        product_id: product.id,
        variant_id: variantId,
        quantity: item.quantity,
        price: unitPrice,
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
          if (item.variantId) {
            await (tx as any).productVariant.update({
              where: { id: item.variantId },
              data: { quantity_available: { decrement: item.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { quantity_available: { decrement: item.quantity } },
            });
          }
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

    // In-app notifications (fire-and-forget; helper swallows errors).
    const orderNumber = `ORD-${order.id.slice(-6).toUpperCase()}`;
    await this.notifications.create({
      userId,
      type: 'ORDER_PLACED' as any,
      title: `Order ${orderNumber} ${requiresPaystack ? 'initiated' : 'placed'}`,
      body: requiresPaystack
        ? `Complete payment to confirm your order with ${seller.store_name}.`
        : `Your order with ${seller.store_name} has been placed.`,
      link: `/orders`,
      data: { orderId: order.id, total: order.total_amount.toString() },
    });
    if (!requiresPaystack && seller.user_id) {
      // Pro-only: in-app new-order alerts are a Pro perk for sellers.
      await this.notifySellerOfNewOrder({
        sellerUserId: seller.user_id,
        orderId: order.id,
        orderNumber,
        buyerName: buyer.full_name,
        buyerId: userId,
      });
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
                id: true,
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
                id: true,
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
        return_request: true,
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
      return_request: (o as any).return_request,
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
        return_request: true,
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
      return_request: order.return_request,
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

  /**
   * Buyer-initiated cancellation. Allowed only while the order is still pending
   * or awaiting payment — once paid/processing, the buyer must use the return
   * flow or contact the seller. Restores quantity for COD orders (where stock
   * was already decremented at creation).
   */
  async cancelOrderByBuyer(
    userId: string,
    orderId: string,
    reason?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { select: { id: true, seller: { select: { user_id: true, store_name: true } } } } } },
        transaction: { select: { status: true, provider: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyer_id !== userId) {
      throw new ForbiddenException('You cannot cancel this order');
    }

    const CANCELLABLE = ['PENDING', 'AWAITING_PAYMENT'];
    if (!CANCELLABLE.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel an order in status ${order.status}. Contact the seller or open a return.`,
      );
    }

    // Don't allow cancel if payment already succeeded.
    if (order.transaction?.status === 'SUCCESS') {
      throw new BadRequestException(
        'Payment has already been processed. Please open a return request.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Restore stock only for COD orders where it was decremented.
      const isCOD = !order.transaction;
      if (isCOD && order.status === 'PENDING') {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.product_id },
            data: { quantity_available: { increment: item.quantity } },
          });
        }
      }
      return tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
    });

    // Notify the seller(s).
    const orderNumber = `ORD-${orderId.slice(-6).toUpperCase()}`;
    const sellerUserIds = Array.from(
      new Set(
        order.items
          .map((i) => i.product?.seller?.user_id)
          .filter((x): x is string => Boolean(x)),
      ),
    );
    for (const sellerUserId of sellerUserIds) {
      await this.notifications.create({
        userId: sellerUserId,
        type: 'ORDER_CANCELLED' as any,
        title: `Order ${orderNumber} cancelled by buyer`,
        body: reason
          ? `Buyer cancelled the order. Reason: ${reason}`
          : 'Buyer cancelled the order before it was processed.',
        link: `/dashboard/orders`,
        data: { orderId, reason: reason ?? null },
      });
    }

    return {
      message: 'Order cancelled',
      status: updated.status,
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

    // Fire the seller "new paid order" notification once payment succeeds.
    // (For COD orders, this fires at creation time in createOrder above.)
    if (transaction?.status === 'SUCCESS' && freshOrder?.status === 'PAID') {
      await this.notifyAllSellersForPaidOrder(orderId);
    }

    return {
      verified: transaction?.status === 'SUCCESS',
      payment_status: transaction?.status || 'PENDING',
      order_status: freshOrder?.status || order.status,
    };
  }

  /**
   * Per-product seller notification gate. Pro-only feature — non-Pro sellers
   * still get email/order-list updates, but the in-app bell is reserved for
   * Pro subscribers as a perk.
   */
  private async notifySellerOfNewOrder(args: {
    sellerUserId: string;
    orderId: string;
    orderNumber: string;
    buyerName: string | null | undefined;
    buyerId: string;
  }) {
    const sellerUser = await this.prisma.user.findUnique({
      where: { id: args.sellerUserId },
      select: { is_pro: true, pro_expires_at: true },
    });
    if (!sellerUser?.is_pro) return;
    // Honor expiry if set.
    if (
      sellerUser.pro_expires_at &&
      sellerUser.pro_expires_at.getTime() < Date.now()
    ) {
      return;
    }
    await this.notifications.create({
      userId: args.sellerUserId,
      type: 'ORDER_PLACED' as any,
      title: `New order ${args.orderNumber}`,
      body: `${args.buyerName || 'A customer'} placed an order with your store.`,
      link: `/dashboard/orders`,
      data: { orderId: args.orderId, buyerId: args.buyerId },
    });
  }

  private async notifyAllSellersForPaidOrder(orderId: string) {
    const orderNumber = `ORD-${orderId.slice(-6).toUpperCase()}`;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { id: true, full_name: true } },
        items: {
          include: {
            product: {
              select: { seller: { select: { user_id: true } } },
            },
          },
        },
      },
    });
    if (!order) return;
    const sellerUserIds = Array.from(
      new Set(
        order.items
          .map((i: any) => i.product?.seller?.user_id)
          .filter((x: any): x is string => Boolean(x)),
      ),
    );
    for (const sellerUserId of sellerUserIds) {
      await this.notifySellerOfNewOrder({
        sellerUserId,
        orderId,
        orderNumber,
        buyerName: order.buyer?.full_name ?? null,
        buyerId: order.buyer_id,
      });
    }
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

  async getBuyerOrderById(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                image_urls: true,
                video_url: true,
                price: true,
                seller: {
                  select: {
                    store_name: true,
                    store_link: true,
                    logo_url: true,
                    whatsapp_number: true,
                  },
                },
              },
            },
          },
        },
        transaction: true,
        return_request: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyer_id !== buyerId) {
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
      payment_info: order.transaction
        ? {
          status: order.transaction.status,
          provider: order.transaction.provider,
          reference: order.transaction.reference,
          amount: order.transaction.amount?.toString(),
        }
        : {
          status: order.status === 'PAID' ? 'SUCCESS' : 'PENDING',
          provider: 'CASH_ON_DELIVERY',
        },
    };
  }

  async createReturnRequest(
    buyerId: string,
    orderId: string,
    dto: {
      reason: string;
      description: string;
      photo_urls?: string[];
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { return_request: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.buyer_id !== buyerId) {
      throw new BadRequestException('Unauthorized access to this order');
    }

    const returnableStatuses = [
      'DELIVERED',
      'COMPLETED',
      'PAID',
      'FULFILLED',
    ];
    if (!returnableStatuses.includes(order.status.toUpperCase())) {
      throw new BadRequestException(
        'Returns can only be requested for delivered or completed orders',
      );
    }

    if (order.return_request) {
      throw new BadRequestException(
        'A return request already exists for this order',
      );
    }

    // Check 7-day window
    const daysSinceOrder = Math.floor(
      (Date.now() - order.created_at.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceOrder > 7) {
      throw new BadRequestException(
        'Return requests must be submitted within 7 days of order placement',
      );
    }

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        order_id: orderId,
        buyer_id: buyerId,
        reason: dto.reason as any,
        description: dto.description,
        photo_urls: dto.photo_urls || [],
      },
    });

    return {
      message: 'Return request submitted successfully',
      returnRequest,
    };
  }

  async updateReturnRequestStatus(
    userId: string,
    orderId: string,
    status: 'APPROVED' | 'REJECTED',
    sellerResponse?: string,
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        return_request: true,
        items: {
          where: { product: { seller_id: seller.id } },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.items.length === 0) {
      throw new BadRequestException('Unauthorized access to this order');
    }

    if (!order.return_request) {
      throw new BadRequestException('No return request exists for this order');
    }

    const returnRequest = await this.prisma.returnRequest.update({
      where: { id: order.return_request.id },
      data: {
        status,
        seller_response: sellerResponse,
      },
    });

    return {
      message: `Return request ${status.toLowerCase()}`,
      returnRequest,
    };
  }
}
