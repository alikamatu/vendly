// Next.js calls this once per runtime (nodejs / edge) on cold start.
// We use it to bootstrap the Sentry SDK for the matching runtime. The
// `.client.config.ts` file is loaded automatically by @sentry/nextjs on
// the browser side — only server/edge need this manual hook.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Capture failures in React Server Components and server actions.
// Sentry exposes this under `captureRequestError` in v8+.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
