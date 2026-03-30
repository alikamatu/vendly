import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findTransactionByReference(reference: string) {
    return this.prisma.transaction.findUnique({
      where: { reference },
      include: { order: true },
    });
  }

  async updateTransactionStatus(
    id: bigint,
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

  async updateOrderStatus(id: bigint, status: string) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async createPaymentLog(event: string, payload: any) {
    return this.prisma.paymentLog.create({
      data: {
        event,
        payload,
      },
    });
  }

  async getSellerProfile(id: bigint) {
    return this.prisma.sellerProfile.findUnique({
      where: { id },
    });
  }

  async updateSellerSubaccount(id: bigint, subaccountCode: string) {
    return this.prisma.sellerProfile.update({
      where: { id },
      data: { paystack_subaccount_code: subaccountCode },
    });
  }

  async createSubaccountRetry(sellerId: bigint, lastError: string) {
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
    id: bigint,
    data: { attempts?: number; last_error?: string; status?: string },
  ) {
    return this.prisma.subaccountRetry.update({
      where: { id },
      data,
    });
  }

  async findPendingSubaccountRetry(sellerId: bigint) {
    return this.prisma.subaccountRetry.findFirst({
      where: { seller_id: sellerId, status: 'PENDING' },
    });
  }
}
