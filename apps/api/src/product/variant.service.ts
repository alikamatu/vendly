import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface UpsertInput {
  id?: string;
  sku?: string | null;
  attributes: Record<string, string>;
  price?: string | null;
  quantity_available: number;
  image_url?: string | null;
  is_active?: boolean;
}

@Injectable()
export class VariantService {
  constructor(private prisma: PrismaService) {}

  private async assertSellerOwns(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: { select: { user_id: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.seller.user_id !== userId) {
      throw new ForbiddenException('Not your product');
    }
    return product;
  }

  private toPrice(p?: string | null): Prisma.Decimal | null {
    if (p === undefined || p === null || p === '') return null;
    return new Prisma.Decimal(p);
  }

  private normAttrs(a: Record<string, string> | undefined) {
    if (!a || typeof a !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(a)) {
      const key = String(k).trim().toLowerCase();
      const val = String(v ?? '').trim();
      if (key && val) out[key] = val;
    }
    return out;
  }

  async list(productId: string) {
    return (this.prisma as any).productVariant.findMany({
      where: { product_id: productId, is_active: true },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Replaces the variant set for a product. Existing variants referenced by
   * orders are kept (soft-deactivated if removed from the input) so we don't
   * orphan order_items.
   */
  async replaceAll(userId: string, productId: string, inputs: UpsertInput[]) {
    await this.assertSellerOwns(userId, productId);

    const incomingIds = new Set(inputs.map((i) => i.id).filter(Boolean));
    const existing = await (this.prisma as any).productVariant.findMany({
      where: { product_id: productId },
      select: { id: true, _count: { select: { order_items: true } } },
    });

    const toRemove = existing.filter((e: any) => !incomingIds.has(e.id));

    return this.prisma.$transaction(async (tx) => {
      // Soft-deactivate variants that have orders, hard-delete otherwise.
      for (const r of toRemove) {
        if (r._count.order_items > 0) {
          await (tx as any).productVariant.update({
            where: { id: r.id },
            data: { is_active: false },
          });
        } else {
          await (tx as any).productVariant.delete({ where: { id: r.id } });
        }
      }

      const upserted: any[] = [];
      for (const inp of inputs) {
        const attrs = this.normAttrs(inp.attributes);
        if (!Object.keys(attrs).length) continue;

        if (inp.id) {
          upserted.push(
            await (tx as any).productVariant.update({
              where: { id: inp.id },
              data: {
                sku: inp.sku || null,
                attributes: attrs,
                price: this.toPrice(inp.price),
                quantity_available: Math.max(0, inp.quantity_available | 0),
                image_url: inp.image_url || null,
                is_active: inp.is_active ?? true,
              },
            }),
          );
        } else {
          upserted.push(
            await (tx as any).productVariant.create({
              data: {
                product_id: productId,
                sku: inp.sku || null,
                attributes: attrs,
                price: this.toPrice(inp.price),
                quantity_available: Math.max(0, inp.quantity_available | 0),
                image_url: inp.image_url || null,
                is_active: inp.is_active ?? true,
              },
            }),
          );
        }
      }
      return upserted;
    });
  }
}
