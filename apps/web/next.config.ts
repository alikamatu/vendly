import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';

// Hosts the app legitimately talks to. Adjust here when adding a new third-
// party (analytics, payment widget, etc.) — every other entry below derives
// from these so we don't drift.
const API_HOST = process.env.NEXT_PUBLIC_API_URL || 'https://api.verndly.com';
const PAYSTACK = 'https://js.paystack.co https://checkout.paystack.com';
const CLOUDINARY = 'https://res.cloudinary.com';
// Sentry's ingest endpoint is hostname-specific per project (e.g.
// https://o12345.ingest.sentry.io). We allow the wildcard so the CSP
// doesn't have to change when the project hash rotates.
const SENTRY_INGEST =
  'https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.sentry.io';
// Vercel Live (preview-deploy feedback widget + comments overlay). Only
// loaded on Vercel preview/prod deployments, never locally. Without these
// the widget is blocked and dev tools fills with CSP violations.
const VERCEL_LIVE = 'https://vercel.live https://*.vercel.live';
const VERCEL_LIVE_WS = 'wss://*.vercel.live wss://*.pusher.com';

// In dev Next.js injects inline scripts, uses eval for HMR, and opens a
// websocket back to the dev server — a strict CSP breaks all of that. We
// keep the policy tight in prod and let dev breathe.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} ${PAYSTACK} ${VERCEL_LIVE}`,
  // `script-src-elem` is what Chrome actually checks for <script src=...>
  // when both are present. Declared explicitly so the fallback warning
  // ("'script-src-elem' was not explicitly set, so 'script-src' is used")
  // goes away and behaviour stays identical across browsers.
  `script-src-elem 'self' 'unsafe-inline' ${PAYSTACK} ${VERCEL_LIVE}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${VERCEL_LIVE}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${CLOUDINARY} https://lh3.googleusercontent.com https://verndly.com ${VERCEL_LIVE}`,
  // `media-src` governs <video>/<audio>/<source>. Without it, Cloudinary
  // video URLs silently fall back to `default-src 'self'` and the browser
  // blocks them with no visible UI — videos just don't play.
  `media-src 'self' data: blob: ${CLOUDINARY}`,
  `connect-src 'self' ${API_HOST} ${PAYSTACK} ${SENTRY_INGEST} ${VERCEL_LIVE} ${VERCEL_LIVE_WS}${isProd ? '' : ' ws: http://localhost:* https://localhost:*'}`,
  `frame-src 'self' ${PAYSTACK} ${VERCEL_LIVE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
  },
  // HSTS only makes sense over HTTPS — Next serves it on every response but
  // browsers ignore it on http://, so it's safe to always set.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  // Note: Next.js 16 no longer runs ESLint during `next build` (the `eslint`
  // config key was removed). Linting lives in its own parallel CI job
  // (`pnpm lint`), so a green build is already decoupled from outstanding
  // lint debt (tracked in GH issue #10). Type errors still fail the build.

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
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'verndly.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
    deviceSizes: [360, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Modular imports: tree-shake huge libs so a single icon doesn't pull
  // in 1500 friends.
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'sonner', '@hookform/resolvers'],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

// Wrap with Sentry. The wrapper is safe even without a DSN — it just
// turns into a no-op for source-map upload at build time. Source-map
// upload requires SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT in the
// build environment (set on Vercel, not committed).
export default withSentryConfig(nextConfig, {
  // Suppress the SDK's noisy build-time logs unless explicitly enabled.
  silent: !process.env.SENTRY_DEBUG,

  // Vercel build env supplies these; locally they're absent and the
  // wrapper skips upload + cleanly logs a one-line warning.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hide source maps from the public bundle (uploaded to Sentry only).
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },

  // Tree-shake the Sentry SDK aggressively in client bundles.
  disableLogger: true,

  // Tunnel route lets us proxy Sentry traffic through our domain so it
  // sidesteps ad-blockers. /monitoring/* is reserved here; if a real
  // route conflicts later, change this string.
  tunnelRoute: '/monitoring',
});
