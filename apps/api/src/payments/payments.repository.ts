import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private isMissingColumnError(error: unknown): boolean {
    const e = error as { code?: string; message?: string };
    return (
      e?.code === 'P2022' || Boolean(e?.message?.includes('does not exist'))
    );
  }

  async findTransactionByReference(reference: string) {
    return this.prisma.transaction.findUnique({
      where: { reference },
      include: { order: true },
    });
  }

  async updateTransactionStatus(
    id: string,
    status: string,
    providerRef?: string,
  ) {
    return this.prisma.transaction.update({
      where: { id },
      data: {
        status,
        ...(providerRef && { provider_ref: providerRef }),
      },
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async finalizeOrderInventory(orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch order with items
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order || order.status !== 'AWAITING_PAYMENT') {
        return;
      }

      // 2. Deduct inventory
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

      // 3. Mark as PAID (which also moves it out of AWAITING_PAYMENT)
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
    });
  }

  async findOrderWithDetails(orderId: string) {
    return this.prisma.order.findUnique({
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
          },
        },
      },
    });
  }

  async findSellerByProfileId(sellerProfileId: string) {
    return this.prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      include: { user: true },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        full_name: true,
        pro_expires_at: true,
        is_pro: true,
      },
    });
  }

  async upgradeUserToPro(userId: string, durationDays: number) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pro_expires_at: true },
    });
    const now = new Date();
    const base =
      existing?.pro_expires_at &&
      existing.pro_expires_at.getTime() > now.getTime()
        ? existing.pro_expires_at
        : now;
    const nextExpiry = new Date(
      base.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );
    return this.prisma.user.update({
      where: { id: userId },
      data: { is_pro: true, pro_expires_at: nextExpiry },
      select: { id: true, is_pro: true, pro_expires_at: true },
    });
  }

  async findPaymentLogByEventId(eventId: string) {
    return this.prisma.paymentLog.findUnique({
      where: { event_id: eventId },
    });
  }

  async createPaymentLog(event: string, payload: any, eventId?: string) {
    return this.prisma.paymentLog.create({
      data: {
        event,
        payload,
        ...(eventId ? { event_id: eventId } : {}),
      },
    });
  }

  async getSellerProfile(id: string) {
    return this.prisma.sellerProfile.findUnique({
      where: { id },
    });
  }

  async getSellerProfileByUserId(userId: string) {
    return this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });
  }

  async updateSellerSubaccount(id: string, subaccountCode: string) {
    return this.prisma.sellerProfile.update({
      where: { id },
      data: { paystack_subaccount_code: subaccountCode },
    });
  }

  async createSubaccountRetry(sellerId: string, lastError: string) {
    return this.prisma.subaccountRetry.create({
      data: {
        seller_id: sellerId,
        last_error: lastError,
        status: 'PENDING',
        attempts: 1,
      },
    });
  }

  async updateSubaccountRetry(
    id: string,
    data: { attempts?: number; last_error?: string; status?: string },
  ) {
    return this.prisma.subaccountRetry.update({
      where: { id },
      data,
    });
  }

  async findPendingSubaccountRetry(sellerId: string) {
    return this.prisma.subaccountRetry.findFirst({
      where: { seller_id: sellerId, status: 'PENDING' },
    });
  }

  async findPromotionPaymentByReference(reference: string) {
    return this.prisma.productPromotionPayment.findUnique({
      where: { reference },
      include: { product: true },
    });
  }

  async markPromotionPaymentSuccessful(
    reference: string,
    providerRef?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.productPromotionPayment.findUnique({
        where: { reference },
      });

      if (!payment) return null;
      if (payment.status === 'SUCCESS') return payment;

      const updatedPayment = await tx.productPromotionPayment.update({
        where: { reference },
        data: {
          status: 'SUCCESS',
          paid_at: new Date(),
          consumed_at: new Date(),
          provider_ref: providerRef,
        },
      });

      await tx.product.update({
        where: { id: payment.product_id },
        data: { is_featured: true },
      });

      return updatedPayment;
    });
  }

  async markPromotionPaymentFailed(reference: string, providerRef?: string) {
    return this.prisma.productPromotionPayment.updateMany({
      where: { reference, status: 'PENDING' },
      data: {
        status: 'FAILED',
        provider_ref: providerRef,
      },
    });
  }

  async findSellerByOrder(orderId: string) {
    const item = await this.prisma.orderItem.findFirst({
      where: { order_id: orderId },
      include: {
        product: {
          select: { seller_id: true },
        },
      },
    });

    return item?.product?.seller_id;
  }

  async createLedgerEntry(data: {
    seller_id: string;
    transaction_id?: string;
    payout_id?: string;
    reference: string;
    type: 'CREDIT' | 'DEBIT';
    source_type: 'ORDER' | 'PROMOTION' | 'ADJUSTMENT' | 'FEE' | 'PAYOUT';
    amount: Prisma.Decimal | number;
    description?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.paymentLedgerEntry.create({
      data: {
        seller_id: data.seller_id,
        transaction_id: data.transaction_id,
        payout_id: data.payout_id,
        reference: data.reference,
        type: data.type,
        source_type: data.source_type,
        amount: data.amount as any,
        description: data.description,
        metadata: data.metadata ?? {},
      },
    });
  }

  async upsertVendorBalanceSnapshot(input: {
    sellerId: string;
    availableDelta?: Prisma.Decimal;
    pendingDelta?: Prisma.Decimal;
    earnedDelta?: Prisma.Decimal;
    withdrawnDelta?: Prisma.Decimal;
  }) {
    const existing = await this.prisma.vendorBalanceSnapshot.findUnique({
      where: { seller_id: input.sellerId },
    });
    if (!existing) {
      return this.prisma.vendorBalanceSnapshot.create({
        data: {
          seller_id: input.sellerId,
          available_balance: input.availableDelta ?? new Prisma.Decimal(0),
          pending_balance: input.pendingDelta ?? new Prisma.Decimal(0),
          total_earned: input.earnedDelta ?? new Prisma.Decimal(0),
          total_withdrawn: input.withdrawnDelta ?? new Prisma.Decimal(0),
        },
      });
    }

    return this.prisma.vendorBalanceSnapshot.update({
      where: { seller_id: input.sellerId },
      data: {
        available_balance: existing.available_balance.add(
          input.availableDelta ?? new Prisma.Decimal(0),
        ),
        pending_balance: existing.pending_balance.add(
          input.pendingDelta ?? new Prisma.Decimal(0),
        ),
        total_earned: existing.total_earned.add(
          input.earnedDelta ?? new Prisma.Decimal(0),
        ),
        total_withdrawn: existing.total_withdrawn.add(
          input.withdrawnDelta ?? new Prisma.Decimal(0),
        ),
      },
    });
  }

  async createPayout(data: {
    seller_id: string;
    transaction_id?: string;
    reference: string;
    amount: Prisma.Decimal;
    mode: 'AUTO' | 'MANUAL';
    status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    failure_reason?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.payout.create({
      data: {
        seller_id: data.seller_id,
        transaction_id: data.transaction_id,
        reference: data.reference,
        amount: data.amount,
        mode: data.mode,
        status: data.status ?? 'PENDING',
        failure_reason: data.failure_reason,
        metadata: data.metadata ?? {},
      },
    });
  }

  async updatePayoutStatus(
    id: string,
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED',
    payload?: {
      provider_ref?: string;
      failure_reason?: string;
      processed_at?: Date;
    },
  ) {
    return this.prisma.payout.update({
      where: { id },
      data: {
        status,
        provider_ref: payload?.provider_ref,
        failure_reason: payload?.failure_reason,
        processed_at: payload?.processed_at,
      },
    });
  }

  async getPayoutById(id: string) {
    return this.prisma.payout.findUnique({
      where: { id },
      include: { seller: true, transaction: true },
    });
  }

  async listPayouts(params: {
    sellerId?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {
      ...(params.sellerId ? { seller_id: params.sellerId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: { transaction: true },
        orderBy: { created_at: 'desc' },
        skip,
        take: params.limit,
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { items, total };
  }

  async listTransactions(params: {
    sellerId?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {
      ...(params.status ? { status: params.status } : {}),
    };
    if (params.sellerId) {
      where.order = {
        items: {
          some: {
            product: {
              seller_id: params.sellerId,
            },
          },
        },
      };
    }
    const skip = (params.page - 1) * params.limit;
    let items: any[] = [];
    let total = 0;
    try {
      [items, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          include: { order: true, payout: true },
          orderBy: { created_at: 'desc' },
          skip,
          take: params.limit,
        }),
        this.prisma.transaction.count({ where }),
      ]);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      [items, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          select: {
            id: true,
            order_id: true,
            reference: true,
            amount: true,
            status: true,
            provider: true,
            provider_ref: true,
            metadata: true,
            created_at: true,
            updated_at: true,
            order: true,
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: params.limit,
        }),
        this.prisma.transaction.count({ where }),
      ]);
    }

    return { items, total };
  }

  async getTransactionById(id: string) {
    try {
      return await this.prisma.transaction.findUnique({
        where: { id },
        include: { order: true, payout: true, ledger_entries: true },
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      return this.prisma.transaction.findUnique({
        where: { id },
        select: {
          id: true,
          order_id: true,
          reference: true,
          amount: true,
          status: true,
          provider: true,
          provider_ref: true,
          metadata: true,
          created_at: true,
          updated_at: true,
          order: true,
        },
      });
    }
  }

  async reconcileTransaction(id: string, status: string) {
    try {
      return await this.prisma.transaction.update({
        where: { id },
        data: { status, reconciled_at: new Date() },
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      return this.prisma.transaction.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          order_id: true,
          reference: true,
          amount: true,
          status: true,
          provider: true,
          provider_ref: true,
          metadata: true,
          created_at: true,
          updated_at: true,
        },
      });
    }
  }

  async listHistory(params: {
    sellerId?: string;
    page: number;
    limit: number;
  }) {
    const skip = (params.page - 1) * params.limit;
    const whereLedger = params.sellerId ? { seller_id: params.sellerId } : {};
    const wherePayout = params.sellerId ? { seller_id: params.sellerId } : {};
    const whereTx: any = {};
    if (params.sellerId) {
      whereTx.order = {
        items: { some: { product: { seller_id: params.sellerId } } },
      };
    }

    let ledger: any[] = [];
    let payouts: any[] = [];
    let transactions: any[] = [];
    try {
      [ledger, payouts, transactions] = await Promise.all([
        this.prisma.paymentLedgerEntry.findMany({
          where: whereLedger,
          orderBy: { created_at: 'desc' },
          skip,
          take: params.limit,
        }),
        this.prisma.payout.findMany({
          where: wherePayout,
          orderBy: { created_at: 'desc' },
          skip,
          take: params.limit,
        }),
        this.prisma.transaction.findMany({
          where: whereTx,
          orderBy: { created_at: 'desc' },
          skip,
          take: params.limit,
        }),
      ]);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      transactions = await this.prisma.transaction.findMany({
        where: whereTx,
        select: {
          id: true,
          order_id: true,
          reference: true,
          amount: true,
          status: true,
          provider: true,
          provider_ref: true,
          metadata: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: params.limit,
      });
    }

    return { ledger, payouts, transactions };
  }

  async listPromotionPayments(params: {
    sellerId?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {
      ...(params.sellerId ? { seller_id: params.sellerId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.prisma.productPromotionPayment.findMany({
        where,
        include: { product: true },
        orderBy: { created_at: 'desc' },
        skip,
        take: params.limit,
      }),
      this.prisma.productPromotionPayment.count({ where }),
    ]);

    return { items, total };
  }
}
