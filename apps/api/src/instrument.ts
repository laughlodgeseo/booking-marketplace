import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 1.0,
    beforeSend(event) {
      // Redact sensitive fields from request bodies before sending to Sentry
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        const sensitiveFields = [
          'password',
          'newPassword',
          'refreshToken',
          'accessToken',
          'token',
          'stripeWebhookSecret',
          'webhookSignature',
        ];
        for (const field of sensitiveFields) {
          if (field in data) {
            data[field] = '[REDACTED]';
          }
        }
      }
      // Redact Authorization headers
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, unknown>;
        if (headers['authorization']) {
          headers['authorization'] = '[REDACTED]';
        }
        if (headers['stripe-signature']) {
          headers['stripe-signature'] = '[REDACTED]';
        }
      }
      return event;
    },
  });
}
