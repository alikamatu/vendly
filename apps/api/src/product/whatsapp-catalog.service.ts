import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../common/cloudinary.service';
import { AuditLogService } from '../audit/audit-log.service';
import { GeminiService } from '../ai/gemini.service';
import { matchCategoryName } from './category-matcher';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

function normalizeTextInput(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeTags(tags: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const clean = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .replace(/\s+/g, ' ');
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 10) break;
  }
  return out;
}

export interface WhatsAppPreviewItem {
  tempId: string;
  externalId?: string;
  title: string;
  description: string;
  price: number | null;
  original_price: number | null;
  currency: string;
  category: string;
  condition: 'new' | 'used' | 'refurbished';
  quantity_available: number;
  brand: string;
  tags: string[];
  image_urls: string[];
  status: 'active' | 'draft';
  source_url?: string;
  source_screenshot_index?: number;
  image_box_2d?: [number, number, number, number] | null;
}

export interface WhatsAppPreviewResponse {
  source:
    | 'whatsapp_link'
    | 'whatsapp_screenshots'
    | 'whatsapp_csv'
    | 'meta_api';
  items: WhatsAppPreviewItem[];
  warnings: string[];
  catalogUrl?: string;
}

export interface WhatsAppCommitItemInput {
  title: string;
  description?: string;
  price: number | string;
  original_price?: number | string | null;
  currency?: string;
  category: string;
  condition?: 'new' | 'used' | 'refurbished';
  quantity_available?: number | string;
  brand?: string;
  tags?: string[];
  image_urls?: string[];
  status?: 'active' | 'draft';
}

const ALLOWED_WHATSAPP_HOSTS = new Set([
  'wa.me',
  'www.wa.me',
  'whatsapp.com',
  'www.whatsapp.com',
  'api.whatsapp.com',
  'catalog.whatsapp.com',
]);

const FETCH_TIMEOUT_MS = 12_000;
const MAX_URLS_PER_PREVIEW = 15;
const MAX_COMMIT_ITEMS = 100;

/**
 * Normalizes a WhatsApp Business catalog link, one or more individual product
 * links (`wa.me/p/...`), or a Ghana / international phone number into validated
 * HTTPS WhatsApp URLs. Rejects arbitrary non-WhatsApp hosts (SSRF protection).
 */
export function normalizeWhatsAppInputToUrls(rawInput: string): string[] {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    throw new BadRequestException(
      'Enter a WhatsApp Business catalog link, product link(s), or phone number.',
    );
  }

  // Split by newlines or commas first so spaced phone numbers like "+233 55 123 4567" stay intact
  const rawSegments = trimmed
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tokens: string[] = [];
  for (const seg of rawSegments) {
    const collapsedPhone = seg.replace(/[\s\-()]/g, '');
    if (/^\+?\d{9,15}$/.test(collapsedPhone)) {
      tokens.push(collapsedPhone);
    } else {
      tokens.push(...seg.split(/\s+/).filter(Boolean));
    }
  }

  const urls: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    // Case 1: Phone number (e.g. 0241234567, +233241234567, 233241234567)
    const digitsOnly = token.replace(/[\s\-()]/g, '');
    if (/^\+?\d{9,15}$/.test(digitsOnly)) {
      let normalizedPhone = digitsOnly.replace(/^\+/, '');
      if (normalizedPhone.startsWith('0') && normalizedPhone.length === 10) {
        normalizedPhone = `233${normalizedPhone.slice(1)}`;
      }
      const catalogUrl = `https://wa.me/c/${normalizedPhone}`;
      if (!seen.has(catalogUrl)) {
        seen.add(catalogUrl);
        urls.push(catalogUrl);
      }
      continue;
    }

    // Case 2: URL (with or without protocol)
    const candidate = /^https?:\/\//i.test(token) ? token : `https://${token}`;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }

    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_WHATSAPP_HOSTS.has(host)) {
      throw new BadRequestException(
        `Unsupported URL "${token}". Only official WhatsApp links (wa.me or whatsapp.com) are allowed.`,
      );
    }

    parsed.protocol = 'https:';
    const cleanUrl = parsed.toString();
    if (!seen.has(cleanUrl)) {
      seen.add(cleanUrl);
      urls.push(cleanUrl);
    }
    if (urls.length >= MAX_URLS_PER_PREVIEW) break;
  }

  if (urls.length === 0) {
    throw new BadRequestException(
      'Could not recognize a valid WhatsApp catalog link (wa.me/c/...), product link (wa.me/p/...), or phone number.',
    );
  }

  return urls;
}

/**
 * Parses price strings like "GH₵ 250.00", "GHS 1,250.50", "250.00 GHS", "₵120", "120".
 */
export function parsePriceValue(raw: string | number | undefined | null): {
  amount: number | null;
  currency: string;
} {
  if (raw === null || raw === undefined) {
    return { amount: null, currency: 'GHS' };
  }
  if (typeof raw === 'number') {
    return {
      amount: Number.isFinite(raw) && raw > 0 ? Number(raw.toFixed(2)) : null,
      currency: 'GHS',
    };
  }

  const text = String(raw).trim();
  if (!text) return { amount: null, currency: 'GHS' };

  let currency = 'GHS';
  if (/\bUSD\b|\$/i.test(text)) currency = 'USD';
  else if (/\bNGN\b|₦/i.test(text)) currency = 'NGN';
  else if (/\bGBP\b|£/i.test(text)) currency = 'GBP';
  else if (/\bEUR\b|€/i.test(text)) currency = 'EUR';
  else if (/GH[S₵¢]|₵/i.test(text)) currency = 'GHS';

  const normalized = text.replace(/,/g, '');
  // Prefer a currency-anchored amount so volumes/sizes like "100 ML · GHS250.00" never grab "100"
  const currencyAnchored =
    normalized.match(
      /(?:GH[S₵¢]|USD|NGN|GBP|EUR|₵|₦|£|€|\$)\s*(\d+(?:\.\d{1,2})?)/i,
    ) ||
    normalized.match(/(\d+(?:\.\d{1,2})?)\s*(?:GH[S₵¢]|USD|NGN|GBP|EUR)\b/i);

  const match =
    currencyAnchored ||
    (/^\s*\d+(?:\.\d{1,2})?\s*$/.test(normalized)
      ? normalized.match(/(\d+(?:\.\d{1,2})?)/)
      : null);
  if (!match) return { amount: null, currency };
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { amount: null, currency };
  }
  return { amount: Number(amount.toFixed(2)), currency };
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeConditionValue(
  raw: string | undefined | null,
): 'new' | 'used' | 'refurbished' {
  const lower = (raw || '').trim().toLowerCase();
  if (lower.includes('refurb')) return 'refurbished';
  if (lower.includes('used') || lower.includes('pre-owned')) return 'used';
  return 'new';
}

function extractMetaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patternA = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const patternB = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
    'i',
  );
  const m = html.match(patternA) || html.match(patternB);
  return m?.[1] ? decodeHtmlEntities(m[1]) : '';
}

function isGenericWhatsAppTitle(title: string): boolean {
  const lower = title.trim().toLowerCase();
  return (
    !lower ||
    lower === 'whatsapp' ||
    lower === 'whatsapp business' ||
    lower === 'whatsapp.com' ||
    lower === 'share on whatsapp' ||
    lower.startsWith('view catalog') ||
    lower.startsWith('open whatsapp') ||
    /^view\s+.+?\s+catalog(?:\s+on\s+whatsapp)?\.?$/i.test(lower) ||
    /^chat\s+on\s+whatsapp/i.test(lower)
  );
}

function cleanWhatsAppProductTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s+from\s+.+?\s+on\s+WhatsApp\.?$/i, '')
    .replace(/\s+on\s+WhatsApp\.?$/i, '')
    .replace(/\s*[-|•·]\s*WhatsApp.*$/i, '')
    .trim();
}

/**
 * Extracts product metadata from WhatsApp HTML (JSON-LD Product / ItemList +
 * OpenGraph product tags). Returns 0 or more normalized preview items.
 */
export function extractProductsFromWhatsAppHtml(
  html: string,
  sourceUrl: string,
  availableCategories: string[],
): WhatsAppPreviewItem[] {
  const items: WhatsAppPreviewItem[] = [];
  const seenTitles = new Set<string>();

  const pushUnique = (item: WhatsAppPreviewItem) => {
    const key = item.title.trim().toLowerCase();
    if (!key || seenTitles.has(key) || isGenericWhatsAppTitle(item.title)) {
      return;
    }
    seenTitles.add(key);
    items.push(item);
  };

  // 1. Parse <script type="application/ld+json"> blocks
  const ldRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = ldRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed?.['@graph'] && Array.isArray(parsed['@graph'])
          ? parsed['@graph']
          : [parsed];

      const handleProductNode = (node: any) => {
        if (!node || typeof node !== 'object') return;
        const type = String(node['@type'] || '').toLowerCase();
        if (type === 'itemlist' && Array.isArray(node.itemListElement)) {
          for (const entry of node.itemListElement) {
            handleProductNode(entry?.item || entry);
          }
          return;
        }
        if (type !== 'product') return;

        const title = decodeHtmlEntities(String(node.name || ''));
        const description = decodeHtmlEntities(String(node.description || ''));
        const offers = Array.isArray(node.offers)
          ? node.offers[0]
          : node.offers;
        const priceObj = parsePriceValue(
          offers?.price ?? node.price ?? undefined,
        );
        const currency =
          String(offers?.priceCurrency || priceObj.currency || 'GHS')
            .trim()
            .toUpperCase() || 'GHS';

        const rawImages = Array.isArray(node.image)
          ? node.image
          : node.image
            ? [node.image]
            : [];
        const image_urls = rawImages
          .map((img: any) => (typeof img === 'string' ? img : img?.url))
          .filter(
            (u: unknown): u is string =>
              typeof u === 'string' && u.startsWith('https://'),
          )
          .slice(0, 3);

        const brandName =
          typeof node.brand === 'string'
            ? node.brand
            : typeof node.brand?.name === 'string'
              ? node.brand.name
              : '';

        const avail = String(offers?.availability || '').toLowerCase();
        const inStock = !avail.includes('outofstock');

        pushUnique({
          tempId: `wa_ld_${items.length}_${Date.now()}`,
          externalId: node.sku ? String(node.sku) : undefined,
          title,
          description,
          price: priceObj.amount,
          original_price: null,
          currency,
          category: matchCategoryName(node.category, availableCategories, {
            title,
            description,
            brand: brandName,
            url: sourceUrl,
          }),
          condition: normalizeConditionValue(
            offers?.itemCondition || node.condition,
          ),
          quantity_available: inStock ? 1 : 0,
          brand: decodeHtmlEntities(brandName),
          tags: [],
          image_urls,
          status: 'draft',
          source_url: sourceUrl,
        });
      };

      for (const n of nodes) {
        handleProductNode(n);
      }
    } catch {
      // Skip malformed JSON-LD
    }
  }

  // 2. Fallback to OpenGraph meta tags (works cleanly for individual wa.me/p/... links)
  if (items.length === 0) {
    const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleTagMatch?.[1]
      ? decodeHtmlEntities(titleTagMatch[1])
      : '';
    const ogTitle =
      extractMetaContent(html, 'og:title') ||
      extractMetaContent(html, 'twitter:title') ||
      pageTitle;
    const ogDesc =
      extractMetaContent(html, 'og:description') ||
      extractMetaContent(html, 'description');
    const ogImage = extractMetaContent(html, 'og:image');
    const ogPriceAmount = extractMetaContent(html, 'product:price:amount');
    const ogPriceCurrency = extractMetaContent(html, 'product:price:currency');

    const cleanedTitle = cleanWhatsAppProductTitle(ogTitle);

    if (cleanedTitle && !isGenericWhatsAppTitle(cleanedTitle)) {
      // Price may be in product:price:amount OR embedded inside og:description (e.g. "100 ML EAU DE PARFUM · GHS250.00" or "GHS 250.00 · ...")
      const fromMeta = parsePriceValue(ogPriceAmount);
      const fromDesc =
        fromMeta.amount !== null ? fromMeta : parsePriceValue(ogDesc);

      // Strip the redundant price segment from og:description when separated by middot/bullet
      const cleanedDesc = ogDesc
        .split(/\s*[·•|]\s*/)
        .map((seg) => seg.trim())
        .filter(
          (seg) =>
            seg.length > 0 &&
            !/^(?:GH[S₵¢]|USD|NGN|GBP|EUR|\$|₵|₦|£|€)?\s*[\d,]+(?:\.\d{1,2})?\s*(?:GH[S₵¢]|USD|NGN|GBP|EUR)?$/i.test(
              seg,
            ),
        )
        .join(' · ')
        .trim();
      const finalDescription = cleanedDesc || ogDesc;

      const validImage =
        ogImage &&
        ogImage.startsWith('https://') &&
        !/whatsapp\.com\/img|static\.whatsapp\.net\/rsrc/i.test(ogImage)
          ? [ogImage]
          : [];

      pushUnique({
        tempId: `wa_og_${Date.now()}`,
        title: cleanedTitle,
        description: finalDescription,
        price: fromDesc.amount,
        original_price: null,
        currency: (ogPriceCurrency || fromDesc.currency || 'GHS').toUpperCase(),
        category: matchCategoryName('', availableCategories, {
          title: cleanedTitle,
          description: finalDescription,
          url: sourceUrl,
        }),
        condition: 'new',
        quantity_available: 1,
        brand: '',
        tags: [],
        image_urls: validImage,
        status:
          fromDesc.amount &&
          validImage.length > 0 &&
          finalDescription.length >= 20
            ? 'active'
            : 'draft',
        source_url: sourceUrl,
      });
    }
  }

  return items;
}

/**
 * Minimal RFC-4180 CSV parser supporting quoted commas & escaped quotes.
 */
function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Parses Meta Commerce Manager / WhatsApp Business catalog CSV exports
 * (and standard Verndly CSVs) into structured preview items.
 */
export function parseMetaCatalogCsv(
  csvText: string,
  availableCategories: string[],
): { items: WhatsAppPreviewItem[]; warnings: string[] } {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  const rows = parseCsvRows(cleaned);
  if (rows.length < 2) {
    throw new BadRequestException(
      'CSV file is empty or only contains a header row.',
    );
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...aliases: string[]) => {
    for (const alias of aliases) {
      const idx = header.indexOf(alias);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const titleCol = col('title', 'name', 'product_name');
  const priceCol = col('price', 'regular_price');
  if (titleCol < 0) {
    throw new BadRequestException(
      'CSV is missing a "title" or "name" column. Export your catalog from Meta Commerce Manager or use the Verndly CSV template.',
    );
  }

  const descCol = col('description', 'rich_text_description');
  const salePriceCol = col('sale_price');
  const origPriceCol = col('original_price');
  const currencyCol = col('currency');
  const imageCol = col('image_link', 'image_url', 'image');
  const extraImagesCol = col(
    'additional_image_link',
    'additional_image_urls',
    'additional_images',
  );
  const categoryCol = col(
    'category',
    'fb_product_category',
    'google_product_category',
    'product_type',
  );
  const conditionCol = col('condition');
  const brandCol = col('brand');
  const availCol = col('availability');
  const qtyCol = col(
    'quantity_to_sell_on_facebook',
    'inventory',
    'quantity_available',
    'stock',
  );
  const idCol = col('id', 'retailer_id', 'sku');
  const tagsCol = col('tags');

  const items: WhatsAppPreviewItem[] = [];
  const warnings: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => !c || !c.trim())) continue;

    const title = normalizeTextInput(row[titleCol] || '');
    if (!title) {
      warnings.push(`Row ${r + 1}: skipped because product title is blank.`);
      continue;
    }

    const basePrice =
      priceCol >= 0
        ? parsePriceValue(row[priceCol])
        : { amount: null, currency: 'GHS' };
    const salePrice =
      salePriceCol >= 0
        ? parsePriceValue(row[salePriceCol])
        : { amount: null, currency: 'GHS' };
    const origPrice =
      origPriceCol >= 0
        ? parsePriceValue(row[origPriceCol])
        : { amount: null, currency: 'GHS' };

    let price = basePrice.amount;
    let original_price: number | null = origPrice.amount;
    // In Meta catalogs, `sale_price` is the discounted price and `price` is the original price
    if (
      salePrice.amount !== null &&
      basePrice.amount !== null &&
      salePrice.amount < basePrice.amount
    ) {
      original_price = basePrice.amount;
      price = salePrice.amount;
    } else if (
      original_price !== null &&
      price !== null &&
      original_price <= price
    ) {
      original_price = null;
    }

    const currency =
      (currencyCol >= 0 && row[currencyCol]?.trim().toUpperCase()) ||
      basePrice.currency ||
      'GHS';

    const imageUrls: string[] = [];
    if (imageCol >= 0 && row[imageCol]) {
      const primary = row[imageCol].trim();
      if (primary.startsWith('https://')) imageUrls.push(primary);
    }
    if (extraImagesCol >= 0 && row[extraImagesCol]) {
      const extras = row[extraImagesCol]
        .split(/[,|;\s]+/)
        .map((u) => u.trim())
        .filter((u) => u.startsWith('https://'));
      for (const u of extras) {
        if (!imageUrls.includes(u) && imageUrls.length < 3) {
          imageUrls.push(u);
        }
      }
    }

    const availText = availCol >= 0 ? (row[availCol] || '').toLowerCase() : '';
    const isOutOfStock =
      availText.includes('out of stock') || availText === 'out_of_stock';
    const parsedQty =
      qtyCol >= 0 ? Number.parseInt(row[qtyCol] || '', 10) : Number.NaN;
    const quantity_available = isOutOfStock
      ? 0
      : Number.isFinite(parsedQty) && parsedQty >= 0
        ? parsedQty
        : 1;

    const rawTags = tagsCol >= 0 ? row[tagsCol] || '' : '';
    const tags = normalizeTags(
      rawTags ? rawTags.split(/[|;,]/).map((t) => t.trim()) : [],
    );

    items.push({
      tempId: `wa_csv_${r}_${Date.now()}`,
      externalId:
        idCol >= 0 ? (row[idCol] || '').trim() || undefined : undefined,
      title,
      description: descCol >= 0 ? (row[descCol] || '').trim() : '',
      price,
      original_price,
      currency,
      category: matchCategoryName(
        categoryCol >= 0 ? row[categoryCol] : undefined,
        availableCategories,
        {
          title,
          description: descCol >= 0 ? (row[descCol] || '').trim() : '',
          brand: brandCol >= 0 ? (row[brandCol] || '').trim() : '',
          tags,
        },
      ),
      condition: normalizeConditionValue(
        conditionCol >= 0 ? row[conditionCol] : undefined,
      ),
      quantity_available,
      brand: brandCol >= 0 ? (row[brandCol] || '').trim() : '',
      tags,
      image_urls: imageUrls,
      status: price && imageUrls.length > 0 ? 'active' : 'draft',
    });

    if (items.length >= MAX_COMMIT_ITEMS) {
      warnings.push(
        `Showing the first ${MAX_COMMIT_ITEMS} products from your CSV file.`,
      );
      break;
    }
  }

  return { items, warnings };
}

@Injectable()
export class WhatsAppCatalogService {
  private readonly logger = new Logger(WhatsAppCatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly auditLogs: AuditLogService,
    private readonly geminiService: GeminiService,
  ) {}

  private async getCategoryNames(): Promise<string[]> {
    const categories = await this.prisma.category.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const names = categories.map((c) => c.name).filter(Boolean);
    return names.length > 0 ? names : ['General'];
  }

  private buildWhatsAppFetchCandidates(url: string): string[] {
    const candidates: string[] = [];
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/\/+$/, '');
      const prodMatch = path.match(/^\/p\/([^/]+)\/([^/]+)$/i);
      if (prodMatch) {
        // Direct www.whatsapp.com/product URL avoids an extra redirect hop on wa.me
        candidates.push(
          `https://www.whatsapp.com/product/${encodeURIComponent(prodMatch[1])}/${encodeURIComponent(prodMatch[2])}/?app_absent=0`,
        );
      }
      const catMatch = path.match(/^\/c\/([^/]+)$/i);
      if (catMatch) {
        candidates.push(
          `https://www.whatsapp.com/catalog/${encodeURIComponent(catMatch[1])}/?app_absent=0`,
        );
      }
    } catch {
      // fall through to original URL
    }
    if (!candidates.includes(url)) {
      candidates.push(url);
    }
    return candidates;
  }

  private async fetchWhatsAppPageHtml(
    url: string,
  ): Promise<
    { html: string; status: number } | { html: null; status: number }
  > {
    const candidateUrls = this.buildWhatsAppFetchCandidates(url);
    // Meta's WhatsApp link-preview edge returns HTTP 400 to generic desktop Chrome UAs without
    // full Sec-Fetch browser fingerprints, whereas official link-preview UAs receive HTTP 200 OG HTML.
    const userAgents = [
      'WhatsApp/2.24.6.77',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    ];

    let lastStatus = 0;

    for (const targetUrl of candidateUrls) {
      for (const ua of userAgents) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
          const res = await fetch(targetUrl, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
              'User-Agent': ua,
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          lastStatus = res.status;
          if (res.ok) {
            const html = await res.text();
            if (html.length > 100) {
              return { html, status: res.status };
            }
          }
        } catch (err) {
          this.logger.warn(
            `WhatsApp link fetch failed for ${targetUrl} (${ua}): ${(err as Error)?.message}`,
          );
        } finally {
          clearTimeout(timer);
        }
      }
    }

    return { html: null, status: lastStatus };
  }

  async previewFromLinks(rawInput: string): Promise<WhatsAppPreviewResponse> {
    const urls = normalizeWhatsAppInputToUrls(rawInput);
    const categories = await this.getCategoryNames();
    const allItems: WhatsAppPreviewItem[] = [];
    const warnings: string[] = [];

    for (const url of urls) {
      const result = await this.fetchWhatsAppPageHtml(url);
      if (!result.html) {
        if (result.status > 0) {
          warnings.push(`WhatsApp returned HTTP ${result.status} for ${url}.`);
        } else {
          warnings.push(
            `Could not reach ${url}. Try uploading WhatsApp catalog screenshots with Verndly AI instead.`,
          );
        }
        continue;
      }

      const extracted = extractProductsFromWhatsAppHtml(
        result.html,
        url,
        categories,
      );
      if (extracted.length > 0) {
        allItems.push(...extracted);
      } else {
        warnings.push(
          `WhatsApp restricted public catalog scraping for ${url}. Paste individual product links (wa.me/p/...) or upload catalog screenshots for Verndly AI to extract every item instantly.`,
        );
      }
    }

    return {
      source: 'whatsapp_link',
      items: allItems,
      warnings,
      catalogUrl: urls[0],
    };
  }

  async previewFromScreenshots(
    files: Express.Multer.File[],
  ): Promise<WhatsAppPreviewResponse> {
    const categories = await this.getCategoryNames();
    const analysis = await this.geminiService.parseWhatsAppCatalogScreenshots(
      files,
      categories,
    );

    const items: WhatsAppPreviewItem[] = analysis.products.map((p, idx) => ({
      tempId: `wa_ss_${idx}_${Date.now()}`,
      title: p.title,
      description: p.description,
      price: p.price,
      original_price: p.original_price,
      currency: p.currency || 'GHS',
      category: p.category,
      condition: p.condition,
      quantity_available: p.in_stock ? 1 : 0,
      brand: p.brand,
      tags: p.tags,
      image_urls: [],
      status: 'draft',
      source_screenshot_index: p.source_screenshot_index,
      image_box_2d: p.image_box_2d ?? null,
    }));

    const warnings: string[] = [];
    if (items.length === 0) {
      warnings.push(
        'Verndly AI could not detect any product items in those screenshots. Make sure product names and prices are clearly visible.',
      );
    }

    return {
      source: 'whatsapp_screenshots',
      items,
      warnings,
    };
  }

  async previewFromCsv(buffer: Buffer): Promise<WhatsAppPreviewResponse> {
    const categories = await this.getCategoryNames();
    const { items, warnings } = parseMetaCatalogCsv(
      buffer.toString('utf8'),
      categories,
    );
    return {
      source: 'whatsapp_csv',
      items,
      warnings,
    };
  }

  async previewFromMetaApi(
    catalogId: string,
    accessToken: string,
  ): Promise<WhatsAppPreviewResponse> {
    const cleanCatalogId = (catalogId || '').trim();
    const cleanToken = (accessToken || '').trim();
    if (!cleanCatalogId || !/^\d{5,30}$/.test(cleanCatalogId)) {
      throw new BadRequestException(
        'Enter a valid numeric Meta Commerce Catalog ID.',
      );
    }
    if (!cleanToken || cleanToken.length < 20) {
      throw new BadRequestException(
        'Enter a valid Meta Commerce Manager Access Token.',
      );
    }

    const categories = await this.getCategoryNames();
    const fields =
      'id,retailer_id,name,description,price,sale_price,currency,availability,condition,brand,image_url,additional_image_urls,category,inventory';
    const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(cleanCatalogId)}/products?fields=${encodeURIComponent(fields)}&limit=100`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/json',
        },
      });

      const payload = (await res.json().catch(() => ({}))) as {
        data?: Array<Record<string, any>>;
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new BadRequestException(
          payload?.error?.message ||
            'Meta Graph API rejected the request. Check your Catalog ID and catalog_management access token.',
        );
      }

      const rawItems = Array.isArray(payload.data) ? payload.data : [];
      const items: WhatsAppPreviewItem[] = [];

      for (let i = 0; i < rawItems.length; i++) {
        const p = rawItems[i];
        const title = normalizeTextInput(String(p.name || ''));
        if (!title) continue;

        const basePrice = parsePriceValue(p.price);
        const salePrice = parsePriceValue(p.sale_price);
        let price = basePrice.amount;
        let original_price: number | null = null;
        if (
          salePrice.amount !== null &&
          basePrice.amount !== null &&
          salePrice.amount < basePrice.amount
        ) {
          original_price = basePrice.amount;
          price = salePrice.amount;
        }

        const images: string[] = [];
        if (
          typeof p.image_url === 'string' &&
          p.image_url.startsWith('https://')
        ) {
          images.push(p.image_url);
        }
        if (Array.isArray(p.additional_image_urls)) {
          for (const url of p.additional_image_urls) {
            if (
              typeof url === 'string' &&
              url.startsWith('https://') &&
              !images.includes(url) &&
              images.length < 3
            ) {
              images.push(url);
            }
          }
        }

        const avail = String(p.availability || '').toLowerCase();
        const isOut =
          avail.includes('out of stock') || avail === 'out_of_stock';
        const inv = Number(p.inventory);

        items.push({
          tempId: `wa_meta_${i}_${Date.now()}`,
          externalId: String(p.retailer_id || p.id || ''),
          title,
          description:
            typeof p.description === 'string' ? p.description.trim() : '',
          price,
          original_price,
          currency:
            typeof p.currency === 'string' && p.currency.trim()
              ? p.currency.trim().toUpperCase()
              : basePrice.currency,
          category: matchCategoryName(
            typeof p.category === 'string' ? p.category : undefined,
            categories,
            {
              title,
              description:
                typeof p.description === 'string' ? p.description.trim() : '',
              brand: typeof p.brand === 'string' ? p.brand.trim() : '',
            },
          ),
          condition: normalizeConditionValue(
            typeof p.condition === 'string' ? p.condition : undefined,
          ),
          quantity_available: isOut
            ? 0
            : Number.isFinite(inv) && inv >= 0
              ? Math.trunc(inv)
              : 1,
          brand: typeof p.brand === 'string' ? p.brand.trim() : '',
          tags: [],
          image_urls: images,
          status: price && images.length > 0 ? 'active' : 'draft',
        });
      }

      return {
        source: 'meta_api',
        items,
        warnings:
          items.length === 0
            ? ['No products were found in that Meta Commerce Catalog.']
            : [],
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'Unable to reach Meta Commerce API right now. Try exporting your catalog CSV instead.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async commitImport(userId: string, items: WhatsAppCommitItemInput[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException(
        'Select at least one product to import into Verndly.',
      );
    }
    if (items.length > MAX_COMMIT_ITEMS) {
      throw new BadRequestException(
        `You can import up to ${MAX_COMMIT_ITEMS} products per batch.`,
      );
    }

    const seller = await this.prisma.sellerProfile.findUnique({
      where: { user_id: userId },
    });
    if (!seller) {
      throw new ForbiddenException(
        'You must have a seller profile to import products.',
      );
    }

    const results: Array<{
      index: number;
      ok: boolean;
      productId?: string;
      title?: string;
      mirroredImages?: number;
      error?: string;
    }> = [];

    const seenTitles = new Set<string>();
    let created = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      try {
        const title = normalizeTextInput(raw?.title || '');
        if (!title || title.length < 2) {
          throw new Error('Title must be at least 2 characters');
        }

        const priceNum = Number(raw?.price);
        if (!Number.isFinite(priceNum) || priceNum <= 0) {
          throw new Error('Price must be greater than 0');
        }
        const price = new Decimal(priceNum.toFixed(2));

        let originalPrice: Decimal | null = null;
        if (
          raw?.original_price !== undefined &&
          raw?.original_price !== null &&
          raw?.original_price !== ''
        ) {
          const origNum = Number(raw.original_price);
          if (Number.isFinite(origNum) && origNum > priceNum) {
            originalPrice = new Decimal(origNum.toFixed(2));
          }
        }

        const category = (raw?.category || '').trim() || 'General';
        const titleKey = title.toLowerCase();
        if (seenTitles.has(titleKey)) {
          throw new Error('Duplicate product title in this import batch');
        }
        seenTitles.add(titleKey);

        const existing = await this.prisma.product.findFirst({
          where: {
            seller_id: seller.id,
            title: { equals: title, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (existing) {
          throw new Error(
            'A product with this title already exists in your store',
          );
        }

        // Mirror up to 3 remote WhatsApp/Meta image URLs into Cloudinary so links never expire
        const mirroredUrls: string[] = [];
        const candidateUrls = Array.isArray(raw.image_urls)
          ? raw.image_urls.slice(0, 3)
          : [];
        for (const url of candidateUrls) {
          if (typeof url !== 'string' || !url.startsWith('https://')) continue;
          try {
            const uploaded = await this.cloudinary.uploadImageFromUrl(
              url,
              'vendly_products',
            );
            if ('secure_url' in uploaded && uploaded.secure_url) {
              mirroredUrls.push(uploaded.secure_url);
            }
          } catch (imgErr) {
            this.logger.warn(
              `Skipped remote image mirror for "${title}": ${(imgErr as Error)?.message}`,
            );
          }
        }

        const description = (raw?.description || '').trim();
        // Enforce active-listing readiness: fall back to draft if missing photo or short description
        const requestedStatus = raw?.status === 'active' ? 'active' : 'draft';
        const finalStatus =
          requestedStatus === 'active' &&
          mirroredUrls.length > 0 &&
          description.length >= 20
            ? 'active'
            : 'draft';

        const qty = Number.parseInt(String(raw?.quantity_available ?? 1), 10);
        const tags = normalizeTags(Array.isArray(raw?.tags) ? raw.tags : []);

        const product = await this.prisma.product.create({
          data: {
            seller_id: seller.id,
            title,
            description: description || null,
            price: price as any,
            original_price: originalPrice as any,
            currency: (raw?.currency || 'GHS').trim().toUpperCase(),
            condition: normalizeConditionValue(raw?.condition),
            quantity_available: Number.isFinite(qty) && qty >= 0 ? qty : 1,
            status: finalStatus,
            category,
            brand: (raw?.brand || '').trim() || null,
            image_urls: mirroredUrls,
            tags,
            is_featured: false,
            attributes: {},
          } as any,
        });

        const productId = (product as any).id.toString();
        this.auditLogs.record({
          actorId: userId,
          actorRole: Role.SELLER,
          action: 'product.whatsapp_import',
          entityType: 'product',
          entityId: productId,
          after: {
            title,
            price: price.toString(),
            status: finalStatus,
          },
          metadata: {
            seller_id: seller.id,
            mirrored_images: mirroredUrls.length,
          },
        });

        results.push({
          index: i,
          ok: true,
          productId,
          title,
          mirroredImages: mirroredUrls.length,
        });
        created++;
      } catch (err: unknown) {
        results.push({
          index: i,
          ok: false,
          title: raw?.title,
          error: err instanceof Error ? err.message : 'Failed to import item',
        });
        failed++;
      }
    }

    return {
      summary: {
        created,
        failed,
        total: items.length,
      },
      results,
    };
  }
}
