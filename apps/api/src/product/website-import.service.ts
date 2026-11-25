import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import {
  parsePriceValue,
  WhatsAppCatalogService,
  WhatsAppCommitItemInput,
  WhatsAppPreviewItem,
} from './whatsapp-catalog.service';

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

function resolveImageUrl(raw: unknown, baseUrl: URL): string | null {
  if (!raw) return null;
  const candidate =
    typeof raw === 'string'
      ? raw.trim()
      : typeof (raw as { url?: unknown; src?: unknown })?.url === 'string'
        ? String((raw as { url: string }).url).trim()
        : typeof (raw as { src?: unknown })?.src === 'string'
          ? String((raw as { src: string }).src).trim()
          : '';
  if (!candidate || candidate.startsWith('data:')) return null;

  try {
    const resolved = new URL(candidate, baseUrl);
    if (resolved.protocol === 'http:') resolved.protocol = 'https:';
    if (resolved.protocol !== 'https:') return null;
    const href = resolved.toString();
    if (/favicon|sprite|spacer|pixel|1x1|\.svg(\?|$)/i.test(href)) return null;
    return href;
  } catch {
    return null;
  }
}

function matchCategoryName(
  rawCategory: string | undefined | null,
  availableCategories: string[],
): string {
  const fallback = availableCategories[0] || 'General';
  if (!rawCategory || !rawCategory.trim()) return fallback;
  const parts = rawCategory
    .split(/[>/,|]/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  for (const part of parts) {
    const exact = availableCategories.find((c) => c.toLowerCase() === part);
    if (exact) return exact;
  }
  for (const part of parts) {
    const partial = availableCategories.find(
      (c) => c.toLowerCase().includes(part) || part.includes(c.toLowerCase()),
    );
    if (partial) return partial;
  }
  return fallback;
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

  // 1. JSON-LD blocks
  const ldRegex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = ldRegex.exec(html)) !== null) {
    try {
      const rawJson = match[1].trim();
      if (!rawJson) continue;
      const parsed = JSON.parse(rawJson);

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
          visitNode(node.mainEntity);
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
            visitNode(el?.item || el);
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
        const primaryOffer = Array.isArray(rawOffers)
          ? rawOffers[0]
          : rawOffers;

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
          ...(variants[0]?.image ? [variants[0].image] : []),
        ];
        const image_urls: string[] = [];
        for (const img of rawImgs) {
          const resolved = resolveImageUrl(img, pageUrl);
          if (resolved && !image_urls.includes(resolved)) {
            image_urls.push(resolved);
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
          category: matchCategoryName(node.category, availableCategories),
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
      const ogImg = resolveImageUrl(
        extractMetaContent(html, 'og:image'),
        pageUrl,
      );

      if (cleanTitle) {
        pushUnique({
          tempId: `web_meta_${Date.now()}`,
          title: cleanTitle.slice(0, 120),
          description: ogDesc.slice(0, 900),
          price: priceObj.amount,
          original_price: null,
          currency: (metaCurrency || priceObj.currency || 'GHS').toUpperCase(),
          category: availableCategories[0] || 'General',
          condition: 'new',
          quantity_available: 1,
          brand: extractMetaContent(html, 'product:brand').slice(0, 60),
          tags: [],
          image_urls: ogImg ? [ogImg] : [],
          status:
            priceObj.amount && ogImg && ogDesc.length >= 20
              ? 'active'
              : 'draft',
          source_url: pageUrl.toString(),
        });
      }
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

  const rawImages = Array.isArray(product.images) ? product.images : [];
  const image_urls = rawImages
    .map((img: any) => (typeof img === 'string' ? img : img?.src))
    .filter(
      (u: unknown): u is string =>
        typeof u === 'string' && u.startsWith('https://'),
    )
    .slice(0, 3);

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
    category: matchCategoryName(product.product_type, availableCategories),
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

  const rawImages = Array.isArray(product.images) ? product.images : [];
  const image_urls = rawImages
    .map((img: any) => img?.src)
    .filter(
      (u: unknown): u is string =>
        typeof u === 'string' && u.startsWith('https://'),
    )
    .slice(0, 3);

  const rawCats = Array.isArray(product.categories) ? product.categories : [];
  const catName = rawCats[0]?.name
    ? stripHtmlTags(String(rawCats[0].name))
    : '';

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
    category: matchCategoryName(catName, availableCategories),
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
   * Builds a product-focused DOM digest preserving `<img>` URLs inline right
   * beside their surrounding headings and prices so Verndly AI pairs each
   * product with its exact photo and never confuses site chrome with products.
   */
  private buildProductFocusedDomDigest(
    html: string,
    baseUrl: URL,
  ): { digest: string; candidateImages: string[] } {
    const candidateImages: string[] = [];
    const seenImgs = new Set<string>();

    const ogImg = resolveImageUrl(
      extractMetaContent(html, 'og:image'),
      baseUrl,
    );
    if (ogImg) {
      seenImgs.add(ogImg);
      candidateImages.push(ogImg);
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

    // Inline <img src / data-src / srcset> right where the image sits in the card/page
    working = working.replace(/<img\b[^>]*>/gi, (imgTag) => {
      const srcMatch =
        imgTag.match(/\b(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i) ||
        imgTag.match(/\bsrcset=["']([^"',\s]+)/i);
      const resolved = srcMatch?.[1]
        ? resolveImageUrl(srcMatch[1], baseUrl)
        : null;
      if (!resolved) return ' ';
      if (!seenImgs.has(resolved) && candidateImages.length < 24) {
        seenImgs.add(resolved);
        candidateImages.push(resolved);
      }
      return ` [IMG: ${resolved}] `;
    });

    // Preserve block boundaries for cleaner card separation
    working = working
      .replace(/<\/(h[1-6]|p|li|article|section|div|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ');

    const lines = decodeHtmlEntities(working)
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1);

    return {
      digest: lines.join('\n').slice(0, 9000),
      candidateImages,
    };
  }

  private async extractWithVerndlyAi(
    html: string,
    pageUrl: URL,
    categories: string[],
    mode: WebsiteImportMode,
  ): Promise<WhatsAppPreviewItem[]> {
    if (!this.geminiService.isConfigured()) return [];

    const { digest, candidateImages } = this.buildProductFocusedDomDigest(
      html,
      pageUrl,
    );
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
      '5. Match each product with its corresponding `[IMG: https://...]` URL from the page.',
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
              condition: {
                type: 'STRING',
                enum: ['new', 'used', 'refurbished'],
              },
              brand: { type: 'STRING' },
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
              `Candidate Product Image URLs:\n${candidateImages.join('\n') || '(none)'}`,
              `Structured Page Content:\n${digest}`,
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ],
        responseSchema,
        temperature: 0.1,
      });

      const allowedImages = new Set(candidateImages);
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

        const pickedImages = Array.isArray(p.image_urls)
          ? p.image_urls
              .filter(
                (u): u is string =>
                  typeof u === 'string' && allowedImages.has(u),
              )
              .slice(0, 3)
          : [];
        const finalImages =
          pickedImages.length > 0
            ? pickedImages
            : mode === 'single' && candidateImages.length > 0
              ? candidateImages.slice(0, 1)
              : [];

        const desc = asString(p.description).trim().slice(0, 900);
        items.push({
          tempId: `web_ai_${i}_${Date.now()}`,
          title,
          description: desc,
          price,
          original_price: orig,
          currency: asString(p.currency, 'GHS').trim().toUpperCase() || 'GHS',
          category: matchCategoryName(
            typeof p.category === 'string' ? p.category : undefined,
            categories,
          ),
          condition:
            p.condition === 'used' || p.condition === 'refurbished'
              ? p.condition
              : 'new',
          quantity_available: 1,
          brand: asString(p.brand).trim().slice(0, 60),
          tags: Array.isArray(p.tags)
            ? p.tags
                .map((t) => asString(t).trim().toLowerCase())
                .filter(Boolean)
                .slice(0, 6)
            : [],
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

  async commitImport(userId: string, items: WhatsAppCommitItemInput[]) {
    return this.whatsappCatalog.commitImport(userId, items);
  }
}
