// Sentry init for the browser. Imported automatically by @sentry/nextjs
// when `instrumentation-client.ts` is present (Next 14+) or directly from
// the runtime config (older). We keep both for compatibility — the older
// `sentry.client.config.ts` path is still picked up by webpack.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

    // Conservative defaults — bump in prod once usage is calibrated.
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1),

    // Session replays only fire on errors by default, so cost stays low.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
        // Hide anything that looks like a sensitive form input. Cheap,
        // catches the obvious cases without overzealous masking.
        mask: ['input[type="password"]', 'input[name*="otp"]', 'input[name*="2fa"]'],
      }),
    ],

    // Ignore noise from third-party scripts and our intentional 4xx
    // toasts. Anything in `ignoreErrors` is dropped before send.
    ignoreErrors: [
      // Browser extensions and ad blockers
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors that aren't actionable (offline, captive portal)
      'Failed to fetch',
      'NetworkError',
      'Load failed',
    ],
    denyUrls: [
      // Common ad-blocker error sources
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}
