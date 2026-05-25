import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = exceptionResponse['message'] || exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error('Unhandled Exception:', exception);
      // Sentry's beforeSend already filters by status code, but capturing
      // explicitly here gives us route context (path + method) on every
      // 5xx so triage can start from the request, not just the stack.
      Sentry.withScope((scope) => {
        scope.setTag('http.status_code', String(status));
        scope.setContext('request', {
          method: request.method,
          url: request.url,
          headers: { 'user-agent': request.headers['user-agent'] },
        });
        Sentry.captureException(exception);
      });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message : [message], // ensure array for consistency
    });
  }
}
