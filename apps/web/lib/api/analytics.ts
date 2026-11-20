import { api } from './index';

export type Range = '7d' | '30d' | '90d' | '12mo';

export interface KpiValue {
  value: number;
  deltaPct?: number;
}

export interface AnalyticsOverview {
  range: Range;
  from: string;
  kpis: {
    revenue: KpiValue;
    orders: KpiValue;
    units: KpiValue;
    averageOrderValue: KpiValue;
    uniqueBuyers: KpiValue;
    totalProducts: KpiValue;
    totalViews: KpiValue;
    conversionPct: KpiValue;
  };
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: string;
  title: string;
  price: string;
  image_url: string | null;
  views: number;
  units: number;
  revenue: number;
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  note?: string;
}

/** Shape the analytics page reads to decide whether to show an upsell. */
export class AnalyticsApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AnalyticsApiError';
    this.status = status;
    this.code = code;
  }
}

async function read<T>(pending: Promise<{ data: T }>): Promise<T> {
  try {
    return (await pending).data;
  } catch (err) {
    const e = err as { message?: string; status?: number; code?: string };
    throw new AnalyticsApiError(e.message || 'Request failed', e.status ?? 0, e.code);
  }
}

export const analyticsApi = {
  overview: (token: string, range: Range = '30d') =>
    read(
      api.get<AnalyticsOverview>(`/seller/analytics/overview?range=${range}`, {
        token,
        cache: 'no-store',
      }),
    ),

  revenueSeries: (token: string, range: Range = '30d') =>
    read(
      api.get<{ range: Range; points: RevenuePoint[] }>(
        `/seller/analytics/revenue-series?range=${range}`,
        { token, cache: 'no-store' },
      ),
    ),

  topProducts: (
    token: string,
    range: Range = '30d',
    sort: 'units' | 'revenue' | 'views' = 'units',
    limit = 10,
  ) =>
    read(
      api.get<TopProduct[]>(
        `/seller/analytics/top-products?range=${range}&sort=${sort}&limit=${limit}`,
        { token, cache: 'no-store' },
      ),
    ),

  funnel: (token: string, range: Range = '30d') =>
    read(
      api.get<{ range: Range; stages: FunnelStage[] }>(`/seller/analytics/funnel?range=${range}`, {
        token,
        cache: 'no-store',
      }),
    ),
};
