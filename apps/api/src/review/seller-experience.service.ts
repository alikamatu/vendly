import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SellerExperienceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitSellerExperienceDto } from './dto/seller-experience.dto';

const PRODUCT_THRESHOLD = 5;

const publicSelect = {
  id: true,
  rating: true,
  body: true,
  created_at: true,
  seller: {
    select: {
      store_name: true,
      store_link: true,
      logo_url: true,
    },
  },
} as const;

@Injectable()
export class SellerExperienceService {
  constructor(private readonly prisma: PrismaService) {}

  async promptFor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        seller_experience_prompted_at: true,
        seller_profile: {
          select: {
            id: true,
            store_name: true,
            _count: { select: { products: true } },
          },
        },
      },
    });

    const productCount = user?.seller_profile?._count.products ?? 0;
    const shouldPrompt = Boolean(
      user?.seller_profile &&
      productCount > PRODUCT_THRESHOLD &&
      !user.seller_experience_prompted_at,
    );

    return {
      should_prompt: shouldPrompt,
      product_count: productCount,
      store_name: user?.seller_profile?.store_name ?? null,
    };
  }

  async dismiss(userId: string) {
    await this.markPrompted(userId);
    return { dismissed: true };
  }

  async submit(userId: string, dto: SubmitSellerExperienceDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        seller_experience_prompted_at: true,
        seller_profile: { select: { id: true } },
      },
    });

    if (!user?.seller_profile) {
      throw new BadRequestException(
        'Create your store before leaving a review.',
      );
    }
    if (user.seller_experience_prompted_at) {
      throw new BadRequestException(
        'You have already responded to this review.',
      );
    }

    const productCount = await this.prisma.product.count({
      where: { seller_id: user.seller_profile.id },
    });
    if (productCount <= PRODUCT_THRESHOLD) {
      throw new BadRequestException(
        'This review opens after you upload more than 5 products.',
      );
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sellerExperienceReview.create({
        data: {
          user_id: userId,
          seller_id: user.seller_profile!.id,
          rating: dto.rating,
          body: dto.body.trim(),
          status: SellerExperienceStatus.PENDING,
        },
        select: { id: true, status: true, rating: true, created_at: true },
      });
      await tx.user.update({
        where: { id: userId },
        data: { seller_experience_prompted_at: new Date() },
      });
      return created;
    });

    return review;
  }

  async listPublic() {
    const where = { status: SellerExperienceStatus.PUBLISHED };
    const [rows, aggregate] = await Promise.all([
      this.prisma.sellerExperienceReview.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 9,
        select: publicSelect,
      }),
      this.prisma.sellerExperienceReview.aggregate({
        where,
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      reviews: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        body: row.body,
        created_at: row.created_at,
        store_name: row.seller.store_name,
        store_link: row.seller.store_link,
        logo_url: row.seller.logo_url,
      })),
      average: aggregate._avg.rating ?? 0,
      count: aggregate._count._all,
    };
  }

  async listForAdmin() {
    const rows = await this.prisma.sellerExperienceReview.findMany({
      orderBy: { created_at: 'desc' },
      take: 200,
      select: {
        id: true,
        rating: true,
        body: true,
        status: true,
        created_at: true,
        reviewed_at: true,
        seller: {
          select: {
            store_name: true,
            store_link: true,
            logo_url: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      body: row.body,
      status: row.status,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      store_name: row.seller.store_name,
      store_link: row.seller.store_link,
      logo_url: row.seller.logo_url,
    }));
  }

  async moderate(
    id: string,
    status: 'PUBLISHED' | 'REJECTED',
    adminId: string,
  ) {
    const existing = await this.prisma.sellerExperienceReview.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Seller review not found');

    return this.prisma.sellerExperienceReview.update({
      where: { id },
      data: {
        status,
        reviewed_by: adminId,
        reviewed_at: new Date(),
      },
      select: {
        id: true,
        status: true,
        reviewed_at: true,
      },
    });
  }

  private async markPrompted(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, seller_experience_prompted_at: null },
      data: { seller_experience_prompted_at: new Date() },
    });
  }
}
