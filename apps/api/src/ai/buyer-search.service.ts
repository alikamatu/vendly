import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { AiBuyerSearchFilters, AiBuyerSearchPlan } from './gemini.types';
import {
  PUBLIC_IN_STOCK_PRODUCT_WHERE,
  PUBLIC_PRODUCT_WHERE,
} from '../product/product-visibility';
import { attachProductSlugs } from '../product/product-slug';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'for',
  'my',
  'me',
  'i',
  'want',
  'need',
  'looking',
  'find',
  'show',
  'under',
  'below',
  'less',
  'than',
  'above',
  'over',
  'more',
  'between',
  'and',
  'or',
  'in',
  'on',
  'to',
  'of',
  'with',
  'ghs',
  'ghc',
  'cedis',
  'cedi',
  'ghana',
  'brand',
  'new',
  'used',
  'refurbished',
  'cheap',
  'affordable',
  'budget',
  'stock',
  'best',
  'good',
  'nice',
  'please',
  'something',
]);

/**
 * Deterministic fallback parser when Verndly AI is unavailable so buyer search
 * still extracts price limits, condition, sort, and keywords cleanly.
 */
export function extractFallbackSearchPlan(
  rawQuery: string,
  availableCategories: string[],
): AiBuyerSearchPlan {
  const lower = rawQuery.trim().toLowerCase();

  let min_price: number | null = null;
  let max_price: number | null = null;

  const betweenMatch = lower.match(
    /between\s+(?:gh[s₵¢]?\s*)?(\d+(?:\.\d+)?)\s+(?:and|to|-)\s+(?:gh[s₵¢]?\s*)?(\d+(?:\.\d+)?)/i,
  );
  if (betweenMatch) {
    min_price = Math.round(Number(betweenMatch[1]));
    max_price = Math.round(Number(betweenMatch[2]));
  } else {
    const maxMatch = lower.match(
      /(?:under|below|less than|max|up to|<=?)\s*(?:gh[s₵¢]?\s*)?(\d+(?:\.\d+)?)/i,
    );
    if (maxMatch) max_price = Math.round(Number(maxMatch[1]));

    const minMatch = lower.match(
      /(?:above|over|more than|min|at least|>=?)\s*(?:gh[s₵¢]?\s*)?(\d+(?:\.\d+)?)/i,
    );
    if (minMatch) min_price = Math.round(Number(minMatch[1]));
  }

  let condition: 'new' | 'used' | 'refurbished' | null = null;
  if (/\brefurbished\b/.test(lower)) condition = 'refurbished';
  else if (/\b(used|pre-owned|preowned|second[- ]?hand)\b/.test(lower))
    condition = 'used';
  else if (/\bbrand\s+new\b|\bnew\b/.test(lower)) condition = 'new';

  let sort: AiBuyerSearchFilters['sort'] = 'newest';
  if (/\b(cheap|cheapest|affordable|budget|lowest)\b/.test(lower)) {
    sort = 'price_asc';
  } else if (/\b(expensive|luxury|premium|highest)\b/.test(lower)) {
    sort = 'price_desc';
  } else if (/\b(deal|deals|discount|sale|promo)\b/.test(lower)) {
    sort = 'discount_desc';
  } else if (/\b(popular|trending|top)\b/.test(lower)) {
    sort = 'popular';
  }

  const matchedCategory =
    availableCategories.find((cat) => lower.includes(cat.toLowerCase())) ||
    null;

  const keywords = Array.from(
    new Set(
      lower
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !STOP_WORDS.has(w)),
    ),
  ).slice(0, 6);

  const priceSummary =
    min_price !== null && max_price !== null
      ? ` between GH₵ ${min_price} and GH₵ ${max_price}`
      : max_price !== null
        ? ` under GH₵ ${max_price}`
        : min_price !== null
          ? ` from GH₵ ${min_price}`
          : '';

  return {
    summary: `Searching Verndly for ${keywords.join(', ') || matchedCategory || rawQuery.trim()}${priceSummary}.`,
    filters: {
      keywords,
      category: matchedCategory,
      min_price,
      max_price,
      condition,
      sort,
      in_stock_only: true,
    },
  };
}

export function buildBrowseUrl(filters: AiBuyerSearchFilters): string {
  const params = new URLSearchParams();
  if (filters.keywords.length > 0) {
    params.set('search', filters.keywords[0]);
  }
  if (filters.category) params.set('category', filters.category);
  if (filters.min_price !== null)
    params.set('min_price', String(filters.min_price));
  if (filters.max_price !== null)
    params.set('max_price', String(filters.max_price));
  if (filters.condition) params.set('condition', filters.condition);
  if (filters.sort && filters.sort !== 'newest')
    params.set('sort', filters.sort);
  if (filters.in_stock_only) params.set('in_stock', 'true');

  const qs = params.toString();
  return qs ? `/products?${qs}` : '/products';
}

export interface BuyerSearchResponse {
  query: string;
  summary: string;
  filters: AiBuyerSearchFilters;
  browseUrl: string;
  products: Record<string, unknown>[];
  total: number;
  relaxed: boolean;
  usedAi: boolean;
}

const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;
const PLAN_CACHE_MAX = 200;
const AI_SEARCH_BUDGET_MS = 5_000;

@Injectable()
export class BuyerSearchService {
  private readonly logger = new Logger(BuyerSearchService.name);
  private categoryCache: { names: string[]; expiresAt: number } | null = null;
  private readonly planCache = new Map<
    string,
    { plan: AiBuyerSearchPlan; usedAi: boolean; expiresAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  private async getCategoryNames(): Promise<string[]> {
    if (this.categoryCache && this.categoryCache.expiresAt > Date.now()) {
      return this.categoryCache.names;
    }
    const categories = await this.prisma.category.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const names = categories.map((c) => c.name).filter(Boolean);
    const resolved = names.length > 0 ? names : ['General'];
    this.categoryCache = {
      names: resolved,
      expiresAt: Date.now() + CATEGORY_CACHE_TTL_MS,
    };
    return resolved;
  }

  private getCachedPlan(
    key: string,
  ): { plan: AiBuyerSearchPlan; usedAi: boolean } | null {
    const entry = this.planCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.planCache.delete(key);
      return null;
    }
    return { plan: entry.plan, usedAi: entry.usedAi };
  }

  private setCachedPlan(
    key: string,
    plan: AiBuyerSearchPlan,
    usedAi: boolean,
  ): void {
    if (this.planCache.size >= PLAN_CACHE_MAX) {
      const oldestKey = this.planCache.keys().next().value;
      if (oldestKey) this.planCache.delete(oldestKey);
    }
    this.planCache.set(key, {
      plan,
      usedAi,
      expiresAt: Date.now() + PLAN_CACHE_TTL_MS,
    });
  }

  private buildWhereClause(
    filters: AiBuyerSearchFilters,
    opts: { includeCategory: boolean; includeKeywords: boolean },
  ): Prisma.ProductWhereInput {
    const base: Prisma.ProductWhereInput = filters.in_stock_only
      ? { ...PUBLIC_IN_STOCK_PRODUCT_WHERE }
      : { ...PUBLIC_PRODUCT_WHERE };

    const andConditions: Prisma.ProductWhereInput[] = [];

    if (opts.includeCategory && filters.category) {
      andConditions.push({
        category: { equals: filters.category, mode: 'insensitive' },
      });
    }

    if (filters.condition) {
      andConditions.push({
        condition: { equals: filters.condition, mode: 'insensitive' },
      });
    }

    if (filters.min_price !== null || filters.max_price !== null) {
      const priceFilter: Prisma.DecimalFilter = {};
      if (filters.min_price !== null) priceFilter.gte = filters.min_price;
      if (filters.max_price !== null) priceFilter.lte = filters.max_price;
      andConditions.push({ price: priceFilter });
    }

    if (filters.sort === 'discount_desc') {
      andConditions.push({ original_price: { not: null } });
    }

    if (opts.includeKeywords && filters.keywords.length > 0) {
      const keywordOr: Prisma.ProductWhereInput[] = [];
      for (const kw of filters.keywords) {
        keywordOr.push(
          { title: { contains: kw, mode: 'insensitive' } },
          { description: { contains: kw, mode: 'insensitive' } },
          { category: { contains: kw, mode: 'insensitive' } },
          { brand: { contains: kw, mode: 'insensitive' } },
          { tags: { has: kw } },
        );
      }
      andConditions.push({ OR: keywordOr });
    }

    return andConditions.length > 0 ? { ...base, AND: andConditions } : base;
  }

  private buildOrderBy(
    sort: AiBuyerSearchFilters['sort'],
  ): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ price: 'asc' }, { created_at: 'desc' }];
      case 'price_desc':
        return [{ price: 'desc' }, { created_at: 'desc' }];
      case 'popular':
        return [{ views_count: 'desc' }, { created_at: 'desc' }];
      case 'discount_desc':
        return [{ is_featured: 'desc' }, { created_at: 'desc' }];
      case 'newest':
      default:
        return [{ is_featured: 'desc' }, { created_at: 'desc' }];
    }
  }

  private async runProductQuery(
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput[],
    limit: number,
  ) {
    return this.prisma.product.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        original_price: true,
        currency: true,
        condition: true,
        quantity_available: true,
        status: true,
        is_featured: true,
        views_count: true,
        category: true,
        brand: true,
        image_urls: true,
        video_url: true,
        tags: true,
        created_at: true,
        seller: {
          select: {
            store_name: true,
            logo_url: true,
            store_link: true,
          },
        },
      },
    });
  }

  async search(rawQuery: string, rawLimit = 12): Promise<BuyerSearchResponse> {
    const query = (rawQuery || '').trim();
    if (query.length < 2) {
      throw new BadRequestException(
        'Enter at least 2 characters to search with Verndly AI.',
      );
    }

    const limit = Math.min(Math.max(1, Math.trunc(Number(rawLimit) || 12)), 24);
    const categories = await this.getCategoryNames();
    const cacheKey = query.toLowerCase().replace(/\s+/g, ' ');

    let plan: AiBuyerSearchPlan;
    let usedAi = true;

    const cached = this.getCachedPlan(cacheKey);
    if (cached) {
      plan = cached.plan;
      usedAi = cached.usedAi;
    } else if (this.geminiService.isConfigured()) {
      let budgetTimer: NodeJS.Timeout | undefined;
      try {
        plan = await Promise.race([
          this.geminiService.parseBuyerSearchQuery(query, categories),
          new Promise<never>((_, reject) => {
            budgetTimer = setTimeout(
              () => reject(new Error('AI_SEARCH_BUDGET_EXCEEDED')),
              AI_SEARCH_BUDGET_MS,
            );
          }),
        ]);
        this.setCachedPlan(cacheKey, plan, true);
      } catch (err) {
        this.logger.warn(
          `Verndly AI buyer search fell back to deterministic parser: ${(err as Error)?.message}`,
        );
        usedAi = false;
        plan = extractFallbackSearchPlan(query, categories);
      } finally {
        if (budgetTimer) clearTimeout(budgetTimer);
      }
    } else {
      usedAi = false;
      plan = extractFallbackSearchPlan(query, categories);
    }

    const orderBy = this.buildOrderBy(plan.filters.sort);

    // 1. Strict query (keywords + category + price + condition)
    let relaxed = false;
    let products = await this.runProductQuery(
      this.buildWhereClause(plan.filters, {
        includeCategory: true,
        includeKeywords: true,
      }),
      orderBy,
      limit,
    );

    // 2. Relaxation pass 1: drop category if both category & keywords were present
    if (
      products.length === 0 &&
      plan.filters.category &&
      plan.filters.keywords.length > 0
    ) {
      products = await this.runProductQuery(
        this.buildWhereClause(plan.filters, {
          includeCategory: false,
          includeKeywords: true,
        }),
        orderBy,
        limit,
      );
      if (products.length > 0) relaxed = true;
    }

    // 3. Relaxation pass 2: keep category + price/condition if keywords were too narrow
    if (
      products.length === 0 &&
      (plan.filters.category ||
        plan.filters.max_price !== null ||
        plan.filters.min_price !== null)
    ) {
      products = await this.runProductQuery(
        this.buildWhereClause(plan.filters, {
          includeCategory: Boolean(plan.filters.category),
          includeKeywords: false,
        }),
        orderBy,
        limit,
      );
      if (products.length > 0) relaxed = true;
    }

    const withSlugs = attachProductSlugs(
      products as unknown as Array<{ id: string; title?: string | null }>,
    );

    return {
      query,
      summary: relaxed
        ? `${plan.summary} Showing the closest available Verndly matches.`
        : plan.summary,
      filters: plan.filters,
      browseUrl: buildBrowseUrl(plan.filters),
      products: withSlugs as unknown as Record<string, unknown>[],
      total: withSlugs.length,
      relaxed,
      usedAi,
    };
  }
}
