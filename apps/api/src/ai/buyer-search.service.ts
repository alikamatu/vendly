import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import {
  AiBuyerIntent,
  AiBuyerSearchFilters,
  AiBuyerSearchPlan,
  AiConversationTurn,
} from './gemini.types';
import {
  PUBLIC_IN_STOCK_PRODUCT_WHERE,
  PUBLIC_PRODUCT_WHERE,
} from '../product/product-visibility';
import { attachProductSlugs } from '../product/product-slug';
import {
  findSubcategoryDefinition,
  matchSubcategoryName,
} from '../product/category-taxonomy';

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
  'can',
  'you',
  'help',
  'get',
  'buy',
  'shop',
  'recommend',
  'some',
  'any',
  'really',
  'very',
]);

const CASUAL_GREETING_RE =
  /^(hi+|hey+|hello+|yo+|sup|wassup|what'?s\s+up|good\s+(morning|afternoon|evening)|how\s+are\s+you|how\s+you\s+doing|how\s+far|chale|charlie|boss|charley|thanks|thank\s+you|thx|cheers|cool|awesome|great|okay|ok|nice|bye|goodbye|see\s+ya|who\s+are\s+you|what\s+can\s+you\s+do)[!?. ,\w]{0,20}$/i;

const PLATFORM_HELP_RE =
  /\b(escrow|paystack|momo|mobile\s*money|telecel|airteltigo|how\s+do(es)?\s+(verndly|payment|delivery|return|refund|shipping)|sell\s+on\s+verndly|open\s+a\s+store|is\s+verndly\s+safe|buyer\s+protection|return\s+policy)\b/i;

const EMPTY_FILTERS = (): AiBuyerSearchFilters => ({
  keywords: [],
  category: null,
  subcategory: null,
  brand: null,
  min_price: null,
  max_price: null,
  condition: null,
  sort: 'newest',
  in_stock_only: true,
});

/**
 * Deterministic fallback parser when Verndly AI is unavailable or times out.
 * Handles casual greetings, platform help questions, subcategory inference,
 * price limits, condition, sort, and keywords cleanly.
 */
export function extractFallbackSearchPlan(
  rawQuery: string,
  availableCategories: string[],
): AiBuyerSearchPlan {
  const clean = rawQuery.trim();
  const lower = clean.toLowerCase();

  // 1. Friendly casual chat handling (never returns awkward "0 products found" for "hey!")
  if (
    CASUAL_GREETING_RE.test(clean) &&
    !/\b(phone|laptop|shoe|dress|watch|bag|deal|gift|perfume|wig|tv|fan)\b/i.test(
      lower,
    )
  ) {
    if (/\b(thanks|thank\s+you|thx|cheers)\b/i.test(lower)) {
      return {
        intent: 'chat',
        summary:
          "You're always welcome! Anytime you want to hunt for a deal, compare options, or find a gift, just drop me a line.",
        follow_ups: [
          'Best deals right now',
          'Trending phones',
          'Gift ideas under GH₵ 250',
        ],
        filters: EMPTY_FILTERS(),
      };
    }
    if (/\b(who\s+are\s+you|what\s+can\s+you\s+do)\b/i.test(lower)) {
      return {
        intent: 'chat',
        summary:
          "I'm Verndly AI — your personal shopping buddy across verified Ghanaian stores! Tell me what you're looking for, your GH₵ budget, or an occasion, and I'll track down the best in-stock picks.",
        follow_ups: [
          'Laptops under GH₵ 5,000',
          'Sneakers in stock',
          'How does escrow work?',
        ],
        filters: EMPTY_FILTERS(),
      };
    }
    if (/\b(bye|goodbye|see\s+ya)\b/i.test(lower)) {
      return {
        intent: 'chat',
        summary: 'Catch you later! Happy shopping whenever you swing back.',
        follow_ups: ['Best deals right now', 'Browse trending finds'],
        filters: EMPTY_FILTERS(),
      };
    }
    return {
      intent: 'chat',
      summary:
        'Hey there! Doing great — ready to help you shop or just bounce around ideas. Looking for tech, fashion, a gift, or something specific today?',
      follow_ups: [
        'Laptops for work or school',
        'Affordable sneakers',
        'Gift ideas under GH₵ 200',
      ],
      filters: EMPTY_FILTERS(),
    };
  }

  // 2. Verndly platform / escrow / payment questions
  if (
    PLATFORM_HELP_RE.test(lower) &&
    !/\b(buy|find|show|under\s*\d+)\b/i.test(lower)
  ) {
    if (/\b(sell|open\s+a\s+store)\b/i.test(lower)) {
      return {
        intent: 'chat',
        summary:
          'Selling on Verndly has zero monthly rent! You can set up your storefront in minutes, upload products with AI (photos, website links, or WhatsApp screenshots), and complete quick seller verification to start receiving orders.',
        follow_ups: ['How does escrow work?', 'Best deals right now'],
        filters: EMPTY_FILTERS(),
      };
    }
    return {
      intent: 'chat',
      summary:
        'Every online payment on Verndly (MTN MoMo, Telecel Cash, AirtelTigo Money, or card) stays safely in 3-day Paystack escrow until your order arrives and you inspect it. If anything is off, you can request a return right from your order page!',
      follow_ups: [
        'Best deals right now',
        'Popular phones in stock',
        'How do I sell on Verndly?',
      ],
      filters: EMPTY_FILTERS(),
    };
  }

  // 3. Shopping search extraction
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

  const matchedSubcategory =
    matchSubcategoryName(null, matchedCategory, { title: clean }) || null;

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

  const label =
    matchedSubcategory || keywords.join(', ') || matchedCategory || clean;
  const followUps: string[] = [];
  if (max_price === null) followUps.push(`Under GH₵ 300`);
  if (!condition) followUps.push('Brand new only');
  if (sort !== 'price_asc') followUps.push('Sort by lowest price');

  return {
    intent: 'shop',
    summary: `Got it! Pulling the best ${label}${priceSummary} from verified stores right now.`,
    follow_ups: followUps.slice(0, 3),
    filters: {
      keywords,
      category: matchedCategory,
      subcategory: matchedSubcategory,
      brand: null,
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
  if (filters.keywords.length > 0 && !filters.subcategory) {
    params.set('search', filters.keywords[0]);
  }
  if (filters.category) params.set('category', filters.category);
  if (filters.subcategory) params.set('subcategory', filters.subcategory);
  if (filters.brand) params.set('brand', filters.brand);
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
  intent: AiBuyerIntent;
  summary: string;
  follow_ups: string[];
  filters: AiBuyerSearchFilters;
  browseUrl: string;
  products: Record<string, unknown>[];
  total: number;
  relaxed: boolean;
  usedAi: boolean;
}

const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
const PLAN_CACHE_TTL_MS = 3 * 60 * 1000;
const PLAN_CACHE_MAX = 200;
const AI_SEARCH_BUDGET_MS = 6_500;

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
    opts: {
      includeCategory: boolean;
      includeSubcategory: boolean;
      includeKeywords: boolean;
      includeBrand: boolean;
    },
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

    if (opts.includeBrand && filters.brand) {
      andConditions.push({
        OR: [
          { brand: { contains: filters.brand, mode: 'insensitive' } },
          { title: { contains: filters.brand, mode: 'insensitive' } },
        ],
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

    // Subcategory matching: match structured attributes.subcategory OR taxonomy synonyms
    if (opts.includeSubcategory && filters.subcategory) {
      const subDef = findSubcategoryDefinition(
        filters.subcategory,
        filters.category,
      );
      const subOr: Prisma.ProductWhereInput[] = [
        {
          attributes: {
            path: ['subcategory'],
            string_contains: filters.subcategory,
          },
        },
        { title: { contains: filters.subcategory, mode: 'insensitive' } },
      ];
      if (subDef) {
        for (const kw of subDef.keywords.slice(0, 8)) {
          subOr.push(
            { title: { contains: kw, mode: 'insensitive' } },
            { description: { contains: kw, mode: 'insensitive' } },
            { tags: { has: kw } },
          );
        }
      }
      andConditions.push({ OR: subOr });
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
        attributes: true,
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

  /**
   * Re-ranks candidate products by semantic relevance so exact title, subcategory,
   * brand, and tag hits always surface first (while preserving explicit price sorts).
   */
  private rankByRelevance(
    products: any[],
    filters: AiBuyerSearchFilters,
  ): any[] {
    if (
      products.length <= 1 ||
      filters.sort === 'price_asc' ||
      filters.sort === 'price_desc'
    ) {
      return products;
    }

    const subNeedle = (filters.subcategory || '').toLowerCase();
    const brandNeedle = (filters.brand || '').toLowerCase();
    const keywords = (filters.keywords || []).map((k) => k.toLowerCase());

    return [...products]
      .map((p) => {
        let score = 0;
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const tags = Array.isArray(p.tags)
          ? p.tags.map((t: string) => t.toLowerCase())
          : [];
        const pSub =
          typeof p.attributes?.subcategory === 'string'
            ? p.attributes.subcategory.toLowerCase()
            : '';

        if (
          subNeedle &&
          pSub &&
          (pSub === subNeedle || pSub.includes(subNeedle))
        ) {
          score += 45;
        }
        if (
          brandNeedle &&
          (brand.includes(brandNeedle) || title.includes(brandNeedle))
        ) {
          score += 30;
        }
        for (const kw of keywords) {
          if (title.includes(kw)) score += 28;
          if (tags.some((t: string) => t.includes(kw))) score += 16;
          if (desc.includes(kw)) score += 8;
        }
        if (p.is_featured) score += 8;
        score += Math.min(8, Math.log10((p.views_count || 0) + 1) * 3);
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
  }

  async search(
    rawQuery: string,
    rawLimit = 12,
    history: AiConversationTurn[] = [],
  ): Promise<BuyerSearchResponse> {
    const query = (rawQuery || '').trim();
    if (query.length < 2) {
      throw new BadRequestException(
        'Enter at least 2 characters to chat with Verndly AI.',
      );
    }

    const limit = Math.min(Math.max(1, Math.trunc(Number(rawLimit) || 12)), 24);
    const categories = await this.getCategoryNames();
    const hasHistory = Array.isArray(history) && history.length > 0;
    const cacheKey = hasHistory ? '' : query.toLowerCase().replace(/\s+/g, ' ');

    let plan: AiBuyerSearchPlan;
    let usedAi = true;

    const cached = cacheKey ? this.getCachedPlan(cacheKey) : null;
    if (cached) {
      plan = cached.plan;
      usedAi = cached.usedAi;
    } else if (this.geminiService.isConfigured()) {
      let budgetTimer: NodeJS.Timeout | undefined;
      try {
        plan = await Promise.race([
          this.geminiService.parseBuyerSearchQuery(query, categories, history),
          new Promise<never>((_, reject) => {
            budgetTimer = setTimeout(
              () => reject(new Error('AI_SEARCH_BUDGET_EXCEEDED')),
              AI_SEARCH_BUDGET_MS,
            );
          }),
        ]);
        if (cacheKey) this.setCachedPlan(cacheKey, plan, true);
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

    const intent: AiBuyerIntent = plan.intent || 'shop';

    // Pure casual chat / platform help — return warm response without bogus product search
    if (intent === 'chat') {
      return {
        query,
        intent: 'chat',
        summary: plan.summary,
        follow_ups: plan.follow_ups || [],
        filters: plan.filters,
        browseUrl: '/products',
        products: [],
        total: 0,
        relaxed: false,
        usedAi,
      };
    }

    // Enrich subcategory deterministically if AI omitted it
    if (!plan.filters.subcategory) {
      const inferredSub = matchSubcategoryName(null, plan.filters.category, {
        title: `${query} ${plan.filters.keywords.join(' ')}`,
      });
      if (inferredSub) {
        plan.filters.subcategory = inferredSub;
      }
    }

    const orderBy = this.buildOrderBy(plan.filters.sort);
    const candidateLimit = Math.min(48, Math.max(limit * 3, 24));

    // 1. Strict pass (subcategory + category + brand + keywords + price + condition)
    let relaxed = false;
    let products = await this.runProductQuery(
      this.buildWhereClause(plan.filters, {
        includeCategory: true,
        includeSubcategory: Boolean(plan.filters.subcategory),
        includeKeywords:
          !plan.filters.subcategory && plan.filters.keywords.length > 0,
        includeBrand: Boolean(plan.filters.brand),
      }),
      orderBy,
      candidateLimit,
    );

    // 2. Relaxation pass 1: drop category restriction (sellers often miscategorize items!)
    if (
      products.length === 0 &&
      plan.filters.category &&
      (plan.filters.subcategory || plan.filters.keywords.length > 0)
    ) {
      products = await this.runProductQuery(
        this.buildWhereClause(plan.filters, {
          includeCategory: false,
          includeSubcategory: Boolean(plan.filters.subcategory),
          includeKeywords: plan.filters.keywords.length > 0,
          includeBrand: Boolean(plan.filters.brand),
        }),
        orderBy,
        candidateLimit,
      );
      if (products.length > 0) relaxed = true;
    }

    // 3. Relaxation pass 2: search by keywords across all categories (drop subcategory/brand)
    if (products.length === 0 && plan.filters.keywords.length > 0) {
      products = await this.runProductQuery(
        this.buildWhereClause(plan.filters, {
          includeCategory: false,
          includeSubcategory: false,
          includeKeywords: true,
          includeBrand: false,
        }),
        orderBy,
        candidateLimit,
      );
      if (products.length > 0) relaxed = true;
    }

    // 4. Relaxation pass 3: keep category/price if keywords were too narrow
    if (
      products.length === 0 &&
      (plan.filters.category ||
        plan.filters.max_price !== null ||
        plan.filters.min_price !== null)
    ) {
      products = await this.runProductQuery(
        this.buildWhereClause(plan.filters, {
          includeCategory: Boolean(plan.filters.category),
          includeSubcategory: false,
          includeKeywords: false,
          includeBrand: false,
        }),
        orderBy,
        candidateLimit,
      );
      if (products.length > 0) relaxed = true;
    }

    const ranked = this.rankByRelevance(products, plan.filters).slice(0, limit);
    const withSlugs = attachProductSlugs(
      ranked as unknown as Array<{ id: string; title?: string | null }>,
    );

    return {
      query,
      intent,
      summary: plan.summary,
      follow_ups: plan.follow_ups || [],
      filters: plan.filters,
      browseUrl: buildBrowseUrl(plan.filters),
      products: withSlugs as unknown as Record<string, unknown>[],
      total: withSlugs.length,
      relaxed,
      usedAi,
    };
  }
}
