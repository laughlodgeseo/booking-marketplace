import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import express from 'express';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { PUBLIC_UPLOADS_DIR } from './common/upload/storage-paths';
import {
  DEFAULT_DISPLAY_CURRENCY,
  DEFAULT_LOCALE,
  normalizeDisplayCurrency,
  normalizeLocale,
  parseLocaleFromAcceptLanguage,
} from './common/i18n/locale';
import type { AppRequest } from './common/i18n/app-request';

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api');

  // Body parsing
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Cookies + security headers
  app.use(cookieParser());
  app.use(helmet());

  app.use((req: AppRequest, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-correlation-id'];
    const correlationId =
      typeof incoming === 'string' && incoming.trim()
        ? incoming.trim()
        : randomUUID();

    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    const startedAt = Date.now();
    res.on('finish', () => {
      const line = {
        level: 'info',
        type: 'http_request',
        correlationId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        ip: req.ip || null,
        userAgent: req.get('user-agent') || null,
      };
      console.log(JSON.stringify(line));
    });

    next();
  });

  app.use((req: AppRequest, res: Response, next: NextFunction) => {
    const localeHeader =
      typeof req.headers['x-locale'] === 'string'
        ? req.headers['x-locale']
        : null;
    const acceptLanguage =
      typeof req.headers['accept-language'] === 'string'
        ? req.headers['accept-language']
        : null;

    const resolvedLocale = localeHeader
      ? normalizeLocale(localeHeader)
      : parseLocaleFromAcceptLanguage(acceptLanguage ?? DEFAULT_LOCALE);

    const currencyHeader =
      typeof req.headers['x-currency'] === 'string'
        ? req.headers['x-currency']
        : null;
    const resolvedCurrency = currencyHeader
      ? normalizeDisplayCurrency(currencyHeader)
      : DEFAULT_DISPLAY_CURRENCY;

    req.locale = resolvedLocale ?? DEFAULT_LOCALE;
    req.displayCurrency = resolvedCurrency;
    res.setHeader('X-Locale', req.locale);
    res.setHeader('X-Currency', req.displayCurrency);
    next();
  });

  /**
   * Public static assets
   * - Property images are public under /uploads/**
   * - Ownership / verification docs must NEVER be public
   */
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    const normalizedPath = req.path.replace(/\\/g, '/').toLowerCase();
    if (normalizedPath.includes('/documents/')) {
      res.status(404).end();
      return;
    }
    next();
  });
  app.use('/uploads', express.static(PUBLIC_UPLOADS_DIR));

  const staticAllowedOrigins = new Set<string>([
    'https://rentpropertyuae.vercel.app',
    'http://localhost:3000',
    'http://localhost:3100',
  ]);

  const extraCorsOriginsRaw =
    process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN;
  if (extraCorsOriginsRaw) {
    for (const raw of extraCorsOriginsRaw.split(',')) {
      const normalized = normalizeOrigin(raw);
      if (normalized) {
        staticAllowedOrigins.add(normalized);
      }
    }
  }

  const vercelPreviewPattern =
    /^https:\/\/rentpropertyuae-[a-z0-9-]+\.vercel\.app$/;

  app.enableCors({
    origin: (origin: string | undefined, callback: CorsOriginCallback) => {
      // Allow non-browser calls (curl, server-to-server) with no Origin header.
      if (!origin) {
        console.log('[cors] origin=<none> allowed=true');
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const allowed =
        staticAllowedOrigins.has(normalizedOrigin) ||
        vercelPreviewPattern.test(normalizedOrigin);

      // Temporary proof log for CORS verification.

      console.log(`[cors] origin=${normalizedOrigin} allowed=${allowed}`);

      if (allowed) {
        callback(null, true);
        return;
      }

      // For disallowed origins, return cleanly without throwing.
      // Browser will block due missing CORS headers.
      callback(null, false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Authorization, Accept, X-Requested-With, Idempotency-Key, X-Correlation-Id, X-Locale, X-Currency',
  });

  /**
   * Validation
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  /**
   * Swagger
   */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Booking Marketplace API')
    .setDescription('API for booking marketplace (customer / vendor / admin)')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 10000);

  console.log(`Starting API listener on 0.0.0.0:${port}...`);
  await app.listen(port, '0.0.0.0');

  console.log(`✅ API running on port ${port}`);
  console.log(`📚 Swagger docs: /docs`);
}

void bootstrap();
