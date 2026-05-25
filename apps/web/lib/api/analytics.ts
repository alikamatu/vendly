const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

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

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch {}
    const msg = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  const json = await res.json();
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const analyticsApi = {
  overview: (token: string, range: Range = '30d') =>
    fetch(`${API_URL}/seller/analytics/overview?range=${range}`, {
      headers: headers(token), cache: 'no-store',
    }).then(unwrap<AnalyticsOverview>),

  revenueSeries: (token: string, range: Range = '30d') =>
    fetch(`${API_URL}/seller/analytics/revenue-series?range=${range}`, {
      headers: headers(token), cache: 'no-store',
    }).then(unwrap<{ range: Range; points: RevenuePoint[] }>),

  topProducts: (
    token: string,
    range: Range = '30d',
    sort: 'units' | 'revenue' | 'views' = 'units',
    limit = 10,
  ) =>
    fetch(
      `${API_URL}/seller/analytics/top-products?range=${range}&sort=${sort}&limit=${limit}`,
      { headers: headers(token), cache: 'no-store' },
    ).then(unwrap<TopProduct[]>),

  funnel: (token: string, range: Range = '30d') =>
    fetch(`${API_URL}/seller/analytics/funnel?range=${range}`, {
      headers: headers(token), cache: 'no-store',
    }).then(unwrap<{ range: Range; stages: FunnelStage[] }>),
};
