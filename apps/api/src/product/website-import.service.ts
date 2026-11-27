import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import {
  parsePriceValue,
  WhatsAppCatalogService,
  WhatsAppCommitItemInput,
  WhatsAppPreviewItem,
} from './whatsapp-catalog.service';
import { GENERIC_CATEGORY_TOKENS, matchCategoryName } from './category-matcher';
import {
  ALL_SUBCATEGORY_NAMES,
  normalizeProductAttributes,
} from './category-taxonomy';

export {
  matchCategoryName,
  type CategoryMatchContext,
} from './category-matcher';

export type WebsiteImportMode = 'auto' | 'single' | 'catalog';

export interface WebsitePreviewResponse {
  source: 'shopify' | 'woocommerce' | 'html' | 'verndly_ai';
  siteUrl: string;
  items: WhatsAppPreviewItem[];
  warnings: string[];
}

const FETCH_TIMEOUT_MS = 12_000;
const SUBPAGE_TIMEOUT_MS = 8_000;
const MAX_CATALOG_ITEMS = 50;
const MAX_CRAWLED_PRODUCT_PAGES = 12;
const MAX_INPUT_URLS = 12;

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const NON_PRODUCT_SLUGS = new Set([
  'products',
  'product',
  'shop',
  'store',
  'stores',
  'catalog',
  'catalogue',
  'collections',
  'collection',
  'categories',
  'category',
  'cart',
  'bag',
  'checkout',
  'login',
  'signin',
  'sign-in',
  'register',
  'signup',
  'sign-up',
  'account',
  'dashboard',
  'orders',
  'favorites',
  'wishlist',
  'search',
  'about',
  'contact',
  'help',
  'faq',
  'terms',
  'privacy',
  'shipping',
  'returns',
  'blog',
  'guides',
  'sell',
  'all',
  'new',
  'sale',
  'featured',
  'bestsellers',
  'best-sellers',
]);

/**
 * Validates that a seller-supplied website URL is a public HTTP(S) host
 * and blocks localhost, loopback, link-local, and RFC-1918 private networks.
 */
export function validatePublicWebsiteUrl(rawInput: string): URL {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    throw new BadRequestException(
      'Enter your website or product page URL (e.g. https://mystore.com).',
    );
  }

  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    throw new BadRequestException(
      'Please enter a valid website URL (e.g. https://mystore.com/products/bag).',
    );
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BadRequestException(
      'Only http:// and https:// URLs are supported.',
    );
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    !host.includes('.') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new BadRequestException(
      'Private, local, or internal network URLs are not allowed.',
    );
  }

  return parsed;
}

export function parsePublicWebsiteUrls(rawInput: string): URL[] {
  const tokens = (rawInput || '')
    .split(/[\r\n,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new BadRequestException(
      'Enter your website or product page URL (e.g. https://mystore.com).',
    );
  }

  const urls: URL[] = [];
  const seen = new Set<string>();
  for (const token of tokens) {
    const parsed = validatePublicWebsiteUrl(token);
    const key = parsed.toString();
    if (!seen.has(key)) {
      seen.add(key);
      urls.push(parsed);
    }
    if (urls.length >= MAX_INPUT_URLS) break;
  }
  return urls;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

export function resolveImageUrl(raw: unknown, baseUrl: URL): string | null {
  if (!raw) return null;

  let candidate = '';
  if (typeof raw === 'string') {
    candidate = raw.trim();
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      const found = resolveImageUrl(item, baseUrl);
      if (found) return found;
    }
    return null;
  } else if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const pick =
      obj.contentUrl ??
      obj.url ??
      obj.src ??
      obj.originalSrc ??
      obj.transformedSrc ??
      obj.large ??
      obj.full ??
      obj.thumbnailUrl ??
      obj.thumbnail;
    if (typeof pick === 'string') {
      candidate = pick.trim();
    } else if (pick && typeof pick === 'object') {
      return resolveImageUrl(pick, baseUrl);
    }
  }

  if (!candidate) return null;
  candidate = decodeHtmlEntities(candidate).trim();
  if (
    !candidate ||
    /^(true|false|null|undefined|0|1)$/i.test(candidate) ||
    /^data:|^blob:|^javascript:/i.test(candidate)
  ) {
    return null;
  }

  try {
    const withScheme = candidate.startsWith('//')
      ? `https:${candidate}`
      : candidate;
    let resolved = new URL(withScheme, baseUrl);

    // Unwrap Next.js /_next/image?url=... to the underlying high-res image URL
    if (resolved.pathname === '/_next/image') {
      const inner = resolved.searchParams.get('url');
      if (inner) {
        resolved = new URL(
          inner.startsWith('//') ? `https:${inner}` : inner,
          resolved.origin,
        );
      }
    }

    if (resolved.protocol === 'http:') resolved.protocol = 'https:';
    if (resolved.protocol !== 'https:') return null;

    const href = resolved.toString();
    if (
      /favicon|sprite|spacer|pixel|1x1|blank\.gif|loading\.gif|spinner|placeholder|sticky[_-]?banner|popup[_-]?banner|\.svg(\?|$)/i.test(
        href,
      )
    ) {
      return null;
    }
    return href;
  } catch {
    return null;
  }
}

/**
 * Recursively extracts up to `max` unique HTTPS product image URLs from strings,
 * arrays, or Schema.org `ImageObject` nodes (including Jumia's `contentUrl: [...]`
 * arrays and nested variant image arrays).
 */
export function extractImageUrls(
  raw: unknown,
  baseUrl: URL,
  max = 3,
): string[] {
  const results: string[] = [];
  const visit = (node: unknown, depth = 0) => {
    if (!node || depth > 5 || results.length >= max) return;
    if (typeof node === 'string') {
      const resolved = resolveImageUrl(node, baseUrl);
      if (resolved && !results.includes(resolved)) {
        results.push(resolved);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const entry of node) {
        visit(entry, depth + 1);
        if (results.length >= max) break;
      }
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      const fields = [
        obj.contentUrl,
        obj.url,
        obj.src,
        obj.originalSrc,
        obj.transformedSrc,
        obj.large,
        obj.full,
        obj.thumbnailUrl,
        obj.thumbnail,
      ];
      for (const field of fields) {
        if (field !== undefined && field !== null) {
          visit(field, depth + 1);
          if (results.length >= max) break;
        }
      }
    }
  };
  visit(raw);
  return results;
}

export function extractBestUrlFromSrcset(
  srcset: string,
  baseUrl: URL,
): string | null {
  if (!srcset || !srcset.trim()) return null;
  const decoded = decodeHtmlEntities(srcset);
  // Split srcset candidates without breaking comma-separated CDN transform params (e.g. w_800,q_auto)
  const parts = decoded
    .split(
      /(?<=\s\d+(?:\.\d+)?[wx])\s*,\s*|\s+,\s+|,\s+(?=(?:https?:)?\/\/|\/)/i,
    )
    .map((p) => p.trim())
    .filter(Boolean);

  let bestUrl: string | null = null;
  let bestScore = -1;

  for (const part of parts) {
    const tokens = part.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const rawUrl = tokens[0];
    const desc = (tokens[1] || '').toLowerCase();
    const resolved = resolveImageUrl(rawUrl, baseUrl);
    if (!resolved) continue;

    let score = 100;
    if (desc.endsWith('w')) {
      const w = Number.parseFloat(desc.slice(0, -1));
      if (Number.isFinite(w)) {
        // Prefer crisp 600–1600px images without grabbing 5000px Print files if avoidable
        score = w > 2400 ? 2400 - (w - 2400) * 0.1 : w;
      }
    } else if (desc.endsWith('x')) {
      const x = Number.parseFloat(desc.slice(0, -1));
      if (Number.isFinite(x)) score = x * 600;
    }

    if (score >= bestScore) {
      bestScore = score;
      bestUrl = resolved;
    }
  }

  return bestUrl;
}

function readTagAttr(tag: string, attrName: string): string {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = tag.match(
    new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, 'i'),
  );
  return m?.[1] ? m[1].trim() : '';
}

export function extractBestImageFromTag(
  tag: string,
  baseUrl: URL,
): string | null {
  // Reject tiny decorative icons (<img width="20" height="20">)
  const widthAttr = Number.parseInt(readTagAttr(tag, 'width'), 10);
  const heightAttr = Number.parseInt(readTagAttr(tag, 'height'), 10);
  if (
    (Number.isFinite(widthAttr) && widthAttr > 0 && widthAttr < 48) ||
    (Number.isFinite(heightAttr) && heightAttr > 0 && heightAttr < 48)
  ) {
    return null;
  }

  const altAndClass =
    `${readTagAttr(tag, 'alt')} ${readTagAttr(tag, 'class')} ${readTagAttr(tag, 'id')}`.toLowerCase();
  if (
    /\b(site-logo|navbar-brand|header-logo|footer-logo|payment-icon|avatar)\b/.test(
      altAndClass,
    )
  ) {
    return null;
  }

  // 1. High-resolution zoom / master product attributes first
  const highResAttrs = [
    'data-zoom-image',
    'data-large_image',
    'data-large-image',
    'data-full-url',
    'data-master',
    'data-hi-res-src',
  ];
  for (const attr of highResAttrs) {
    const val = readTagAttr(tag, attr);
    const resolved = val ? resolveImageUrl(val, baseUrl) : null;
    if (resolved) return resolved;
  }

  // 2. Responsive srcset / data-srcset (picks highest resolution instead of blur placeholder)
  for (const attr of ['data-srcset', 'data-lazy-srcset', 'srcset']) {
    const val = readTagAttr(tag, attr);
    const resolved = val ? extractBestUrlFromSrcset(val, baseUrl) : null;
    if (resolved) return resolved;
  }

  // 3. Lazy-load attributes BEFORE `src` so `src="data:..."` never shadows `data-src`
  const lazyAttrs = [
    'data-original',
    'data-src',
    'data-lazy-src',
    'data-lazy',
    'data-image',
    'data-bg',
  ];
  for (const attr of lazyAttrs) {
    const val = readTagAttr(tag, attr);
    const resolved = val ? resolveImageUrl(val, baseUrl) : null;
    if (resolved) return resolved;
  }

  // 4. Standard `src`
  const srcVal = readTagAttr(tag, 'src');
  return srcVal ? resolveImageUrl(srcVal, baseUrl) : null;
}

export function extractProductGalleryImagesFromHtml(
  html: string,
  baseUrl: URL,
  maxImages = 3,
): string[] {
  const found: string[] = [];
  const push = (u: string | null) => {
    if (u && !found.includes(u) && found.length < maxImages) {
      found.push(u);
    }
  };

  for (const metaKey of [
    'og:image:secure_url',
    'og:image',
    'twitter:image',
    'twitter:image:src',
  ]) {
    const val = extractMetaContent(html, metaKey);
    if (val) push(resolveImageUrl(val, baseUrl));
  }
  if (found.length >= maxImages) return found;

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const cleaned = (bodyMatch ? bodyMatch[1] : html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');

  const tagRegex = /<(?:img|source)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  const fallbackGifs: string[] = [];
  while ((m = tagRegex.exec(cleaned)) !== null && found.length < maxImages) {
    const imgUrl = extractBestImageFromTag(m[0], baseUrl);
    if (!imgUrl) continue;
    // Skip promotional CMS/banner GIFs in favor of real product photos
    if (/\.gif(\?|$)/i.test(imgUrl) || /\/cms\/.*banner/i.test(imgUrl)) {
      if (!fallbackGifs.includes(imgUrl)) fallbackGifs.push(imgUrl);
      continue;
    }
    push(imgUrl);
  }
  if (found.length === 0) {
    for (const g of fallbackGifs) push(g);
  }

  return found;
}

function asString(raw: unknown, fallback = ''): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return fallback;
}

function normalizeConditionValue(raw: unknown): 'new' | 'used' | 'refurbished' {
  const lower = asString(raw).toLowerCase();
  if (lower.includes('refurb')) return 'refurbished';
  if (
    lower.includes('used') ||
    lower.includes('second') ||
    lower.includes('pre')
  ) {
    return 'used';
  }
  return 'new';
}

function extractMetaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patternA = new RegExp(
    `<meta[^>]+(?:property|name|itemprop)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const patternB = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${escaped}["']`,
    'i',
  );
  const m = html.match(patternA) || html.match(patternB);
  return m?.[1] ? decodeHtmlEntities(m[1]) : '';
}

function isProductUrlPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '');
  if (!clean || clean === '') return false;
  const segments = clean.split('/').filter(Boolean);
  const lastSeg = (segments[segments.length - 1] || '').toLowerCase();
  if (!lastSeg || NON_PRODUCT_SLUGS.has(lastSeg)) return false;

  // Jumia, AliExpress, Magento, PrestaShop `.html` product detail slugs (e.g. /hansen-fan-300573915.html)
  if (
    /\.html?$/i.test(lastSeg) &&
    lastSeg !== 'index.html' &&
    (/-\d{4,}\.html?$/i.test(lastSeg) ||
      (lastSeg.match(/-/g) || []).length >= 2)
  ) {
    return true;
  }

  return (
    /\/(products?|product-page|items?|p|dp|goods)\/[^/]+$/i.test(clean) ||
    /\/collections\/[^/]+\/products\/[^/]+$/i.test(clean) ||
    /\/shop\/[^/]+\/[^/]+$/i.test(clean) ||
    /\/(shop|store)\/[a-z0-9][a-z0-9-_]{2,}$/i.test(clean)
  );
}

/**
 * Strictly extracts REAL structured products from HTML:
 * 1. Schema.org JSON-LD (`Product`, `ProductGroup`, `IndividualProduct`, `ItemList`)
 * 2. Embedded Next.js `__NEXT_DATA__` product payloads
 * 3. Explicit Product OpenGraph / Microdata ONLY when `og:type="product"` or an
 *    explicit product price meta/itemprop tag is present (NEVER generic site `og:title`!).
 */
export function extractStructuredProductsFromHtml(
  html: string,
  pageUrl: URL,
  availableCategories: string[],
  allowProductMetaFallback = false,
): WhatsAppPreviewItem[] {
  const items: WhatsAppPreviewItem[] = [];
  const seenKeys = new Set<string>();

  const pushUnique = (item: WhatsAppPreviewItem) => {
    const cleanTitle = item.title.trim();
    if (!cleanTitle || cleanTitle.length < 2) return;
    const key = cleanTitle.toLowerCase();
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    items.push(item);
  };

  // Extract breadcrumb category hints from JSON-LD BreadcrumbList and HTML breadcrumb navs
  const pageBreadcrumbs: string[] = [];
  const pushBreadcrumb = (raw: unknown) => {
    const clean = stripHtmlTags(asString(raw)).trim();
    if (
      clean.length >= 2 &&
      clean.length <= 60 &&
      !GENERIC_CATEGORY_TOKENS.has(clean.toLowerCase()) &&
      !pageBreadcrumbs.includes(clean)
    ) {
      pageBreadcrumbs.push(clean);
    }
  };
  const htmlBreadcrumbBlock = html.match(
    /<(?:nav|ol|ul|div)[^>]*(?:aria-label=["'][^"']*breadcrumb[^"']*["']|class=["'][^"']*breadcrumb[^"']*["'])[^>]*>([\s\S]{1,3000}?)<\/(?:nav|ol|ul|div)>/i,
  );
  if (htmlBreadcrumbBlock?.[1]) {
    const crumbMatches = htmlBreadcrumbBlock[1].matchAll(
      /<a[^>]*>([\s\S]*?)<\/a>/gi,
    );
    for (const cm of crumbMatches) {
      pushBreadcrumb(cm[1]);
    }
  }

  // 1. JSON-LD blocks (with @id lookup for Yoast/RankMath ImageObject references)
  const ldRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const parsedLdBlocks: unknown[] = [];
  let match: RegExpExecArray | null;
  while ((match = ldRegex.exec(html)) !== null) {
    try {
      const rawJson = match[1].trim();
      if (!rawJson) continue;
      const parsed = JSON.parse(rawJson);
      parsedLdBlocks.push(parsed);

      // First pass: harvest BreadcrumbList labels before product nodes are mapped
      const collectBreadcrumbs = (n: any) => {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) {
          n.forEach(collectBreadcrumbs);
          return;
        }
        if (Array.isArray(n['@graph'])) {
          n['@graph'].forEach(collectBreadcrumbs);
        }
        const rawTypes = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
        const types = rawTypes.map((t: unknown) =>
          asString(t)
            .toLowerCase()
            .replace(/^https?:\/\/schema\.org\//, ''),
        );
        if (
          types.includes('breadcrumblist') &&
          Array.isArray(n.itemListElement)
        ) {
          // Skip last crumb if it is just the product title itself, keep category hierarchy crumbs
          const els = n.itemListElement;
          const limit = els.length > 1 ? els.length - 1 : els.length;
          for (let i = 0; i < limit; i++) {
            const el = els[i];
            pushBreadcrumb(el?.name ?? el?.item?.name);
          }
        }
      };
      collectBreadcrumbs(parsed);
    } catch {
      // ignore invalid JSON-LD block
    }
  }

  for (const parsed of parsedLdBlocks) {
    try {
      const idMap = new Map<string, any>();
      const indexIds = (n: any) => {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) {
          n.forEach(indexIds);
          return;
        }
        if (
          typeof n['@id'] === 'string' &&
          n['@id'].trim() &&
          Object.keys(n).some((k) => k !== '@id')
        ) {
          idMap.set(n['@id'].trim(), n);
        }
        for (const k of Object.keys(n)) {
          if (k !== '@context') indexIds(n[k]);
        }
      };
      indexIds(parsed);

      const derefNode = (ref: any): any => {
        if (
          ref &&
          typeof ref === 'object' &&
          typeof ref['@id'] === 'string' &&
          !ref.url &&
          !ref.contentUrl &&
          !ref.src
        ) {
          return idMap.get(ref['@id'].trim()) ?? ref;
        }
        return ref;
      };

      const visitNode = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(visitNode);
          return;
        }
        if (typeof node !== 'object') return;

        if (Array.isArray(node['@graph'])) {
          node['@graph'].forEach(visitNode);
        }
        if (node.mainEntity) {
          visitNode(derefNode(node.mainEntity));
        }

        const rawTypes = Array.isArray(node['@type'])
          ? node['@type']
          : [node['@type']];
        const types = rawTypes.map((t: unknown) =>
          asString(t)
            .toLowerCase()
            .replace(/^https?:\/\/schema\.org\//, ''),
        );

        if (types.includes('itemlist') && Array.isArray(node.itemListElement)) {
          for (const el of node.itemListElement) {
            visitNode(derefNode(el?.item || el));
          }
          return;
        }

        const isProductType = types.some((t) =>
          [
            'product',
            'productgroup',
            'individualproduct',
            'productmodel',
          ].includes(t),
        );
        if (!isProductType) return;

        // If ProductGroup has variants without top-level offers, inspect first variant for price
        const variants = Array.isArray(node.hasVariant) ? node.hasVariant : [];
        const rawOffers = node.offers ?? variants[0]?.offers ?? undefined;
        const primaryOffer = derefNode(
          Array.isArray(rawOffers) ? rawOffers[0] : rawOffers,
        );

        const priceCandidate =
          primaryOffer?.price ??
          primaryOffer?.lowPrice ??
          primaryOffer?.highPrice ??
          node.price ??
          variants[0]?.price;
        const priceObj = parsePriceValue(priceCandidate);
        const highOffer = parsePriceValue(primaryOffer?.highPrice);
        const original_price =
          highOffer.amount !== null &&
          priceObj.amount !== null &&
          highOffer.amount > priceObj.amount
            ? highOffer.amount
            : null;

        const currency =
          String(
            primaryOffer?.priceCurrency ||
              node.priceCurrency ||
              priceObj.currency ||
              'GHS',
          )
            .trim()
            .toUpperCase() || 'GHS';

        const rawImgs = [
          ...(Array.isArray(node.image)
            ? node.image
            : node.image
              ? [node.image]
              : []),
          ...variants.flatMap((v: any) =>
            Array.isArray(v?.image) ? v.image : v?.image ? [v.image] : [],
          ),
        ];
        const image_urls: string[] = [];
        for (const img of rawImgs) {
          const extracted = extractImageUrls(derefNode(img), pageUrl, 3);
          for (const resolved of extracted) {
            if (!image_urls.includes(resolved)) {
              image_urls.push(resolved);
            }
            if (image_urls.length >= 3) break;
          }
          if (image_urls.length >= 3) break;
        }

        const title = stripHtmlTags(String(node.name || ''));
        const description = stripHtmlTags(String(node.description || '')).slice(
          0,
          900,
        );
        const brandName =
          typeof node.brand === 'string'
            ? node.brand
            : typeof node.brand?.name === 'string'
              ? node.brand.name
              : '';

        const avail = String(primaryOffer?.availability || '').toLowerCase();
        const isOut = avail.includes('outofstock') || avail.includes('soldout');

        const itemUrl =
          typeof node.url === 'string'
            ? new URL(node.url, pageUrl).toString()
            : typeof primaryOffer?.url === 'string'
              ? new URL(primaryOffer.url, pageUrl).toString()
              : pageUrl.toString();

        pushUnique({
          tempId: `web_ld_${items.length}_${Date.now()}`,
          externalId: node.sku ? String(node.sku) : undefined,
          title: title.slice(0, 120),
          description,
          price: priceObj.amount,
          original_price,
          currency,
          category: matchCategoryName(
            typeof node.category === 'string'
              ? node.category
              : asString(node.category?.name),
            availableCategories,
            {
              breadcrumbs: pageBreadcrumbs,
              title,
              description,
              brand: brandName,
              url: itemUrl,
            },
          ),
          condition: normalizeConditionValue(
            primaryOffer?.itemCondition || node.itemCondition,
          ),
          quantity_available: isOut ? 0 : 1,
          brand: stripHtmlTags(brandName).slice(0, 60),
          tags: [],
          image_urls,
          status:
            priceObj.amount && image_urls.length > 0 && description.length >= 20
              ? 'active'
              : 'draft',
          source_url: itemUrl,
        });
      };

      visitNode(parsed);
    } catch {
      // ignore invalid JSON-LD block
    }
  }

  // 2. Embedded Next.js `__NEXT_DATA__` product objects (for SSR React/Next storefronts)
  if (items.length === 0) {
    const nextDataMatch = html.match(
      /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
    );
    if (nextDataMatch?.[1]) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const walkData = (obj: any, depth = 0) => {
          if (
            !obj ||
            typeof obj !== 'object' ||
            depth > 9 ||
            items.length >= MAX_CATALOG_ITEMS
          ) {
            return;
          }
          if (Array.isArray(obj)) {
            for (const entry of obj) walkData(entry, depth + 1);
            return;
          }

          const maybeTitle =
            typeof obj.title === 'string'
              ? obj.title
              : typeof obj.name === 'string'
                ? obj.name
                : '';
          const rawPrice =
            obj.price ??
            obj.sale_price ??
            obj.base_price ??
            obj.priceRange?.minVariantPrice?.amount;
          const hasImageField =
            Array.isArray(obj.image_urls) ||
            Array.isArray(obj.images) ||
            typeof obj.image_url === 'string' ||
            typeof obj.image === 'string' ||
            typeof obj.featuredImage?.url === 'string';

          const parsedPrice = parsePriceValue(rawPrice);
          if (maybeTitle && parsedPrice.amount !== null && hasImageField) {
            const imgs: string[] = [];
            const candidates = [
              ...(Array.isArray(obj.image_urls) ? obj.image_urls : []),
              ...(Array.isArray(obj.images) ? obj.images : []),
              obj.image_url,
              obj.image,
              obj.featuredImage?.url,
            ];
            for (const c of candidates) {
              const r = resolveImageUrl(c, pageUrl);
              if (r && !imgs.includes(r)) imgs.push(r);
              if (imgs.length >= 3) break;
            }

            const desc = stripHtmlTags(
              String(obj.description || obj.short_description || ''),
            ).slice(0, 900);

            pushUnique({
              tempId: `web_nd_${items.length}_${Date.now()}`,
              externalId: obj.id ? String(obj.id) : undefined,
              title: stripHtmlTags(maybeTitle).slice(0, 120),
              description: desc,
              price: parsedPrice.amount,
              original_price: parsePriceValue(obj.original_price).amount,
              currency: String(
                obj.currency ||
                  obj.priceRange?.minVariantPrice?.currencyCode ||
                  parsedPrice.currency ||
                  'GHS',
              ).toUpperCase(),
              category: matchCategoryName(
                typeof obj.category === 'string'
                  ? obj.category
                  : obj.category?.name,
                availableCategories,
                {
                  breadcrumbs: pageBreadcrumbs,
                  title: stripHtmlTags(maybeTitle),
                  description: desc,
                  tags: Array.isArray(obj.tags)
                    ? obj.tags.map((t: unknown) => asString(t))
                    : [],
                  brand: typeof obj.brand === 'string' ? obj.brand : '',
                  url: pageUrl.toString(),
                },
              ),
              condition: normalizeConditionValue(obj.condition),
              quantity_available:
                typeof obj.quantity_available === 'number'
                  ? obj.quantity_available
                  : 1,
              brand:
                typeof obj.brand === 'string' ? obj.brand.slice(0, 60) : '',
              tags: Array.isArray(obj.tags)
                ? obj.tags
                    .map((t: unknown) => asString(t).trim().toLowerCase())
                    .filter(Boolean)
                    .slice(0, 6)
                : [],
              image_urls: imgs,
              status:
                parsedPrice.amount && imgs.length > 0 && desc.length >= 20
                  ? 'active'
                  : 'draft',
              source_url: pageUrl.toString(),
            });
            return;
          }

          for (const key of Object.keys(obj)) {
            walkData(obj[key], depth + 1);
          }
        };
        walkData(nextData?.props);
      } catch {
        // ignore invalid __NEXT_DATA__
      }
    }
  }

  // 3. Strict Product-Only Meta / Microdata (ONLY when explicit product type or price tag is present!)
  if (items.length === 0 && allowProductMetaFallback) {
    const ogType = extractMetaContent(html, 'og:type').toLowerCase();
    const metaPriceRaw =
      extractMetaContent(html, 'product:price:amount') ||
      extractMetaContent(html, 'og:price:amount') ||
      extractMetaContent(html, 'price');
    const metaCurrency =
      extractMetaContent(html, 'product:price:currency') ||
      extractMetaContent(html, 'og:price:currency') ||
      extractMetaContent(html, 'priceCurrency');

    const priceObj = parsePriceValue(metaPriceRaw);
    const hasExplicitProductSignal =
      ogType.startsWith('product') || priceObj.amount !== null;

    if (hasExplicitProductSignal) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const h1Title = h1Match?.[1] ? stripHtmlTags(h1Match[1]) : '';
      const ogTitle = extractMetaContent(html, 'og:title');
      const cleanTitle = (h1Title || ogTitle)
        .replace(/\s*[|\-–—•·]\s*[^|\-–—•·]{2,40}$/, '')
        .trim();

      const ogDesc =
        extractMetaContent(html, 'og:description') ||
        extractMetaContent(html, 'description');
      const galleryImgs = extractProductGalleryImagesFromHtml(html, pageUrl, 3);

      if (cleanTitle) {
        pushUnique({
          tempId: `web_meta_${Date.now()}`,
          title: cleanTitle.slice(0, 120),
          description: ogDesc.slice(0, 900),
          price: priceObj.amount,
          original_price: null,
          currency: (metaCurrency || priceObj.currency || 'GHS').toUpperCase(),
          category: matchCategoryName(
            extractMetaContent(html, 'product:category') ||
              extractMetaContent(html, 'og:category') ||
              extractMetaContent(html, 'article:section'),
            availableCategories,
            {
              breadcrumbs: pageBreadcrumbs,
              title: cleanTitle,
              description: ogDesc,
              brand: extractMetaContent(html, 'product:brand'),
              url: pageUrl.toString(),
            },
          ),
          condition: 'new',
          quantity_available: 1,
          brand: extractMetaContent(html, 'product:brand').slice(0, 60),
          tags: [],
          image_urls: galleryImgs,
          status:
            priceObj.amount && galleryImgs.length > 0 && ogDesc.length >= 20
              ? 'active'
              : 'draft',
          source_url: pageUrl.toString(),
        });
      }
    }
  }

  // Enrich single-product structured item with page gallery images if JSON-LD lacked images
  if (
    items.length === 1 &&
    (allowProductMetaFallback || items[0].image_urls.length === 0) &&
    items[0].image_urls.length < 3
  ) {
    const extraGallery = extractProductGalleryImagesFromHtml(html, pageUrl, 3);
    for (const g of extraGallery) {
      if (!items[0].image_urls.includes(g) && items[0].image_urls.length < 3) {
        items[0].image_urls.push(g);
      }
    }
    if (
      items[0].price &&
      items[0].image_urls.length > 0 &&
      items[0].description.length >= 20
    ) {
      items[0].status = 'active';
    }
  }

  return items;
}

/**
 * Discovers same-origin product detail links (`<a href="...">`) from a store
 * homepage or catalog/collection page so we can crawl real product pages.
 */
export function discoverProductLinksFromHtml(
  html: string,
  baseUrl: URL,
): { productUrls: URL[]; catalogUrls: URL[] } {
  const productUrls: URL[] = [];
  const catalogUrls: URL[] = [];
  const seen = new Set<string>([baseUrl.toString().replace(/\/+$/, '')]);

  const anchorRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(html)) !== null) {
    const rawHref = m[1].trim();
    if (!rawHref || /^(mailto:|tel:|javascript:)/i.test(rawHref)) continue;

    let resolved: URL;
    try {
      resolved = new URL(rawHref, baseUrl);
    } catch {
      continue;
    }

    if (resolved.origin !== baseUrl.origin) continue;
    resolved.hash = '';
    const cleanKey = resolved.toString().replace(/\/+$/, '');
    if (seen.has(cleanKey)) continue;

    const segments = resolved.pathname
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
    if (segments.length === 0) continue;

    const lastSeg = segments[segments.length - 1].toLowerCase();
    if (/\.(jpg|jpeg|png|webp|gif|pdf|svg|css|js)$/i.test(lastSeg)) continue;

    if (
      isProductUrlPath(resolved.pathname) &&
      !NON_PRODUCT_SLUGS.has(lastSeg)
    ) {
      seen.add(cleanKey);
      productUrls.push(resolved);
    } else if (
      segments.length === 1 &&
      [
        'products',
        'shop',
        'store',
        'catalog',
        'catalogue',
        'collections',
      ].includes(lastSeg)
    ) {
      seen.add(cleanKey);
      catalogUrls.push(resolved);
    }

    if (productUrls.length >= MAX_CRAWLED_PRODUCT_PAGES * 2) break;
  }

  return { productUrls, catalogUrls };
}

export function mapShopifyProductToPreview(
  product: Record<string, any>,
  origin: string,
  availableCategories: string[],
  idx = 0,
): WhatsAppPreviewItem | null {
  const title = String(product?.title || '').trim();
  if (!title) return null;

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const firstVariant = variants[0] || {};
  const priceObj = parsePriceValue(firstVariant.price);
  const compareObj = parsePriceValue(firstVariant.compare_at_price);
  const original_price =
    compareObj.amount !== null &&
    priceObj.amount !== null &&
    compareObj.amount > priceObj.amount
      ? compareObj.amount
      : null;

  const baseOriginUrl = new URL(origin);
  const rawImages = [
    ...(Array.isArray(product.images) ? product.images : []),
    ...(product.image ? [product.image] : []),
    ...(product.featured_image ? [product.featured_image] : []),
    ...(firstVariant.featured_image ? [firstVariant.featured_image] : []),
  ];
  const image_urls: string[] = [];
  for (const img of rawImages) {
    const resolved = resolveImageUrl(img, baseOriginUrl);
    if (resolved && !image_urls.includes(resolved)) {
      image_urls.push(resolved);
    }
    if (image_urls.length >= 3) break;
  }

  const rawTags = Array.isArray(product.tags)
    ? product.tags
    : typeof product.tags === 'string'
      ? product.tags.split(',')
      : [];
  const tags = rawTags
    .map((t: unknown) => asString(t).trim().toLowerCase())
    .filter((t: string) => t.length >= 2 && t.length <= 32)
    .slice(0, 6);

  const anyAvailable =
    variants.length === 0 || variants.some((v: any) => v?.available !== false);

  const description = stripHtmlTags(String(product.body_html || '')).slice(
    0,
    900,
  );

  return {
    tempId: `web_sh_${idx}_${Date.now()}`,
    externalId: product.id ? String(product.id) : undefined,
    title: title.slice(0, 120),
    description,
    price: priceObj.amount,
    original_price,
    currency: 'GHS',
    category: matchCategoryName(product.product_type, availableCategories, {
      title,
      description,
      tags,
      brand: String(product.vendor || ''),
      url: product.handle ? `${origin}/products/${product.handle}` : origin,
    }),
    condition: 'new',
    quantity_available: anyAvailable ? 1 : 0,
    brand: String(product.vendor || '')
      .trim()
      .slice(0, 60),
    tags,
    image_urls,
    status:
      priceObj.amount && image_urls.length > 0 && description.length >= 20
        ? 'active'
        : 'draft',
    source_url: product.handle
      ? `${origin}/products/${product.handle}`
      : origin,
  };
}

export function mapWooProductToPreview(
  product: Record<string, any>,
  availableCategories: string[],
  idx = 0,
): WhatsAppPreviewItem | null {
  const title = stripHtmlTags(String(product?.name || ''));
  if (!title) return null;

  const minorUnit = Number(product?.prices?.currency_minor_unit ?? 2);
  const divisor = Math.pow(10, Number.isFinite(minorUnit) ? minorUnit : 2);

  const rawPrice = Number(product?.prices?.price);
  const rawRegular = Number(product?.prices?.regular_price);
  const price =
    Number.isFinite(rawPrice) && rawPrice > 0
      ? Number((rawPrice / divisor).toFixed(2))
      : null;
  const regular =
    Number.isFinite(rawRegular) && rawRegular > 0
      ? Number((rawRegular / divisor).toFixed(2))
      : null;
  const original_price =
    regular !== null && price !== null && regular > price ? regular : null;

  const permalinkUrl = (() => {
    try {
      return typeof product.permalink === 'string'
        ? new URL(product.permalink)
        : new URL('https://verndly.com');
    } catch {
      return new URL('https://verndly.com');
    }
  })();
  const rawImages = Array.isArray(product.images) ? product.images : [];
  const image_urls: string[] = [];
  for (const img of rawImages) {
    const resolved = resolveImageUrl(img, permalinkUrl);
    if (resolved && !image_urls.includes(resolved)) {
      image_urls.push(resolved);
    }
    if (image_urls.length >= 3) break;
  }

  const rawCats = Array.isArray(product.categories) ? product.categories : [];
  const catNames = rawCats
    .map((c: any) => (c?.name ? stripHtmlTags(String(c.name)) : ''))
    .filter(Boolean);
  const catName = catNames[0] || '';

  const description = stripHtmlTags(
    String(product.short_description || product.description || ''),
  ).slice(0, 900);

  return {
    tempId: `web_wc_${idx}_${Date.now()}`,
    externalId: product.id ? String(product.id) : undefined,
    title: title.slice(0, 120),
    description,
    price,
    original_price,
    currency: String(product?.prices?.currency_code || 'GHS').toUpperCase(),
    category: matchCategoryName(catName, availableCategories, {
      breadcrumbs: catNames,
      title,
      description,
      url:
        typeof product.permalink === 'string' ? product.permalink : undefined,
    }),
    condition: 'new',
    quantity_available: product.is_in_stock === false ? 0 : 1,
    brand: '',
    tags: [],
    image_urls,
    status:
      price && image_urls.length > 0 && description.length >= 20
        ? 'active'
        : 'draft',
    source_url:
      typeof product.permalink === 'string' ? product.permalink : undefined,
  };
}

const NON_API_HOST_PATTERNS = [
  /(^|\.)w3\.org$/i,
  /(^|\.)schema\.org$/i,
  /(^|\.)googleapis\.com$/i,
  /(^|\.)gstatic\.com$/i,
  /(^|\.)google\.com$/i,
  /(^|\.)googletagmanager\.com$/i,
  /(^|\.)google-analytics\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)linkedin\.com$/i,
  /(^|\.)whatsapp\.com$/i,
  /(^|\.)wa\.me$/i,
  /(^|\.)sentry\.io$/i,
  /(^|\.)vercel\.com$/i,
  /(^|\.)vercel\.live$/i,
  /(^|\.)nextjs\.org$/i,
  /(^|\.)reactjs\.org$/i,
  /(^|\.)react\.dev$/i,
  /(^|\.)cloudinary\.com$/i,
  /(^|\.)unsplash\.com$/i,
  /(^|\.)stripe\.com$/i,
  /(^|\.)paystack\.co$/i,
  /(^|\.)paystack\.com$/i,
  /(^|\.)cloudflare\.com$/i,
  /(^|\.)jsdelivr\.net$/i,
  /(^|\.)unpkg\.com$/i,
  /(^|\.)github\.com$/i,
  /(^|\.)npmjs\.com$/i,
  /(^|\.)mozilla\.org$/i,
  /(^|\.)apple\.com$/i,
  /(^|\.)microsoft\.com$/i,
  /(^|\.)example\.com$/i,
];

function normalizeCurrencyCode(raw: unknown, fallback = 'GHS'): string {
  const code = asString(raw, fallback).trim().toUpperCase();
  if (!code || code === 'GHC' || code === 'GH₵' || code === '₵') return 'GHS';
  return code.slice(0, 6);
}

/**
 * Normalizes a product object returned by a generic REST/SPA storefront JSON API
 * (Next.js App Router, Express, NestJS, Medusa, MongoDB/Prisma stores, etc.).
 */
export function mapGenericJsonProductToPreview(
  raw: Record<string, any>,
  siteUrl: URL,
  availableCategories: string[],
  idx = 0,
): WhatsAppPreviewItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const title = stripHtmlTags(
    asString(raw.title ?? raw.name ?? raw.productName ?? raw.product_name),
  ).slice(0, 120);
  if (!title || title.length < 2) return null;

  // Price: support both minor-unit cents (`priceCents`, `price_cents`, `unit_amount`) and major units (`price`)
  let price: number | null = null;
  let original_price: number | null = null;
  let inferredCurrency = '';

  const centsRaw =
    raw.salePriceCents ??
    raw.sale_price_cents ??
    raw.priceCents ??
    raw.price_cents ??
    raw.unit_amount ??
    raw.amountCents ??
    raw.amount_cents;
  if (
    typeof centsRaw === 'number' &&
    Number.isFinite(centsRaw) &&
    centsRaw > 0
  ) {
    price = Number((centsRaw / 100).toFixed(2));
  } else {
    const majorObj = parsePriceValue(
      raw.salePrice ??
        raw.sale_price ??
        raw.discountedPrice ??
        raw.price ??
        raw.sellingPrice ??
        raw.selling_price ??
        raw.amount,
    );
    price = majorObj.amount;
    inferredCurrency = majorObj.currency;
  }

  const origCentsRaw =
    raw.originalPriceCents ??
    raw.original_price_cents ??
    raw.compareAtPriceCents ??
    raw.compare_at_price_cents ??
    (raw.salePriceCents ? raw.priceCents : undefined);
  if (
    typeof origCentsRaw === 'number' &&
    Number.isFinite(origCentsRaw) &&
    origCentsRaw > 0
  ) {
    const candidate = Number((origCentsRaw / 100).toFixed(2));
    if (price !== null && candidate > price) original_price = candidate;
  } else {
    const origObj = parsePriceValue(
      raw.original_price ??
        raw.originalPrice ??
        raw.compare_at_price ??
        raw.compareAtPrice ??
        raw.regular_price ??
        raw.regularPrice ??
        raw.mrp,
    );
    if (origObj.amount !== null && price !== null && origObj.amount > price) {
      original_price = origObj.amount;
    }
  }

  // Images: handle arrays of strings or `{ url, src, secure_url, position }` objects
  const rawImgEntries: unknown[] = [];
  for (const field of [
    raw.images,
    raw.image_urls,
    raw.imageUrls,
    raw.photos,
    raw.media,
    raw.gallery,
  ]) {
    if (Array.isArray(field)) {
      const sorted = [...field].sort((a, b) => {
        const pa = typeof a?.position === 'number' ? a.position : 999;
        const pb = typeof b?.position === 'number' ? b.position : 999;
        return pa - pb;
      });
      rawImgEntries.push(...sorted);
    }
  }
  for (const singleField of [
    raw.image,
    raw.imageUrl,
    raw.image_url,
    raw.featuredImage,
    raw.featured_image,
    raw.coverImage,
    raw.thumbnail,
  ]) {
    if (singleField) rawImgEntries.push(singleField);
  }

  const image_urls: string[] = [];
  for (const entry of rawImgEntries) {
    const extracted = extractImageUrls(entry, siteUrl, 3);
    for (const resolved of extracted) {
      if (!image_urls.includes(resolved)) {
        image_urls.push(resolved);
      }
      if (image_urls.length >= 3) break;
    }
    if (image_urls.length >= 3) break;
  }

  // Require at least a price or an image so non-product JSON objects (users, categories, blogs) are skipped
  if (price === null && image_urls.length === 0) return null;

  const description = stripHtmlTags(
    asString(
      raw.description ??
        raw.shortDescription ??
        raw.short_description ??
        raw.summary ??
        raw.details,
    ),
  ).slice(0, 900);

  const catRaw =
    typeof raw.category === 'string'
      ? raw.category
      : typeof raw.category?.name === 'string'
        ? raw.category.name
        : typeof raw.categoryId?.name === 'string'
          ? raw.categoryId.name
          : typeof raw.category_name === 'string'
            ? raw.category_name
            : Array.isArray(raw.categories) &&
                typeof raw.categories[0]?.name === 'string'
              ? raw.categories[0].name
              : typeof raw.product_type === 'string'
                ? raw.product_type
                : '';

  const brandRaw =
    typeof raw.brand === 'string'
      ? raw.brand
      : typeof raw.brand?.name === 'string'
        ? raw.brand.name
        : asString(raw.vendor ?? raw.manufacturer);

  const rawId = asString(raw._id ?? raw.id ?? raw.sku).trim();
  const slugOrId = asString(raw.slug ?? raw.handle ?? rawId).trim();

  const rawQty =
    raw.quantity_available ??
    raw.quantity ??
    raw.stock ??
    raw.inventory ??
    raw.countInStock;
  const parsedQty =
    typeof rawQty === 'number' && Number.isFinite(rawQty) && rawQty >= 0
      ? Math.trunc(rawQty)
      : raw.inStock === false ||
          raw.in_stock === false ||
          raw.available === false
        ? 0
        : 1;

  const rawTags = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = rawTags
    .map((t: unknown) => asString(t).trim().toLowerCase())
    .filter((t: string) => t.length >= 2 && t.length <= 32)
    .slice(0, 6);

  const conditionHint =
    asString(raw.condition) ||
    (/\brefurbished\b/i.test(description)
      ? 'refurbished'
      : /\b(used|pre-owned|second\s*hand)\b/i.test(description)
        ? 'used'
        : 'new');

  const source_url =
    typeof raw.url === 'string' && /^https?:\/\//i.test(raw.url)
      ? raw.url
      : slugOrId
        ? `${siteUrl.origin}/products/${encodeURIComponent(slugOrId)}`
        : siteUrl.toString();

  return {
    tempId: `web_api_${idx}_${Date.now()}`,
    externalId: rawId || undefined,
    title,
    description,
    price,
    original_price,
    currency: normalizeCurrencyCode(raw.currency || inferredCurrency || 'GHS'),
    category: matchCategoryName(catRaw, availableCategories, {
      title,
      description,
      tags,
      brand: brandRaw,
      url: source_url,
    }),
    condition: normalizeConditionValue(conditionHint),
    quantity_available: parsedQty,
    brand: stripHtmlTags(brandRaw).slice(0, 60),
    tags,
    image_urls,
    status:
      price && image_urls.length > 0 && description.length >= 20
        ? 'active'
        : 'draft',
    source_url,
  };
}

export function extractProductsFromJsonPayload(
  payload: unknown,
  siteUrl: URL,
  availableCategories: string[],
  singleMode: boolean,
): WhatsAppPreviewItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, any>;

  const arrayCandidates: unknown[] = [
    Array.isArray(payload) ? payload : null,
    Array.isArray(root.products) ? root.products : null,
    Array.isArray(root.data) ? root.data : null,
    Array.isArray(root.items) ? root.items : null,
    Array.isArray(root.results) ? root.results : null,
    Array.isArray(root.docs) ? root.docs : null,
    Array.isArray(root.data?.products) ? root.data.products : null,
    Array.isArray(root.data?.items) ? root.data.items : null,
    Array.isArray(root.data?.docs) ? root.data.docs : null,
  ].filter(Boolean);

  if (arrayCandidates.length > 0) {
    const arr = arrayCandidates[0] as Array<Record<string, any>>;
    const items: WhatsAppPreviewItem[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < arr.length && items.length < MAX_CATALOG_ITEMS; i++) {
      const mapped = mapGenericJsonProductToPreview(
        arr[i],
        siteUrl,
        availableCategories,
        i,
      );
      if (mapped && !seen.has(mapped.title.toLowerCase())) {
        seen.add(mapped.title.toLowerCase());
        items.push(mapped);
      }
    }
    return singleMode ? items.slice(0, 1) : items;
  }

  const singleCandidates = [
    root.data?.product,
    root.data?.item,
    root.product,
    root.item,
    root.data,
    root.result,
    root,
  ];
  for (const cand of singleCandidates) {
    if (cand && typeof cand === 'object' && !Array.isArray(cand)) {
      const mapped = mapGenericJsonProductToPreview(
        cand as Record<string, any>,
        siteUrl,
        availableCategories,
        0,
      );
      if (mapped) return [mapped];
    }
  }

  return [];
}

@Injectable()
export class WebsiteImportService {
  private readonly logger = new Logger(WebsiteImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly whatsappCatalog: WhatsAppCatalogService,
  ) {}

  private async getCategoryNames(): Promise<string[]> {
    const categories = await this.prisma.category.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const names = categories.map((c) => c.name).filter(Boolean);
    return names.length > 0 ? names : ['General'];
  }

  private async fetchWithTimeout(
    url: string,
    accept = 'application/json, text/html;q=0.9,*/*;q=0.8',
    timeoutMs = FETCH_TIMEOUT_MS,
  ): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          Accept: accept,
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Builds a product-focused DOM digest preserving `<img>`, `<source>`, and
   * CSS background-image URLs inline right beside their surrounding headings
   * and prices so Verndly AI pairs each product with its exact photo.
   */
  private buildProductFocusedDomDigest(
    html: string,
    baseUrl: URL,
  ): {
    digest: string;
    candidateImages: string[];
    allowedImageHosts: Set<string>;
  } {
    const candidateImages: string[] = [];
    const seenImgs = new Set<string>();
    const allowedImageHosts = new Set<string>([baseUrl.hostname.toLowerCase()]);

    const recordImg = (resolved: string | null): string | null => {
      if (!resolved) return null;
      try {
        allowedImageHosts.add(new URL(resolved).hostname.toLowerCase());
      } catch {
        return null;
      }
      if (!seenImgs.has(resolved)) {
        seenImgs.add(resolved);
        if (candidateImages.length < 80) {
          candidateImages.push(resolved);
        }
      }
      return resolved;
    };

    for (const metaKey of [
      'og:image:secure_url',
      'og:image',
      'twitter:image',
    ]) {
      recordImg(resolveImageUrl(extractMetaContent(html, metaKey), baseUrl));
    }

    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let working = bodyMatch ? bodyMatch[1] : html;

    // Remove noise regions (scripts, styles, navbars, footers)
    working = working
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
      .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');

    // Collapse <picture> blocks into their single highest-resolution image
    working = working.replace(
      /<picture\b[^>]*>([\s\S]*?)<\/picture>/gi,
      (picBlock) => {
        const tagMatches = picBlock.match(/<(?:source|img)\b[^>]*>/gi) || [];
        for (const t of tagMatches) {
          const best = recordImg(extractBestImageFromTag(t, baseUrl));
          if (best) return ` [IMG: ${best}] `;
        }
        return ' ';
      },
    );

    // Inline <img ...> (checking zoom / srcset / lazy data-src BEFORE src="data:...")
    working = working.replace(/<img\b[^>]*>/gi, (imgTag) => {
      const resolved = recordImg(extractBestImageFromTag(imgTag, baseUrl));
      return resolved ? ` [IMG: ${resolved}] ` : ' ';
    });

    // Inline CSS background-image URLs often used on custom storefront product cards
    working = working.replace(
      /background(?:-image)?\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi,
      (_full, rawBgUrl: string) => {
        const resolved = recordImg(resolveImageUrl(rawBgUrl, baseUrl));
        return resolved ? `>[IMG: ${resolved}]<` : '';
      },
    );

    // Preserve block boundaries for cleaner card separation
    working = working
      .replace(/<\/(h[1-6]|p|li|article|section|div|tr|a)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');

    const lines = decodeHtmlEntities(working)
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1);

    return {
      digest: lines.join('\n').slice(0, 11000),
      candidateImages,
      allowedImageHosts,
    };
  }

  private async extractWithVerndlyAi(
    html: string,
    pageUrl: URL,
    categories: string[],
    mode: WebsiteImportMode,
  ): Promise<WhatsAppPreviewItem[]> {
    if (!this.geminiService.isConfigured()) return [];

    const { digest, candidateImages, allowedImageHosts } =
      this.buildProductFocusedDomDigest(html, pageUrl);
    if (digest.length < 30) return [];

    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h1Text = h1Match?.[1] ? stripHtmlTags(h1Match[1]) : '';

    const systemInstruction = [
      'You are Verndly AI, extracting real purchasable products from an e-commerce webpage so the store owner can import them into Verndly (Ghana’s escrow-protected marketplace).',
      mode === 'single'
        ? 'This URL is a SINGLE product detail page. Extract ONLY the 1 primary product being sold on this page (ignore "related products" or store headers).'
        : 'Extract every distinct purchasable product card/listing visible on this page (up to 16 products).',
      'CRITICAL ANTI-HALLUCINATION RULES:',
      '1. NEVER return the website’s brand name, homepage hero slogan, about-us blurb, or category names as a product! If a block does not represent a real specific item for sale, ignore it. If NO actual products for sale appear in the page content, return an empty array `"products": []`.',
      '2. Extract the exact product name and exact numeric selling price shown on the page (if a higher original/crossed-out price is also shown, put it in original_price). If no price is shown for an item on a single product page, set price to null.',
      '3. Write a concise, factual product description (40–300 chars) describing the product itself — never the website’s general meta description.',
      `4. Pick the closest category from: ${categories.join(', ')}.`,
      `5. Pick the closest subcategory from this list when applicable (or ""): ${ALL_SUBCATEGORY_NAMES.join(', ')}.`,
      '6. Extract tags (3–6 lowercase search keywords), plus color, material, size, warranty, sku, dimensions (length/width/height/unit), and weight (value/unit) if mentioned on the page; never fabricate measurements.',
      '7. Match each product with its exact `[IMG: https://...]` URL that appears directly above, inside, or beside that product card in the Structured Page Content.',
    ].join('\n');

    const responseSchema = {
      type: 'OBJECT',
      required: ['products'],
      properties: {
        products: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: ['title', 'description', 'category', 'condition'],
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
              sku: { type: 'STRING' },
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

    try {
      const raw = await this.geminiService.generateStructuredJson<{
        products?: Array<Record<string, unknown>>;
      }>({
        systemInstruction,
        parts: [
          {
            text: [
              `Page URL: ${pageUrl.toString()}`,
              h1Text ? `Main H1 Heading: ${h1Text}` : '',
              `Candidate Product Image URLs:\n${candidateImages.slice(0, 50).join('\n') || '(none)'}`,
              `Structured Page Content:\n${digest}`,
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ],
        responseSchema,
        temperature: 0.1,
      });

      const allowedSet = new Set(candidateImages);
      const list = Array.isArray(raw?.products) ? raw.products : [];
      const items: WhatsAppPreviewItem[] = [];

      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const title = asString(p?.title).trim().slice(0, 120);
        if (!title) continue;

        const price =
          typeof p.price === 'number' && Number.isFinite(p.price) && p.price > 0
            ? Number(p.price.toFixed(2))
            : null;
        const orig =
          typeof p.original_price === 'number' &&
          Number.isFinite(p.original_price) &&
          price !== null &&
          p.original_price > price
            ? Number(p.original_price.toFixed(2))
            : null;

        const pickedImages: string[] = [];
        if (Array.isArray(p.image_urls)) {
          for (const rawImg of p.image_urls) {
            const normalized = resolveImageUrl(rawImg, pageUrl);
            if (!normalized || pickedImages.includes(normalized)) continue;
            const imgHost = new URL(normalized).hostname.toLowerCase();
            if (allowedSet.has(normalized) || allowedImageHosts.has(imgHost)) {
              pickedImages.push(normalized);
            }
            if (pickedImages.length >= 3) break;
          }
        }
        const finalImages =
          pickedImages.length > 0
            ? pickedImages
            : mode === 'single' && candidateImages.length > 0
              ? candidateImages.slice(0, 3)
              : [];

        const desc = asString(p.description).trim().slice(0, 900);
        const parsedTags = Array.isArray(p.tags)
          ? p.tags
              .map((t) => asString(t).trim().toLowerCase())
              .filter(Boolean)
              .slice(0, 6)
          : [];
        const matchedCategory = matchCategoryName(
          typeof p.category === 'string' ? p.category : undefined,
          categories,
          {
            title,
            description: desc,
            tags: parsedTags,
            brand: asString(p.brand),
            url: pageUrl.toString(),
          },
        );
        const attributes = normalizeProductAttributes(
          {
            subcategory:
              typeof p.subcategory === 'string' ? p.subcategory : undefined,
            color: typeof p.color === 'string' ? p.color : undefined,
            material: typeof p.material === 'string' ? p.material : undefined,
            size: typeof p.size === 'string' ? p.size : undefined,
            warranty: typeof p.warranty === 'string' ? p.warranty : undefined,
            sku: typeof p.sku === 'string' ? p.sku : undefined,
            dimensions: p.dimensions,
            weight: p.weight,
          },
          matchedCategory,
          { title, description: desc, tags: parsedTags },
        );

        items.push({
          tempId: `web_ai_${i}_${Date.now()}`,
          title,
          description: desc,
          price,
          original_price: orig,
          currency: asString(p.currency, 'GHS').trim().toUpperCase() || 'GHS',
          category: matchedCategory,
          ...(attributes.subcategory
            ? { subcategory: attributes.subcategory }
            : {}),
          condition:
            p.condition === 'used' || p.condition === 'refurbished'
              ? p.condition
              : 'new',
          quantity_available: 1,
          brand: asString(p.brand).trim().slice(0, 60),
          tags: parsedTags,
          ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
          image_urls: finalImages,
          status:
            price && finalImages.length > 0 && desc.length >= 20
              ? 'active'
              : 'draft',
          source_url: pageUrl.toString(),
        });
      }

      return items;
    } catch (err) {
      this.logger.warn(
        `Verndly AI website extraction fallback failed: ${(err as Error)?.message}`,
      );
      return [];
    }
  }

  /**
   * Extracts a single product from a specific product URL (Shopify JSON ->
   * WooCommerce slug API -> HTML JSON-LD / Product Meta -> Verndly AI).
   */
  private async extractSingleProductUrl(
    productUrl: URL,
    categories: string[],
  ): Promise<{
    source: WebsitePreviewResponse['source'];
    items: WhatsAppPreviewItem[];
  }> {
    const pathname = productUrl.pathname.replace(/\/+$/, '');

    // 1a. Shopify single product JSON (supports /products/<handle> and /collections/.../products/<handle>)
    const shopifyHandleMatch = pathname.match(/\/products\/([^/?#]+)$/i);
    if (shopifyHandleMatch?.[1]) {
      const shRes = await this.fetchWithTimeout(
        `${productUrl.origin}/products/${encodeURIComponent(shopifyHandleMatch[1])}.json`,
        'application/json',
        SUBPAGE_TIMEOUT_MS,
      );
      if (shRes?.ok) {
        const json = (await shRes.json().catch(() => null)) as {
          product?: Record<string, any>;
        } | null;
        if (json?.product) {
          const item = mapShopifyProductToPreview(
            json.product,
            productUrl.origin,
            categories,
            0,
          );
          if (item) return { source: 'shopify', items: [item] };
        }
      }
    }

    // 1b. WooCommerce single product by slug (/product/<slug>)
    const wooSlugMatch = pathname.match(/\/product\/([^/?#]+)$/i);
    if (wooSlugMatch?.[1]) {
      const wcRes = await this.fetchWithTimeout(
        `${productUrl.origin}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(wooSlugMatch[1])}`,
        'application/json',
        SUBPAGE_TIMEOUT_MS,
      );
      if (wcRes?.ok) {
        const json = await wcRes.json().catch(() => null);
        if (Array.isArray(json) && json[0]) {
          const item = mapWooProductToPreview(json[0], categories, 0);
          if (item) return { source: 'woocommerce', items: [item] };
        }
      }
    }

    // 2. Fetch product HTML -> strict JSON-LD / NextData / Product Meta
    const pageRes = await this.fetchWithTimeout(
      productUrl.toString(),
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    );
    if (!pageRes || !pageRes.ok) {
      return { source: 'html', items: [] };
    }

    const html = await pageRes.text();
    const structured = extractStructuredProductsFromHtml(
      html,
      productUrl,
      categories,
      true,
    );
    if (structured.length > 0) {
      return { source: 'html', items: structured.slice(0, 1) };
    }

    // 2b. Client-rendered SPA / Next.js App Router storefront API discovery
    const spaItems = await this.discoverAndFetchSpaProducts(
      html,
      productUrl,
      categories,
      true,
    );
    if (spaItems.length > 0) {
      return { source: 'html', items: spaItems.slice(0, 1) };
    }

    // 3. Verndly AI single-product extraction
    const aiItems = await this.extractWithVerndlyAi(
      html,
      productUrl,
      categories,
      'single',
    );
    if (aiItems.length > 0) {
      return { source: 'verndly_ai', items: aiItems.slice(0, 1) };
    }

    return { source: 'html', items: [] };
  }

  /**
   * Discovers public REST product API endpoints from client-rendered Next.js /
   * React / Vite storefront JS bundles (e.g. Vercel frontend + Render/Railway/
   * custom API backend) when the initial HTML only renders a loading skeleton.
   */
  private async discoverAndFetchSpaProducts(
    html: string,
    pageUrl: URL,
    categories: string[],
    singleMode: boolean,
  ): Promise<WhatsAppPreviewItem[]> {
    // 1. Collect same-origin script chunk URLs, prioritizing route-specific product/page chunks
    //    and app shared modules (which Next.js emits right before page-*.js after vendor bundles).
    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    const prioritizedChunks: string[] = [];
    const fallbackChunks: string[] = [];
    const seenScripts = new Set<string>();
    let m: RegExpExecArray | null;

    while ((m = scriptRegex.exec(html)) !== null) {
      const rawSrc = decodeHtmlEntities(m[1].trim());
      if (!rawSrc) continue;
      let resolved: URL;
      try {
        resolved = new URL(rawSrc, pageUrl);
      } catch {
        continue;
      }
      if (resolved.origin !== pageUrl.origin) continue;
      const href = resolved.toString();
      if (seenScripts.has(href)) continue;
      seenScripts.add(href);

      const lowerPath = resolved.pathname.toLowerCase();
      if (
        /(polyfills|webpack|framework|runtime|gtag|analytics|sentry|not-found)/i.test(
          lowerPath,
        )
      ) {
        continue;
      }
      if (
        /(product|shop|store|catalog|app\/page|app\/layout|page-|index-|main-)/i.test(
          lowerPath,
        )
      ) {
        prioritizedChunks.push(href);
      } else {
        fallbackChunks.push(href);
      }
    }

    // Reverse fallbackChunks so shared app chunks right next to page-*.js are inspected BEFORE large vendor bundles
    const chunksToInspect = [
      ...prioritizedChunks.slice(0, 8),
      ...[...fallbackChunks].reverse().slice(0, 12),
    ].slice(0, 18);

    // 2. Fetch JS bundles in parallel and scan for public API base URLs & product paths
    const chunkTexts = await Promise.all(
      chunksToInspect.map(async (src) => {
        const res = await this.fetchWithTimeout(
          src,
          'application/javascript,text/javascript,*/*;q=0.5',
          SUBPAGE_TIMEOUT_MS,
        );
        if (!res?.ok) return '';
        const text = await res.text();
        return text.slice(0, 600_000);
      }),
    );

    // Extract inline <script> bodies (e.g. Next.js RSC flight payloads) without <meta>/<link rel="canonical"> URLs
    const inlineScripts: string[] = [];
    const inlineScriptRegex =
      /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineScriptRegex.exec(html)) !== null) {
      const body = inlineMatch[1];
      if (body && body.length > 20) inlineScripts.push(body.slice(0, 100_000));
    }

    const combinedJs = `${chunkTexts.join('\n')}\n${inlineScripts.join('\n')}`;

    const stripWww = (host: string) => host.toLowerCase().replace(/^www\./, '');
    const pageBaseHost = stripWww(pageUrl.hostname);

    const candidateOrigins = new Set<string>();
    const externalOrigins: string[] = [];
    const discoveredApiPrefixes = new Set<string>();

    const urlRegex =
      /https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?(?:\/api(?:\/v\d+)?)?/gi;
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlRegex.exec(combinedJs)) !== null) {
      try {
        const u = validatePublicWebsiteUrl(urlMatch[0]);
        const host = u.hostname.toLowerCase();
        if (NON_API_HOST_PATTERNS.some((p) => p.test(host))) continue;
        if (stripWww(host) === pageBaseHost) continue;
        const cleanPath = u.pathname.replace(/\/+$/, '');
        if (/^\/api(?:\/v\d+)?$/i.test(cleanPath)) {
          discoveredApiPrefixes.add(`${cleanPath}/products`);
        }
        if (!candidateOrigins.has(u.origin)) {
          candidateOrigins.add(u.origin);
          externalOrigins.push(u.origin);
        }
      } catch {
        // skip private or invalid origins
      }
    }

    // Prioritize origins that look like backend APIs, then same-origin
    externalOrigins.sort((a, b) => {
      const score = (o: string) =>
        /(api\.|backend|server|commerce|store|shop|onrender\.com|railway\.app|fly\.dev|herokuapp\.com|workers\.dev|up\.railway\.app|render\.com)/i.test(
          o,
        )
          ? 0
          : 1;
      return score(a) - score(b);
    });

    const orderedOrigins = [...externalOrigins.slice(0, 4), pageUrl.origin];

    // Discover product API path prefixes referenced in the JS bundle (always keeping /api/products & /api/v1/products)
    const apiPathMatches =
      combinedJs.match(/\/(?:api\/(?:v\d+\/)?)?(?:store\/)?products\b/gi) || [];
    const apiPaths: string[] = [...discoveredApiPrefixes];
    for (const p of apiPathMatches) {
      const clean = p.replace(/\/+$/, '');
      if (!apiPaths.includes(clean)) apiPaths.push(clean);
    }
    for (const stdPath of ['/api/products', '/api/v1/products']) {
      if (!apiPaths.includes(stdPath)) apiPaths.push(stdPath);
    }
    apiPaths.sort(
      (a, b) =>
        (a.toLowerCase().startsWith('/api/') ? 0 : 1) -
        (b.toLowerCase().startsWith('/api/') ? 0 : 1),
    );

    const segments = pageUrl.pathname.split('/').filter(Boolean);
    const lastSeg = segments[segments.length - 1] || '';

    const probeJsonEndpoint = async (
      endpoint: string,
      useSingleMode: boolean,
    ): Promise<WhatsAppPreviewItem[]> => {
      if (
        endpoint.replace(/\/+$/, '') === pageUrl.toString().replace(/\/+$/, '')
      ) {
        return [];
      }
      const res = await this.fetchWithTimeout(
        endpoint,
        'application/json,text/plain,*/*;q=0.5',
        18_000,
      );
      if (!res?.ok) return [];
      const contentType = (
        res.headers?.get('content-type') || ''
      ).toLowerCase();
      if (!contentType.includes('json')) return [];
      const json: unknown = await res.json().catch(() => null);
      if (!json) return [];
      return extractProductsFromJsonPayload(
        json,
        pageUrl,
        categories,
        useSingleMode,
      );
    };

    // 3. Query discovered public API endpoints in small parallel batches (handles Render/Railway cold starts up to 18s)
    const directEndpoints: string[] = [];
    for (const origin of orderedOrigins) {
      for (const apiPath of apiPaths.slice(0, 3)) {
        if (singleMode && lastSeg) {
          directEndpoints.push(
            `${origin}${apiPath}/${encodeURIComponent(lastSeg)}`,
          );
        } else {
          directEndpoints.push(
            `${origin}${apiPath}?limit=${MAX_CATALOG_ITEMS}`,
          );
        }
      }
    }

    const primaryResults = await Promise.all(
      directEndpoints
        .slice(0, 6)
        .map((ep) => probeJsonEndpoint(ep, singleMode)),
    );
    for (const items of primaryResults) {
      if (items.length > 0) return items;
    }

    // 4. Single-product fallback: if /api/products/:id wasn't supported (e.g. slug-only or list-only API),
    //    query the catalog list endpoint and match the product by _id / id / slug in source_url
    if (singleMode && lastSeg) {
      const decodedSeg = decodeURIComponent(lastSeg).toLowerCase();
      const listEndpoints: string[] = [];
      for (const origin of orderedOrigins.slice(0, 3)) {
        for (const apiPath of apiPaths.slice(0, 2)) {
          listEndpoints.push(`${origin}${apiPath}?limit=50`);
        }
      }
      const listResults = await Promise.all(
        listEndpoints.slice(0, 4).map((ep) => probeJsonEndpoint(ep, false)),
      );
      for (const items of listResults) {
        const matched = items.find(
          (it) =>
            it.externalId?.toLowerCase() === decodedSeg ||
            it.source_url?.toLowerCase().endsWith(`/${decodedSeg}`) ||
            it.source_url
              ?.toLowerCase()
              .endsWith(`/${encodeURIComponent(decodedSeg)}`),
        );
        if (matched) return [matched];
      }
    }

    return [];
  }

  /**
   * Crawls up to MAX_CRAWLED_PRODUCT_PAGES discovered product URLs in small
   * batches to assemble a catalog when a website lacks /products.json.
   * Falls back to batched Verndly AI extraction across crawled sub-pages when
   * custom HTML product pages omit Schema.org JSON-LD.
   */
  private async crawlProductPages(
    urls: URL[],
    categories: string[],
  ): Promise<{
    source: WebsitePreviewResponse['source'];
    items: WhatsAppPreviewItem[];
  }> {
    const targets = urls.slice(0, MAX_CRAWLED_PRODUCT_PAGES);
    const collected: WhatsAppPreviewItem[] = [];
    const unstructuredPages: Array<{ url: URL; html: string }> = [];
    const seenTitles = new Set<string>();
    const batchSize = 4;

    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (u) => {
          const pageRes = await this.fetchWithTimeout(
            u.toString(),
            'text/html,application/xhtml+xml',
            SUBPAGE_TIMEOUT_MS,
          );
          if (!pageRes?.ok) return { url: u, html: '', structured: [] };
          const html = await pageRes.text();
          const structured = extractStructuredProductsFromHtml(
            html,
            u,
            categories,
            true,
          ).slice(0, 1);
          return { url: u, html, structured };
        }),
      );

      for (const res of batchResults) {
        if (res.structured.length > 0) {
          for (const item of res.structured) {
            const key = item.title.trim().toLowerCase();
            if (!seenTitles.has(key)) {
              seenTitles.add(key);
              collected.push(item);
            }
          }
        } else if (res.html && unstructuredPages.length < 6) {
          unstructuredPages.push({ url: res.url, html: res.html });
        }
      }
    }

    if (collected.length > 0) {
      return { source: 'html', items: collected };
    }

    // If sub-pages had custom HTML without JSON-LD/meta price, run Verndly AI over a combined sub-page digest
    if (unstructuredPages.length > 0 && this.geminiService.isConfigured()) {
      const combinedSections: string[] = [];
      const allImages: string[] = [];
      for (const p of unstructuredPages) {
        const { digest, candidateImages } = this.buildProductFocusedDomDigest(
          p.html,
          p.url,
        );
        for (const img of candidateImages) {
          if (!allImages.includes(img) && allImages.length < 24) {
            allImages.push(img);
          }
        }
        combinedSections.push(
          `--- PRODUCT PAGE: ${p.url.toString()} ---\n${digest.slice(0, 1400)}`,
        );
      }

      const syntheticHtml = `<body>${allImages
        .map((u) => `<img src="${u}" />`)
        .join('')}<section>${combinedSections.join('\n\n')}</section></body>`;
      const aiItems = await this.extractWithVerndlyAi(
        syntheticHtml,
        unstructuredPages[0].url,
        categories,
        'catalog',
      );
      if (aiItems.length > 0) {
        return { source: 'verndly_ai', items: aiItems };
      }
    }

    return { source: 'html', items: [] };
  }

  private async discoverProductUrlsFromSitemap(origin: string): Promise<URL[]> {
    const res = await this.fetchWithTimeout(
      `${origin}/sitemap.xml`,
      'application/xml,text/xml,*/*;q=0.8',
      SUBPAGE_TIMEOUT_MS,
    );
    if (!res?.ok) return [];
    const xml = await res.text();
    const locRegex = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi;
    const found: URL[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while (
      (m = locRegex.exec(xml)) !== null &&
      found.length < MAX_CRAWLED_PRODUCT_PAGES
    ) {
      try {
        const u = new URL(m[1].trim());
        if (
          u.origin === origin &&
          isProductUrlPath(u.pathname) &&
          !seen.has(u.toString())
        ) {
          seen.add(u.toString());
          found.push(u);
        }
      } catch {
        // skip invalid loc
      }
    }
    return found;
  }

  async previewWebsite(
    rawUrl: string,
    mode: WebsiteImportMode = 'auto',
  ): Promise<WebsitePreviewResponse> {
    const urls = parsePublicWebsiteUrls(rawUrl);
    const categories = await this.getCategoryNames();
    const warnings: string[] = [];

    // Multi-URL paste: extract each product link directly
    if (urls.length > 1) {
      const results = await Promise.all(
        urls.map((u) => this.extractSingleProductUrl(u, categories)),
      );
      const combined: WhatsAppPreviewItem[] = [];
      const seen = new Set<string>();
      let detectedSource: WebsitePreviewResponse['source'] = 'html';

      results.forEach((r, idx) => {
        if (r.items.length === 0) {
          warnings.push(
            `Could not detect a product on ${urls[idx].toString()}.`,
          );
          return;
        }
        detectedSource = r.source;
        for (const it of r.items) {
          const key = it.title.trim().toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push({ ...it, tempId: `${it.tempId}_${idx}` });
          }
        }
      });

      return {
        source: detectedSource,
        siteUrl: urls[0].origin,
        items: combined,
        warnings,
      };
    }

    const parsedUrl = urls[0];
    const pathname = parsedUrl.pathname.replace(/\/+$/, '');
    const isSingle =
      mode === 'single' || (mode === 'auto' && isProductUrlPath(pathname));

    // Single Product Flow
    if (isSingle) {
      const single = await this.extractSingleProductUrl(parsedUrl, categories);
      if (single.items.length > 0) {
        return {
          source: single.source,
          siteUrl: parsedUrl.toString(),
          items: single.items,
          warnings,
        };
      }

      warnings.push(
        `Could not find product details on ${parsedUrl.toString()}. Make sure the link points directly to an individual product page, or upload its photo with Verndly AI.`,
      );
      return {
        source: 'html',
        siteUrl: parsedUrl.toString(),
        items: [],
        warnings,
      };
    }

    // Store / Catalog Flow
    // 1a. Shopify collection JSON (/collections/<handle>/products.json)
    const collectionMatch = pathname.match(/^\/collections\/([^/?#]+)$/i);
    if (collectionMatch?.[1]) {
      const colRes = await this.fetchWithTimeout(
        `${parsedUrl.origin}/collections/${encodeURIComponent(collectionMatch[1])}/products.json?limit=${MAX_CATALOG_ITEMS}`,
        'application/json',
      );
      if (colRes?.ok) {
        const json = (await colRes.json().catch(() => null)) as {
          products?: Array<Record<string, any>>;
        } | null;
        if (Array.isArray(json?.products) && json.products.length > 0) {
          const items = json.products
            .map((p, idx) =>
              mapShopifyProductToPreview(p, parsedUrl.origin, categories, idx),
            )
            .filter((x): x is WhatsAppPreviewItem => x !== null);
          if (items.length > 0) {
            return {
              source: 'shopify',
              siteUrl: parsedUrl.toString(),
              items,
              warnings,
            };
          }
        }
      }
    }

    // 1b. Shopify store-wide /products.json
    const shCatalogRes = await this.fetchWithTimeout(
      `${parsedUrl.origin}/products.json?limit=${MAX_CATALOG_ITEMS}`,
      'application/json',
    );
    if (shCatalogRes?.ok) {
      const json = (await shCatalogRes.json().catch(() => null)) as {
        products?: Array<Record<string, any>>;
      } | null;
      if (Array.isArray(json?.products) && json.products.length > 0) {
        const items = json.products
          .map((p, idx) =>
            mapShopifyProductToPreview(p, parsedUrl.origin, categories, idx),
          )
          .filter((x): x is WhatsAppPreviewItem => x !== null);
        if (items.length > 0) {
          return {
            source: 'shopify',
            siteUrl: parsedUrl.origin,
            items,
            warnings,
          };
        }
      }
    }

    // 1c. WooCommerce Store API
    const wcRes = await this.fetchWithTimeout(
      `${parsedUrl.origin}/wp-json/wc/store/v1/products?per_page=${MAX_CATALOG_ITEMS}`,
      'application/json',
    );
    if (wcRes?.ok) {
      const json = await wcRes.json().catch(() => null);
      if (Array.isArray(json) && json.length > 0) {
        const items = json
          .map((p: Record<string, any>, idx: number) =>
            mapWooProductToPreview(p, categories, idx),
          )
          .filter((x): x is WhatsAppPreviewItem => x !== null);
        if (items.length > 0) {
          return {
            source: 'woocommerce',
            siteUrl: parsedUrl.origin,
            items,
            warnings,
          };
        }
      }
    }

    // 2. Fetch landing / catalog HTML page
    const pageRes = await this.fetchWithTimeout(
      parsedUrl.toString(),
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    );
    if (!pageRes || !pageRes.ok) {
      throw new BadRequestException(
        `Could not load ${parsedUrl.hostname} (HTTP ${pageRes?.status ?? 'unreachable'}). Check the URL or try pasting a direct product link.`,
      );
    }

    const html = await pageRes.text();

    // 2a. Strict JSON-LD ItemList / Product / __NEXT_DATA__ (NO generic og:title fallback!)
    const structuredOnPage = extractStructuredProductsFromHtml(
      html,
      parsedUrl,
      categories,
      false,
    );
    if (structuredOnPage.length > 0) {
      return {
        source: 'html',
        siteUrl: parsedUrl.toString(),
        items: structuredOnPage,
        warnings,
      };
    }

    // 2b. Discover internal product links (from page -> /products subpage -> /sitemap.xml) and crawl them!
    const discovered = discoverProductLinksFromHtml(html, parsedUrl);
    let productUrls = discovered.productUrls;
    const catalogUrls = discovered.catalogUrls;
    let aiTargetHtml = html;
    let aiTargetUrl = parsedUrl;

    if (productUrls.length === 0 && catalogUrls.length > 0) {
      const subCatRes = await this.fetchWithTimeout(
        catalogUrls[0].toString(),
        'text/html,application/xhtml+xml',
        SUBPAGE_TIMEOUT_MS,
      );
      if (subCatRes?.ok) {
        const subCatHtml = await subCatRes.text();
        aiTargetHtml = subCatHtml;
        aiTargetUrl = catalogUrls[0];
        const subCatStructured = extractStructuredProductsFromHtml(
          subCatHtml,
          catalogUrls[0],
          categories,
          false,
        );
        if (subCatStructured.length > 0) {
          return {
            source: 'html',
            siteUrl: catalogUrls[0].toString(),
            items: subCatStructured,
            warnings,
          };
        }
        const deeper = discoverProductLinksFromHtml(subCatHtml, catalogUrls[0]);
        productUrls = deeper.productUrls;
      }
    }

    if (productUrls.length === 0) {
      productUrls = await this.discoverProductUrlsFromSitemap(parsedUrl.origin);
    }

    if (productUrls.length > 0) {
      const crawled = await this.crawlProductPages(productUrls, categories);
      if (crawled.items.length > 0) {
        return {
          source: crawled.source,
          siteUrl: parsedUrl.origin,
          items: crawled.items,
          warnings,
        };
      }
    }

    // 2c. Client-rendered SPA / Next.js App Router storefront API discovery
    const spaCatalogItems = await this.discoverAndFetchSpaProducts(
      aiTargetHtml,
      aiTargetUrl,
      categories,
      false,
    );
    if (spaCatalogItems.length > 0) {
      return {
        source: 'html',
        siteUrl: aiTargetUrl.toString(),
        items: spaCatalogItems,
        warnings,
      };
    }

    // 3. Verndly AI DOM Product Card Reader (prefers /shop or /products catalog page over landing hero)
    const aiItems = await this.extractWithVerndlyAi(
      aiTargetHtml,
      aiTargetUrl,
      categories,
      'catalog',
    );
    if (aiItems.length > 0) {
      return {
        source: 'verndly_ai',
        siteUrl: aiTargetUrl.toString(),
        items: aiItems,
        warnings,
      };
    }

    warnings.push(
      `We couldn’t find public product listings on ${parsedUrl.hostname} (some JavaScript-only storefronts load products in the browser). Try pasting direct product links (e.g. ${parsedUrl.origin}/products/item-name) or switch to "Single item".`,
    );
    return {
      source: 'html',
      siteUrl: parsedUrl.toString(),
      items: [],
      warnings,
    };
  }

  /**
   * Fetches and validates a remote product image server-side for the dashboard
   * preview queue so CSP rules and merchant hotlink (`Referer`) blocks never
   * break product thumbnails before commit.
   */
  async fetchProxiedPreviewImage(rawUrl: string): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    const cleaned = decodeHtmlEntities((rawUrl || '').trim());
    const parsed = validatePublicWebsiteUrl(
      cleaned.startsWith('//') ? `https:${cleaned}` : cleaned,
    );
    parsed.protocol = 'https:';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBPAGE_TIMEOUT_MS);
    try {
      const res = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': BROWSER_USER_AGENT,
          Accept:
            'image/webp,image/jpeg,image/png,image/avif,image/*;q=0.9,*/*;q=0.5',
          Referer: `${parsed.origin}/`,
        },
      });
      if (!res.ok) {
        throw new BadRequestException(
          `Remote image returned HTTP ${res.status}`,
        );
      }

      const arrayBuffer = await res.arrayBuffer();
      if (
        arrayBuffer.byteLength === 0 ||
        arrayBuffer.byteLength > 12 * 1024 * 1024
      ) {
        throw new BadRequestException('Invalid remote image size');
      }

      const buffer = Buffer.from(arrayBuffer);
      const headerType = (res.headers.get('content-type') || '')
        .split(';')[0]
        .trim()
        .toLowerCase();

      // Sniff magic bytes to guarantee safe raster image response (never active HTML/SVG)
      let sniffed: string | null = null;
      if (buffer.length >= 12) {
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
          sniffed = 'image/jpeg';
        } else if (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47
        ) {
          sniffed = 'image/png';
        } else if (
          buffer[0] === 0x47 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x46
        ) {
          sniffed = 'image/gif';
        } else if (
          buffer[0] === 0x52 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x46 &&
          buffer[3] === 0x46 &&
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50
        ) {
          sniffed = 'image/webp';
        } else if (
          buffer[4] === 0x66 &&
          buffer[5] === 0x74 &&
          buffer[6] === 0x79 &&
          buffer[7] === 0x70
        ) {
          sniffed = 'image/avif';
        }
      }

      const safeType =
        sniffed ||
        (headerType.startsWith('image/') && headerType !== 'image/svg+xml'
          ? headerType
          : null);
      if (!safeType) {
        throw new BadRequestException(
          'URL did not return a raster product image',
        );
      }

      return { buffer, contentType: safeType };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Unable to load remote product image');
    } finally {
      clearTimeout(timer);
    }
  }

  async commitImport(userId: string, items: WhatsAppCommitItemInput[]) {
    return this.whatsappCatalog.commitImport(userId, items);
  }
}
