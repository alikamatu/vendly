import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiBulkPhotoAnalysisResult,
  AiBuyerSearchPlan,
  AiBuyerSearchSort,
  AiCardCopyInput,
  AiCardCopyResult,
  AiConfidence,
  AiDeliveryTime,
  AiDraftStorefrontInput,
  AiDraftStorefrontResult,
  AiOnboardingAssistantInput,
  AiOnboardingAssistantResult,
  AiOnboardingLocationOption,
  AiPolishListingInput,
  AiPolishListingResult,
  AiProductCondition,
  AiProductGroupDraft,
  AiServiceArea,
  AiSinglePhotoAnalysisResult,
  AiSingleProductDraft,
  AiStatusResult,
  AiWhatsAppCatalogItem,
  AiWhatsAppScreenshotsResult,
} from './gemini.types';
import {
  ALL_SUBCATEGORY_NAMES,
  findSubcategoryDefinition,
  normalizeProductAttributes,
} from '../product/category-taxonomy';

const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
const FALLBACK_GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
] as const;
const FAST_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
] as const;
const AI_STUDIO_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const VERTEX_EXPRESS_API_BASE =
  'https://aiplatform.googleapis.com/v1/publishers/google';
const MAX_PHOTOS_PER_PRODUCT = 3;
const MAX_BULK_PHOTOS = 20;
const PER_MODEL_TIMEOUT_MS = 28_000;
const HEALTHY_MODEL_TTL_MS = 5 * 60 * 1000;

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiGenerateOptions {
  systemInstruction: string;
  parts: GeminiPart[];
  responseSchema: Record<string, unknown>;
  temperature?: number;
  /** Prefer lowest-latency Flash Lite model chain for instant search UX */
  fast?: boolean;
  /** Override per-model abort timeout in milliseconds */
  timeoutMs?: number;
  /** Optional cap on output tokens for compact JSON responses */
  maxOutputTokens?: number;
}

const VALID_CONDITIONS: readonly AiProductCondition[] = [
  'new',
  'used',
  'refurbished',
];

const VALID_CONFIDENCES: readonly AiConfidence[] = ['high', 'medium', 'low'];

const VALID_BUYER_SORTS: readonly AiBuyerSearchSort[] = [
  'newest',
  'price_asc',
  'price_desc',
  'popular',
  'discount_desc',
];

function normalizeOptionalCondition(value: unknown): AiProductCondition | null {
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if ((VALID_CONDITIONS as readonly string[]).includes(lower)) {
    return lower as AiProductCondition;
  }
  return null;
}

function normalizeBuyerSort(value: unknown): AiBuyerSearchSort {
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if ((VALID_BUYER_SORTS as readonly string[]).includes(lower)) {
    return lower as AiBuyerSearchSort;
  }
  return 'newest';
}

function resolveOptionalCategory(
  rawCategory: unknown,
  availableCategories: string[],
): string | null {
  if (typeof rawCategory !== 'string' || !rawCategory.trim()) return null;
  const needle = rawCategory.trim().toLowerCase();
  const exact = availableCategories.find(
    (c) => c.trim().toLowerCase() === needle,
  );
  if (exact) return exact;
  const partial = availableCategories.find(
    (c) =>
      c.trim().toLowerCase().includes(needle) ||
      needle.includes(c.trim().toLowerCase()),
  );
  return partial || null;
}

export function normalizeBuyerSearchPlan(
  raw: unknown,
  availableCategories: string[],
): AiBuyerSearchPlan {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const rawIntent =
    typeof obj.intent === 'string' ? obj.intent.trim().toLowerCase() : '';
  const intent: 'shop' | 'chat' | 'hybrid' =
    rawIntent === 'chat' || rawIntent === 'hybrid' || rawIntent === 'shop'
      ? rawIntent
      : 'shop';

  const keywords = normalizeTags(obj.keywords);
  const category = resolveOptionalCategory(obj.category, availableCategories);
  const rawSub = cleanText(obj.subcategory, 60);
  const matchedSub = rawSub
    ? findSubcategoryDefinition(rawSub, category)?.name || null
    : null;
  const brand = cleanText(obj.brand, 60) || null;

  let min_price = normalizePrice(obj.min_price);
  let max_price = normalizePrice(obj.max_price);
  if (min_price !== null && max_price !== null && min_price > max_price) {
    [min_price, max_price] = [max_price, min_price];
  }

  const summary =
    cleanText(obj.summary, 480) ||
    (intent === 'chat'
      ? "Hey! I'm Verndly AI — happy to chat or help you hunt down great finds across verified Ghanaian stores."
      : 'Here are the best Verndly picks matching what you asked for!');

  const follow_ups = Array.isArray(obj.follow_ups)
    ? Array.from(
        new Set(
          obj.follow_ups
            .filter((x): x is string => typeof x === 'string')
            .map((x) => cleanText(x, 60))
            .filter(Boolean),
        ),
      ).slice(0, 3)
    : [];

  return {
    intent,
    summary,
    follow_ups,
    filters: {
      keywords,
      category,
      subcategory: matchedSub,
      brand,
      min_price,
      max_price,
      condition: normalizeOptionalCondition(obj.condition),
      sort: normalizeBuyerSort(obj.sort),
      in_stock_only: obj.in_stock_only !== false,
    },
  };
}

function normalizeCondition(value: unknown): AiProductCondition {
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if ((VALID_CONDITIONS as readonly string[]).includes(lower)) {
    return lower as AiProductCondition;
  }
  return 'new';
}

function normalizeConfidence(value: unknown): AiConfidence {
  const lower = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if ((VALID_CONFIDENCES as readonly string[]).includes(lower)) {
    return lower as AiConfidence;
  }
  return 'medium';
}

function resolveCategory(
  rawCategory: unknown,
  availableCategories: string[],
): string {
  const fallback = availableCategories[0] || 'General';
  if (typeof rawCategory !== 'string' || !rawCategory.trim()) {
    return fallback;
  }
  const needle = rawCategory.trim().toLowerCase();
  const exact = availableCategories.find(
    (c) => c.trim().toLowerCase() === needle,
  );
  if (exact) return exact;

  const partial = availableCategories.find(
    (c) =>
      c.trim().toLowerCase().includes(needle) ||
      needle.includes(c.trim().toLowerCase()),
  );
  return partial || fallback;
}

function normalizeTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of rawTags) {
    if (typeof item !== 'string') continue;
    const clean = item
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/\s+/g, ' ');
    if (!clean || clean.length < 2 || clean.length > 32 || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    result.push(clean);
    if (result.length >= 6) break;
  }
  return result;
}

function normalizePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num);
}

function cleanText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

/**
 * Pure deterministic normalizer for Gemini's bulk photo grouping output.
 * Guarantees:
 * - Every index in [0, photoCount - 1] appears in at most one product group.
 * - Every product group has at most MAX_PHOTOS_PER_PRODUCT (3) photos.
 * - Any photo index omitted by the model is recovered so zero seller photos are lost.
 * - Categories, conditions, tags, and prices conform to Verndly's schema.
 */
export function normalizeBulkAnalysis(
  raw: unknown,
  photoCount: number,
  availableCategories: string[],
): AiProductGroupDraft[] {
  const rawProducts =
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as { products?: unknown }).products)
      ? ((raw as { products: Record<string, unknown>[] }).products ?? [])
      : [];

  const assigned = new Set<number>();
  const normalized: AiProductGroupDraft[] = [];

  for (const item of rawProducts) {
    if (!item || typeof item !== 'object') continue;
    const rawIndices = Array.isArray(item.photo_indices)
      ? item.photo_indices
      : [];

    const validIndices: number[] = [];
    for (const candidate of rawIndices) {
      const idx =
        typeof candidate === 'number'
          ? Math.trunc(candidate)
          : Number.parseInt(String(candidate), 10);
      if (
        Number.isInteger(idx) &&
        idx >= 0 &&
        idx < photoCount &&
        !assigned.has(idx)
      ) {
        assigned.add(idx);
        validIndices.push(idx);
      }
    }

    if (validIndices.length === 0) continue;

    const title = cleanText(item.title, 120);
    const description = cleanText(item.description, 1000);
    const category = resolveCategory(item.category, availableCategories);
    const tags = normalizeTags(item.tags);
    const attributes = normalizeProductAttributes(
      {
        subcategory: item.subcategory,
        color: item.color,
        material: item.material,
        size: item.size,
        warranty: item.warranty,
        dimensions: item.dimensions,
        weight: item.weight,
      },
      category,
      { title, description, tags },
    );

    const baseDraft = {
      title,
      description,
      category,
      ...(attributes.subcategory
        ? { subcategory: attributes.subcategory }
        : {}),
      condition: normalizeCondition(item.condition),
      brand: cleanText(item.brand, 60),
      tags,
      ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
      suggested_price_ghs: normalizePrice(item.suggested_price_ghs),
      confidence: normalizeConfidence(item.confidence),
    };

    // Verndly allows max 3 photos per product listing; split overflow cleanly
    for (let i = 0; i < validIndices.length; i += MAX_PHOTOS_PER_PRODUCT) {
      const chunk = validIndices.slice(i, i + MAX_PHOTOS_PER_PRODUCT);
      const partSuffix =
        i > 0 ? ` (${Math.floor(i / MAX_PHOTOS_PER_PRODUCT) + 1})` : '';
      normalized.push({
        ...baseDraft,
        photo_indices: chunk,
        title: baseDraft.title
          ? `${baseDraft.title}${partSuffix}`.slice(0, 120)
          : '',
      });
    }
  }

  // Recover any photo index not assigned by Gemini so no seller photo is ever dropped
  const fallbackCategory = availableCategories[0] || 'General';
  for (let idx = 0; idx < photoCount; idx++) {
    if (!assigned.has(idx)) {
      normalized.push({
        photo_indices: [idx],
        title: '',
        description: '',
        category: fallbackCategory,
        condition: 'new',
        brand: '',
        tags: [],
        suggested_price_ghs: null,
        confidence: 'low',
      });
    }
  }

  return normalized;
}

function slugifyHandle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 35);
}

function isSafePublicHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.includes(':')
  ) {
    return false;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return false;
    }
  }
  return host.includes('.');
}

function extractSimpleMeta(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const b = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
    'i',
  );
  const m = html.match(a) || html.match(b);
  return m?.[1]
    ? m[1]
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .trim()
    : '';
}

export function matchOnboardingLocation(
  cityHint: string,
  regionHint: string,
  rawContext: string,
  locations: AiOnboardingLocationOption[],
): AiOnboardingLocationOption | null {
  if (!locations.length) return null;
  const cleanCity = cityHint.trim().toLowerCase();
  const cleanRegion = regionHint.trim().toLowerCase();
  const lowerCtx = rawContext.toLowerCase();

  if (cleanCity) {
    const exactCity = locations.find(
      (l) => l.city.trim().toLowerCase() === cleanCity,
    );
    if (exactCity) return exactCity;
    const partialCity = locations.find(
      (l) =>
        l.city.trim().toLowerCase().includes(cleanCity) ||
        cleanCity.includes(l.city.trim().toLowerCase()),
    );
    if (partialCity) return partialCity;
  }

  for (const loc of locations) {
    const c = loc.city.trim().toLowerCase();
    if (c.length >= 3 && new RegExp(`\\b${c}\\b`, 'i').test(lowerCtx)) {
      return loc;
    }
  }

  // Common Accra / Kumasi neighborhood-to-city aliases
  if (
    /\b(east\s*legon|osu|cantonments|labone|spintex|madina|airport|dzorwulu|adenta|achimota|lapaz|dansoman|circle|kaneshie|kasoa)\b/i.test(
      lowerCtx,
    )
  ) {
    const accra = locations.find((l) => l.city.toLowerCase() === 'accra');
    if (accra) return accra;
  }
  if (/\b(knust|adum|ahodwo|asokwa|bantama|suame|ayeduase)\b/i.test(lowerCtx)) {
    const kumasi = locations.find((l) => l.city.toLowerCase() === 'kumasi');
    if (kumasi) return kumasi;
  }

  if (cleanRegion) {
    const byRegion = locations.find((l) =>
      l.region.toLowerCase().includes(cleanRegion),
    );
    if (byRegion) return byRegion;
  }

  return null;
}

export function normalizeImageBox2d(
  raw: unknown,
): [number, number, number, number] | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const nums = raw.map((v) => Number(v));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  const clamp = (n: number) => Math.max(0, Math.min(1000, Math.round(n)));
  const ymin = clamp(nums[0]);
  const xmin = clamp(nums[1]);
  const ymax = clamp(nums[2]);
  const xmax = clamp(nums[3]);
  // Require a meaningful photo area (at least 2.5% width and height)
  if (ymax - ymin < 25 || xmax - xmin < 25) return null;
  return [ymin, xmin, ymax, xmax];
}

export function normalizeSingleAnalysis(
  raw: unknown,
  availableCategories: string[],
): AiSingleProductDraft {
  const item =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const title = cleanText(item.title, 120);
  const description = cleanText(item.description, 1000);
  const category = resolveCategory(item.category, availableCategories);
  const tags = normalizeTags(item.tags);
  const attributes = normalizeProductAttributes(
    {
      subcategory: item.subcategory,
      color: item.color,
      material: item.material,
      size: item.size,
      warranty: item.warranty,
      dimensions: item.dimensions,
      weight: item.weight,
    },
    category,
    { title, description, tags },
  );

  return {
    title,
    description,
    category,
    ...(attributes.subcategory ? { subcategory: attributes.subcategory } : {}),
    condition: normalizeCondition(item.condition),
    brand: cleanText(item.brand, 60),
    tags,
    ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
    suggested_price_ghs: normalizePrice(item.suggested_price_ghs),
    confidence: normalizeConfidence(item.confidence),
  };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private stickyFallbackModel: { model: string; expiresAt: number } | null =
    null;

  constructor(private readonly configService: ConfigService) {}

  getApiKey(): string {
    return (this.configService.get<string>('GEMINI_API_KEY') || '').trim();
  }

  getModel(): string {
    return (
      (this.configService.get<string>('GEMINI_MODEL') || '').trim() ||
      DEFAULT_GEMINI_MODEL
    );
  }

  /**
   * Ordered list of models to attempt. If the primary model recently hit a 503
   * capacity spike, promote the last known-healthy fallback model first so
   * subsequent requests succeed immediately without waiting on an overloaded model.
   */
  getCandidateModels(): string[] {
    const primary = this.getModel();
    const extraRaw = (
      this.configService.get<string>('GEMINI_FALLBACK_MODELS') || ''
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const sticky =
      this.stickyFallbackModel &&
      this.stickyFallbackModel.expiresAt > Date.now()
        ? this.stickyFallbackModel.model
        : null;

    const ordered = [
      ...(sticky ? [sticky] : []),
      primary,
      ...extraRaw,
      ...FALLBACK_GEMINI_MODELS,
    ];

    return Array.from(new Set(ordered.filter(Boolean)));
  }

  isConfigured(): boolean {
    return this.getApiKey().length > 0;
  }

  getStatus(): AiStatusResult {
    return {
      configured: this.isConfigured(),
      provider: 'gemini',
      model: this.getModel(),
    };
  }

  /**
   * Builds the Gemini REST endpoint:
   * - Defaults to `generativelanguage.googleapis.com/v1beta` (works with both
   *   `AIza...` and `AQ....` keys without needing Vertex Agent Platform API enabled).
   * - Uses `aiplatform.googleapis.com` only when `GEMINI_USE_VERTEX=true`.
   * - Custom `GEMINI_API_BASE` overrides either.
   */
  resolveEndpoint(model: string, apiKey: string): string {
    const customBase = (this.configService.get<string>('GEMINI_API_BASE') || '')
      .trim()
      .replace(/\/+$/, '');
    const forceVertex =
      (this.configService.get<string>('GEMINI_USE_VERTEX') || '')
        .trim()
        .toLowerCase() === 'true';

    const base =
      customBase ||
      (forceVertex ? VERTEX_EXPRESS_API_BASE : AI_STUDIO_API_BASE);
    return `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  }

  private parseCandidateJson<T>(payload: {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string; thought?: boolean }>;
      };
    }>;
  }): T {
    const rawText = payload?.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought && typeof p.text === 'string')
      .map((p) => p.text || '')
      .join('')
      .trim();

    if (!rawText) {
      throw new Error('EMPTY_MODEL_RESPONSE');
    }

    try {
      return JSON.parse(rawText) as T;
    } catch {
      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      return JSON.parse(cleaned) as T;
    }
  }

  /**
   * Reusable Gemini Vision/Text structured-JSON primitive for all Verndly AI features.
   * Automatically fails over across healthy Flash models if the primary model
   * returns 503 (high demand), 429 (quota/rate spike), 404 (deprecated), or times out.
   */
  async generateStructuredJson<T>(options: GeminiGenerateOptions): Promise<T> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new ServiceUnavailableException({
        message:
          'Verndly AI is not configured on this server yet. Please try again later.',
        code: 'AI_NOT_CONFIGURED',
      });
    }

    const candidates = options.fast
      ? Array.from(
          new Set([...FAST_GEMINI_MODELS, ...this.getCandidateModels()]),
        )
      : this.getCandidateModels();
    const primaryModel = options.fast ? FAST_GEMINI_MODELS[0] : this.getModel();
    const perModelTimeout = options.timeoutMs ?? PER_MODEL_TIMEOUT_MS;
    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [{ text: options.systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: options.parts,
        },
      ],
      generationConfig: {
        ...(options.temperature !== undefined
          ? { temperature: options.temperature }
          : {}),
        ...(options.maxOutputTokens !== undefined
          ? { maxOutputTokens: options.maxOutputTokens }
          : {}),
        responseMimeType: 'application/json',
        responseSchema: options.responseSchema,
      },
    });

    let sawRateOrCapacitySpike = false;

    for (let i = 0; i < candidates.length; i++) {
      const model = candidates[i];
      const endpoint = this.resolveEndpoint(model, apiKey);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), perModelTimeout);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: requestBody,
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          this.logger.warn(
            `Verndly AI model "${model}" returned HTTP ${response.status}: ${errorBody.slice(0, 280)}`,
          );

          // Invalid API key / permission error affects all models on this endpoint — fail fast
          if (response.status === 401 || response.status === 403) {
            throw new ServiceUnavailableException({
              message:
                'Verndly AI is temporarily unavailable. Please check your API key configuration.',
              code: 'AI_AUTH_ERROR',
            });
          }

          // Transient overload (503/500/502/504), rate spike (429), or retired model (404): try next fallback model
          if (
            response.status === 429 ||
            response.status === 404 ||
            response.status >= 500
          ) {
            if (response.status === 429 || response.status === 503) {
              sawRateOrCapacitySpike = true;
            }
            continue;
          }

          throw new InternalServerErrorException(
            'Verndly AI could not analyze these photos right now. Please try again.',
          );
        }

        const payload = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string; thought?: boolean }>;
            };
          }>;
        };

        const parsed = this.parseCandidateJson<T>(payload);

        // Cache fallback model briefly if primary was overloaded so next call is instant
        if (model !== primaryModel) {
          this.stickyFallbackModel = {
            model,
            expiresAt: Date.now() + HEALTHY_MODEL_TTL_MS,
          };
          this.logger.log(
            `Verndly AI succeeded using fallback model "${model}"`,
          );
        }

        return parsed;
      } catch (error) {
        if (
          error instanceof ServiceUnavailableException ||
          error instanceof BadRequestException ||
          error instanceof InternalServerErrorException
        ) {
          throw error;
        }

        const isAbort = (error as { name?: string })?.name === 'AbortError';
        this.logger.warn(
          `Verndly AI attempt on "${model}" failed (${isAbort ? 'timeout' : (error as Error)?.message}) — trying next model if available`,
        );
        sawRateOrCapacitySpike = sawRateOrCapacitySpike || isAbort;
        continue;
      } finally {
        clearTimeout(timer);
      }
    }

    if (sawRateOrCapacitySpike) {
      throw new ServiceUnavailableException(
        'Verndly AI is experiencing high demand right now. Please try again in a moment.',
      );
    }

    throw new InternalServerErrorException(
      'Unable to reach Verndly AI right now. Please try again.',
    );
  }

  private validateImageFiles(
    files: Express.Multer.File[],
    maxCount: number,
  ): void {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Please upload at least one product photo.',
      );
    }
    if (files.length > maxCount) {
      throw new BadRequestException(
        `You can analyze up to ${maxCount} photos at a time.`,
      );
    }
    for (const file of files) {
      if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        throw new BadRequestException(
          `Unsupported file "${file.originalname}". Only image files are supported.`,
        );
      }
      if (!file.buffer || file.buffer.length === 0) {
        throw new BadRequestException(`Image "${file.originalname}" is empty.`);
      }
    }
  }

  async analyzeBulkProductPhotos(
    files: Express.Multer.File[],
    availableCategories: string[],
  ): Promise<AiBulkPhotoAnalysisResult> {
    this.validateImageFiles(files, MAX_BULK_PHOTOS);
    const categories =
      availableCategories.length > 0 ? availableCategories : ['General'];

    const systemInstruction = [
      'You are Verndly AI, an expert e-commerce catalog vision assistant for Verndly, Ghana’s escrow-protected online marketplace.',
      'Your job is to examine a batch of seller-uploaded photos, accurately distinguish which photos depict the SAME physical product (different angles, close-ups, packaging) versus DIFFERENT physical products (different items, different models, or distinct colorways sold separately), and draft clean, honest listing details for each distinct product.',
      'Strict rules:',
      '1. Group photos of the exact same physical item together in one product entry. Put the clearest, best front-facing hero photo FIRST in photo_indices.',
      '2. Each product group may contain at most 3 photos. Every input photo index (0 to N-1) MUST appear in exactly one group.',
      '3. NEVER merge two different products into one group. When unsure whether two photos are the same item, keep them as separate products.',
      '4. Write concise, natural product titles (3–9 words, Title Case, no spam, no ALL CAPS, no "best/cheap/promo").',
      '5. Write factual descriptions of 2–3 sentences (35–260 characters) describing ONLY what is visibly observable: item type, color, material/finish, design details, and apparent state. Never invent technical specifications (like RAM, storage, battery size, or warranty) unless clearly printed in the image.',
      `6. Pick the single best matching category from this exact list: ${categories.join(', ')}.`,
      `7. Pick the closest subcategory from this list when applicable (or "" if none fits): ${ALL_SUBCATEGORY_NAMES.join(', ')}.`,
      '8. Set brand ONLY if a brand name or logo is clearly readable/visible on the product or box. Otherwise return an empty string "". NEVER guess restricted brands (Apple, Nike, Adidas, Samsung, etc.).',
      '9. Provide 3 to 6 lowercase search tags relevant to shoppers in Ghana.',
      '10. Extract visible color, material, and size/capacity if clearly observable (otherwise ""). Populate dimensions (length, width, height, unit) or weight (value, unit) ONLY if printed on packaging/labels; never invent measurements.',
      '11. Provide suggested_price_ghs as a rough, realistic Ghana Cedis (GHS) integer estimate ONLY if the product type is clear; otherwise set it to null.',
    ].join('\n');

    const parts: GeminiPart[] = [
      {
        text: `Analyze these ${files.length} product photos (indexed 0 through ${files.length - 1}). Group photos of the same physical item together and return structured listing drafts for every distinct product.`,
      },
    ];

    files.forEach((file, idx) => {
      parts.push({ text: `Photo ${idx}:` });
      parts.push({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString('base64'),
        },
      });
    });

    const responseSchema = {
      type: 'OBJECT',
      required: ['products'],
      properties: {
        products: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: [
              'photo_indices',
              'title',
              'description',
              'category',
              'condition',
              'brand',
              'tags',
              'confidence',
            ],
            properties: {
              photo_indices: {
                type: 'ARRAY',
                items: { type: 'INTEGER' },
              },
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              category: { type: 'STRING' },
              subcategory: { type: 'STRING' },
              condition: {
                type: 'STRING',
                enum: ['new', 'used', 'refurbished'],
              },
              brand: { type: 'STRING' },
              color: { type: 'STRING' },
              material: { type: 'STRING' },
              size: { type: 'STRING' },
              dimensions: {
                type: 'OBJECT',
                nullable: true,
                properties: {
                  length: { type: 'NUMBER', nullable: true },
                  width: { type: 'NUMBER', nullable: true },
                  height: { type: 'NUMBER', nullable: true },
                  unit: { type: 'STRING' },
                },
              },
              weight: {
                type: 'OBJECT',
                nullable: true,
                properties: {
                  value: { type: 'NUMBER', nullable: true },
                  unit: { type: 'STRING' },
                },
              },
              tags: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
              suggested_price_ghs: {
                type: 'NUMBER',
                nullable: true,
              },
              confidence: {
                type: 'STRING',
                enum: ['high', 'medium', 'low'],
              },
            },
          },
        },
      },
    };

    const raw = await this.generateStructuredJson<unknown>({
      systemInstruction,
      parts,
      responseSchema,
      temperature: 0.15,
    });

    const products = normalizeBulkAnalysis(raw, files.length, categories);

    return {
      products,
      model: this.getModel(),
      totalPhotos: files.length,
    };
  }

  async analyzeSingleProductPhotos(
    files: Express.Multer.File[],
    availableCategories: string[],
  ): Promise<AiSinglePhotoAnalysisResult> {
    this.validateImageFiles(files, MAX_PHOTOS_PER_PRODUCT);
    const categories =
      availableCategories.length > 0 ? availableCategories : ['General'];

    const systemInstruction = [
      'You are Verndly AI, an e-commerce catalog vision assistant for Verndly, Ghana’s escrow-protected online marketplace.',
      'All provided photos show a single product the seller wants to list. Generate an accurate, honest, buyer-friendly product draft.',
      'Strict rules:',
      '1. Write a concise, natural product title (3–9 words, Title Case, no spam, no ALL CAPS).',
      '2. Write a factual description of 2–3 sentences (35–260 characters) describing ONLY visible attributes (type, color, material, visible features). Never fabricate specs not visible in the photo.',
      `3. Pick the single best matching category from this exact list: ${categories.join(', ')}.`,
      `4. Pick the closest subcategory from this list when applicable (or ""): ${ALL_SUBCATEGORY_NAMES.join(', ')}.`,
      '5. Set brand ONLY if clearly printed/visible on the item or packaging; otherwise return "". Never guess trademarks.',
      '6. Provide 3 to 6 clean lowercase search tags.',
      '7. Extract visible color, material, and size/capacity if clearly observable (otherwise ""). Populate dimensions/weight ONLY if visibly printed on the product or box.',
      '8. Provide suggested_price_ghs as a conservative rough Ghana Cedis (GHS) integer estimate if clear, otherwise null.',
    ].join('\n');

    const parts: GeminiPart[] = [
      {
        text: `Generate a structured Verndly product listing from these ${files.length} photo(s) of one item.`,
      },
    ];

    files.forEach((file, idx) => {
      parts.push({ text: `Angle ${idx + 1}:` });
      parts.push({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString('base64'),
        },
      });
    });

    const responseSchema = {
      type: 'OBJECT',
      required: [
        'title',
        'description',
        'category',
        'condition',
        'brand',
        'tags',
        'confidence',
      ],
      properties: {
        title: { type: 'STRING' },
        description: { type: 'STRING' },
        category: { type: 'STRING' },
        subcategory: { type: 'STRING' },
        condition: {
          type: 'STRING',
          enum: ['new', 'used', 'refurbished'],
        },
        brand: { type: 'STRING' },
        color: { type: 'STRING' },
        material: { type: 'STRING' },
        size: { type: 'STRING' },
        dimensions: {
          type: 'OBJECT',
          nullable: true,
          properties: {
            length: { type: 'NUMBER', nullable: true },
            width: { type: 'NUMBER', nullable: true },
            height: { type: 'NUMBER', nullable: true },
            unit: { type: 'STRING' },
          },
        },
        weight: {
          type: 'OBJECT',
          nullable: true,
          properties: {
            value: { type: 'NUMBER', nullable: true },
            unit: { type: 'STRING' },
          },
        },
        tags: {
          type: 'ARRAY',
          items: { type: 'STRING' },
        },
        suggested_price_ghs: {
          type: 'NUMBER',
          nullable: true,
        },
        confidence: {
          type: 'STRING',
          enum: ['high', 'medium', 'low'],
        },
      },
    };

    const raw = await this.generateStructuredJson<unknown>({
      systemInstruction,
      parts,
      responseSchema,
      temperature: 0.2,
    });

    return {
      product: normalizeSingleAnalysis(raw, categories),
      model: this.getModel(),
    };
  }

  async parseWhatsAppCatalogScreenshots(
    files: Express.Multer.File[],
    availableCategories: string[],
  ): Promise<AiWhatsAppScreenshotsResult> {
    this.validateImageFiles(files, 10);
    const categories =
      availableCategories.length > 0 ? availableCategories : ['General'];

    const systemInstruction = [
      'You are Verndly AI, an e-commerce catalog extraction assistant for Verndly, Ghana’s escrow-protected online marketplace.',
      'The seller has uploaded one or more screenshots from their WhatsApp Business Catalog (either the catalog list screen showing multiple items or individual WhatsApp product detail screens).',
      'Extract EVERY distinct product visible across all screenshots. Deduplicate if the same product appears twice across overlapping scroll screenshots.',
      'Strict rules:',
      '1. Read the EXACT product title as written in WhatsApp (clean whitespace only).',
      '2. Read the EXACT numeric price printed in WhatsApp (e.g. "GHS 250.00" or "GH₵ 250" → price: 250, currency: "GHS"). If a crossed-out sale price is shown, put the higher crossed-out price in original_price and the active selling price in price. If no price is visible, set price to null.',
      '3. Write a clean factual description (35–260 chars) combining the WhatsApp item description (if visible) and observable visual details. Never fabricate specs.',
      `4. Pick the closest category from this exact list: ${categories.join(', ')}.`,
      `5. Pick the closest subcategory from this list when applicable (or ""): ${ALL_SUBCATEGORY_NAMES.join(', ')}.`,
      '6. Set brand ONLY if clearly printed in the WhatsApp text or visibly on the product; otherwise "".',
      '7. Provide 3 to 6 lowercase search tags.',
      '8. Extract color, material, size, warranty, dimensions (length/width/height/unit), and weight (value/unit) if mentioned in the WhatsApp text or visibly clear; never fabricate measurements.',
      '9. Set source_screenshot_index to the 0-based index of the screenshot where the product appears most clearly.',
      '10. Set in_stock to false only if WhatsApp explicitly marks the item out of stock or unavailable; otherwise true.',
      '11. Set image_box_2d to [ymin, xmin, ymax, xmax] (4 integers on a 0 to 1000 normalized scale, where 0 is top/left and 1000 is bottom/right) tightly framing ONLY that product’s photo or thumbnail inside the screenshot at source_screenshot_index — EXCLUDING WhatsApp headers, status bars, titles, prices, and buttons. If no product photo is visible for that item, set image_box_2d to null.',
    ].join('\n');

    const parts: GeminiPart[] = [
      {
        text: `Extract every distinct WhatsApp Business catalog product from these ${files.length} screenshot(s) (indexed 0 through ${files.length - 1}).`,
      },
    ];

    files.forEach((file, idx) => {
      parts.push({ text: `Screenshot ${idx}:` });
      parts.push({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString('base64'),
        },
      });
    });

    const responseSchema = {
      type: 'OBJECT',
      required: ['products'],
      properties: {
        products: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: [
              'title',
              'description',
              'category',
              'condition',
              'brand',
              'tags',
              'in_stock',
              'source_screenshot_index',
            ],
            properties: {
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              price: { type: 'NUMBER', nullable: true },
              original_price: { type: 'NUMBER', nullable: true },
              currency: { type: 'STRING' },
              category: { type: 'STRING' },
              subcategory: { type: 'STRING' },
              condition: {
                type: 'STRING',
                enum: ['new', 'used', 'refurbished'],
              },
              brand: { type: 'STRING' },
              color: { type: 'STRING' },
              material: { type: 'STRING' },
              size: { type: 'STRING' },
              warranty: { type: 'STRING' },
              dimensions: {
                type: 'OBJECT',
                nullable: true,
                properties: {
                  length: { type: 'NUMBER', nullable: true },
                  width: { type: 'NUMBER', nullable: true },
                  height: { type: 'NUMBER', nullable: true },
                  unit: { type: 'STRING' },
                },
              },
              weight: {
                type: 'OBJECT',
                nullable: true,
                properties: {
                  value: { type: 'NUMBER', nullable: true },
                  unit: { type: 'STRING' },
                },
              },
              tags: { type: 'ARRAY', items: { type: 'STRING' } },
              in_stock: { type: 'BOOLEAN' },
              source_screenshot_index: { type: 'INTEGER' },
              image_box_2d: {
                type: 'ARRAY',
                items: { type: 'INTEGER' },
                nullable: true,
              },
            },
          },
        },
      },
    };

    const raw = await this.generateStructuredJson<unknown>({
      systemInstruction,
      parts,
      responseSchema,
      temperature: 0.1,
    });

    const rawProducts =
      raw &&
      typeof raw === 'object' &&
      Array.isArray((raw as { products?: unknown }).products)
        ? ((raw as { products: Record<string, unknown>[] }).products ?? [])
        : [];

    const seenTitles = new Set<string>();
    const products: AiWhatsAppCatalogItem[] = [];

    for (const item of rawProducts) {
      if (!item || typeof item !== 'object') continue;
      const title = cleanText(item.title, 120);
      if (!title) continue;
      const key = title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);

      const price = normalizePrice(item.price);
      const rawOrig = normalizePrice(item.original_price);
      const original_price =
        rawOrig !== null && price !== null && rawOrig > price ? rawOrig : null;

      const rawIdx =
        typeof item.source_screenshot_index === 'number'
          ? Math.trunc(item.source_screenshot_index)
          : 0;
      const source_screenshot_index =
        rawIdx >= 0 && rawIdx < files.length ? rawIdx : 0;

      const resolvedCat = resolveCategory(item.category, categories);
      const description = cleanText(item.description, 1000);
      const tags = normalizeTags(item.tags);
      const attributes = normalizeProductAttributes(
        {
          subcategory: item.subcategory,
          color: item.color,
          material: item.material,
          size: item.size,
          warranty: item.warranty,
          dimensions: item.dimensions,
          weight: item.weight,
        },
        resolvedCat,
        { title, description, tags },
      );

      products.push({
        title,
        description,
        price,
        original_price,
        currency: cleanText(item.currency, 8).toUpperCase() || 'GHS',
        category: resolvedCat,
        ...(attributes.subcategory
          ? { subcategory: attributes.subcategory }
          : {}),
        condition: normalizeCondition(item.condition),
        brand: cleanText(item.brand, 60),
        tags,
        ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
        in_stock: item.in_stock !== false,
        source_screenshot_index,
        image_box_2d: normalizeImageBox2d(item.image_box_2d),
      });
    }

    return {
      products,
      model: this.getModel(),
      totalScreenshots: files.length,
    };
  }

  async parseBuyerSearchQuery(
    query: string,
    availableCategories: string[],
    history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
  ): Promise<AiBuyerSearchPlan> {
    const cleanQuery = cleanText(query, 320);
    if (!cleanQuery) {
      throw new BadRequestException('Please enter a message for Verndly AI.');
    }

    const categories =
      availableCategories.length > 0 ? availableCategories : ['General'];

    const systemInstruction = [
      'You are Verndly AI — a sharp personal shopping companion for Verndly, Ghana’s escrow-protected marketplace.',
      "Understand the shopper's latest message before you do anything else. Use the conversation so far. Reply to what they actually said: a question, a correction, a joke, a complaint, an opinion, or a product request.",
      '',
      'About Verndly (use accurately when asked):',
      '- Every online order (MTN MoMo, Telecel Cash, AirtelTigo Money, or card) is protected by 3-day Paystack escrow until delivery & inspection.',
      '- Independent Ghanaian merchants are verified before receiving orders, with zero monthly store rent.',
      '- Prices are in Ghana Cedis (GH₵).',
      '',
      'How to respond:',
      '- `summary` is the reply the shopper reads. Answer them directly in 1–3 natural sentences. Mention the constraints they gave (who it is for, occasion, budget, color, brand, city, condition). If a missing detail would make the recommendation wrong, ask one short question instead of guessing.',
      '- Do not open with "Searching Verndly", "Pulling picks", or "Here are the best products" unless you are actually showing products that match the request.',
      '- Set intent="chat" when they are not asking to see products. Leave keywords=[], category=null, subcategory=null, and brand=null.',
      '- Set intent="hybrid" when they want advice and a few relevant products would help. Give the advice in `summary`, then set precise filters.',
      '- Set intent="shop" when they clearly want to browse or buy, including follow-ups like "cheaper", "in black", or "the other color". Carry forward details from the conversation that they have not changed.',
      '- Never show products that contradict an explicit constraint. "Men" is not "women". A gift for a mother is not a men\'s product. A phone request is not fashion. If you are unsure, ask.',
      '- For clothing, set "Men\'s Clothing" only when they ask for men, and "Women\'s Clothing" or "Women\'s Dresses" only when they ask for women or the item itself is women\'s (dress, blouse). If they do not say, do not assume a gender.',
      '',
      'Shopping filter rules (for "shop" and "hybrid"):',
      '- Extract 1 to 6 high-signal product keywords (include practical synonyms and singular forms; e.g. for "gift for girlfriend under 200" use ["perfume", "handbag", "watch", "jewelry", "gift box"]).',
      `- Set category ONLY if clearly matching one of: ${categories.join(', ')}. Otherwise null.`,
      `- Set subcategory ONLY if clearly matching one of: ${ALL_SUBCATEGORY_NAMES.join(', ')}. Mapping subcategory accurately dramatically improves results (e.g. "macbook" or "student computer" -> "Laptops"; "air force" or "trainers" -> "Sneakers"; "inverter" or "light off power" -> "Solar & Power Solutions"; "wig" -> "Hair & Wigs"; "hamper" -> "Gift Boxes & Hampers").`,
      '- Set brand if a specific brand is requested (e.g. "Apple", "Samsung", "Nike", "HP", "Dell", "Tecno", "JBL"); otherwise null.',
      '- Extract min_price and max_price in GHS when mentioned (e.g. "under 300 cedis" -> max_price: 300; "around 500" -> min_price: 300, max_price: 650).',
      '- Set condition ("new", "used", "refurbished") ONLY when mentioned; otherwise null.',
      '- Choose sort: "price_asc" for cheap/affordable/budget, "price_desc" for luxury/premium, "discount_desc" for deals/sales, "popular" for trending/best, otherwise "newest".',
      '',
      'Follow-ups:',
      '- Include 2–3 short clickable `follow_ups` (under 42 chars) that continue this exact conversation. Do not offer generic deals that ignore what they just said.',
    ].join('\n');

    const responseSchema = {
      type: 'OBJECT',
      required: [
        'intent',
        'summary',
        'keywords',
        'sort',
        'in_stock_only',
        'follow_ups',
      ],
      properties: {
        intent: {
          type: 'STRING',
          enum: ['shop', 'chat', 'hybrid'],
        },
        summary: { type: 'STRING' },
        follow_ups: { type: 'ARRAY', items: { type: 'STRING' } },
        keywords: { type: 'ARRAY', items: { type: 'STRING' } },
        category: { type: 'STRING', nullable: true },
        subcategory: { type: 'STRING', nullable: true },
        brand: { type: 'STRING', nullable: true },
        min_price: { type: 'NUMBER', nullable: true },
        max_price: { type: 'NUMBER', nullable: true },
        condition: {
          type: 'STRING',
          enum: ['new', 'used', 'refurbished'],
          nullable: true,
        },
        sort: {
          type: 'STRING',
          enum: [
            'newest',
            'price_asc',
            'price_desc',
            'popular',
            'discount_desc',
          ],
        },
        in_stock_only: { type: 'BOOLEAN' },
      },
    };

    const trimmedHistory = (history || [])
      .slice(-6)
      .filter((t) => t && typeof t.text === 'string' && t.text.trim())
      .map(
        (t) =>
          `${t.role === 'assistant' ? 'Verndly AI' : 'Shopper'}: ${cleanText(t.text, 220)}`,
      );

    const promptText = trimmedHistory.length
      ? `Recent conversation:\n${trimmedHistory.join('\n')}\n\nLatest message from Shopper: "${cleanQuery}"`
      : `Shopper message: "${cleanQuery}"`;

    const raw = await this.generateStructuredJson<unknown>({
      systemInstruction,
      parts: [{ text: promptText }],
      responseSchema,
      temperature: 0.4,
      fast: true,
      timeoutMs: 6_000,
      maxOutputTokens: 640,
    });

    return normalizeBuyerSearchPlan(raw, categories);
  }

  async polishProductListing(
    input: AiPolishListingInput,
    availableCategories: string[],
  ): Promise<AiPolishListingResult> {
    const rawTitle = cleanText(input?.title, 160);
    const rawDesc = cleanText(input?.description, 1500);
    if (!rawTitle && !rawDesc) {
      throw new BadRequestException(
        'Enter a product title or description before polishing with Verndly AI.',
      );
    }

    const categories =
      availableCategories.length > 0 ? availableCategories : ['General'];

    const systemInstruction = [
      'You are Verndly AI, a conversion-focused e-commerce copy editor for Verndly, Ghana’s escrow-protected online marketplace.',
      'Improve the seller’s product listing so it reads clearly, builds buyer trust, and ranks cleanly in search.',
      'Strict honesty rules:',
      '1. Polish title to clean, natural Title Case (3–10 words). Remove ALL CAPS, emoji spam, phone numbers, and hype words like "best/cheap/DM to order". Keep all factual attributes (color, size, model).',
      '2. Rewrite description into 2–4 concise, scannable sentences (60–360 characters) describing what the buyer gets. NEVER invent unstated specs, warranties, materials, or brand names.',
      `3. Pick the closest matching category from this exact list: ${categories.join(', ')}.`,
      '4. Provide 4 to 6 clean lowercase search tags shoppers in Ghana would type.',
      '5. Provide 2 to 4 short, practical improvement notes (each under 90 chars) explaining what was polished or one real detail the seller could add.',
    ].join('\n');

    const listingSnapshot = [
      `Current title: ${rawTitle || '(empty)'}`,
      `Current description: ${rawDesc || '(empty)'}`,
      input?.category ? `Current category: ${input.category}` : '',
      input?.condition ? `Condition: ${input.condition}` : '',
      input?.brand ? `Brand: ${input.brand}` : '',
      input?.price ? `Price: GH₵ ${input.price}` : '',
      Array.isArray(input?.tags) && input.tags.length > 0
        ? `Current tags: ${input.tags.join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const responseSchema = {
      type: 'OBJECT',
      required: ['title', 'description', 'category', 'tags', 'improvements'],
      properties: {
        title: { type: 'STRING' },
        description: { type: 'STRING' },
        category: { type: 'STRING' },
        tags: { type: 'ARRAY', items: { type: 'STRING' } },
        improvements: { type: 'ARRAY', items: { type: 'STRING' } },
      },
    };

    const raw = await this.generateStructuredJson<unknown>({
      systemInstruction,
      parts: [
        { text: `Polish this Verndly product listing:\n${listingSnapshot}` },
      ],
      responseSchema,
      temperature: 0.25,
    });

    const obj =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const improvements = Array.isArray(obj.improvements)
      ? obj.improvements
          .map((item) => cleanText(item, 110))
          .filter(Boolean)
          .slice(0, 4)
      : [];

    return {
      title: cleanText(obj.title, 120) || rawTitle,
      description: cleanText(obj.description, 1000) || rawDesc,
      category: resolveCategory(obj.category || input?.category, categories),
      tags: normalizeTags(obj.tags),
      improvements,
      model: this.getModel(),
    };
  }

  async draftStorefrontSetup(
    input: AiDraftStorefrontInput,
  ): Promise<AiDraftStorefrontResult> {
    const storeName = cleanText(input?.store_name, 100);
    const whatYouSell = cleanText(input?.what_you_sell, 500);
    if (!storeName && !whatYouSell) {
      throw new BadRequestException(
        'Tell Verndly AI your store name or what you sell first.',
      );
    }

    const systemInstruction = [
      'You are Verndly AI, helping independent sellers in Ghana set up a trustworthy, high-converting storefront on Verndly (Ghana’s escrow-protected online marketplace).',
      'Draft clean, natural, honest storefront copy from the seller’s notes.',
      'Strict rules:',
      '1. bio: 2–3 clear, friendly sentences (80–300 chars) explaining what the store offers, where it operates (if provided), and why buyers can shop with confidence. No buzzword fluff or ALL CAPS.',
      '2. delivery_policies: 2–3 concise sentences (80–360 chars) covering dispatch timing, coverage area, and reassuring buyers that orders are protected by Verndly’s 3-day escrow.',
      '3. business_hours: clean formatted operating hours (e.g. "Mon–Sat: 9:00 AM – 6:00 PM"). Use what the seller mentioned, or a sensible standard Ghana retail schedule if not specified.',
      '4. service_area: choose ONE of SAME_CITY, NEARBY_STATES, NATIONWIDE only if clearly implied; otherwise null.',
      '5. avg_delivery_time: choose ONE of SAME_DAY, NEXT_DAY, TWO_TO_THREE_DAYS, FOUR_TO_SEVEN_DAYS, MORE_THAN_ONE_WEEK only if clearly implied; otherwise null.',
    ].join('\n');

    const contextLines = [
      storeName ? `Store name: ${storeName}` : '',
      whatYouSell ? `Seller description: ${whatYouSell}` : '',
      input?.location ? `Location: ${cleanText(input.location, 120)}` : '',
      input?.service_area ? `Current service area: ${input.service_area}` : '',
      input?.avg_delivery_time
        ? `Current avg delivery time: ${input.avg_delivery_time}`
        : '',
      input?.business_hours
        ? `Current business hours: ${cleanText(input.business_hours, 120)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const responseSchema = {
      type: 'OBJECT',
      required: ['bio', 'delivery_policies', 'business_hours'],
      properties: {
        bio: { type: 'STRING' },
        delivery_policies: { type: 'STRING' },
        business_hours: { type: 'STRING' },
        service_area: {
          type: 'STRING',
          enum: ['SAME_CITY', 'NEARBY_STATES', 'NATIONWIDE'],
          nullable: true,
        },
        avg_delivery_time: {
          type: 'STRING',
          enum: [
            'SAME_DAY',
            'NEXT_DAY',
            'TWO_TO_THREE_DAYS',
            'FOUR_TO_SEVEN_DAYS',
            'MORE_THAN_ONE_WEEK',
          ],
          nullable: true,
        },
      },
    };

    const raw = await this.generateStructuredJson<unknown>({
      systemInstruction,
      parts: [{ text: `Draft storefront settings for:\n${contextLines}` }],
      responseSchema,
      temperature: 0.3,
    });

    const obj =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

    const validAreas: readonly AiServiceArea[] = [
      'SAME_CITY',
      'NEARBY_STATES',
      'NATIONWIDE',
    ];
    const validTimes: readonly AiDeliveryTime[] = [
      'SAME_DAY',
      'NEXT_DAY',
      'TWO_TO_THREE_DAYS',
      'FOUR_TO_SEVEN_DAYS',
      'MORE_THAN_ONE_WEEK',
    ];

    const rawArea =
      typeof obj.service_area === 'string' ? obj.service_area : '';
    const rawTime =
      typeof obj.avg_delivery_time === 'string' ? obj.avg_delivery_time : '';

    return {
      bio: cleanText(obj.bio, 500),
      delivery_policies: cleanText(obj.delivery_policies, 600),
      business_hours: cleanText(obj.business_hours, 140),
      service_area: (validAreas as readonly string[]).includes(rawArea)
        ? (rawArea as AiServiceArea)
        : null,
      avg_delivery_time: (validTimes as readonly string[]).includes(rawTime)
        ? (rawTime as AiDeliveryTime)
        : null,
      model: this.getModel(),
    };
  }

  private async fetchWebsiteOnboardingSignals(rawUrl: string): Promise<{
    normalizedUrl: string;
    siteName: string;
    description: string;
    whatsappOrPhone: string | null;
    domainLabel: string;
  }> {
    const candidate = /^https?:\/\//i.test(rawUrl.trim())
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new BadRequestException('Please enter a valid website URL.');
    }
    if (!isSafePublicHostname(parsed.hostname)) {
      throw new BadRequestException('Please enter a public website domain.');
    }
    parsed.protocol = 'https:';

    const domainLabel = parsed.hostname
      .replace(/^www\./i, '')
      .split('.')[0]
      .replace(/[-_]+/g, ' ');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7_500);
    try {
      const res = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
      });
      if (!res.ok) {
        return {
          normalizedUrl: parsed.origin,
          siteName: domainLabel,
          description: '',
          whatsappOrPhone: null,
          domainLabel,
        };
      }
      const html = (await res.text()).slice(0, 120_000);
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const rawTitle = titleMatch?.[1]
        ? titleMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/\s*[|\-–—•]\s*.*$/, '')
            .trim()
        : '';
      const siteName =
        extractSimpleMeta(html, 'og:site_name') ||
        rawTitle ||
        extractSimpleMeta(html, 'og:title') ||
        domainLabel;
      const description =
        extractSimpleMeta(html, 'og:description') ||
        extractSimpleMeta(html, 'description');

      const waMatch =
        html.match(/wa\.me\/(\+?\d{9,15})/i) ||
        html.match(/tel:(\+?233[\d\s-]{8,13}|0[235][\d\s-]{8,11})/i);
      const whatsappOrPhone = waMatch?.[1]
        ? waMatch[1].replace(/[^\d+]/g, '')
        : null;

      return {
        normalizedUrl: parsed.origin,
        siteName: cleanText(siteName, 80),
        description: cleanText(description, 400),
        whatsappOrPhone,
        domainLabel,
      };
    } catch {
      return {
        normalizedUrl: parsed.origin,
        siteName: domainLabel,
        description: '',
        whatsappOrPhone: null,
        domainLabel,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async assistSellerOnboarding(
    input: AiOnboardingAssistantInput,
    availableLocations: AiOnboardingLocationOption[] = [],
  ): Promise<AiOnboardingAssistantResult> {
    const prompt = cleanText(input?.prompt, 600);
    const rawWebUrl = cleanText(input?.website_url, 260);
    const explicitStoreName = cleanText(input?.store_name, 80);

    if (!prompt && !rawWebUrl && !explicitStoreName) {
      throw new BadRequestException(
        'Describe what you sell or paste your website URL so Verndly AI can set up your store.',
      );
    }

    const webSignals = rawWebUrl
      ? await this.fetchWebsiteOnboardingSignals(rawWebUrl)
      : null;

    const sampleCities = Array.from(
      new Set(availableLocations.map((l) => l.city).filter(Boolean)),
    )
      .slice(0, 40)
      .join(', ');

    const systemInstruction = [
      'You are Verndly AI, onboarding an entrepreneur onto Verndly (Ghana’s AI-native escrow-protected online marketplace).',
      'Turn the seller’s short note and/or website metadata into a complete, trustworthy 3-step storefront configuration.',
      'Strict rules:',
      '1. store_name: If the seller already gave a store_name or clear website brand name, preserve/clean it in Title Case (2–5 words). Otherwise invent a natural, credible brand name fitting what they sell.',
      '2. bio: 2–3 friendly, specific sentences (90–280 chars) describing what they sell, where they operate, and quality buyers can expect. Never use ALL CAPS or buzzwords.',
      '3. business_hours: Clean operating schedule (e.g. "Mon – Sat: 8:30 AM – 6:00 PM").',
      '4. delivery_policies: 1–2 concise sentences (60–220 chars) covering dispatch speed, pickup/courier options, and noting 3-day Paystack escrow protection.',
      `5. inferred_city: Pick the matching Ghana city if mentioned or implied (prefer one of: ${sampleCities || 'Accra, Kumasi, Tema, Takoradi, Tamale, Cape Coast'}), otherwise "".`,
      '6. inferred_region: Matching Ghana region if known (e.g. "Greater Accra", "Ashanti"), otherwise "".',
      '7. area: Specific neighborhood/campus/landmark if mentioned (e.g. "East Legon", "Osu", "KNUST"), otherwise "".',
      '8. service_area: SAME_CITY (local city only), NEARBY_STATES (regional), or NATIONWIDE (ships across Ghana). Default SAME_CITY if unsure, or NATIONWIDE if nationwide/VIP/courier shipping is mentioned.',
      '9. avg_delivery_time: SAME_DAY, NEXT_DAY, TWO_TO_THREE_DAYS, FOUR_TO_SEVEN_DAYS, or MORE_THAN_ONE_WEEK.',
      '10. recommended_payment_timing: UPFRONT_ONLY (recommended for escrow protection against no-shows) or BOTH.',
      '11. onboarding_tip: 1 short, practical tip (under 140 chars) tailored to their product category on Verndly.',
    ].join('\n');

    const contextBlock = [
      explicitStoreName ? `Provided store name: ${explicitStoreName}` : '',
      prompt ? `Seller description: ${prompt}` : '',
      webSignals
        ? `Website URL: ${webSignals.normalizedUrl}\nWebsite brand/title: ${webSignals.siteName}\nWebsite description: ${webSignals.description}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const responseSchema = {
      type: 'OBJECT',
      required: [
        'store_name',
        'bio',
        'business_hours',
        'delivery_policies',
        'inferred_city',
        'inferred_region',
        'area',
        'service_area',
        'avg_delivery_time',
        'recommended_payment_timing',
        'onboarding_tip',
      ],
      properties: {
        store_name: { type: 'STRING' },
        bio: { type: 'STRING' },
        business_hours: { type: 'STRING' },
        delivery_policies: { type: 'STRING' },
        whatsapp_number: { type: 'STRING', nullable: true },
        inferred_city: { type: 'STRING' },
        inferred_region: { type: 'STRING' },
        area: { type: 'STRING' },
        service_area: {
          type: 'STRING',
          enum: ['SAME_CITY', 'NEARBY_STATES', 'NATIONWIDE'],
        },
        avg_delivery_time: {
          type: 'STRING',
          enum: [
            'SAME_DAY',
            'NEXT_DAY',
            'TWO_TO_THREE_DAYS',
            'FOUR_TO_SEVEN_DAYS',
            'MORE_THAN_ONE_WEEK',
          ],
        },
        recommended_payment_timing: {
          type: 'STRING',
          enum: ['UPFRONT_ONLY', 'BOTH'],
        },
        onboarding_tip: { type: 'STRING' },
      },
    };

    let obj: Record<string, unknown> = {};
    if (this.isConfigured()) {
      try {
        const raw = await this.generateStructuredJson<unknown>({
          systemInstruction,
          parts: [{ text: contextBlock }],
          responseSchema,
          temperature: 0.25,
          fast: true,
          timeoutMs: 8_000,
        });
        if (raw && typeof raw === 'object') {
          obj = raw as Record<string, unknown>;
        }
      } catch (err) {
        this.logger.warn(
          `Onboarding AI fallback triggered: ${(err as Error)?.message}`,
        );
      }
    }

    const fallbackName =
      explicitStoreName ||
      webSignals?.siteName ||
      prompt
        .split(/[,.|-]/)[0]
        .trim()
        .slice(0, 40) ||
      'My Verndly Store';

    const finalStoreName = cleanText(obj.store_name, 80) || fallbackName;
    const finalSlug = slugifyHandle(finalStoreName) || 'my-verndly-store';

    const validAreas: readonly AiServiceArea[] = [
      'SAME_CITY',
      'NEARBY_STATES',
      'NATIONWIDE',
    ];
    const validTimes: readonly AiDeliveryTime[] = [
      'SAME_DAY',
      'NEXT_DAY',
      'TWO_TO_THREE_DAYS',
      'FOUR_TO_SEVEN_DAYS',
      'MORE_THAN_ONE_WEEK',
    ];

    const rawArea =
      typeof obj.service_area === 'string' ? obj.service_area : '';
    const rawTime =
      typeof obj.avg_delivery_time === 'string' ? obj.avg_delivery_time : '';

    const inferredNationwide =
      /\b(nationwide|across\s*ghana|all\s*regions|vip\s*bus)\b/i.test(prompt);
    const service_area: AiServiceArea = (
      validAreas as readonly string[]
    ).includes(rawArea)
      ? (rawArea as AiServiceArea)
      : inferredNationwide
        ? 'NATIONWIDE'
        : 'SAME_CITY';

    const avg_delivery_time: AiDeliveryTime = (
      validTimes as readonly string[]
    ).includes(rawTime)
      ? (rawTime as AiDeliveryTime)
      : /\b(next\s*day|24\s*h)/i.test(prompt)
        ? 'NEXT_DAY'
        : 'SAME_DAY';

    const matched_location = matchOnboardingLocation(
      cleanText(obj.inferred_city, 60),
      cleanText(obj.inferred_region, 60),
      `${prompt} ${webSignals?.description || ''}`,
      availableLocations,
    );

    const promptPhoneMatch = prompt.match(
      /(\+?233[\d\s-]{8,13}|\b0[235][\d\s-]{8,11}\b)/,
    );
    const whatsapp_number =
      cleanText(obj.whatsapp_number, 20) ||
      webSignals?.whatsappOrPhone ||
      (promptPhoneMatch?.[1]
        ? promptPhoneMatch[1].replace(/[^\d+]/g, '')
        : null) ||
      null;

    return {
      store_name: finalStoreName,
      store_slug: finalSlug,
      bio:
        cleanText(obj.bio, 500) ||
        webSignals?.description ||
        `${finalStoreName} offers quality verified products on Verndly with fast dispatch and responsive customer care.`,
      business_hours:
        cleanText(obj.business_hours, 140) || 'Mon – Sat: 8:30 AM – 6:00 PM',
      delivery_policies:
        cleanText(obj.delivery_policies, 400) ||
        'Orders dispatch promptly via courier or store pickup, protected by Verndly 3-day Paystack escrow.',
      whatsapp_number,
      matched_location,
      area: cleanText(obj.area, 80),
      service_area,
      avg_delivery_time,
      recommended_payment_timing:
        obj.recommended_payment_timing === 'BOTH' ? 'BOTH' : 'UPFRONT_ONLY',
      onboarding_tip:
        cleanText(obj.onboarding_tip, 180) ||
        'Right after launch, upload product photos or paste your website/WhatsApp catalog so Verndly AI lists your inventory in seconds.',
      source_website_url: webSignals?.normalizedUrl || null,
      model: this.getModel(),
    };
  }

  async extractProductsFromWebpage(
    pageText: string,
    candidateImageUrls: string[],
    sourceUrl: string,
    availableCategories: string[],
  ): Promise<
    Array<{
      title: string;
      description: string;
      price: number | null;
      original_price: number | null;
      currency: string;
      category: string;
      condition: AiProductCondition;
      brand: string;
      tags: string[];
      image_urls: string[];
    }>
  > {
    const snippet = cleanText(pageText, 9000);
    if (!snippet) return [];
    const categories =
      availableCategories.length > 0 ? availableCategories : ['General'];
    const imagesList = candidateImageUrls.slice(0, 25);

    const systemInstruction = [
      'You are Verndly AI, extracting product listing data from a seller’s own webpage so they can import their catalog onto Verndly.',
      'Extract up to 15 real products found in the page text. Never invent products, prices, or image URLs that do not appear in the input.',
      'Strict rules:',
      '1. title: clean product name (3–12 words).',
      '2. description: concise 2–3 sentence factual description from the page text (40–280 chars).',
      '3. price and original_price: numeric amounts only (or null if not present). currency: 3-letter ISO code (default GHS).',
      `4. category: closest match from: ${categories.join(', ')}.`,
      '5. image_urls: pick 0 to 3 matching HTTPS URLs ONLY from the provided candidate image list.',
      '6. tags: 3 to 5 lowercase search keywords.',
    ].join('\n');

    const responseSchema = {
      type: 'OBJECT',
      required: ['products'],
      properties: {
        products: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: ['title', 'description', 'category', 'condition', 'tags'],
            properties: {
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              price: { type: 'NUMBER', nullable: true },
              original_price: { type: 'NUMBER', nullable: true },
              currency: { type: 'STRING' },
              category: { type: 'STRING' },
              subcategory: { type: 'STRING' },
              condition: {
                type: 'STRING',
                enum: ['new', 'used', 'refurbished'],
              },
              brand: { type: 'STRING' },
              color: { type: 'STRING' },
              material: { type: 'STRING' },
              size: { type: 'STRING' },
              warranty: { type: 'STRING' },
              dimensions: {
                type: 'OBJECT',
                nullable: true,
                properties: {
                  length: { type: 'NUMBER', nullable: true },
                  width: { type: 'NUMBER', nullable: true },
                  height: { type: 'NUMBER', nullable: true },
                  unit: { type: 'STRING' },
                },
              },
              weight: {
                type: 'OBJECT',
                nullable: true,
                properties: {
                  value: { type: 'NUMBER', nullable: true },
                  unit: { type: 'STRING' },
                },
              },
              tags: { type: 'ARRAY', items: { type: 'STRING' } },
              image_urls: { type: 'ARRAY', items: { type: 'STRING' } },
            },
          },
        },
      },
    };

    const raw = await this.generateStructuredJson<unknown>({
      systemInstruction,
      parts: [
        {
          text: [
            `Source URL: ${sourceUrl}`,
            imagesList.length > 0
              ? `Candidate image URLs:\n${imagesList.map((u, i) => `[${i}] ${u}`).join('\n')}`
              : 'Candidate image URLs: (none)',
            `Webpage text:\n${snippet}`,
          ].join('\n\n'),
        },
      ],
      responseSchema,
      temperature: 0.1,
    });

    const rawProducts =
      raw &&
      typeof raw === 'object' &&
      Array.isArray((raw as { products?: unknown }).products)
        ? ((raw as { products: Record<string, unknown>[] }).products ?? [])
        : [];

    const allowedImageSet = new Set(imagesList);
    const out: Array<{
      title: string;
      description: string;
      price: number | null;
      original_price: number | null;
      currency: string;
      category: string;
      condition: AiProductCondition;
      brand: string;
      tags: string[];
      image_urls: string[];
    }> = [];

    for (const item of rawProducts.slice(0, 15)) {
      if (!item || typeof item !== 'object') continue;
      const title = cleanText(item.title, 120);
      if (!title) continue;
      const price = normalizePrice(item.price);
      const rawOrig = normalizePrice(item.original_price);
      const original_price =
        rawOrig !== null && price !== null && rawOrig > price ? rawOrig : null;
      const image_urls = Array.isArray(item.image_urls)
        ? item.image_urls
            .filter(
              (u): u is string =>
                typeof u === 'string' &&
                u.startsWith('https://') &&
                (allowedImageSet.size === 0 || allowedImageSet.has(u)),
            )
            .slice(0, 3)
        : [];

      out.push({
        title,
        description: cleanText(item.description, 1000),
        price,
        original_price,
        currency: cleanText(item.currency, 8).toUpperCase() || 'GHS',
        category: resolveCategory(item.category, categories),
        condition: normalizeCondition(item.condition),
        brand: cleanText(item.brand, 60),
        tags: normalizeTags(item.tags),
        image_urls,
      });
    }

    return out;
  }

  /**
   * Generates high-impact, mobile-legible editorial copy for Verndly Product
   * Share Cards (inspired by Apple / Nike studio product cards).
   * Always returns crisp, bounded strings safe for 1080×1350 & 1200×630 layouts.
   */
  async generateProductCardCopy(
    input: AiCardCopyInput,
  ): Promise<AiCardCopyResult> {
    const rawTitle = cleanText(input?.title, 120);
    if (!rawTitle) {
      throw new BadRequestException('A product title is required.');
    }

    const rawDesc = cleanText(input?.description, 800);
    const category = cleanText(input?.category, 60) || 'Featured';
    const brand = cleanText(input?.brand, 60);
    const condition = cleanText(input?.condition, 30) || 'new';
    const storeName = cleanText(input?.store_name, 60);
    const location = cleanText(input?.location, 60);
    const tone = input?.tone || 'minimal';
    const numPrice = Number(input?.price);
    const numOriginal =
      input?.original_price != null ? Number(input.original_price) : null;
    const hasDiscount = Boolean(
      numOriginal &&
      Number.isFinite(numOriginal) &&
      Number.isFinite(numPrice) &&
      numOriginal > numPrice &&
      numPrice > 0,
    );
    const discountPct =
      hasDiscount && numOriginal
        ? Math.round(((numOriginal - numPrice) / numOriginal) * 100)
        : 0;
    const currency = cleanText(input?.currency, 6).toUpperCase() || 'GHS';
    const formattedPrice = Number.isFinite(numPrice)
      ? `${currency === 'GHS' ? 'GH₵' : currency} ${numPrice.toLocaleString('en-US')}`
      : '';

    const toneGuide: Record<string, string> = {
      minimal:
        'Apple / Nike minimalist editorial — ultra-clean, confident, effortless, zero fluff or exclamation spam.',
      luxury:
        'High-fashion studio editorial — refined, tactile, elevated craftsmanship language, calm prestige.',
      hype: 'Energetic streetwear drop — bold, crisp, punchy, culturally resonant for Ghana & modern youth without sounding spammy.',
    };

    const systemInstruction = [
      'You are Verndly AI, an elite brand copywriter crafting text for a bold, studio-grade mobile product share card (1080x1350).',
      'The card has LARGE, minimal typography like a Nike / Apple product showcase card — every word must punch above its weight and be readable in 2 seconds on a phone.',
      `Tone direction: ${toneGuide[tone] || toneGuide.minimal}`,
      'Strict field rules:',
      '1. badge: 1–2 short words (max 16 chars) for a frosted glass pill on the photo (e.g. "Best Seller", "New Drop", "Limited Stock", "Top Pick", or "Save X%" if discounted). Never use emojis.',
      '2. headline: Clean, crisp product name (max 34 chars). Fix messy casing, drop redundant filler/emojis, keep the exact real product identity.',
      '3. tagline: Iconic 2–5 word hook (max 36 chars) that sits directly under the title (like "Own the Airforce" or "Built for everyday wear"). Must feel magnetic and authentic.',
      '4. blurb: One crisp editorial sentence (45–92 chars max, fits cleanly on 2 lines). Elevate thin descriptions honestly without inventing fake materials, specs, or warranties not implied by the listing.',
      '5. cta: Short 2-word action pill text (max 12 chars), e.g. "Buy Now", "Shop Now", or "Order Now".',
      '6. social_caption: Ready-to-post WhatsApp Status / Instagram caption (max 220 chars, natural, includes price if provided, invites buyers to order safely on Verndly with 3-day escrow).',
    ].join('\n');

    const responseSchema = {
      type: 'OBJECT',
      required: [
        'badge',
        'headline',
        'tagline',
        'blurb',
        'cta',
        'social_caption',
      ],
      properties: {
        badge: { type: 'STRING' },
        headline: { type: 'STRING' },
        tagline: { type: 'STRING' },
        blurb: { type: 'STRING' },
        cta: { type: 'STRING' },
        social_caption: { type: 'STRING' },
      },
    };

    const fallbackBadge = hasDiscount
      ? `Save ${discountPct}%`
      : condition.toLowerCase() === 'new'
        ? 'New Drop'
        : 'Top Pick';
    const fallbackHeadline =
      rawTitle.length > 34 ? `${rawTitle.slice(0, 31).trimEnd()}…` : rawTitle;
    const fallbackTagline = brand
      ? `Signature ${brand} ${category.toLowerCase()}`
      : `Elevated ${category.toLowerCase()} essentials`;
    const fallbackBlurb =
      rawDesc && rawDesc.length >= 24
        ? rawDesc.length > 94
          ? `${rawDesc.slice(0, 91).trimEnd()}…`
          : rawDesc
        : `Curated by ${storeName || 'a verified Verndly seller'} — ready for fast delivery with 3-day escrow protection.`;
    const fallbackCaption = [
      `${fallbackHeadline}${formattedPrice ? ` — ${formattedPrice}` : ''}`,
      fallbackTagline,
      'Order safely on Verndly with 3-day Paystack escrow.',
    ].join('\n');

    if (!this.isConfigured()) {
      return {
        badge: fallbackBadge,
        headline: fallbackHeadline,
        tagline: fallbackTagline,
        blurb: fallbackBlurb,
        cta: 'Buy Now',
        social_caption: fallbackCaption,
        model: 'fallback',
      };
    }

    try {
      const raw = await this.generateStructuredJson<Record<string, unknown>>({
        systemInstruction,
        parts: [
          {
            text: [
              `Product title: ${rawTitle}`,
              rawDesc
                ? `Description: ${rawDesc}`
                : 'Description: (not provided)',
              `Category: ${category}`,
              brand ? `Brand: ${brand}` : '',
              `Condition: ${condition}`,
              formattedPrice ? `Price: ${formattedPrice}` : '',
              hasDiscount ? `Discount: ${discountPct}% off` : '',
              storeName ? `Store: ${storeName}` : '',
              location ? `Location: ${location}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
        responseSchema,
        temperature: tone === 'hype' ? 0.65 : 0.45,
        fast: true,
        timeoutMs: 12_000,
        maxOutputTokens: 320,
      });

      const badge = cleanText(raw?.badge, 18) || fallbackBadge;
      const headline = cleanText(raw?.headline, 36) || fallbackHeadline;
      const tagline = cleanText(raw?.tagline, 42) || fallbackTagline;
      const blurb = cleanText(raw?.blurb, 105) || fallbackBlurb;
      const cta = cleanText(raw?.cta, 14) || 'Buy Now';
      const social_caption =
        cleanText(raw?.social_caption, 260) || fallbackCaption;

      return {
        badge,
        headline,
        tagline,
        blurb,
        cta,
        social_caption,
        model: this.getModel(),
      };
    } catch (err) {
      this.logger.warn(
        `generateProductCardCopy fell back cleanly: ${(err as Error)?.message}`,
      );
      return {
        badge: fallbackBadge,
        headline: fallbackHeadline,
        tagline: fallbackTagline,
        blurb: fallbackBlurb,
        cta: 'Buy Now',
        social_caption: fallbackCaption,
        model: 'fallback',
      };
    }
  }
}
