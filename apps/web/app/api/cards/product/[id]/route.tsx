import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Pro-only shareable product card.
 *
 *   GET /api/cards/product/<productId>
 *
 * Returns a 1200×630 PNG with:
 *  - Product photo (left half)
 *  - Vendly logo (top-right corner of the info panel)
 *  - Seller logo + store name (below the Vendly branding)
 *  - Product title + price
 *  - "Shop now" CTA
 *
 * The download button lives in ShareProductCardModal on the frontend.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

/**
 * Render-scale multiplier. 2 = retina quality (2400×1260). Every numeric
 * dimension below is multiplied by S, so the layout proportions stay
 * identical while the output PNG gets sharper. Bump to 3 for print.
 *
 * File size grows roughly quadratically with S — 2x is ~3–4x the bytes
 * of 1x, which CDN caching makes a non-issue.
 */
const S = 2;
// 4:5 — 1080×1350 base → 2160×2700 retina. Ideal for Instagram portrait.
const CARD_W = 1080 * S;
const CARD_H = 1350 * S;

interface Product {
  id: string;
  title: string;
  price: string | number;
  currency?: string | null;
  image_urls?: string[];
  tags?: string[];
  /**
   * Free-form key/value JSON. Common keys we surface on the card include
   * "size" and "color". Anything else is ignored to keep the layout tight.
   */
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

/**
 * Fetch an image and return it as `data:image/...;base64,...`. Falls back
 * to null on any failure so the caller can render a graceful placeholder
 * instead of crashing the whole route.
 */
async function fetchImageAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Vendly-Card-Renderer/1.0" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Read the Vendly logo from public/logos/vendly.png and return a data URI. */
function getVendlyLogoDataUri(): string | null {
  try {
    const logoPath = join(process.cwd(), "public", "logos", "vendly.png");
    const buf = readFileSync(logoPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Format the price for the share card with the Ghana cedi symbol.
 */
function formatPrice(price: string | number, currency?: string | null) {
  const code = (currency || "GHS").toUpperCase();
  const symbol = code === "GHS" ? "GH₵" : code === "USD" ? "$" : `${code} `;
  const n = Number(price);
  if (!Number.isFinite(n)) return `${symbol}${price}`;
  return `${symbol}${n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

/** PNG of a friendly error so the UI never shows a broken-image icon. */
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
          background:
            "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 60%, #e7e5e4 100%)",
          color: "#0a0a0a",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 64 * S,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 36 * S,
            fontWeight: 600,
            letterSpacing: -1 * S,
            display: "flex",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 22 * S,
            color: "#525252",
            marginTop: 16 * S,
            display: "flex",
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { width: CARD_W, height: CARD_H },
  );
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const product = await fetchProduct(id);
  if (!product) {
    return errorImage("Product not found", "We couldn't load that product.");
  }

  // Inline the product image
  const remoteUrl = product.image_urls?.[0];
  const imageData = remoteUrl ? await fetchImageAsDataUri(remoteUrl) : null;

  // Inline the seller logo
  const sellerLogoUrl = product.seller?.logo_url;
  const sellerLogoData = sellerLogoUrl
    ? await fetchImageAsDataUri(sellerLogoUrl)
    : null;

  // Inline the Vendly logo from /public/logos/vendly.png
  const vendlyLogoData = getVendlyLogoDataUri();

  const priceLabel = formatPrice(product.price, product.currency);
  const storeName = product.seller?.store_name || "Vendly seller";
  const isPro = Boolean(product.seller?.user?.is_pro);
  // Trim the title manually since satori's line-clamp is brittle.
  const safeTitle =
    product.title.length > 80
      ? `${product.title.slice(0, 78).trimEnd()}…`
      : product.title;

  // ─── Detail chips ───────────────────────────────────────────────────
  // Tags (show up to 3, then "+N" overflow chip if more).
  const allTags = (product.tags || []).map((t) => String(t).trim()).filter(Boolean);
  const visibleTags = allTags.slice(0, 3);
  const extraTagCount = Math.max(0, allTags.length - visibleTags.length);

  // Common attribute keys we surface as chips. Falls through silently if
  // a seller hasn't set them — apparel sellers get size/color, electronics
  // sellers might get neither, which is fine.
  const attrs = product.attributes || {};
  const detailChips: Array<{ label: string; value: string }> = [];
  const pushAttr = (label: string, key: string) => {
    const raw = attrs?.[key];
    const val = raw == null ? "" : String(raw).trim();
    if (val) detailChips.push({ label, value: val });
  };
  pushAttr("Size", "size");
  pushAttr("Color", "color");

  // Service area pill — only render when the seller has set one.
  const SERVICE_AREA_LABELS: Record<string, string> = {
    SAME_CITY: "Local · same city",
    NEARBY_STATES: "Nearby regions",
    NATIONWIDE: "Nationwide delivery",
  };
  const serviceAreaLabel = product.seller?.service_area
    ? SERVICE_AREA_LABELS[product.seller.service_area] ||
    String(product.seller.service_area).replace(/_/g, " ").toLowerCase()
    : null;

  // "Free Delivery until DD/MM/YYYY" pill, mirroring the inspiration card.
  // We default the deadline to two weeks out — long enough to feel real,
  // short enough to push urgency. Sellers who want a different window can
  // set `attributes.delivery_until` to an ISO date and we honour it.
  const deliveryUntilRaw = (attrs?.["delivery_until"] as string | undefined) || null;
  const deliveryUntil = (() => {
    const d = deliveryUntilRaw ? new Date(deliveryUntilRaw) : null;
    const target =
      d && !Number.isNaN(d.getTime())
        ? d
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const dd = String(target.getDate()).padStart(2, "0");
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const yy = target.getFullYear();
    return `${dd}/${mm}/${yy}`;
  })();
  const deliveryLabel = serviceAreaLabel
    ? `Free Delivery · ${serviceAreaLabel} · until ${deliveryUntil}`
    : `Free Delivery until ${deliveryUntil}`;

  try {
    return new ImageResponse(
      (
        // Outer canvas — solid black bleed so the card reads cleanly on any
        // share surface. The actual "card" sits inside with rounded corners
        // so the result mirrors the inspiration's softened silhouette.
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundColor: "#000000",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: 40 * S,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#000000",
              border: `${2 * S}px solid #1a1a1a`,
              borderRadius: 56 * S,
              overflow: "hidden",
            }}
          >
            {/* Photo region — ~62% of the card. Rounded only on the inside
                so it tucks under the outer card's border seamlessly. */}
            <div
              style={{
                width: "100%",
                flex: 62,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0a0a0a",
                overflow: "hidden",
              }}
            >
              {imageData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageData}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ fontSize: 32 * S, color: "#525252", display: "flex" }}>
                  No image
                </div>
              )}

              {/* Top-left: Vendly logo. Sits over a subtle dark chip so it
                  stays legible on bright product shots. */}
              {vendlyLogoData && (
                <div
                  style={{
                    position: "absolute",
                    top: 32 * S,
                    left: 32 * S,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.55)",
                    padding: `${8 * S}px ${16 * S}px`,
                    borderRadius: 999,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vendlyLogoData}
                    alt="Vendly"
                    style={{ height: 28 * S, objectFit: "contain" }}
                  />
                </div>
              )}

              {/* Top-right: PRO badge — only for pro sellers. */}
              {isPro && (
                <div
                  style={{
                    position: "absolute",
                    top: 32 * S,
                    right: 32 * S,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    padding: `${8 * S}px ${18 * S}px`,
                    borderRadius: 999,
                    fontSize: 16 * S,
                    fontWeight: 700,
                    letterSpacing: 1 * S,
                  }}
                >
                  PRO
                </div>
              )}

              {/* Bottom-left: seller chip with logo + store name. Optional,
                  but it carries the brand for screenshots. */}
              {storeName && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 32 * S,
                    left: 32 * S,
                    display: "flex",
                    alignItems: "center",
                    gap: 10 * S,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    padding: `${8 * S}px ${16 * S}px ${8 * S}px ${8 * S}px`,
                    borderRadius: 999,
                    color: "#ffffff",
                    fontSize: 18 * S,
                    fontWeight: 600,
                  }}
                >
                  {sellerLogoData ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sellerLogoData}
                      alt=""
                      style={{
                        width: 32 * S,
                        height: 32 * S,
                        borderRadius: 999,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32 * S,
                        height: 32 * S,
                        borderRadius: 999,
                        backgroundColor: "#1f1f1f",
                        display: "flex",
                      }}
                    />
                  )}
                  <span>{storeName}</span>
                </div>
              )}
            </div>

            {/* Slim delivery banner — the visual hinge between photo and
                metadata. Keeps the inspiration's "Free Delivery until …"
                cue but on a dark fill so it stays on-brand. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                paddingTop: 16 * S,
                paddingBottom: 16 * S,
                backgroundColor: "#0d0d0d",
                color: "#a3a3a3",
                fontSize: 18 * S,
                fontWeight: 500,
                letterSpacing: 0.5 * S,
                borderTop: `${1 * S}px solid #1a1a1a`,
                borderBottom: `${1 * S}px solid #1a1a1a`,
              }}
            >
              {deliveryLabel}
            </div>

            {/* Footer — title + price on one baseline (mirrors inspiration
                B), chips beneath. ~38% of card height. */}
            <div
              style={{
                width: "100%",
                flex: 38,
                display: "flex",
                flexDirection: "column",
                padding: `${36 * S}px ${44 * S}px ${40 * S}px ${44 * S}px`,
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  width: "100%",
                  gap: 24 * S,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    maxWidth: "62%",
                    gap: 6 * S,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14 * S,
                      color: "#737373",
                      letterSpacing: 2 * S,
                      textTransform: "uppercase",
                      fontWeight: 600,
                      display: "flex",
                    }}
                  >
                    {(product.seller?.location || "Vendly").toString().slice(0, 40)}
                  </div>
                  <div
                    style={{
                      fontSize: 56 * S,
                      fontWeight: 700,
                      color: "#ffffff",
                      lineHeight: 1.05,
                      letterSpacing: -1.5 * S,
                      display: "flex",
                    }}
                  >
                    {safeTitle}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8 * S,
                  }}
                >
                  <div
                    style={{
                      fontSize: 64 * S,
                      fontWeight: 800,
                      color: "#ef4444",
                      letterSpacing: -2 * S,
                      lineHeight: 1,
                      display: "flex",
                    }}
                  >
                    {priceLabel}
                  </div>
                  <div
                    style={{
                      fontSize: 18 * S,
                      fontWeight: 600,
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      gap: 6 * S,
                    }}
                  >
                    Order Now <span style={{ color: "#ef4444" }}>↗</span>
                  </div>
                </div>
              </div>

              {/* Chip rail — size/color first (most useful), then tags,
                  then a "+N" overflow. Reads left-to-right at a glance. */}
              {(detailChips.length > 0 || visibleTags.length > 0) && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10 * S,
                    marginTop: 24 * S,
                  }}
                >
                  {detailChips.map((c) => (
                    <div
                      key={c.label}
                      style={{
                        display: "flex",
                        gap: 6 * S,
                        backgroundColor: "#171717",
                        color: "#a3a3a3",
                        borderRadius: 999,
                        padding: `${8 * S}px ${16 * S}px`,
                        fontSize: 16 * S,
                        fontWeight: 500,
                        border: `${1 * S}px solid #262626`,
                      }}
                    >
                      <span>{c.label}</span>
                      <span style={{ color: "#ffffff", fontWeight: 600 }}>
                        {c.value}
                      </span>
                    </div>
                  ))}
                  {visibleTags.map((t) => (
                    <div
                      key={t}
                      style={{
                        backgroundColor: "#171717",
                        color: "#ffffff",
                        borderRadius: 999,
                        padding: `${8 * S}px ${16 * S}px`,
                        fontSize: 16 * S,
                        fontWeight: 500,
                        border: `${1 * S}px solid #262626`,
                        display: "flex",
                      }}
                    >
                      {t}
                    </div>
                  ))}
                  {extraTagCount > 0 && (
                    <div
                      style={{
                        backgroundColor: "#ef4444",
                        color: "#ffffff",
                        borderRadius: 999,
                        padding: `${8 * S}px ${16 * S}px`,
                        fontSize: 16 * S,
                        fontWeight: 700,
                        display: "flex",
                      }}
                    >
                      +{extraTagCount}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      {
        width: CARD_W,
        height: CARD_H,
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    // Don't 500 the route — return a PNG with the error so the UI shows
    // something. Logged for ops.
     
    console.error("[product-card] render failed:", err);
    return errorImage(
      "Couldn't render this card",
      "Please try again in a moment.",
    );
  }
}
