import { Controller, Get } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Reports SDK runtime state so we can verify `Sentry.init` actually
   * ran with the right DSN at boot.
   *
   *   GET /debug-sentry/status
   *
   * Returns enough metadata to debug "events not arriving" without
   * exposing the DSN itself. Safe to leave on in production.
   */
  @Get('/debug-sentry/status')
  sentryStatus() {
    const client = Sentry.getClient();
    const options: any = client?.getOptions?.();
    const dsn = options?.dsn as string | undefined;
    // Mask everything except the host so we can see "right project"
    // without leaking the auth token portion of the DSN.
    const dsnHost = (() => {
      try {
        return dsn ? new URL(dsn).host : null;
      } catch {
        return null;
      }
    })();
    return {
      initialised: Boolean(client),
      enabled: options?.enabled,
      environment: options?.environment,
      release: options?.release ?? null,
      tracesSampleRate: options?.tracesSampleRate,
      dsnHost,
      env: {
        SENTRY_DSN: process.env.SENTRY_DSN ? 'set' : 'missing',
        NODE_ENV: process.env.NODE_ENV,
      },
    };
  }

  /**
   * Sends a `message` event (no exception filter, no 4xx skip). If this
   * lands in your Sentry inbox but `/debug-sentry/throw` doesn't, the
   * SDK is wired correctly and the issue is in the exception filter or
   * the beforeSend predicate.
   */
  @Get('/debug-sentry/message')
  async sentryMessage() {
    Sentry.captureMessage('Verndly API debug ping', 'info');
    await Sentry.flush(2000);
    return { sent: true };
  }

  /**
   * Throws an unhandled error. Should land in Sentry as a 500.
   *
   *   GET /debug-sentry/throw
   *
   * Kept as `/debug-sentry` too for backwards compat with any wiki link.
   */
  @Get('/debug-sentry')
  getError() {
    throw new Error('Verndly API debug — Sentry test exception');
  }

  @Get('/debug-sentry/throw')
  getErrorAlt() {
    throw new Error('Verndly API debug — Sentry test exception');
  }
}
