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
  AiConfidence,
  AiProductCondition,
  AiProductGroupDraft,
  AiSinglePhotoAnalysisResult,
  AiSingleProductDraft,
  AiStatusResult,
  AiWhatsAppCatalogItem,
  AiWhatsAppScreenshotsResult,
} from './gemini.types';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_PHOTOS_PER_PRODUCT = 3;
const MAX_BULK_PHOTOS = 20;
const REQUEST_TIMEOUT_MS = 55_000;

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
}

const VALID_CONDITIONS: readonly AiProductCondition[] = [
  'new',
  'used',
  'refurbished',
];

const VALID_CONFIDENCES: readonly AiConfidence[] = ['high', 'medium', 'low'];

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

    const baseDraft = {
      title: cleanText(item.title, 120),
      description: cleanText(item.description, 1000),
      category: resolveCategory(item.category, availableCategories),
      condition: normalizeCondition(item.condition),
      brand: cleanText(item.brand, 60),
      tags: normalizeTags(item.tags),
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

export function normalizeSingleAnalysis(
  raw: unknown,
  availableCategories: string[],
): AiSingleProductDraft {
  const item =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    title: cleanText(item.title, 120),
    description: cleanText(item.description, 1000),
    category: resolveCategory(item.category, availableCategories),
    condition: normalizeCondition(item.condition),
    brand: cleanText(item.brand, 60),
    tags: normalizeTags(item.tags),
    suggested_price_ghs: normalizePrice(item.suggested_price_ghs),
    confidence: normalizeConfidence(item.confidence),
  };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

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
   * Reusable Gemini Vision/Text structured-JSON primitive for all Verndly AI features.
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

    const model = this.getModel();
    const endpoint = `${GEMINI_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
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
            temperature: options.temperature ?? 0.2,
            responseMimeType: 'application/json',
            responseSchema: options.responseSchema,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        this.logger.error(
          `Gemini API error (${response.status}): ${errorBody.slice(0, 500)}`,
        );
        if (response.status === 429) {
          throw new ServiceUnavailableException(
            'Verndly AI is temporarily busy. Please try again in a moment.',
          );
        }
        if (response.status === 401 || response.status === 403) {
          throw new ServiceUnavailableException({
            message:
              'Verndly AI is temporarily unavailable. Please try again shortly.',
            code: 'AI_AUTH_ERROR',
          });
        }
        throw new InternalServerErrorException(
          'Verndly AI could not analyze these photos right now. Please try again.',
        );
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
      };

      const rawText = payload?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim();

      if (!rawText) {
        this.logger.warn('Verndly AI returned an empty response payload');
        throw new InternalServerErrorException(
          'Verndly AI returned an empty response. Please try again.',
        );
      }

      try {
        return JSON.parse(rawText) as T;
      } catch {
        // Fallback: strip accidental markdown fences if present
        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        return JSON.parse(cleaned) as T;
      }
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      if ((error as { name?: string })?.name === 'AbortError') {
        throw new ServiceUnavailableException(
          'Verndly AI timed out while analyzing your photos. Try uploading fewer photos at once.',
        );
      }
      this.logger.error(
        `Unexpected Verndly AI request error: ${(error as Error)?.message || error}`,
      );
      throw new InternalServerErrorException(
        'Unable to reach Verndly AI right now. Please try again.',
      );
    } finally {
      clearTimeout(timer);
    }
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
      '7. Set brand ONLY if a brand name or logo is clearly readable/visible on the product or box. Otherwise return an empty string "". NEVER guess restricted brands (Apple, Nike, Adidas, Samsung, etc.).',
      '8. Provide 3 to 6 lowercase search tags relevant to shoppers in Ghana.',
      '9. Provide suggested_price_ghs as a rough, realistic Ghana Cedis (GHS) integer estimate ONLY if the product type is clear; otherwise set it to null.',
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
              condition: {
                type: 'STRING',
                enum: ['new', 'used', 'refurbished'],
              },
              brand: { type: 'STRING' },
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
      '4. Set brand ONLY if clearly printed/visible on the item or packaging; otherwise return "". Never guess trademarks.',
      '5. Provide 3 to 6 clean lowercase search tags.',
      '6. Provide suggested_price_ghs as a conservative rough Ghana Cedis (GHS) integer estimate if clear, otherwise null.',
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
        condition: {
          type: 'STRING',
          enum: ['new', 'used', 'refurbished'],
        },
        brand: { type: 'STRING' },
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
      '5. Set brand ONLY if clearly printed in the WhatsApp text or visibly on the product; otherwise "".',
      '6. Provide 3 to 5 lowercase search tags.',
      '7. Set source_screenshot_index to the 0-based index of the screenshot where the product appears most clearly.',
      '8. Set in_stock to false only if WhatsApp explicitly marks the item out of stock or unavailable; otherwise true.',
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
              condition: {
                type: 'STRING',
                enum: ['new', 'used', 'refurbished'],
              },
              brand: { type: 'STRING' },
              tags: { type: 'ARRAY', items: { type: 'STRING' } },
              in_stock: { type: 'BOOLEAN' },
              source_screenshot_index: { type: 'INTEGER' },
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

      products.push({
        title,
        description: cleanText(item.description, 1000),
        price,
        original_price,
        currency: cleanText(item.currency, 8).toUpperCase() || 'GHS',
        category: resolveCategory(item.category, categories),
        condition: normalizeCondition(item.condition),
        brand: cleanText(item.brand, 60),
        tags: normalizeTags(item.tags),
        in_stock: item.in_stock !== false,
        source_screenshot_index,
      });
    }

    return {
      products,
      model: this.getModel(),
      totalScreenshots: files.length,
    };
  }
}
