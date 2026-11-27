import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPublicBrand } from '@/lib/brand-guard';

/**
 * Verndly Studio Product Card Generator (Apple / Nike Editorial Style)
 *
 *   GET /api/cards/product/<productId>?theme=light|dark&format=portrait|landscape
 *       &fit=cover|contain&photo=0&badge=...&title=...&tagline=...&blurb=...&cta=...
 *
 * Engineered for effortless mobile legibility on WhatsApp Status, Instagram Stories,
 * TikTok, X/Twitter, and OpenGraph link previews:
 *  - Bundled Inter static weights (500 / 600 / 700 / 800) with crisp tight tracking
 *  - Large, eye-friendly typography (58px titles, 44px prices, 34px CTAs on 1080×1350)
 *  - Floating rounded studio card over soft cyclorama canvas with ambient depth
 *  - Full-bleed rounded hero image with frosted glass badge & circular store/Verndly mark
 *  - Optional Verndly AI editorial headline, tagline, blurb, badge, and CTA overrides
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

interface Product {
  id: string;
  title: string;
  description?: string | null;
  price: string | number;
  original_price?: string | number | null;
  currency?: string | null;
  condition?: string | null;
  category?: string | null;
  brand?: string | null;
  image_urls?: string[];
  tags?: string[];
  attributes?: Record<string, string | number | null> | null;
  seller?: {
    store_name?: string | null;
    store_link?: string | null;
    logo_url?: string | null;
    service_area?: string | null;
    location?: string | null;
    user?: { is_pro?: boolean | null; is_verified?: boolean | null } | null;
  } | null;
}

type LoadedFont = {
  name: string;
  data: Buffer;
  weight: 500 | 600 | 700 | 800;
  style: 'normal';
};

let fontsPromise: Promise<LoadedFont[]> | null = null;

function loadInterFonts(): Promise<LoadedFont[]> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
      const specs: Array<{ file: string; weight: 500 | 600 | 700 | 800 }> = [
        { file: 'Inter-Medium.ttf', weight: 500 },
        { file: 'Inter-SemiBold.ttf', weight: 600 },
        { file: 'Inter-Bold.ttf', weight: 700 },
        { file: 'Inter-ExtraBold.ttf', weight: 800 },
      ];
      const loaded: LoadedFont[] = [];
      for (const spec of specs) {
        try {
          const data = await readFile(path.join(fontsDir, spec.file));
          loaded.push({
            name: 'Inter',
            data,
            weight: spec.weight,
            style: 'normal',
          });
        } catch {
          // Graceful fallback if a font file is absent in a partial test environment
        }
      }
      return loaded;
    })();
  }
  return fontsPromise;
}

async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (
      json && typeof json === 'object' && 'data' in json ? (json as { data: Product }).data : json
    ) as Product;
  } catch {
    return null;
  }
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Verndly-Card-Renderer/2.0' },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

function cleanParam(val: string | null, maxLen: number): string | null {
  if (!val) return null;
  const cleaned = val.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1).trimEnd()}…` : cleaned;
}

function formatPriceText(price: string | number, currency?: string | null) {
  const code = (currency || 'GHS').toUpperCase();
  const symbol =
    code === 'GHS'
      ? 'GH¢'
      : code === 'USD'
        ? '$'
        : code === 'EUR'
          ? '€'
          : code === 'GBP'
            ? '£'
            : `${code} `;
  const n = Number(price);
  if (!Number.isFinite(n)) {
    return `${symbol}${price}`;
  }
  const hasDecimals = Math.abs(n - Math.round(n)) > 0.001;
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
  return code === 'GHS' ? `${symbol} ${formatted}` : `${symbol}${formatted}`;
}

function buildSmartFallbackCopy(product: Product, hasDiscount: boolean, discountPercent: number) {
  const publicBrand = getPublicBrand(product.brand, product.seller);
  const storeName = product.seller?.store_name?.trim() || 'Verified Verndly Store';
  const category = product.category?.trim() || 'Featured';

  const badge = hasDiscount
    ? `Save ${discountPercent}%`
    : product.seller?.user?.is_pro
      ? 'Featured'
      : product.condition && product.condition.toLowerCase() !== 'new'
        ? product.condition.charAt(0).toUpperCase() + product.condition.slice(1).toLowerCase()
        : 'Best Seller';

  const headline =
    product.title.length > 36 ? `${product.title.slice(0, 33).trimEnd()}…` : product.title;

  const tagline = publicBrand ? `By ${publicBrand} · ${storeName}` : `Curated by ${storeName}`;

  const rawDesc = (product.description || '').replace(/\s+/g, ' ').trim();
  const isWeakDesc =
    !rawDesc ||
    rawDesc.length < 24 ||
    /^(it is nice|nice|good|quality|available|dm to order)\.?$/i.test(rawDesc);

  const blurb = isWeakDesc
    ? `Shop authentic ${category.toLowerCase()} from ${storeName} with 3-day Paystack escrow protection.`
    : rawDesc.length > 96
      ? `${rawDesc.slice(0, 93).trimEnd()}…`
      : rawDesc;

  return { badge, headline, tagline, blurb, cta: 'Buy Now' };
}

function VerndlyMark({ size = 40, color = '#B91C1C' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="27" cy="33" r="14" fill={color} />
      <rect
        x="37"
        y="16"
        width="28"
        height="74"
        rx="14"
        transform="rotate(-36 51 53)"
        fill={color}
      />
    </svg>
  );
}

function ArrowUpRightIcon({ size = 26, color = '#0A0A0A' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function errorImage(title: string, subtitle: string, fonts: LoadedFont[]) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F2F5',
        color: '#0A0A0A',
        fontFamily: fonts.length ? 'Inter, sans-serif' : 'system-ui, sans-serif',
        padding: 72,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1.5, display: 'flex' }}>
        {title}
      </div>
      <div style={{ fontSize: 28, color: '#64748B', marginTop: 18, display: 'flex' }}>
        {subtitle}
      </div>
    </div>,
    {
      width: 1080,
      height: 1350,
      ...(fonts.length ? { fonts } : {}),
    },
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const searchParams = req.nextUrl.searchParams;

  const themeParam = searchParams.get('theme') || 'light';
  const formatParam = searchParams.get('format') || 'portrait';
  const fitParam = searchParams.get('fit') || 'cover';
  const photoIndexParam = Number(searchParams.get('photo') || '0');

  const isDark = themeParam === 'dark';
  const isLandscape = formatParam === 'landscape';
  const imageFit: 'cover' | 'contain' = fitParam === 'contain' ? 'contain' : 'cover';

  const [product, fonts] = await Promise.all([fetchProduct(id), loadInterFonts()]);
  if (!product) {
    return errorImage('Product Not Found', 'This listing could not be loaded.', fonts);
  }

  const images = Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : [];
  const safePhotoIndex =
    Number.isFinite(photoIndexParam) && photoIndexParam >= 0 && photoIndexParam < images.length
      ? photoIndexParam
      : 0;
  const activePhotoUrl = images[safePhotoIndex] || images[0] || null;

  const [imageData, sellerLogoData] = await Promise.all([
    activePhotoUrl ? fetchImageAsDataUri(activePhotoUrl) : Promise.resolve(null),
    product.seller?.logo_url ? fetchImageAsDataUri(product.seller.logo_url) : Promise.resolve(null),
  ]);

  const numPrice = Number(product.price);
  const numOriginal = product.original_price != null ? Number(product.original_price) : null;
  const hasDiscount = Boolean(
    numOriginal &&
    Number.isFinite(numOriginal) &&
    Number.isFinite(numPrice) &&
    numOriginal > numPrice &&
    numPrice > 0,
  );
  const discountPercent =
    hasDiscount && numOriginal ? Math.round(((numOriginal - numPrice) / numOriginal) * 100) : 0;

  const formattedPrice = formatPriceText(product.price, product.currency);
  const formattedOriginal =
    hasDiscount && numOriginal ? formatPriceText(numOriginal, product.currency) : null;

  const fallbackCopy = buildSmartFallbackCopy(product, hasDiscount, discountPercent);

  const badgeText = cleanParam(searchParams.get('badge'), 20) || fallbackCopy.badge;
  const headlineText = cleanParam(searchParams.get('title'), 42) || fallbackCopy.headline;
  const taglineText = cleanParam(searchParams.get('tagline'), 44) || fallbackCopy.tagline;
  const blurbText = cleanParam(searchParams.get('blurb'), 110) || fallbackCopy.blurb;
  const ctaText = cleanParam(searchParams.get('cta'), 16) || fallbackCopy.cta;

  const storeName = product.seller?.store_name?.trim() || 'Verndly Store';
  const storeUrlLabel = product.seller?.store_link
    ? `verndly.com/s/${product.seller.store_link}`
    : 'verndly.com';
  const dotCount = images.length > 1 ? Math.min(images.length, 5) : 0;

  // Dynamic font sizes so short headlines go MASSIVE and longer ones never clip
  const portraitTitleSize = headlineText.length <= 22 ? 58 : headlineText.length <= 32 ? 50 : 44;
  const portraitPriceSize = formattedPrice.length <= 9 ? 44 : formattedPrice.length <= 12 ? 38 : 34;

  const landscapeTitleSize = headlineText.length <= 22 ? 46 : headlineText.length <= 32 ? 40 : 35;
  const landscapePriceSize = formattedPrice.length <= 9 ? 36 : 30;

  const fontFamily = fonts.length
    ? 'Inter, system-ui, -apple-system, sans-serif'
    : 'system-ui, -apple-system, sans-serif';

  // Studio Light (exact Apple / Nike inspo aesthetic) & Obsidian Dark tokens
  const t = isDark
    ? {
        canvasBg: '#09090B',
        cardBg: '#141418',
        cardShadow: '0 40px 96px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        photoBg: '#1C1C22',
        badgeBg: 'rgba(10, 10, 14, 0.62)',
        badgeBorder: 'rgba(255, 255, 255, 0.18)',
        badgeText: '#FFFFFF',
        logoBg: '#FFFFFF',
        titleText: '#FAFAFA',
        taglineText: '#A1A1AA',
        blurbText: '#8E929B',
        pricePillBg: '#23232B',
        priceText: '#FFFFFF',
        strikeText: '#71717A',
        ctaBg: '#FFFFFF',
        ctaText: '#0A0A0A',
        ctaCircleBg: '#0A0A0A',
        ctaArrowColor: '#FFFFFF',
        footerText: '#A1A1AA',
        footerStrong: '#FAFAFA',
      }
    : {
        canvasBg: '#F1F2F5',
        cardBg: '#FFFFFF',
        cardShadow: '0 40px 90px rgba(15, 23, 42, 0.13), 0 10px 28px rgba(15, 23, 42, 0.06)',
        photoBg: '#F4F4F6',
        badgeBg: 'rgba(28, 28, 32, 0.48)',
        badgeBorder: 'rgba(255, 255, 255, 0.24)',
        badgeText: '#FFFFFF',
        logoBg: '#FFFFFF',
        titleText: '#0A0A0A',
        taglineText: '#6E737D',
        blurbText: '#858B96',
        pricePillBg: '#F2F3F6',
        priceText: '#0A0A0A',
        strikeText: '#9CA3AF',
        ctaBg: '#0A0A0A',
        ctaText: '#FFFFFF',
        ctaCircleBg: '#FFFFFF',
        ctaArrowColor: '#0A0A0A',
        footerText: '#64748B',
        footerStrong: '#0A0A0A',
      };

  const width = isLandscape ? 1200 : 1080;
  const height = isLandscape ? 630 : 1350;

  try {
    const imgRes = new ImageResponse(
      isLandscape ? (
        // ────────────────── LANDSCAPE 1200×630 (OG / Social Preview) ──────────────────
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundColor: t.canvasBg,
            fontFamily,
            padding: '28px 34px',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'row',
              backgroundColor: t.cardBg,
              borderRadius: 42,
              padding: 22,
              boxShadow: t.cardShadow,
            }}
          >
            {/* Left Rounded Hero Photo */}
            <div
              style={{
                width: 492,
                height: '100%',
                borderRadius: 30,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.photoBg,
                padding: imageFit === 'contain' ? 24 : 0,
              }}
            >
              {imageData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageData}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: imageFit,
                  }}
                />
              ) : (
                <div style={{ fontSize: 28, fontWeight: 600, color: t.blurbText, display: 'flex' }}>
                  Product Photo
                </div>
              )}

              {/* Subtle Bottom Scrim */}
              {imageFit === 'cover' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 120,
                    backgroundImage:
                      'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.36) 100%)',
                    display: 'flex',
                  }}
                />
              )}

              {/* Top-Left Frosted Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 20,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: hasDiscount ? '#B91C1C' : t.badgeBg,
                  border: `1px solid ${hasDiscount ? 'rgba(255,255,255,0.22)' : t.badgeBorder}`,
                  color: t.badgeText,
                  padding: '10px 22px',
                  borderRadius: 999,
                  fontSize: 21,
                  fontWeight: 600,
                  letterSpacing: -0.2,
                }}
              >
                {badgeText}
              </div>

              {/* Top-Right Circular Brand / Store Emblem */}
              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  width: 68,
                  height: 68,
                  borderRadius: 999,
                  backgroundColor: t.logoBg,
                  boxShadow: '0 8px 22px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {sellerLogoData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sellerLogoData}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <VerndlyMark size={38} color="#B91C1C" />
                )}
              </div>

              {/* Bottom Pagination Dots */}
              {dotCount > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 18,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {Array.from({ length: dotCount }).map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: idx === safePhotoIndex ? 12 : 9,
                        height: idx === safePhotoIndex ? 12 : 9,
                        borderRadius: 999,
                        backgroundColor:
                          idx === safePhotoIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.48)',
                        display: 'flex',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Editorial Stack */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '18px 20px 14px 36px',
              }}
            >
              {/* Brand & Store Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <VerndlyMark size={24} color="#B91C1C" />
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: -0.3,
                      color: t.footerStrong,
                      display: 'flex',
                    }}
                  >
                    {storeName}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    color: t.taglineText,
                    display: 'flex',
                  }}
                >
                  verndly.com
                </span>
              </div>

              {/* Main Copy Block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    fontSize: landscapeTitleSize,
                    fontWeight: 800,
                    letterSpacing: -1.4,
                    lineHeight: 1.08,
                    color: t.titleText,
                    display: 'flex',
                  }}
                >
                  {headlineText}
                </div>
                <div
                  style={{
                    fontSize: 27,
                    fontWeight: 600,
                    letterSpacing: -0.4,
                    lineHeight: 1.2,
                    color: t.taglineText,
                    display: 'flex',
                  }}
                >
                  {taglineText}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: -0.2,
                    lineHeight: 1.38,
                    color: t.blurbText,
                    marginTop: 6,
                    display: 'flex',
                  }}
                >
                  {blurbText}
                </div>
              </div>

              {/* Price Pill + Buy Now CTA Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                    backgroundColor: t.pricePillBg,
                    padding: '16px 30px',
                    borderRadius: 999,
                  }}
                >
                  <span
                    style={{
                      fontSize: landscapePriceSize,
                      fontWeight: 800,
                      letterSpacing: -1,
                      color: t.priceText,
                      display: 'flex',
                    }}
                  >
                    {formattedPrice}
                  </span>
                  {formattedOriginal && (
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        textDecoration: 'line-through',
                        color: t.strikeText,
                        display: 'flex',
                      }}
                    >
                      {formattedOriginal}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    backgroundColor: t.ctaBg,
                    color: t.ctaText,
                    padding: '10px 12px 10px 28px',
                    borderRadius: 999,
                  }}
                >
                  <span
                    style={{
                      fontSize: 25,
                      fontWeight: 700,
                      letterSpacing: -0.4,
                      display: 'flex',
                    }}
                  >
                    {ctaText}
                  </span>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      backgroundColor: t.ctaCircleBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowUpRightIcon size={22} color={t.ctaArrowColor} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ────────────────── PORTRAIT 1080×1350 (Studio Card — Inspo Architecture) ──────────────────
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: t.canvasBg,
            fontFamily,
            padding: '54px 62px 38px 62px',
          }}
        >
          {/* Floating Studio Product Card */}
          <div
            style={{
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: t.cardBg,
              borderRadius: 56,
              padding: 28,
              boxShadow: t.cardShadow,
            }}
          >
            {/* Top Full-Bleed Rounded Hero Photo */}
            <div
              style={{
                width: '100%',
                height: 678,
                borderRadius: 38,
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.photoBg,
                padding: imageFit === 'contain' ? 32 : 0,
              }}
            >
              {imageData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageData}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: imageFit,
                  }}
                />
              ) : (
                <div style={{ fontSize: 34, fontWeight: 600, color: t.blurbText, display: 'flex' }}>
                  Product Photo Unavailable
                </div>
              )}

              {/* Subtle bottom vignette so pagination dots always stay crisp */}
              {imageFit === 'cover' && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 150,
                    backgroundImage:
                      'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.42) 100%)',
                    display: 'flex',
                  }}
                />
              )}

              {/* Top-Left Frosted Glass Badge (e.g. "Best Seller" / "Save 20%") */}
              <div
                style={{
                  position: 'absolute',
                  top: 26,
                  left: 26,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: hasDiscount ? '#B91C1C' : t.badgeBg,
                  border: `1px solid ${hasDiscount ? 'rgba(255,255,255,0.22)' : t.badgeBorder}`,
                  color: t.badgeText,
                  padding: '14px 30px',
                  borderRadius: 999,
                  fontSize: 27,
                  fontWeight: 600,
                  letterSpacing: -0.3,
                }}
              >
                {badgeText}
              </div>

              {/* Top-Right Circular Store / Verndly Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  right: 24,
                  width: 92,
                  height: 92,
                  borderRadius: 999,
                  backgroundColor: t.logoBg,
                  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {sellerLogoData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sellerLogoData}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <VerndlyMark size={52} color="#B91C1C" />
                )}
              </div>

              {/* Bottom-Center Carousel Dots (when multi-photo listing) */}
              {dotCount > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 24,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  {Array.from({ length: dotCount }).map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: idx === safePhotoIndex ? 14 : 11,
                        height: idx === safePhotoIndex ? 14 : 11,
                        borderRadius: 999,
                        backgroundColor:
                          idx === safePhotoIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.45)',
                        display: 'flex',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Editorial Copy + Massive Price / CTA Row */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '34px 24px 16px 24px',
              }}
            >
              {/* Title, Punchy Tagline & Crisp 2-Line Blurb */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: portraitTitleSize,
                    fontWeight: 800,
                    letterSpacing: -1.8,
                    lineHeight: 1.08,
                    color: t.titleText,
                    display: 'flex',
                  }}
                >
                  {headlineText}
                </div>

                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 600,
                    letterSpacing: -0.6,
                    lineHeight: 1.2,
                    color: t.taglineText,
                    marginTop: 10,
                    display: 'flex',
                  }}
                >
                  {taglineText}
                </div>

                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 500,
                    letterSpacing: -0.3,
                    lineHeight: 1.38,
                    color: t.blurbText,
                    marginTop: 22,
                    display: 'flex',
                  }}
                >
                  {blurbText}
                </div>
              </div>

              {/* Price Capsule + Buy Now Arrow Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 20,
                  marginTop: 24,
                }}
              >
                {/* Left Tonal Price Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 12,
                    backgroundColor: t.pricePillBg,
                    padding: '22px 38px',
                    borderRadius: 999,
                  }}
                >
                  <span
                    style={{
                      fontSize: portraitPriceSize,
                      fontWeight: 800,
                      letterSpacing: -1.2,
                      color: t.priceText,
                      display: 'flex',
                    }}
                  >
                    {formattedPrice}
                  </span>
                  {formattedOriginal && (
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 600,
                        textDecoration: 'line-through',
                        color: t.strikeText,
                        display: 'flex',
                      }}
                    >
                      {formattedOriginal}
                    </span>
                  )}
                </div>

                {/* Right High-Contrast CTA Pill */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    backgroundColor: t.ctaBg,
                    color: t.ctaText,
                    padding: '14px 16px 14px 38px',
                    borderRadius: 999,
                  }}
                >
                  <span
                    style={{
                      fontSize: 33,
                      fontWeight: 700,
                      letterSpacing: -0.6,
                      display: 'flex',
                    }}
                  >
                    {ctaText}
                  </span>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 999,
                      backgroundColor: t.ctaCircleBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowUpRightIcon size={28} color={t.ctaArrowColor} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Verndly Attribution Strip Below Floating Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              marginTop: 24,
            }}
          >
            <VerndlyMark size={24} color="#B91C1C" />
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: -0.3,
                color: t.footerStrong,
                display: 'flex',
              }}
            >
              {storeUrlLabel}
            </span>
            <span style={{ fontSize: 22, color: t.footerText, display: 'flex' }}>•</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: t.footerText,
                display: 'flex',
              }}
            >
              3-Day Escrow Protected
            </span>
          </div>
        </div>
      ),
      {
        width,
        height,
        ...(fonts.length ? { fonts } : {}),
      },
    );

    const buf = await imgRes.arrayBuffer();

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: unknown) {
    console.error('[product-card] render failed:', err);
    return errorImage('Unable to Generate Card', 'Please refresh to retry rendering.', fonts);
  }
}
