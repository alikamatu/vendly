import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  async toggleFavorite(userId: bigint, productId: bigint) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        user_id_product_id: {
          user_id: userId,
          product_id: productId,
        },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { favorited: false };
    } else {
      const newFavorite = await this.prisma.favorite.create({
        data: {
          user_id: userId,
          product_id: productId,
        },
      });
      return { favorited: true, id: String(newFavorite.id) };
    }
  }

  async getFavorites(userId: bigint) {
    return this.prisma.favorite.findMany({
      where: { user_id: userId },
      include: {
        product: {
          include: {
            seller: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async getFavoriteIds(userId: bigint) {
    const favorites = await this.prisma.favorite.findMany({
      where: { user_id: userId },
      select: { product_id: true },
    });
    return favorites.map((f) => f.product_id);
  }
}
