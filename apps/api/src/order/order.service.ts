import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: bigint, dto: CreateOrderDto) {
    // 1. Get seller/store
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { store_link: dto.storeLink },
    });

    if (!seller) {
      throw new NotFoundException('Store not found');
    }

    // 2. Fetch products and calculate total
    const productIds = dto.items.map(item => BigInt(item.productId));
    const products = await (this.prisma.product as any).findMany({
      where: {
        id: { in: productIds },
        seller_id: seller.id,
      },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException('One or more products not found or do not belong to this store');
    }

    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

    for (const item of dto.items) {
      const product = products.find(p => p.id === BigInt(item.productId));
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
          status: 'PENDING',
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

      // Update quantity available (optional, but good practice)
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: BigInt(item.productId) },
          data: {
            quantity_available: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newOrder;
    });

    return {
      message: 'Order placed successfully',
      orderId: order.id.toString(),
      total: order.total_amount.toString(),
    };
  }

  async getBuyerOrders(userId: bigint) {
    const orders = await this.prisma.order.findMany({
      where: { buyer_id: userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                title: true,
                image_urls: true,
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    return orders.map(o => ({
      ...o,
      id: o.id.toString(),
      buyer_id: o.buyer_id.toString(),
      total_amount: o.total_amount.toString(),
      items: o.items.map(i => ({
        ...i,
        id: i.id.toString(),
        order_id: i.order_id.toString(),
        product_id: i.product_id.toString(),
        price: i.price.toString(),
      }))
    }));
  }

  async getSellerOrders(userId: bigint) {
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
        items: {
          some: {
            product: {
              seller_id: seller.id,
            }
          }
        }
      },
      include: {
        items: {
          where: {
            product: {
              seller_id: seller.id,
            }
          },
          include: {
            product: {
              select: {
                title: true,
                image_urls: true,
                video_url: true,
              }
            }
          }
        },
        buyer: {
          select: {
            full_name: true,
            email: true,
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    return orders.map(o => ({
      ...o,
      id: o.id.toString(),
      buyer_id: o.buyer_id.toString(),
      total_amount: o.total_amount.toString(),
      items: o.items.map(i => ({
        ...i,
        id: i.id.toString(),
        order_id: i.order_id.toString(),
        product_id: i.product_id.toString(),
        price: i.price.toString(),
      }))
    }));
  }

  async getOrderById(userId: bigint, orderId: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      include: {
        items: {
          where: {
            product: {
              seller_id: seller.id,
            }
          },
          include: {
            product: true
          }
        },
        buyer: {
          select: {
            full_name: true,
            email: true,
            school: true,
          }
        }
      }
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
      items: order.items.map(i => ({
        ...i,
        id: i.id.toString(),
        order_id: i.order_id.toString(),
        product_id: i.product_id.toString(),
        price: i.price.toString(),
      }))
    };
  }

  async updateOrderStatus(userId: bigint, orderId: string, status: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });

    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    // Check if order exists and belongs to seller
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      include: {
        items: {
          where: {
            product: {
              seller_id: seller.id,
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.items.length === 0) {
      throw new BadRequestException('Unauthorized access to this order');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: BigInt(orderId) },
      data: { status },
    });

    return {
      message: 'Order status updated successfully',
      status: updatedOrder.status,
    };
  }
}
