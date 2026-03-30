import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// BigInt serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false, // set to false in production to hide details
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
bootstrap();
