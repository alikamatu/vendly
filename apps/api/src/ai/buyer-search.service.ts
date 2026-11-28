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

const PLATFORM_HELP_RE =
  /\b(escrow|paystack|momo|mobile\s*money|telecel|airteltigo|how\s+do(es)?\s+(verndly|payment|delivery|return|refund|shipping)|sell\s+on\s+verndly|open\s+a\s+store|is\s+verndly\s+safe|buyer\s+protection|return\s+policy)\b/i;

const CORRECTION_RE =
  /\b(not what i|didn'?t ask|don'?t understand|do not understand|you don'?t understand|wrong|those are|these are|that(?:'s| is) not|you (?:gave|showed|recommended)|i said|i asked|i meant|stop (?:showing|recommending))\b/i;

const GARMENT_OR_PRODUCT_RE =
  /\b(shirts?|t-?shirts?|polos?|hoodies?|jeans|trousers?|pants|dresses?|gowns?|blouses?|skirts?|sneakers?|heels?|shoes?|bags?|handbags?|watches?|phones?|laptops?|perfumes?|wigs?|tvs?|fans?|jackets?|suits?|shorts|joggers?)\b/i;

const SHOP_SIGNAL_RE =
  /\b(buy|looking\s+for|find\s+me|shop\s+for|deal|deals|gift|present|outfit|budget|cedis|ghs|gh₵)\b/i;

export type ApparelAudience = 'men' | 'women';

export function detectApparelAudience(text: string): ApparelAudience | null {
  const women =
    /\b(women(?:'s|s)?|womenswear|lad(?:y|ies)|female|for\s+her)\b/i.test(text);
  const men =
    /\b(men(?:'s|s)?|menswear|gentlemen(?:'s)?|male|for\s+him)\b/i.test(text);
  if (women && !men) return 'women';
  if (men && !women) return 'men';
  return null;
}

export function looksLikeWomensProduct(text: string): boolean {
  if (
    /\b(women(?:'s|s)?|womenswear|lad(?:y|ies)|female|blouse|crop\s*tops?|skirts?|bodysuits?|lingerie|bikinis?|maxi\s*dress|midi\s*dress|mini\s*dress|evening\s*dress|sundress|bodycon)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  return /\bdress(?:es)?\b/i.test(text) && !/\bdress\s*shoes?\b/i.test(text);
}

export function looksLikeMensProduct(text: string): boolean {
  return /\b(men(?:'s|s)?|menswear|gentlemen(?:'s)?|male|boxers?|briefs)\b/i.test(
    text,
  );
}

export function productFitsAudience(
  text: string,
  audience: ApparelAudience,
): boolean {
  const womens = looksLikeWomensProduct(text);
  const mens = looksLikeMensProduct(text);
  if (audience === 'men') return !womens || mens;
  return !mens || womens;
}

export function messageWantsProducts(
  rawQuery: string,
  availableCategories: string[] = [],
): boolean {
  const clean = rawQuery.trim();
  const lower = clean.toLowerCase();
  if (!clean) return false;

  const correction = CORRECTION_RE.test(clean);
  const hasGarment = GARMENT_OR_PRODUCT_RE.test(clean);
  const hasPrice =
    /(?:under|below|less than|above|over|more than|between)\s+(?:gh[s₵¢]?\s*)?\d/i.test(
      lower,
    ) || /\b\d+\s*(?:cedis|ghs|gh₵)\b/i.test(lower);
  const hasCategory = availableCategories.some((cat) =>
    lower.includes(cat.toLowerCase()),
  );
  const hasSubcategory = Boolean(
    matchSubcategoryName(null, null, { title: clean }),
  );

  if (correction && !hasGarment && !hasPrice) return false;
  if (hasPrice || hasCategory || hasSubcategory || hasGarment) return true;
  return SHOP_SIGNAL_RE.test(clean);
}

function conversationalPlan(clean: string): AiBuyerSearchPlan {
  const lower = clean.toLowerCase();
  let summary: string;

  if (/\b(thanks|thank\s+you|thx|cheers)\b/i.test(lower)) {
    summary =
      "You're welcome. Whenever you want to keep talking or actually shop, just say it plainly.";
  } else if (/\b(who\s+are\s+you|what\s+can\s+you\s+do)\b/i.test(lower)) {
    summary =
      "I'm Verndly AI. I can chat with you, and I can find in-stock products from verified Ghanaian stores when you tell me what you want, who it's for, and a GH₵ budget.";
  } else if (/\b(bye|goodbye|see\s+ya)\b/i.test(lower)) {
    summary = 'Catch you later. Come back when you want to talk or shop.';
  } else if (
    /\b(how\s+are\s+you|how're\s+you|how\s+you\s+doing|how\s+far|what'?s\s+up|whats\s+up)\b/i.test(
      lower,
    )
  ) {
    summary =
      "I'm doing well, thanks for asking. We can just talk, or I can help you shop — tell me the item and whether it's for men or women if it's clothing.";
  } else if (CORRECTION_RE.test(clean) || /\bwomen/i.test(lower)) {
    summary =
      "You're right to correct that. I won't pass women's wear off as men's, or the other way around. Say the audience and the item again, like men's shirts or women's dresses, and I'll stick to it.";
  } else if (/\b(joke|funny|bored|chat|talk)\b/i.test(lower)) {
    summary =
      "We can talk. I won't turn that into a product search. Ask me something direct, or name a product when you want listings.";
  } else {
    summary = `I hear you. That isn't a request to browse products, so I won't show a random catalog. If you want to keep talking, go ahead — if you want to shop, tell me the item, who it's for, and a budget.`;
  }

  return {
    intent: 'chat',
    summary,
    follow_ups: [
      "Men's shirts in stock",
      "Women's dresses",
      'How does escrow work?',
    ],
    filters: EMPTY_FILTERS(),
  };
}

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

  // 1. Verndly platform / escrow / payment questions
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

  // 2. Casual conversation, corrections, and anything that is not a product request
  if (!messageWantsProducts(clean, availableCategories)) {
    return conversationalPlan(clean);
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
      audience?: ApparelAudience | null;
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

    if (opts.audience === 'men') {
      andConditions.push({
        NOT: {
          OR: [
            'women',
            'ladies',
            'blouse',
            'skirt',
            'lingerie',
            'bikini',
          ].flatMap((needle) => [
            { title: { contains: needle, mode: 'insensitive' as const } },
            { tags: { has: needle } },
          ]),
        },
      });
    } else if (opts.audience === 'women') {
      andConditions.push({
        NOT: {
          OR: ["men's", 'menswear', 'boxers'].flatMap((needle) => [
            { title: { contains: needle, mode: 'insensitive' as const } },
            { tags: { has: needle } },
          ]),
        },
      });
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

    const genericCatalogReply =
      !plan.summary ||
      /pulling the best|here are the best verndly picks|searching verndly/i.test(
        plan.summary,
      );
    if (!messageWantsProducts(query, categories)) {
      const conversational = conversationalPlan(query);
      const modelAnswered =
        usedAi && Boolean(plan.summary) && !genericCatalogReply;
      if (!(modelAnswered && plan.intent === 'hybrid')) {
        plan = modelAnswered
          ? {
              ...plan,
              intent: 'chat',
              filters: EMPTY_FILTERS(),
              follow_ups: plan.follow_ups?.length
                ? plan.follow_ups
                : conversational.follow_ups,
            }
          : conversational;
      }
    } else {
      const audience = detectApparelAudience(query);
      if (audience === 'men' && /women/i.test(plan.filters.subcategory || '')) {
        plan.filters.subcategory = "Men's Clothing";
      } else if (
        audience === 'women' &&
        plan.filters.subcategory &&
        /men'?s/i.test(plan.filters.subcategory) &&
        !/women/i.test(plan.filters.subcategory)
      ) {
        plan.filters.subcategory = "Women's Clothing";
      }
      if (
        audience === 'men' &&
        /\bwomen/i.test(plan.summary) &&
        !/\bwomen/i.test(query)
      ) {
        plan.summary =
          "These are men's picks only. I left women's wear out of the results.";
      } else if (
        audience === 'women' &&
        /\bmen'?s\b/i.test(plan.summary) &&
        !/\bmen\b/i.test(query)
      ) {
        plan.summary =
          "These are women's picks only. I left men's wear out of the results.";
      }
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
    const audience = detectApparelAudience(
      `${query} ${plan.filters.subcategory || ''}`,
    );
    const clauseOpts = {
      includeBrand: Boolean(plan.filters.brand),
      audience,
    };

    // 1. Strict pass (subcategory + category + brand + keywords + price + condition)
    let relaxed = false;
    let products = await this.runProductQuery(
      this.buildWhereClause(plan.filters, {
        ...clauseOpts,
        includeCategory: true,
        includeSubcategory: Boolean(plan.filters.subcategory),
        includeKeywords:
          !plan.filters.subcategory && plan.filters.keywords.length > 0,
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
          ...clauseOpts,
          includeCategory: false,
          includeSubcategory: Boolean(plan.filters.subcategory),
          includeKeywords: plan.filters.keywords.length > 0,
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
          audience,
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
          audience,
        }),
        orderBy,
        candidateLimit,
      );
      if (products.length > 0) relaxed = true;
    }

    let ranked = this.rankByRelevance(products, plan.filters);
    if (audience) {
      const fitting = ranked.filter((product) => {
        const tags = Array.isArray(product.tags) ? product.tags.join(' ') : '';
        const sub =
          typeof product.attributes?.subcategory === 'string'
            ? product.attributes.subcategory
            : '';
        return productFitsAudience(
          `${product.title || ''} ${product.description || ''} ${tags} ${sub}`,
          audience,
        );
      });
      if (fitting.length === 0 && ranked.length > 0) {
        return {
          query,
          intent,
          summary:
            audience === 'men'
              ? "I found listings, but they are women's wear, so I won't show them as men's. Name a men's style or brand and I'll search that."
              : "I found listings, but they are men's wear, so I won't show them as women's. Name a women's style or brand and I'll search that.",
          follow_ups:
            audience === 'men'
              ? ["Men's polos", "Men's jeans", "Men's sneakers"]
              : ["Women's dresses", "Women's blouses", "Women's heels"],
          filters: plan.filters,
          browseUrl: buildBrowseUrl(plan.filters),
          products: [],
          total: 0,
          relaxed,
          usedAi,
        };
      }
      ranked = fitting;
    }
    ranked = ranked.slice(0, limit);
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
