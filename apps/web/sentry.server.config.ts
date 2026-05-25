// Sentry init for Next.js's Node.js runtime (RSC + API routes + server
// actions). Mirrors the client config but with a stricter `ignoreErrors`
// because server-side noise is harder to triage.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
    ignoreErrors: [
      // Aborted requests / client disconnects — frequent and not actionable
      'AbortError',
      'Request aborted',
    ],
  });
}
