import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Response } from 'express';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : 500;

    // Only forward unexpected server errors to Sentry (not 4xx client errors)
    if (!isHttpException || status >= 500) {
      Sentry.captureException(exception);
    }

    if (!response.headersSent) {
      if (isHttpException) {
        const body = exception.getResponse();
        response.status(status).json(body);
      } else {
        this.logger.error(
          exception instanceof Error ? exception.message : String(exception),
        );
        response.status(500).json({ message: 'Internal server error' });
      }
    }
  }
}
