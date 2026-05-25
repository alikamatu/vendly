// ─── Sentry must be the very first import ───────────────────────────────
// Otherwise @sentry/nestjs misses the require-time http instrumentation.
import './sentry/instrument';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// BigInt serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      // Collapse class-validator's nested error trees into a flat,
      // human-friendly list so the frontend can show the first message
      // (e.g. "Please enter a valid email address.") without parsing arrays
      // of `constraints` objects.
      exceptionFactory: (errors) => {
        const messages: string[] = [];
        const walk = (errs: any[]) => {
          for (const err of errs) {
            if (err.constraints) {
              for (const m of Object.values(err.constraints)) {
                if (m) messages.push(String(m));
              }
            }
            if (err.children && err.children.length) walk(err.children);
          }
        };
        walk(errors);
        return new BadRequestException({
          statusCode: 400,
          message: messages.length ? messages : 'Please check your input and try again.',
          error: 'Bad Request',
        });
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Security and Performance Middleware
  app.use(helmet());
  app.use(compression());

  // Enable CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';

  app.enableCors({
    origin: [frontendUrl, adminUrl],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  await app.listen(1000);
}

const port = 1000;
bootstrap().then(() => {
  console.log(`Server running on http://localhost:${port}`);
});
