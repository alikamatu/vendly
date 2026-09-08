import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { NotificationService } from '../notification/notification.service';
import { SmsClient } from '../auth/arkesel.client';
import { EmailService } from '../email/email.service';
import { OrderEventsService } from '../events/order-events.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private notifications: NotificationService,
    private sms: SmsClient,
    private emailService: EmailService,
    private orderEvents: OrderEventsService,
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

      // Reject orders for products that have been pulled from the catalogue.
      if (product.status && product.status !== 'published' && product.status !== 'active') {
        throw new BadRequestException(
          `${product.title} is no longer available.`,
        );
      }

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
        if (variant.quantity_available <= 0) {
          throw new BadRequestException(
            `${product.title} is out of stock.`,
          );
        }
        if (variant.quantity_available < item.quantity) {
          throw new BadRequestException(
            `Only ${variant.quantity_available} of this variant available`,
          );
        }
        if (variant.price) unitPrice = variant.price;
        variantId = variant.id;
      } else {
        // Product-level stock check. Without this, a buyer could place an
        // order on a product whose `quantity_available` is already 0 or
        // negative — the unconditional decrement below would drive it
        // further negative. Validate up front so the seller sees a
        // 4xx rather than a corrupted inventory count.
        if (typeof product.quantity_available === 'number') {
          if (product.quantity_available <= 0) {
            throw new BadRequestException(
              `${product.title} is out of stock.`,
            );
          }
          if (product.quantity_available < item.quantity) {
            throw new BadRequestException(
              `Only ${product.quantity_available} of "${product.title}" left.`,
            );
          }
        }
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

      // Update quantity available only if it's NOT a Paystack order (e.g. COD).
      // For Paystack, we deduct ONLY after successful payment verification.
      //
      // Guard against negative stock under race conditions: we run the
      // decrement scoped to rows where the current quantity is still
      // >= the requested amount. If `updateMany` reports zero rows
      // updated, another concurrent order claimed the last units in the
      // window between our validation above and this write — fail the
      // transaction with a clean 4xx instead of letting the count slip
      // into negative territory.
      if (!requiresPaystack) {
        for (const item of dto.items) {
          if (item.variantId) {
            const updated = await (tx as any).productVariant.updateMany({
              where: {
                id: item.variantId,
                quantity_available: { gte: item.quantity },
              },
              data: { quantity_available: { decrement: item.quantity } },
            });
            if (updated.count === 0) {
              throw new BadRequestException(
                'Sorry — someone else just bought the last of that item.',
              );
            }
          } else {
            const updated = await tx.product.updateMany({
              where: {
                id: item.productId,
                quantity_available: { gte: item.quantity },
              },
              data: { quantity_available: { decrement: item.quantity } },
            });
            if (updated.count === 0) {
              throw new BadRequestException(
                'Sorry — that item just sold out.',
              );
            }
          }
        }
      }

      return newOrder;
    });

    let authorization_url: string | null = null;
    let access_code: string | null = null;
    let reference: string | undefined = undefined;

    if (requiresPaystack) {
      // Create a Transaction record
      reference = `ORD_${order.id}_${Date.now()}`;
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

      const buyerEmail =
        buyer.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim())
          ? buyer.email.trim()
          : 'customer@verndly.com';

      // Call Paystack
      const paystackData = await this.paymentsService.initializeTransaction({
        email: buyerEmail,
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
        access_code = paystackData.data.access_code || null;
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

    if (!requiresPaystack) {
      // Send buyer confirmation and vendor order alert emails for Cash on Delivery / Pay on Delivery orders
      this.sendOrderPlacedEmails(order.id).catch((err) =>
        console.error(`Failed to send order placed emails for ${order.id}:`, err),
      );
    }

    // Real-time synchronization across system
    this.orderEvents.emit({
      type: 'order.created',
      orderId: order.id,
      orderNumber,
      status: order.status,
      buyerId: userId,
      sellerUserIds: [seller.user_id],
      total: order.total_amount.toString(),
      customerName: dto.customerName,
      reference: reference || undefined,
      timestamp: new Date().toISOString(),
    });

    return {
      message: requiresPaystack
        ? 'Order initiated. Complete payment to finalize.'
        : 'Order placed successfully',
      orderId: order.id.toString(),
      total: order.total_amount.toString(),
      authorization_url,
      access_code,
      reference,
    };
  }

  async getBuyerOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyer_id: userId },
      include: {
        buyer: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone_e164: true,
          },
        },
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
          provider_ref: o.transaction.provider_ref,
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
          provider_ref: o.transaction.provider_ref,
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
        transaction: true,
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
      payment_info: order.transaction
        ? {
            status: order.transaction.status,
            provider: order.transaction.provider,
            reference: order.transaction.reference,
            provider_ref: order.transaction.provider_ref,
            amount: order.transaction.amount?.toString(),
          }
        : {
            status: order.status === 'PAID' ? 'SUCCESS' : 'PENDING',
            provider: 'CASH_ON_DELIVERY',
          },
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

    const orderNumber = `ORD-${orderId.slice(-6).toUpperCase()}`;

    // In-app notification for buyer
    await this.notifications.create({
      userId: order.buyer_id,
      type: 'ORDER_STATUS_CHANGED' as any,
      title: `Order ${orderNumber} is now ${status.replace(/_/g, ' ')}`,
      body: `Your order status has been updated to ${status.replace(/_/g, ' ')}.`,
      link: `/orders/${orderId}`,
      data: { orderId, status },
    });

    // Real-time synchronization event across system
    this.orderEvents.emit({
      type: 'order.status_updated',
      orderId,
      orderNumber,
      status,
      buyerId: order.buyer_id,
      sellerUserIds: [seller.user_id],
      total: order.total_amount.toString(),
      customerName: order.customer_name || undefined,
      timestamp: new Date().toISOString(),
    });

    // Trigger rich status email with product images and order details to buyer (and seller if cancelled)
    this.sendOrderStatusEmails(orderId, status).catch((err) =>
      console.error(`Failed to send status email for order ${orderId}:`, err),
    );

    return {
      message: 'Order status updated successfully',
      status: updatedOrder.status,
    };
  }

  async updateOrderPaymentStatus(
    userId: string,
    orderId: string,
    dto: {
      payment_status: 'PAID' | 'PENDING' | 'FAILED';
      payment_method: 'PAYSTACK' | 'CASH' | 'CASH_ON_DELIVERY';
      reference?: string;
    },
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'ADMIN';

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                seller_id: true,
                title: true,
                image_urls: true,
                seller: { select: { user_id: true, store_name: true } },
              },
            },
          },
        },
        transaction: true,
        buyer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin) {
      if (!seller) throw new NotFoundException('Seller profile not found');
      const ownsItem = order.items.some(
        (it) => it.product?.seller_id === seller.id,
      );
      if (!ownsItem)
        throw new BadRequestException('Unauthorized access to this order');
    }

    let providerRef: string | null = order.transaction?.provider_ref || null;
    let finalReference =
      dto.reference?.trim() ||
      order.transaction?.reference ||
      `ORD_${orderId}_${Date.now()}`;

    // If Online / Paystack and reference is supplied, query / verify Paystack to get the real Paystack Transaction ID
    if (dto.payment_method === 'PAYSTACK') {
      if (dto.reference?.trim()) {
        try {
          const paystackVerify = await this.paymentsService.verifyTransaction(
            dto.reference.trim(),
          );
          if (paystackVerify?.data?.id) {
            providerRef = paystackVerify.data.id.toString();
          }
        } catch (err) {
          this.logger.warn(
            `Could not verify Paystack reference ${dto.reference}: ${err}`,
          );
        }
      }
    } else if (
      dto.payment_method === 'CASH' ||
      dto.payment_method === 'CASH_ON_DELIVERY'
    ) {
      if (!dto.reference?.trim()) {
        finalReference = `CASH_${orderId}_${Date.now()}`;
      }
    }

    const txStatus =
      dto.payment_status === 'PAID' ? 'SUCCESS' : dto.payment_status;

    // Upsert transaction
    const transaction = await this.prisma.transaction.upsert({
      where: { order_id: orderId },
      create: {
        order_id: orderId,
        reference: finalReference,
        amount: order.total_amount,
        status: txStatus,
        provider: dto.payment_method,
        provider_ref: providerRef,
      },
      update: {
        status: txStatus,
        provider: dto.payment_method,
        reference: finalReference,
        ...(providerRef ? { provider_ref: providerRef } : {}),
      },
    });

    // Update order status if marked paid
    let newOrderStatus = order.status;
    if (
      dto.payment_status === 'PAID' &&
      (order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT')
    ) {
      newOrderStatus = 'PAID';
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
    }

    const orderNumber = `ORD-${orderId.slice(-6).toUpperCase()}`;

    if (dto.payment_status === 'PAID') {
      // Finalize inventory if not already finalized
      await this.prisma
        .$transaction(async (tx) => {
          for (const item of order.items) {
            if (item.variant_id) {
              await tx.productVariant.update({
                where: { id: item.variant_id },
                data: { quantity_available: { decrement: item.quantity } },
              });
            }
            await tx.product.update({
              where: { id: item.product_id },
              data: { quantity_available: { decrement: item.quantity } },
            });
          }
        })
        .catch(() => {});

      // Settle ledger, 4% platform fee and vendor balance records
      await this.paymentsService
        .createOrderSettlementRecords(transaction.id, finalReference)
        .catch((err) => {
          this.logger.error(
            `Failed to create settlement records for order ${orderId}: ${err}`,
          );
        });

      // In-app notification for buyer
      await this.notifications.create({
        userId: order.buyer_id,
        type: 'ORDER_STATUS_CHANGED' as any,
        title: `Payment recorded for ${orderNumber}`,
        body: `Payment for order ${orderNumber} was marked as received (${dto.payment_method === 'PAYSTACK' ? 'Online' : 'Cash'}).`,
        link: `/orders/${orderId}`,
        data: { orderId, reference: finalReference },
      });

      // Real-time event
      const sellerUserIds = Array.from(
        new Set(
          order.items
            .map((i: any) => i.product?.seller?.user_id)
            .filter((x: any): x is string => Boolean(x)),
        ),
      );

      this.orderEvents.emit({
        type: 'order.paid',
        orderId: order.id,
        orderNumber,
        status: newOrderStatus,
        buyerId: order.buyer_id,
        sellerUserIds,
        total: order.total_amount.toString(),
        customerName:
          order.customer_name || order.buyer?.full_name || 'Customer',
        reference: finalReference,
        timestamp: new Date().toISOString(),
      });

      // Send payment receipt email
      if (order.buyer?.email) {
        this.emailService
          .sendPaymentReceiptEmail(order.buyer.email, {
            orderNumber,
            date: order.created_at,
            customerName:
              order.customer_name || order.buyer?.full_name || 'Customer',
            customerEmail: order.buyer?.email,
            customerPhone: order.customer_phone || undefined,
            deliveryMethod: order.delivery_method || undefined,
            deliveryLocation: order.delivery_location || undefined,
            deliveryNotes: order.delivery_notes || undefined,
            storeName:
              order.items[0]?.product?.seller?.store_name || 'Verndly Store',
            items: order.items.map((it: any) => ({
              title: it.product?.title || 'Product',
              quantity: it.quantity,
              price: it.price.toString(),
              image_url: it.product?.image_urls?.[0] || null,
            })),
            subtotal: order.total_amount.toString(),
            total: order.total_amount.toString(),
            paymentMethod:
              dto.payment_method === 'PAYSTACK'
                ? 'Paystack (Online)'
                : 'Cash / Cash on Delivery',
            paymentReference: finalReference,
            isPaid: true,
            orderId: order.id,
            transactionId: transaction.id,
          })
          .catch((err) =>
            this.logger.error('Failed to send payment receipt email', err),
          );
      }
    }

    return {
      message: 'Order payment status updated successfully',
      order: {
        ...order,
        status: newOrderStatus,
        payment_info: {
          status: transaction.status,
          provider: transaction.provider,
          reference: transaction.reference,
          provider_ref: transaction.provider_ref,
          amount: transaction.amount?.toString(),
        },
      },
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

    // Trigger rich cancellation email to buyer and seller(s)
    this.sendOrderStatusEmails(orderId, 'CANCELLED', reason, { cancelledBy: 'buyer' }).catch((err) =>
      console.error(`Failed to send cancellation emails for order ${orderId}:`, err),
    );

    // Real-time event for cancellation
    this.orderEvents.emit({
      type: 'order.cancelled',
      orderId,
      orderNumber,
      status: 'CANCELLED',
      buyerId: userId,
      sellerUserIds,
      total: order.total_amount ? order.total_amount.toString() : '0',
      timestamp: new Date().toISOString(),
    });

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
      this.sendOrderPlacedEmails(orderId).catch((err) =>
        console.error(`Failed to send paid order confirmation emails for ${orderId}:`, err),
      );

      const orderNumber = `ORD-${orderId.slice(-6).toUpperCase()}`;
      const sellerUserIds = Array.from(
        new Set(
          order.items
            .map((i: any) => i.product?.seller?.user_id)
            .filter((x): x is string => Boolean(x)),
        ),
      );
      this.orderEvents.emit({
        type: 'order.paid',
        orderId,
        orderNumber,
        status: 'PAID',
        buyerId: order.buyer_id,
        sellerUserIds,
        total: order.total_amount ? order.total_amount.toString() : '0',
        reference,
        timestamp: new Date().toISOString(),
      });
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
      select: {
        is_pro: true,
        pro_expires_at: true,
        phone_e164: true,
        full_name: true,
      },
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

    // Pro-only SMS alert. Fire-and-forget — failures shouldn't roll back
    // order processing. Skipped silently when the seller hasn't saved a
    // phone number yet (legacy accounts pre-dating the required-phone
    // signup flow).
    if (sellerUser.phone_e164) {
      const firstName =
        (args.buyerName || 'A customer').split(' ')[0] || 'A customer';
      const message =
        `Verndly: new order ${args.orderNumber} from ${firstName}. ` +
        `Open your dashboard to fulfil it.`;
      this.sms
        .sendSms(sellerUser.phone_e164, message)
        .catch((err) =>
          console.error('Failed to send order SMS to seller', err),
        );
    }
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

    const buyerEmail =
      order.buyer?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.buyer.email.trim())
        ? order.buyer.email.trim()
        : 'customer@verndly.com';

    // Call Paystack
    const paystackData = await this.paymentsService.initializeTransaction({
      email: buyerEmail,
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
      access_code: paystackData.data.access_code || null,
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
        buyer: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone_e164: true,
          },
        },
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
          provider_ref: order.transaction.provider_ref,
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
    status: 'APPROVED' | 'REJECTED' | 'REFUNDED',
    sellerResponse?: string,
    refundNow?: boolean,
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

    const effectiveStatus =
      status === 'REFUNDED' || refundNow ? 'REFUNDED' : status;

    const returnRequest = await this.prisma.returnRequest.update({
      where: { id: order.return_request.id },
      data: {
        status: effectiveStatus,
        seller_response: sellerResponse,
      },
    });

    if (refundNow || status === 'REFUNDED') {
      await this.paymentsService.refundTransaction({
        orderId,
        reason: sellerResponse || 'Seller approved return and refund',
        actor: { id: userId, role: 'SELLER' as any },
      });
    } else {
      const orderNumber = `ORD-${orderId.slice(-6).toUpperCase()}`;
      await this.notifications
        .create({
          userId: order.buyer_id,
          type: 'RETURN_UPDATED' as any,
          title: `Return request ${status.toLowerCase()} for ${orderNumber}`,
          body: sellerResponse
            ? `Seller note: "${sellerResponse}"`
            : `Your return request was ${status.toLowerCase()} by the seller.`,
          link: `/orders/${orderId}`,
          data: { orderId, status },
        })
        .catch(() => {});
    }

    return {
      message: `Return request ${effectiveStatus.toLowerCase()}`,
      returnRequest,
    };
  }

  async escalateReturnRequest(
    userId: string,
    orderId: string,
    disputeReason: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        return_request: true,
        items: {
          include: {
            product: { select: { seller: { select: { user_id: true } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyer_id !== userId) {
      throw new ForbiddenException('Unauthorized access to this order');
    }

    if (!order.return_request) {
      throw new BadRequestException('No return request exists for this order');
    }

    const returnRequest = await this.prisma.returnRequest.update({
      where: { id: order.return_request.id },
      data: {
        status: 'ESCALATED',
        description: `${order.return_request.description}\n\n[ESCALATION NOTE]: ${disputeReason}`,
      },
    });

    const orderNumber = `ORD-${orderId.slice(-6).toUpperCase()}`;
    const sellerUserIds = Array.from(
      new Set(
        order.items
          .map((i: any) => i.product?.seller?.user_id)
          .filter((x): x is string => Boolean(x)),
      ),
    );

    for (const sUserId of sellerUserIds) {
      await this.notifications
        .create({
          userId: sUserId,
          type: 'RETURN_UPDATED' as any,
          title: `Dispute Escalated for ${orderNumber}`,
          body: `Buyer escalated return dispute to Verndly Support: "${disputeReason}"`,
          link: `/dashboard/orders/${orderId}`,
          data: { orderId, disputeReason },
        })
        .catch(() => {});
    }

    this.orderEvents.emit({
      type: 'order.return_updated',
      orderId,
      orderNumber,
      status: 'ESCALATED',
      buyerId: userId,
      sellerUserIds,
      total: order.total_amount?.toString() || '0',
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Dispute escalated to Verndly Trust & Safety',
      returnRequest,
    };
  }

  async confirmReturnReceivedAndRefund(
    userId: string,
    orderId: string,
    note?: string,
  ) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        return_request: true,
        items: { where: { product: { seller_id: seller.id } } },
      },
    });
    if (!order || order.items.length === 0) {
      throw new BadRequestException('Unauthorized access to this order');
    }

    return this.paymentsService.refundTransaction({
      orderId,
      reason:
        note ||
        'Seller confirmed returned item receipt and authorized refund',
      actor: { id: userId, role: 'SELLER' as any },
    });
  }

  /**
   * Dispatches professional order confirmation emails:
   * 1. Buyer order confirmation (with item thumbnails, variants, breakdown, delivery details)
   * 2. Vendor new sale alert (with buyer contact, WhatsApp quick action, and store items)
   */
  async sendOrderPlacedEmails(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: true,
          transaction: true,
          items: {
            include: {
              product: {
                include: {
                  seller: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!order) return;

      const orderNumber = `ORD-${order.id.slice(-6).toUpperCase()}`;
      const customerName =
        order.customer_name || order.buyer?.full_name || 'Customer';

      const formatVariantDesc = (variant: any): string | null => {
        if (!variant || !variant.attributes) return null;
        try {
          const attrs =
            typeof variant.attributes === 'string'
              ? JSON.parse(variant.attributes)
              : variant.attributes;
          if (attrs && typeof attrs === 'object') {
            const entries = Object.entries(attrs).filter(
              ([, v]) => v != null && String(v).trim() !== '',
            );
            if (entries.length > 0) {
              return entries.map(([k, v]) => `${k}: ${v}`).join(' • ');
            }
          }
        } catch {}
        return null;
      };

      const buyerItems = order.items.map((item: any) => ({
        title: item.product?.title || 'Product',
        quantity: item.quantity,
        price: item.price.toString(),
        image_url:
          item.variant?.image_url ||
          item.product?.image_urls?.[0] ||
          null,
        variantDescription: formatVariantDesc(item.variant),
      }));

      const isPaid =
        order.transaction?.status === 'SUCCESS' || order.status === 'PAID';
      const paymentMethod =
        order.transaction?.provider === 'PAYSTACK'
          ? 'Paystack (Paid Online)'
          : 'Cash on Delivery (Pay on Delivery)';

      const buyerOrderData = {
        orderNumber,
        date: order.created_at,
        customerName,
        customerEmail: order.buyer?.email,
        customerPhone: order.customer_phone || undefined,
        deliveryMethod: order.delivery_method || undefined,
        deliveryLocation: order.delivery_location || undefined,
        deliveryNotes: order.delivery_notes || undefined,
        storeName:
          order.items[0]?.product?.seller?.store_name || 'Verndly Store',
        storeLink: order.items[0]?.product?.seller?.store_link || undefined,
        items: buyerItems,
        subtotal: order.total_amount.toString(),
        total: order.total_amount.toString(),
        currency: 'GHS',
        paymentMethod,
        paymentReference: order.transaction?.reference || undefined,
        isPaid,
      };

      // 1. Send confirmation to buyer
      if (order.buyer?.email) {
        this.emailService
          .sendOrderConfirmation(order.buyer.email, buyerOrderData)
          .catch((err) =>
            console.error(`Failed to send order confirmation to ${order.buyer?.email}:`, err),
          );
      }

      // 2. Group items per seller & send new sale alert to each vendor
      const sellerGroups = new Map<
        string,
        {
          email: string;
          storeName: string;
          storeLink?: string;
          items: typeof buyerItems;
        }
      >();

      for (const item of order.items as any[]) {
        const seller = item.product?.seller;
        const sellerUser = seller?.user;
        if (!sellerUser?.email) continue;

        const email = sellerUser.email;
        let group = sellerGroups.get(email);
        if (!group) {
          group = {
            email,
            storeName: seller?.store_name || 'Your Store',
            storeLink: seller?.store_link,
            items: [],
          };
          sellerGroups.set(email, group);
        }

        group.items.push({
          title: item.product?.title || 'Product',
          quantity: item.quantity,
          price: item.price.toString(),
          image_url:
            item.variant?.image_url ||
            item.product?.image_urls?.[0] ||
            null,
          variantDescription: formatVariantDesc(item.variant),
        });
      }

      for (const group of sellerGroups.values()) {
        const sellerTotal = group.items.reduce(
          (sum, it) => sum + Number(it.price) * it.quantity,
          0,
        );

        this.emailService
          .sendSellerOrderNotification(group.email, {
            ...buyerOrderData,
            storeName: group.storeName,
            storeLink: group.storeLink,
            items: group.items,
            subtotal: sellerTotal.toFixed(2),
            total: sellerTotal.toFixed(2),
          })
          .catch((err) =>
            console.error(`Failed to send seller order notification to ${group.email}:`, err),
          );
      }
    } catch (error) {
      console.error(`Error in sendOrderPlacedEmails for order ${orderId}:`, error);
    }
  }

  /**
   * Dispatches rich status update emails:
   * 1. Buyer status email (with product thumbnails, details, delivery info, and tracking CTA)
   * 2. Vendor status alert (especially when cancelled by buyer or admin)
   */
  async sendOrderStatusEmails(
    orderId: string,
    status: string,
    reason?: string | null,
    opts?: { cancelledBy?: 'buyer' | 'seller' | 'admin' },
  ) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: true,
          transaction: true,
          items: {
            include: {
              product: {
                include: {
                  seller: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
              variant: true,
            },
          },
        },
      });

      if (!order) return;

      const orderNumber = `ORD-${order.id.slice(-6).toUpperCase()}`;
      const customerName =
        order.customer_name || order.buyer?.full_name || 'Customer';

      const formatVariantDesc = (variant: any): string | null => {
        if (!variant || !variant.attributes) return null;
        try {
          const attrs =
            typeof variant.attributes === 'string'
              ? JSON.parse(variant.attributes)
              : variant.attributes;
          if (attrs && typeof attrs === 'object') {
            const entries = Object.entries(attrs).filter(
              ([, v]) => v != null && String(v).trim() !== '',
            );
            if (entries.length > 0) {
              return entries.map(([k, v]) => `${k}: ${v}`).join(' • ');
            }
          }
        } catch {}
        return null;
      };

      const items = order.items.map((item: any) => ({
        title: item.product?.title || 'Product',
        quantity: item.quantity,
        price: item.price.toString(),
        image_url:
          item.variant?.image_url ||
          item.product?.image_urls?.[0] ||
          null,
        variantDescription: formatVariantDesc(item.variant),
      }));

      const storeName =
        order.items[0]?.product?.seller?.store_name || 'Verndly Store';
      const storeLink =
        order.items[0]?.product?.seller?.store_link || undefined;

      const statusData = {
        orderNumber,
        date: order.created_at,
        customerName,
        customerPhone: order.customer_phone || undefined,
        storeName,
        storeLink,
        status,
        items,
        subtotal: order.total_amount.toString(),
        total: order.total_amount.toString(),
        currency: 'GHS',
        deliveryMethod: order.delivery_method || undefined,
        deliveryLocation: order.delivery_location || undefined,
        deliveryNotes: order.delivery_notes || undefined,
        reason: reason ?? null,
        cancelledBy: opts?.cancelledBy,
      };

      // 1. Notify buyer
      if (order.buyer?.email) {
        this.emailService
          .sendOrderStatusUpdate(order.buyer.email, statusData)
          .catch((err) =>
            console.error(`Failed to send order status email to ${order.buyer?.email}:`, err),
          );
      }

      // 2. If cancelled (by buyer or admin), notify vendor(s)
      const normStatus = status.trim().toUpperCase();
      if (normStatus === 'CANCELLED') {
        const sellerEmails = Array.from(
          new Set(
            order.items
              .map((i: any) => i.product?.seller?.user?.email)
              .filter((e): e is string => Boolean(e)),
          ),
        );

        for (const email of sellerEmails) {
          this.emailService
            .sendSellerOrderStatusNotification(email, statusData)
            .catch((err) =>
              console.error(`Failed to send cancellation alert to seller ${email}:`, err),
            );
        }
      }
    } catch (error) {
      console.error(`Error in sendOrderStatusEmails for order ${orderId}:`, error);
    }
  }
}
