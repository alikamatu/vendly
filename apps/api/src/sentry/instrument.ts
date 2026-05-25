/**
 * Sentry bootstrap. Must be imported as the very first line of main.ts
 * before any other module, because @sentry/nestjs instruments Node's
 * `http`/`https` modules at require-time. If we wait until inside
 * `bootstrap()` Sentry misses anything that ran during module init.
 *
 * Behaviour when SENTRY_DSN is missing:
 *   - `init()` becomes a no-op; nothing is sent.
 *   - The exception filter still runs and still logs to stdout.
 *   - We deliberately do NOT throw — production should never crash on
 *     missing monitoring config; an alert-less deployment is bad, but
 *     a refusing-to-start deployment is worse.
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || undefined,

    // Performance traces sampling — keep low in prod to control cost.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),

    // Profiling adds CPU-level traces but doubles cost. Off by default.
    profilesSampleRate: Number(
      process.env.SENTRY_PROFILES_SAMPLE_RATE || 0,
    ),

    // Don't ship local-dev stack traces to the prod Sentry project.
    enabled: process.env.NODE_ENV !== 'test',

    // Strip query strings and most headers from requests before sending.
    sendDefaultPii: false,

    // Drop expected validation / auth errors. They're business rules,
    // not bugs, and they would drown the project in noise.
    ignoreErrors: [
      // class-validator messages
      'Please check your input and try again.',
      // common business-rule exceptions
      'Invalid credentials',
      'Email already in use',
      'You already have a pending verification request',
    ],

    beforeSend(event, hint) {
      const err: any = hint?.originalException;
      // Skip anything that mapped to a 4xx HTTP response — those are
      // intentional. We only want to know about 5xx and uncaught.
      const status =
        err?.status ||
        err?.statusCode ||
        (typeof err?.getStatus === 'function' ? err.getStatus() : undefined);
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return null;
      }
      return event;
    },
  });
} else {
  // eslint-disable-next-line no-console
  console.warn('[sentry] SENTRY_DSN not set — error monitoring disabled');
}
