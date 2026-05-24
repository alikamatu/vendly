import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Hosts the app legitimately talks to. Adjust here when adding a new third-
// party (analytics, payment widget, etc.) — every other entry below derives
// from these so we don't drift.
const API_HOST = process.env.NEXT_PUBLIC_API_URL || "https://api.vendly.market";
const PAYSTACK = "https://js.paystack.co https://checkout.paystack.com";
const CLOUDINARY = "https://res.cloudinary.com";

// In dev Next.js injects inline scripts, uses eval for HMR, and opens a
// websocket back to the dev server — a strict CSP breaks all of that. We
// keep the policy tight in prod and let dev breathe.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} ${PAYSTACK}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${CLOUDINARY} https://lh3.googleusercontent.com https://vendly.market`,
  `connect-src 'self' ${API_HOST} ${PAYSTACK}${isProd ? "" : " ws: http://localhost:* https://localhost:*"}`,
  `frame-src 'self' ${PAYSTACK}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // HSTS only makes sense over HTTPS — Next serves it on every response but
  // browsers ignore it on http://, so it's safe to always set.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Trim the response time tax by GZip/Brotli'ing responses + ditching the
  // "x-powered-by" header.
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  // Next/Image lets us serve product photos at the right size + format.
  // Whitelisting Cloudinary (where every uploaded image lives) is required
  // for next/image optimisation to kick in.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "vendly.market" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Modular imports: tree-shake huge libs so a single icon doesn't pull
  // in 1500 friends.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "sonner",
      "@hookform/resolvers",
    ],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
