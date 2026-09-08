import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

/**
 * Modern Google-Style Product Poster & Social Card Generator
 *
 *   GET /api/cards/product/<productId>?theme=dark|light&format=portrait|landscape
 *
 * Modern Google Store / Material Design aesthetic:
 *  - High-clarity typography with zero missing glyphs (clean "GH¢ " currency formatting)
 *  - Sculptural product showcase stage with seamless studio backdrop
 *  - Material You pill chips for specs and categories
 *  - Google Store-style pill CTA button and proud price lockup
 *  - Portrait: 1080×1350 (4:5 poster ratio, WhatsApp Status, Instagram Post/Story, TikTok)
 *  - Landscape: 1200×630 (16:9 social ratio, Twitter/X cards, WhatsApp links, iMessage, Facebook)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

interface Product {
  id: string;
  title: string;
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
    user?: { is_pro?: boolean | null } | null;
  } | null;
}

async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json && typeof json === "object" && "data" in json
      ? (json as any).data
      : json) as Product;
  } catch {
    return null;
  }
}

async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Verndly-Card-Renderer/1.0" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function getPriceComponents(price: string | number, currency?: string | null) {
  const code = (currency || "GHS").toUpperCase();
  const symbol =
    code === "GHS"
      ? "GH¢"
      : code === "USD"
        ? "$"
        : code === "EUR"
          ? "€"
          : code === "GBP"
            ? "£"
            : code;
  const n = Number(price);
  const formattedNumber = Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(price);
  return { symbol, formattedNumber, full: `${symbol} ${formattedNumber}` };
}

function errorImage(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0c0e",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 60,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: -1,
            display: "flex",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#9ca3af",
            marginTop: 12,
            display: "flex",
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const searchParams = req.nextUrl.searchParams;
  const themeParam = searchParams.get("theme") || "dark";
  const formatParam = searchParams.get("format") || "portrait";

  const isDark = themeParam !== "light";
  const isLandscape = formatParam === "landscape";

  const product = await fetchProduct(id);
  if (!product) {
    return errorImage(
      "Product Not Found",
      "Unable to load product specifications.",
    );
  }

  // Fetch product photo and seller avatar
  const remoteUrl = product.image_urls?.[0];
  const [imageData, sellerLogoData] = await Promise.all([
    remoteUrl ? fetchImageAsDataUri(remoteUrl) : Promise.resolve(null),
    product.seller?.logo_url
      ? fetchImageAsDataUri(product.seller.logo_url)
      : Promise.resolve(null),
  ]);

  // Modern Price Formatting (Zero missing tofu glyphs)
  const price = getPriceComponents(product.price, product.currency);
  const numPrice = Number(product.price);
  const numOriginal =
    product.original_price != null ? Number(product.original_price) : null;
  const hasDiscount = Boolean(
    numOriginal && numOriginal > numPrice && numPrice > 0,
  );
  const discountPercent =
    hasDiscount && numOriginal
      ? Math.round(((numOriginal - numPrice) / numOriginal) * 100)
      : 0;
  const originalPrice =
    hasDiscount && numOriginal
      ? getPriceComponents(numOriginal, product.currency)
      : null;

  const storeName = product.seller?.store_name || "Verified Merchant";
  const isPro = Boolean(product.seller?.user?.is_pro);
  const safeTitle =
    product.title.length > 55
      ? `${product.title.slice(0, 52).trimEnd()}…`
      : product.title;

  const category = (product.category || "Featured Listing").toUpperCase();
  const location = (product.seller?.location || "Accra, Ghana").toUpperCase();

  // Modern Google-Style Palette Tokens
  const c = isDark
    ? {
        canvasBg: "#0c0d10",
        cardBg: "#131519",
        cardBorder: "rgba(255, 255, 255, 0.09)",
        stageBg: "#ffffff",
        stageBorder: "rgba(255, 255, 255, 0.08)",
        badgeBg: "#1c2026",
        badgeBorder: "rgba(255, 255, 255, 0.08)",
        badgeText: "#f1f3f4",
        textPrimary: "#f8f9fa",
        textSecondary: "#9aa0a6",
        textTertiary: "#5f6368",
        currencyText: "#ef4444",
        accent: "#ef4444",
        pillBg: "#1e2229",
        pillBorder: "rgba(255, 255, 255, 0.08)",
        pillText: "#e8eaed",
        actionBarBg: "#181b20",
        actionBarBorder: "rgba(255, 255, 255, 0.08)",
        ctaBg: "#ef4444",
        ctaText: "#ffffff",
      }
    : {
        canvasBg: "#edf0f4",
        cardBg: "#ffffff",
        cardBorder: "rgba(0, 0, 0, 0.07)",
        stageBg: "#ffffff",
        stageBorder: "rgba(0, 0, 0, 0.06)",
        badgeBg: "#f1f3f4",
        badgeBorder: "rgba(0, 0, 0, 0.06)",
        badgeText: "#202124",
        textPrimary: "#202124",
        textSecondary: "#5f6368",
        textTertiary: "#80868b",
        currencyText: "#ef4444",
        accent: "#ef4444",
        pillBg: "#f1f3f4",
        pillBorder: "rgba(0, 0, 0, 0.06)",
        pillText: "#3c4043",
        actionBarBg: "#f8f9fa",
        actionBarBorder: "rgba(0, 0, 0, 0.07)",
        ctaBg: "#202124",
        ctaText: "#ffffff",
      };

  // Structured specification pills (Material You Chips)
  const attrs = product.attributes || {};
  const chips: string[] = [];
  if (product.brand) chips.push(product.brand);
  if (attrs.dietary_info) chips.push(String(attrs.dietary_info));
  if (attrs.food_type) chips.push(String(attrs.food_type));
  if (attrs.size) chips.push(`Size: ${attrs.size}`);
  if (attrs.color) chips.push(`Color: ${attrs.color}`);
  if (attrs.material) chips.push(String(attrs.material));
  if (attrs.storage) chips.push(String(attrs.storage));
  if (attrs.quantity_unit) chips.push(String(attrs.quantity_unit));

  // Dynamic fallback for custom attributes
  if (chips.length < 3) {
    for (const [k, v] of Object.entries(attrs)) {
      if (
        v &&
        typeof v === "string" &&
        !chips.includes(v) &&
        !["expiry", "delivery_until"].includes(k)
      ) {
        chips.push(v.length > 20 ? `${v.slice(0, 18)}…` : v);
        if (chips.length >= 3) break;
      }
    }
  }

  if (product.condition && product.condition.toLowerCase() !== "new") {
    chips.push(product.condition);
  }
  chips.push("In Stock");

  const width = isLandscape ? 1200 : 1080;
  const height = isLandscape ? 630 : 1350;

  try {
    const imgRes = new ImageResponse(
      isLandscape ? (
        // ────────────────── LANDSCAPE 1200×630 (OG / Social Card) ──────────────────
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundColor: c.canvasBg,
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: 24,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              backgroundColor: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 32,
              overflow: "hidden",
            }}
          >
            {/* Left Column: Product Showcase Stage */}
            <div
              style={{
                width: 480,
                height: "100%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.stageBg,
                borderRight: `1px solid ${c.cardBorder}`,
                padding: 24,
              }}
            >
              {imageData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageData}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 24,
                    color: c.textTertiary,
                    display: "flex",
                  }}
                >
                  Product Photo
                </div>
              )}

              {/* Discount pill */}
              {hasDiscount && (
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: c.accent,
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                  }}
                >
                  {`SAVE ${discountPercent}%`}
                </div>
              )}
            </div>

            {/* Right Column: Information & Pricing */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "32px 36px",
              }}
            >
              {/* Header: Verndly & Store Info */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                {/* Verndly Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: c.badgeBg,
                    border: `1px solid ${c.badgeBorder}`,
                    padding: "6px 14px",
                    borderRadius: 999,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 100 100"
                    fill="none"
                  >
                    <circle cx="27" cy="33" r="14" fill="#ef4444" />
                    <rect
                      x="37"
                      y="16"
                      width="28"
                      height="74"
                      rx="14"
                      transform="rotate(-36 51 53)"
                      fill="#ef4444"
                    />
                  </svg>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: 1.2,
                      color: c.badgeText,
                      display: "flex",
                    }}
                  >
                    VERNDLY
                  </span>
                </div>

                {/* Seller Store Badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: c.badgeBg,
                    border: `1px solid ${c.badgeBorder}`,
                    padding: "4px 12px 4px 6px",
                    borderRadius: 999,
                  }}
                >
                  {sellerLogoData ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sellerLogoData}
                      alt=""
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        backgroundColor: c.accent,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {storeName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: c.textPrimary,
                      display: "flex",
                    }}
                  >
                    {storeName}
                  </span>
                  {isPro && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        backgroundColor: c.accent,
                        color: "#ffffff",
                        padding: "2px 6px",
                        borderRadius: 999,
                        display: "flex",
                      }}
                    >
                      PRO
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Metadata */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: c.textSecondary,
                    display: "flex",
                  }}
                >
                  {`${category}  •  ${location}`}
                </div>
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    letterSpacing: -1,
                    lineHeight: 1.15,
                    color: c.textPrimary,
                    display: "flex",
                  }}
                >
                  {safeTitle}
                </div>

                {/* Specs chips */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 4,
                  }}
                >
                  {chips.slice(0, 3).map((chip) => (
                    <div
                      key={chip}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        backgroundColor: c.pillBg,
                        color: c.pillText,
                        border: `1px solid ${c.pillBorder}`,
                        padding: "5px 14px",
                        borderRadius: 999,
                        display: "flex",
                      }}
                    >
                      {chip}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price & Pill CTA Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: c.actionBarBg,
                  border: `1px solid ${c.actionBarBorder}`,
                  borderRadius: 24,
                  padding: "14px 22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: c.currencyText,
                      display: "flex",
                    }}
                  >
                    {price.symbol}
                  </span>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 800,
                      letterSpacing: -1.2,
                      color: c.textPrimary,
                      display: "flex",
                    }}
                  >
                    {price.formattedNumber}
                  </span>
                  {originalPrice && (
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 500,
                        textDecoration: "line-through",
                        color: c.textTertiary,
                        display: "flex",
                        marginLeft: 8,
                      }}
                    >
                      {originalPrice.full}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: c.ctaBg,
                    color: c.ctaText,
                    padding: "10px 20px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <span>Order Now</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </div>
              </div>

              {/* Trust Footer */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  color: c.textTertiary,
                  fontWeight: 500,
                  marginTop: -6,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ display: "flex" }}>
                    Verndly Escrow Protected
                  </span>
                </div>
                <span style={{ display: "flex" }}>•</span>
                <span style={{ display: "flex" }}>
                  Verified Independent Merchant
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ────────────────── PORTRAIT 1080×1350 (Google-Style Poster) ──────────────────
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundColor: c.canvasBg,
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: 36,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 44,
              overflow: "hidden",
              padding: 32,
              justifyContent: "space-between",
            }}
          >
            {/* Top Header Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                height: 52,
                marginBottom: 16,
              }}
            >
              {/* Verndly Brand Tag */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: c.badgeBg,
                  border: `1px solid ${c.badgeBorder}`,
                  padding: "8px 18px",
                  borderRadius: 999,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <circle cx="27" cy="33" r="14" fill="#ef4444" />
                  <rect
                    x="37"
                    y="16"
                    width="28"
                    height="74"
                    rx="14"
                    transform="rotate(-36 51 53)"
                    fill="#ef4444"
                  />
                </svg>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    color: c.badgeText,
                    display: "flex",
                  }}
                >
                  VERNDLY MARKETPLACE
                </span>
              </div>

              {/* Merchant Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: c.badgeBg,
                  border: `1px solid ${c.badgeBorder}`,
                  padding: "6px 16px 6px 8px",
                  borderRadius: 999,
                }}
              >
                {sellerLogoData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sellerLogoData}
                    alt=""
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      backgroundColor: c.accent,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    {storeName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: c.textPrimary,
                    display: "flex",
                  }}
                >
                  {storeName}
                </span>
                {isPro && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      backgroundColor: c.accent,
                      color: "#ffffff",
                      padding: "3px 8px",
                      borderRadius: 999,
                      display: "flex",
                    }}
                  >
                    PRO
                  </span>
                )}
              </div>
            </div>

            {/* Center Product Showcase Stage */}
            <div
              style={{
                width: "100%",
                height: 660,
                borderRadius: 32,
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.stageBg,
                border: `1px solid ${c.stageBorder}`,
                padding: 28,
              }}
            >
              {imageData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageData}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: 32,
                    color: c.textTertiary,
                    display: "flex",
                  }}
                >
                  Product Photo Unavailable
                </div>
              )}

              {/* Category Pill Floating */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: 20,
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "rgba(18, 20, 24, 0.8)",
                  color: "#ffffff",
                  padding: "6px 16px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                }}
              >
                {category}
              </div>

              {/* Discount Pill Floating */}
              {hasDiscount && (
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: c.accent,
                    color: "#ffffff",
                    padding: "8px 18px",
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                  }}
                >
                  {`SAVE ${discountPercent}%`}
                </div>
              )}
            </div>

            {/* Bottom Section: Title, Specs & Price Bar */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                paddingTop: 18,
                gap: 14,
              }}
            >
              {/* Category & Location Subtitle */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2.5,
                  textTransform: "uppercase",
                  color: c.textSecondary,
                  display: "flex",
                }}
              >
                {`${category}  •  ${location}`}
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 800,
                  letterSpacing: -1.5,
                  lineHeight: 1.15,
                  color: c.textPrimary,
                  display: "flex",
                }}
              >
                {safeTitle}
              </div>

              {/* Material You Chips Rail */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {chips.slice(0, 4).map((chip) => (
                  <div
                    key={chip}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      backgroundColor: c.pillBg,
                      color: c.pillText,
                      border: `1px solid ${c.pillBorder}`,
                      padding: "7px 18px",
                      borderRadius: 999,
                      display: "flex",
                    }}
                  >
                    {chip}
                  </div>
                ))}
              </div>

              {/* High-Impact Price & Pill CTA Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: c.actionBarBg,
                  border: `1px solid ${c.actionBarBorder}`,
                  borderRadius: 28,
                  padding: "16px 28px",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: c.currencyText,
                      display: "flex",
                    }}
                  >
                    {price.symbol}
                  </span>
                  <span
                    style={{
                      fontSize: 52,
                      fontWeight: 800,
                      letterSpacing: -1.8,
                      color: c.textPrimary,
                      display: "flex",
                    }}
                  >
                    {price.formattedNumber}
                  </span>
                  {originalPrice && (
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 500,
                        textDecoration: "line-through",
                        color: c.textTertiary,
                        display: "flex",
                        marginLeft: 8,
                      }}
                    >
                      {originalPrice.full}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: c.ctaBg,
                    color: c.ctaText,
                    padding: "14px 28px",
                    borderRadius: 999,
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  <span>Order on verndly.com</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </div>
              </div>

              {/* Security and Buyer Trust Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  fontSize: 12,
                  color: c.textTertiary,
                  fontWeight: 500,
                  letterSpacing: 0.3,
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ display: "flex" }}>
                    100% Buyer Protected
                  </span>
                </div>
                <span style={{ display: "flex" }}>•</span>
                <span style={{ display: "flex" }}>
                  Direct WhatsApp & In-App Chat
                </span>
                <span style={{ display: "flex" }}>•</span>
                <span style={{ display: "flex" }}>
                  Official Express Delivery
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width,
        height,
      },
    );

    const buf = await imgRes.arrayBuffer();

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control":
          "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    console.error("[product-card] render failed:", err);
    return errorImage(
      "Unable to Generate Card",
      "Please refresh to retry rendering.",
    );
  }
}
