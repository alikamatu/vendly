"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  ShoppingBag,
  Users as UsersIcon,
  DollarSign,
  Package,
  Percent,
  Award,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  analyticsApi,
  AnalyticsApiError,
  AnalyticsOverview,
  RevenuePoint,
  TopProduct,
  FunnelStage,
  Range,
} from "@/lib/api/analytics";
import { Sparkles, Zap, BarChart3 } from "lucide-react";

/**
 * Seller analytics dashboard.
 *
 * Replaces the "Analytics coming soon" placeholder. Pulls four datasets in
 * parallel: KPI overview, revenue time-series, top products, and a simple
 * funnel. All queries are scoped server-side to the caller's seller_id.
 */

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12mo", label: "12 months" },
];

const CURRENCY = "GH₵";
const fmtMoney = (n: number) =>
  `${CURRENCY}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtNum = (n: number) => n.toLocaleString();

export default function SellerAnalyticsPage() {
  const { token } = useAuth();
  const [range, setRange] = useState<Range>("30d");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [sort, setSort] = useState<"units" | "revenue" | "views">("units");
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Separate flag for the "you're not Pro" state so we render an upsell
  // instead of the generic error block. Tripped when the API returns
  // 403 with code: 'PRO_REQUIRED'.
  const [proRequired, setProRequired] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    setProRequired(false);
    try {
      const [ov, sr, tp, fn] = await Promise.all([
        analyticsApi.overview(token, range),
        analyticsApi.revenueSeries(token, range),
        analyticsApi.topProducts(token, range, sort, 8),
        analyticsApi.funnel(token, range),
      ]);
      setOverview(ov);
      setSeries(sr.points);
      setTopProducts(tp);
      setFunnel(fn.stages);
    } catch (err: any) {
      if (
        err instanceof AnalyticsApiError &&
        (err.code === "PRO_REQUIRED" || err.status === 403)
      ) {
        setProRequired(true);
      } else {
        setError(err.message || "Failed to load analytics");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, range, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="text-muted hover:text-foreground inline-flex items-center gap-2 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-red-500 h-5 w-5" />
              <h1 className="text-foreground text-2xl font-medium tracking-tight">
                Analytics
              </h1>
            </div>
            <p className="text-muted mt-1 max-w-xl text-sm">
              How your store is doing — revenue, orders, what&apos;s selling,
              and where buyers fall off. Updated every time you refresh.
            </p>
          </div>
          <div className="border-border bg-surface flex gap-1 rounded-full border p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`rounded-full px-4 py-1.5 text-[11px] font-medium transition-colors ${
                  range === r.value
                    ? "bg-red-500 text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pro upsell — replaces the rest of the page when the API responds
          with PRO_REQUIRED so non-Pro sellers see a clean upgrade prompt
          instead of empty KPI cards. Early-returns so we don't even try
          to render the chart / funnel below. */}
      {proRequired ? (
        <ProUpsell />
      ) : (
        <>
          {error && (
            <div className="border-border/40 bg-surface flex items-start gap-3 rounded-2xl border p-4">
              <AlertCircle className="text-red-500 mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="text-foreground text-sm">{error}</p>
                <button
                  onClick={load}
                  className="text-red-500 mt-1 text-xs underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

      {/* KPI grid */}
      {isLoading && !overview ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="border-border/30 bg-surface/40 h-28 animate-pulse rounded-2xl border"
            />
          ))}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Revenue"
            value={fmtMoney(overview.kpis.revenue.value)}
            delta={overview.kpis.revenue.deltaPct}
            icon={<DollarSign className="h-4 w-4" />}
            accent
          />
          <Kpi
            label="Orders"
            value={fmtNum(overview.kpis.orders.value)}
            delta={overview.kpis.orders.deltaPct}
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <Kpi
            label="Units sold"
            value={fmtNum(overview.kpis.units.value)}
            delta={overview.kpis.units.deltaPct}
            icon={<Package className="h-4 w-4" />}
          />
          <Kpi
            label="Avg order"
            value={fmtMoney(overview.kpis.averageOrderValue.value)}
            icon={<Award className="h-4 w-4" />}
          />
          <Kpi
            label="Unique buyers"
            value={fmtNum(overview.kpis.uniqueBuyers.value)}
            icon={<UsersIcon className="h-4 w-4" />}
          />
          <Kpi
            label="Total views"
            value={fmtNum(overview.kpis.totalViews.value)}
            icon={<Eye className="h-4 w-4" />}
            subtle="Lifetime"
          />
          <Kpi
            label="Conversion"
            value={`${overview.kpis.conversionPct.value}%`}
            icon={<Percent className="h-4 w-4" />}
            subtle="Orders / lifetime views"
          />
          <Kpi
            label="Products live"
            value={fmtNum(overview.kpis.totalProducts.value)}
            icon={<Package className="h-4 w-4" />}
          />
        </div>
      ) : null}

      {/* Revenue chart */}
      <div className="border-border/40 bg-surface/40 rounded-3xl border p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-foreground text-sm font-medium uppercase tracking-wider">
              Revenue over time
            </h2>
            <p className="text-muted text-xs">
              Daily paid-order revenue across the selected range.
            </p>
          </div>
        </div>
        {isLoading && series.length === 0 ? (
          <div className="border-border/30 bg-surface h-56 animate-pulse rounded-2xl border" />
        ) : (
          <RevenueChart points={series} />
        )}
      </div>

      {/* Two column: Top products + Funnel */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top products */}
        <div className="border-border/40 bg-surface/40 lg:col-span-2 rounded-3xl border p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-foreground text-sm font-medium uppercase tracking-wider">
                Top products
              </h2>
              <p className="text-muted text-xs">
                Best performers in the selected range.
              </p>
            </div>
            <div className="border-border bg-surface flex gap-1 rounded-full border p-1">
              {(["units", "revenue", "views"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`rounded-full px-3 py-1 text-[10px] font-medium capitalize transition-colors ${
                    sort === s
                      ? "bg-foreground text-background"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {isLoading && topProducts.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="border-border/30 bg-surface h-14 animate-pulse rounded-xl border"
                />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <EmptyBlock
              icon={<Package className="h-8 w-8" />}
              title="No sales in this range yet"
              hint="Once orders land, your best sellers surface here."
            />
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <Link
                  key={p.id}
                  href={`/dashboard/products/${p.id}`}
                  className="border-border/40 bg-surface hover:bg-surface/70 group flex items-center gap-3 rounded-2xl border p-3 transition-colors"
                >
                  <span className="text-muted w-5 text-center text-[11px] font-medium">
                    {idx + 1}
                  </span>
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="bg-surface-dark h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="bg-surface-dark h-10 w-10 rounded-xl" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-normal">
                      {p.title}
                    </p>
                    <p className="text-muted text-[11px]">
                      {fmtNum(p.units)} sold · {fmtNum(p.views)} views
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground text-sm font-medium">
                      {fmtMoney(p.revenue)}
                    </p>
                    <p className="text-muted text-[10px]">in range</p>
                  </div>
                  <ArrowUpRight className="text-muted group-hover:text-foreground h-4 w-4" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Funnel */}
        <div className="border-border/40 bg-surface/40 rounded-3xl border p-6">
          <div className="mb-4">
            <h2 className="text-foreground text-sm font-medium uppercase tracking-wider">
              Buyer funnel
            </h2>
            <p className="text-muted text-xs">
              Where shoppers drop off between view and buy.
            </p>
          </div>
          {isLoading && funnel.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="border-border/30 bg-surface h-14 animate-pulse rounded-xl border"
                />
              ))}
            </div>
          ) : funnel.length === 0 ? (
            <EmptyBlock
              icon={<TrendingUp className="h-8 w-8" />}
              title="No funnel data yet"
              hint="Funnel needs at least one paid order."
            />
          ) : (
            <Funnel stages={funnel} />
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

/**
 * Shown to non-Pro sellers when the analytics API rejects with
 * PRO_REQUIRED. Keeps the same top-of-page chrome (header + range
 * pills) above so the user understands what they'd be unlocking.
 */
function ProUpsell() {
  const features = [
    {
      icon: <BarChart3 className="h-4 w-4" />,
      title: "Revenue, orders, conversion",
      desc: "Live KPIs across 7-day, 30-day, 90-day, and 12-month windows.",
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      title: "Best-sellers + funnel",
      desc: "See which products convert, where buyers fall off, and who repeats.",
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      title: "Branded share cards",
      desc: "Portrait-mode product cards ready for Instagram and TikTok.",
    },
    {
      icon: <Zap className="h-4 w-4" />,
      title: "Priority verification + support",
      desc: "Get verified in 24h. Skip the queue, get help by WhatsApp.",
    },
  ];
  return (
    <div className="border-border/40 bg-gradient-to-br from-red-500/5 via-surface/30 to-surface/40 rounded-[2.5rem] border p-8 md:p-12">
      <div className="flex flex-col items-center gap-6 text-center max-w-xl mx-auto">
        <div className="bg-red-500 text-white rounded-2xl px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-red-500/20">
          <Sparkles className="h-3 w-3" /> Pro feature
        </div>
        <div className="space-y-3">
          <h2 className="text-foreground text-2xl md:text-3xl font-medium tracking-tight">
            Unlock seller analytics
          </h2>
          <p className="text-muted text-sm md:text-base leading-relaxed">
            Pro sellers get the full insights stack — revenue trends, top
            products, conversion, and the buyer funnel. Without it,
            you&apos;re guessing.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-background/60 border-border/40 rounded-2xl border p-4 text-left flex items-start gap-3"
            >
              <div className="bg-red-500/10 text-red-500 rounded-xl p-2 shrink-0">
                {f.icon}
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-sm font-medium">
                  {f.title}
                </p>
                <p className="text-muted text-xs mt-0.5 leading-snug">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard/settings"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-500 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 active:scale-95"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade to Pro
        </Link>
        <p className="text-muted text-[11px]">
          Cancel anytime. Activated immediately after payment.
        </p>
      </div>
    </div>
  );
}

// ─── components ────────────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  delta,
  icon,
  accent,
  subtle,
}: {
  label: string;
  value: string;
  delta?: number;
  icon: React.ReactNode;
  accent?: boolean;
  subtle?: string;
}) {
  const showDelta = typeof delta === "number";
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={`border-border/40 rounded-2xl border p-4 ${
        accent ? "bg-red-500/5" : "bg-surface/40"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`${accent ? "text-red-500" : "text-muted"}`}>
          {icon}
        </div>
        {showDelta && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
              positive
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            {positive ? (
              <TrendingUp className="h-2.5 w-2.5" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5" />
            )}
            {Math.abs(delta!).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-foreground text-xl font-medium tracking-tight">
        {value}
      </p>
      <p className="text-muted mt-1 text-[10px] font-medium uppercase tracking-wider">
        {label}
      </p>
      {subtle && (
        <p className="text-muted/70 mt-1 text-[9px] italic">{subtle}</p>
      )}
    </div>
  );
}

function RevenueChart({ points }: { points: RevenuePoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyBlock
        icon={<TrendingUp className="h-8 w-8" />}
        title="No revenue data in this range"
        hint="Once orders land, the chart fills in automatically."
      />
    );
  }

  // Recharts wants serialisable data; we already have it. Format the X axis
  // tick label so very long ranges (12mo) don't overlap.
  const data = points.map((p) => ({
    ...p,
    label: new Date(p.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="currentColor" opacity={0.1} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
            tickLine={false}
            axisLine={{ stroke: "currentColor", opacity: 0.15 }}
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
            tickLine={false}
            axisLine={{ stroke: "currentColor", opacity: 0.15 }}
            tickFormatter={(v) =>
              v >= 1000 ? `${CURRENCY}${(v / 1000).toFixed(1)}k` : `${CURRENCY}${v}`
            }
            width={56}
          />
          <Tooltip
            cursor={{ stroke: "#ef4444", strokeOpacity: 0.3, strokeWidth: 1 }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#revFill)"
            activeDot={{ r: 4, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: RevenuePoint & { label: string } }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="border-border bg-background/95 rounded-xl border px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-muted text-[10px] uppercase tracking-widest">{label}</p>
      <p className="text-foreground mt-1 text-sm font-medium">
        {fmtMoney(p.revenue)}
      </p>
      <p className="text-muted text-[10px]">{p.orders} {p.orders === 1 ? "order" : "orders"}</p>
    </div>
  );
}

function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const widthPct = (s.value / max) * 100;
        const prev = i > 0 ? stages[i - 1].value : null;
        const dropPct =
          prev !== null && prev > 0
            ? ((prev - s.value) / prev) * 100
            : null;
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-foreground font-medium">{s.label}</span>
              <span className="text-muted">
                {fmtNum(s.value)}
                {dropPct !== null && dropPct > 0 && (
                  <span className="text-red-500 ml-2">
                    -{dropPct.toFixed(0)}%
                  </span>
                )}
              </span>
            </div>
            <div className="bg-surface relative h-6 overflow-hidden rounded-lg">
              <div
                className="bg-red-500 h-full rounded-lg transition-all"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            {s.note && (
              <p className="text-muted/70 mt-1 text-[10px] italic">{s.note}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="border-border/30 bg-surface/30 flex flex-col items-center gap-2 rounded-2xl border border-dashed py-10 text-center">
      <div className="text-muted opacity-40">{icon}</div>
      <p className="text-foreground text-xs font-medium">{title}</p>
      {hint && <p className="text-muted text-[11px]">{hint}</p>}
    </div>
  );
}
