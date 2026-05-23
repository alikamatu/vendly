import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ReviewStatus, type ReviewFlagReason } from '@prisma/client';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { UpdateReviewDto } from './dto/update-review.dto';
import type { ListReviewsDto } from './dto/list-reviews.dto';

const EDIT_WINDOW_DAYS = 30;
const DELIVERED_STATUSES = new Set([
  'DELIVERED',
  'COMPLETED',
  'PAID',
  'FULFILLED',
]);

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────
  // Buyer: create / edit / delete own review
  // ──────────────────────────────────────────────────────────────

  async create(buyerId: string, dto: CreateReviewDto) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('rating must be between 1 and 5');
    }

    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: dto.order_item_id },
      include: { order: true, product: true, review: true },
    });
    if (!orderItem) throw new NotFoundException('Order item not found');
    if (orderItem.order.buyer_id !== buyerId) {
      throw new ForbiddenException('You can only review items you purchased');
    }
    if (!DELIVERED_STATUSES.has(orderItem.order.status)) {
      throw new BadRequestException(
        'You can only review an item after delivery is confirmed',
      );
    }
    if (orderItem.review) {
      throw new ConflictException('You already reviewed this item');
    }
    if (orderItem.product.seller_id) {
      // Block self-reviews — a seller cannot review their own product
      // even if they "bought" it through their own account.
      const sellerProfile = await this.prisma.sellerProfile.findUnique({
        where: { id: orderItem.product.seller_id },
        select: { user_id: true },
      });
      if (sellerProfile?.user_id === buyerId) {
        throw new ForbiddenException('You cannot review your own product');
      }
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          product_id: orderItem.product_id,
          seller_id: orderItem.product.seller_id,
          buyer_id: buyerId,
          order_item_id: orderItem.id,
          rating: dto.rating,
          title: dto.title?.trim() || null,
          body: dto.body?.trim() || null,
          verified_purchase: true,
          status: ReviewStatus.PUBLISHED,
        },
        include: { buyer: { select: { id: true, full_name: true } } },
      });
      await this.recomputeAggregates(
        tx,
        orderItem.product_id,
        orderItem.product.seller_id,
      );
      return created;
    });

    return review;
  }

  async update(buyerId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.buyer_id !== buyerId)
      throw new ForbiddenException('Not your review');
    if (review.status === ReviewStatus.HIDDEN) {
      throw new BadRequestException('Hidden reviews cannot be edited');
    }
    const ageDays = (Date.now() - review.created_at.getTime()) / 86_400_000;
    if (ageDays > EDIT_WINDOW_DAYS) {
      throw new BadRequestException(
        `Edits allowed within ${EDIT_WINDOW_DAYS} days of posting`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.review.update({
        where: { id: reviewId },
        data: {
          rating: dto.rating ?? review.rating,
          title:
            dto.title !== undefined ? dto.title?.trim() || null : undefined,
          body: dto.body !== undefined ? dto.body?.trim() || null : undefined,
          edited_at: new Date(),
        },
      });
      if (dto.rating && dto.rating !== review.rating) {
        await this.recomputeAggregates(tx, review.product_id, review.seller_id);
      }
      return u;
    });
    return updated;
  }

  async remove(buyerId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.buyer_id !== buyerId)
      throw new ForbiddenException('Not your review');

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: { status: ReviewStatus.HIDDEN },
      });
      await this.recomputeAggregates(tx, review.product_id, review.seller_id);
    });
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────────
  // Seller: reply
  // ──────────────────────────────────────────────────────────────

  async sellerReply(userId: string, reviewId: string, reply: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: review.seller_id },
      select: { user_id: true },
    });
    if (!seller || seller.user_id !== userId) {
      throw new ForbiddenException('Only the seller of this product can reply');
    }
    if (review.status === ReviewStatus.HIDDEN) {
      throw new BadRequestException('Cannot reply to a hidden review');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        seller_reply: reply.trim(),
        seller_replied_at: new Date(),
      },
    });
  }

  async removeSellerReply(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: review.seller_id },
      select: { user_id: true },
    });
    if (!seller || seller.user_id !== userId) {
      throw new ForbiddenException(
        'Only the seller of this product can edit the reply',
      );
    }
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { seller_reply: null, seller_replied_at: null },
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Flagging — community moderation signal
  // ──────────────────────────────────────────────────────────────

  async flag(
    userId: string,
    reviewId: string,
    reason: ReviewFlagReason,
    notes?: string,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.buyer_id === userId) {
      throw new BadRequestException('You cannot flag your own review');
    }
    try {
      await this.prisma.reviewFlag.create({
        data: { review_id: reviewId, reporter_id: userId, reason, notes },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('You already flagged this review');
      }
      throw err;
    }

    // After 3 distinct flags, hide pending moderator review.
    const flagCount = await this.prisma.reviewFlag.count({
      where: { review_id: reviewId },
    });
    if (flagCount >= 3 && review.status === ReviewStatus.PUBLISHED) {
      await this.prisma.review.update({
        where: { id: reviewId },
        data: { status: ReviewStatus.FLAGGED },
      });
    }
    return { ok: true, flagCount };
  }

  // ──────────────────────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────────────────────

  async listForProduct(productId: string, dto: ListReviewsDto) {
    return this.list({ product_id: productId }, dto);
  }

  async listForSellerByStoreLink(storeLink: string, dto: ListReviewsDto) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { store_link: storeLink },
      select: {
        id: true,
        rating_avg: true,
        rating_count: true,
        store_name: true,
      },
    });
    if (!seller) throw new NotFoundException('Store not found');
    const list = await this.list({ seller_id: seller.id }, dto);
    return { ...list, seller };
  }

  async summaryForProduct(productId: string) {
    return this.summary({ product_id: productId });
  }

  async summaryForSellerByStoreLink(storeLink: string) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { store_link: storeLink },
      select: { id: true },
    });
    if (!seller) throw new NotFoundException('Store not found');
    return this.summary({ seller_id: seller.id });
  }

  /** Items the buyer purchased + delivered + not yet reviewed. */
  async eligibleForBuyer(buyerId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          buyer_id: buyerId,
          status: { in: Array.from(DELIVERED_STATUSES) },
        },
        review: null,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            image_urls: true,
            seller_id: true,
            seller: { select: { store_name: true, store_link: true } },
          },
        },
        order: { select: { id: true, created_at: true, status: true } },
      },
      orderBy: { order: { created_at: 'desc' } },
      take: 50,
    });
    return items;
  }

  async mineWritten(buyerId: string) {
    return this.prisma.review.findMany({
      where: { buyer_id: buyerId },
      include: {
        product: { select: { id: true, title: true, image_urls: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────

  private async list(where: Prisma.ReviewWhereInput, dto: ListReviewsDto) {
    const status = ReviewStatus.PUBLISHED;
    const whereWithStatus: Prisma.ReviewWhereInput = {
      ...where,
      status,
      ...(dto.rating ? { rating: dto.rating } : {}),
    };

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      dto.sort === 'oldest'
        ? { created_at: 'asc' }
        : dto.sort === 'highest'
          ? { rating: 'desc' }
          : dto.sort === 'lowest'
            ? { rating: 'asc' }
            : dto.sort === 'helpful'
              ? { helpful_count: 'desc' }
              : { created_at: 'desc' };

    const take = Math.min(dto.limit ?? 10, 100);
    const skip = dto.cursor ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: whereWithStatus,
        orderBy,
        skip,
        take,
        include: {
          buyer: { select: { id: true, full_name: true } },
          product: { select: { id: true, title: true, image_urls: true } },
        },
      }),
      this.prisma.review.count({ where: whereWithStatus }),
    ]);

    return {
      items,
      total,
      nextCursor: skip + items.length < total ? skip + items.length : null,
    };
  }

  /** Aggregate {avg, count, distribution[1..5]} over PUBLISHED reviews. */
  private async summary(where: Prisma.ReviewWhereInput) {
    const base = { ...where, status: ReviewStatus.PUBLISHED };
    const [count, sumRow, dist] = await Promise.all([
      this.prisma.review.count({ where: base }),
      this.prisma.review.aggregate({ where: base, _avg: { rating: true } }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: base,
        _count: true,
      }),
    ]);
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const row of dist) {
      const r = row.rating as 1 | 2 | 3 | 4 | 5;
      distribution[r] = row._count;
    }
    return {
      count,
      average: Number((sumRow._avg.rating ?? 0).toFixed(2)),
      distribution,
    };
  }

  /**
   * Recompute denormalized `rating_avg` + `rating_count` on the product
   * (and the seller's overall) after any write that changes counts/avg.
   */
  private async recomputeAggregates(
    tx: Prisma.TransactionClient,
    productId: string,
    sellerId: string,
  ) {
    // Per product
    const p = await tx.review.aggregate({
      where: { product_id: productId, status: ReviewStatus.PUBLISHED },
      _avg: { rating: true },
      _count: true,
    });
    await tx.product.update({
      where: { id: productId },
      data: {
        rating_avg: Number((p._avg.rating ?? 0).toFixed(2)),
        rating_count: p._count,
      },
    });

    // Per seller (overall)
    const s = await tx.review.aggregate({
      where: { seller_id: sellerId, status: ReviewStatus.PUBLISHED },
      _avg: { rating: true },
      _count: true,
    });
    await tx.sellerProfile.update({
      where: { id: sellerId },
      data: {
        rating_avg: Number((s._avg.rating ?? 0).toFixed(2)),
        rating_count: s._count,
      },
    });
  }
}
