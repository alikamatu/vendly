import { ImageResponse } from "next/og";

/**
 * Default site-wide Open Graph image. Lives at `/opengraph-image` and is
 * automatically referenced by Next for any route that doesn't define its
 * own `opengraph-image.tsx`.
 *
 * Static — generated once at build time. No external fonts so we don't add
 * a network round-trip to the build.
 */
export const runtime = "edge";
export const alt = "Verndly — Marketplace for Independent Businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 60%, #e7e5e4 100%)",
          padding: "72px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
            <circle cx="27" cy="33" r="14" fill="#ef4444" />
            <rect x="37" y="16" width="28" height="74" rx="14" transform="rotate(-36 51 53)" fill="#ef4444" />
          </svg>
          <span
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#0a0a0a",
              letterSpacing: -0.5,
            }}
          >
            Verndly
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2.5,
              color: "#0a0a0a",
              margin: 0,
              maxWidth: 980,
            }}
          >
            Shop directly from independent stores you trust.
          </h1>
          <p
            style={{
              fontSize: 28,
              color: "#525252",
              margin: 0,
              maxWidth: 880,
            }}
          >
            Discover verified sellers and young entrepreneurs across Ghana — all in one marketplace.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#737373",
          }}
        >
          <span>verndly.market</span>
          <span style={{ display: "flex", gap: 24 }}>
            <span>Shop</span>
            <span>·</span>
            <span>Sell</span>
            <span>·</span>
            <span>Verified</span>
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
