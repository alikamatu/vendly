import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Seller-facing analytics. Every query is scoped to a single seller_id
 * derived from the authenticated user — no controller can ask for another
 * seller's data because we never accept seller_id as a parameter.
 *
 * "Paid" orders are determined by two parallel signals:
 *
 *   1. Order.status is one of PAID/PROCESSING/SHIPPED/DELIVERED (Paystack
 *      webhook flipped it after settlement), OR
 *   2. The order's Transaction.status is "SUCCESS" (verified via the
 *      /payments/verify endpoint), even if the webhook never flipped the
 *      Order status — common in dev where the Paystack webhook can't reach
 *      localhost. Without this fallback, "paid" orders made in dev would
 *      register as zero revenue.
 *
 * CANCELLED, REFUNDED, and orphan PENDING orders are excluded.
 */
const PAID_ORDER_STATUSES = [
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
] as const;

/** Prisma `where` fragment matching any order considered paid for analytics. */
function paidWhere(): { OR: any[] } {
  return {
    OR: [
      { status: { in: [...PAID_ORDER_STATUSES] } },
      { transaction: { status: 'SUCCESS' } },
    ],
  };
}

export type Range = '7d' | '30d' | '90d' | '12mo';

function rangeToDays(range: Range): number {
  switch (range) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '12mo':
      return 365;
  }
}

function startOfRange(range: Range): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - rangeToDays(range) + 1);
  return d;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the SellerProfile.id for the authenticated user. */
  private async sellerIdFor(userId: string): Promise<string> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    if (!seller) {
      throw new NotFoundException(
        'No seller profile found. Create your store first.',
      );
    }
    return seller.id;
  }

  /** Headline KPI block + delta vs. the equivalent previous period. */
  async overview(userId: string, range: Range = '30d') {
    const sellerId = await this.sellerIdFor(userId);
    const from = startOfRange(range);
    const periodDays = rangeToDays(range);
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - periodDays);
    const prevTo = new Date(from);

    // Aggregations are all expressed as Prisma calls so we don't hand-write
    // SQL — slower in absolute terms but safe across Postgres/Supabase.
    const [
      productCount,
      viewsAgg,
      currentOrderItems,
      previousOrderItems,
    ] = await Promise.all([
      this.prisma.product.count({ where: { seller_id: sellerId } }),
      this.prisma.product.aggregate({
        where: { seller_id: sellerId },
        _sum: { views_count: true },
      }),
      this.prisma.orderItem.findMany({
        where: {
          product: { seller_id: sellerId },
          order: {
            ...paidWhere(),
            created_at: { gte: from },
          },
        },
        select: {
          quantity: true,
          price: true,
          order_id: true,
          order: { select: { buyer_id: true, created_at: true } },
        },
      }),
      this.prisma.orderItem.findMany({
        where: {
          product: { seller_id: sellerId },
          order: {
            ...paidWhere(),
            created_at: { gte: prevFrom, lt: prevTo },
          },
        },
        select: { quantity: true, price: true, order_id: true },
      }),
    ]);

    type ItemLike = { quantity: number; price: { toString(): string } | number };
    const revenue = (items: ItemLike[]) =>
      items.reduce((acc, it) => acc + Number(it.price) * it.quantity, 0);
    const unitsSold = (items: ItemLike[]) =>
      items.reduce((acc, it) => acc + it.quantity, 0);

    const currentRevenue = revenue(currentOrderItems);
    const previousRevenue = revenue(previousOrderItems);
    const currentUnits = unitsSold(currentOrderItems);
    const previousUnits = unitsSold(previousOrderItems);
    const currentOrders = new Set(currentOrderItems.map((i) => i.order_id)).size;
    const previousOrders = new Set(previousOrderItems.map((i) => i.order_id)).size;
    const currentBuyers = new Set(
      currentOrderItems.map((i) => i.order.buyer_id),
    ).size;
    const aov = currentOrders > 0 ? currentRevenue / currentOrders : 0;

    const totalViews = Number(viewsAgg._sum.views_count || 0);
    // Conversion rate uses total lifetime views as the denominator because
    // we don't time-bucket view events yet. Caveat surfaced in the UI.
    const conversion = totalViews > 0 ? (currentOrders / totalViews) * 100 : 0;

    const pctDelta = (a: number, b: number) =>
      b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100;

    return {
      range,
      from: from.toISOString(),
      kpis: {
        revenue: { value: currentRevenue, deltaPct: pctDelta(currentRevenue, previousRevenue) },
        orders: { value: currentOrders, deltaPct: pctDelta(currentOrders, previousOrders) },
        units: { value: currentUnits, deltaPct: pctDelta(currentUnits, previousUnits) },
        averageOrderValue: { value: aov },
        uniqueBuyers: { value: currentBuyers },
        totalProducts: { value: productCount },
        totalViews: { value: totalViews },
        conversionPct: { value: Number(conversion.toFixed(2)) },
      },
    };
  }

  /**
   * Daily revenue + order count series. We bucket in JS rather than asking
   * Postgres to date_trunc — keeps the Prisma layer simple, and the result
   * set is small (max 365 rows).
   */
  async revenueSeries(userId: string, range: Range = '30d') {
    const sellerId = await this.sellerIdFor(userId);
    const from = startOfRange(range);

    const items = await this.prisma.orderItem.findMany({
      where: {
        product: { seller_id: sellerId },
        order: {
          ...paidWhere(),
          created_at: { gte: from },
        },
      },
      select: {
        quantity: true,
        price: true,
        order_id: true,
        order: { select: { created_at: true } },
      },
    });

    const buckets = new Map<string, { revenue: number; orders: Set<string> }>();
    for (let i = 0; i < rangeToDays(range); i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { revenue: 0, orders: new Set() });
    }

    for (const item of items) {
      const key = item.order.created_at.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.revenue += Number(item.price) * item.quantity;
      bucket.orders.add(item.order_id);
    }

    return {
      range,
      points: Array.from(buckets.entries()).map(([date, b]) => ({
        date,
        revenue: Number(b.revenue.toFixed(2)),
        orders: b.orders.size,
      })),
    };
  }

  /** Top products by units sold (default), revenue, or lifetime views. */
  async topProducts(
    userId: string,
    range: Range = '30d',
    sort: 'units' | 'revenue' | 'views' = 'units',
    limit = 10,
  ) {
    const sellerId = await this.sellerIdFor(userId);
    const from = startOfRange(range);

    if (sort === 'views') {
      const rows = await this.prisma.product.findMany({
        where: { seller_id: sellerId },
        orderBy: { views_count: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          price: true,
          image_urls: true,
          views_count: true,
        },
      });
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        price: r.price.toString(),
        image_url: r.image_urls?.[0] || null,
        views: r.views_count,
        units: 0,
        revenue: 0,
      }));
    }

    // Aggregate over order items in the range, then enrich with product meta.
    const items = await this.prisma.orderItem.findMany({
      where: {
        product: { seller_id: sellerId },
        order: {
          ...paidWhere(),
          created_at: { gte: from },
        },
      },
      select: {
        product_id: true,
        quantity: true,
        price: true,
      },
    });

    const agg = new Map<string, { units: number; revenue: number }>();
    for (const it of items) {
      const cur = agg.get(it.product_id) || { units: 0, revenue: 0 };
      cur.units += it.quantity;
      cur.revenue += Number(it.price) * it.quantity;
      agg.set(it.product_id, cur);
    }

    const productIds = Array.from(agg.keys());
    if (productIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        price: true,
        image_urls: true,
        views_count: true,
      },
    });

    return products
      .map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price.toString(),
        image_url: p.image_urls?.[0] || null,
        views: p.views_count,
        units: agg.get(p.id)!.units,
        revenue: Number(agg.get(p.id)!.revenue.toFixed(2)),
      }))
      .sort((a, b) =>
        sort === 'revenue' ? b.revenue - a.revenue : b.units - a.units,
      )
      .slice(0, limit);
  }

  /**
   * Funnel: views → orders (paid) → repeat buyers. We don't yet track
   * "added to cart" server-side, so we surface what we can and flag the
   * missing rung in the UI.
   */
  async funnel(userId: string, range: Range = '30d') {
    const sellerId = await this.sellerIdFor(userId);
    const from = startOfRange(range);

    const [viewsAgg, items] = await Promise.all([
      this.prisma.product.aggregate({
        where: { seller_id: sellerId },
        _sum: { views_count: true },
      }),
      this.prisma.orderItem.findMany({
        where: {
          product: { seller_id: sellerId },
          order: {
            ...paidWhere(),
            created_at: { gte: from },
          },
        },
        select: {
          order_id: true,
          order: { select: { buyer_id: true } },
        },
      }),
    ]);

    const totalViews = Number(viewsAgg._sum.views_count || 0);
    const uniqueBuyers = new Set(items.map((i) => i.order.buyer_id));
    const orderCount = new Set(items.map((i) => i.order_id)).size;

    // Repeat buyers = those with > 1 order in the range.
    const ordersPerBuyer = new Map<string, Set<string>>();
    for (const it of items) {
      const set = ordersPerBuyer.get(it.order.buyer_id) || new Set();
      set.add(it.order_id);
      ordersPerBuyer.set(it.order.buyer_id, set);
    }
    let repeat = 0;
    for (const orders of ordersPerBuyer.values()) {
      if (orders.size > 1) repeat++;
    }

    return {
      range,
      stages: [
        {
          key: 'views',
          label: 'Product views (lifetime)',
          value: totalViews,
          note: 'Lifetime — per-day view tracking is on the roadmap.',
        },
        {
          key: 'orders',
          label: 'Paid orders (in range)',
          value: orderCount,
        },
        {
          key: 'buyers',
          label: 'Unique buyers (in range)',
          value: uniqueBuyers.size,
        },
        {
          key: 'repeat',
          label: 'Repeat buyers (in range)',
          value: repeat,
        },
      ],
    };
  }
}
