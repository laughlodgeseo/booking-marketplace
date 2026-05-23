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
import { validateCriticalEnvironment } from './common/config/env.validation';

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  validateCriticalEnvironment();

  const rawDbUrl = (process.env.DATABASE_URL || '').trim();
  if (!rawDbUrl) {
    console.warn(
      'DATABASE_URL is not set. API will fail to connect to the database.',
    );
  } else {
    try {
      const parsed = new URL(rawDbUrl);
      const dbName = parsed.pathname.replace(/^\//, '') || '(default)';
      const host = parsed.host || '(unknown)';
      console.log(`Database target: ${host}/${dbName}`);
    } catch {
      console.warn('DATABASE_URL is set but could not be parsed.');
    }
  }

  // Global API prefix
  app.setGlobalPrefix('api');

  // Stripe webhook MUST receive raw body only on this route.
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Body parsing
  app.use(
    express.json({
      limit: '1mb',
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Cookies + security headers
  app.use(cookieParser());
  app.use(helmet());

  app.use((req: AppRequest, res: Response, next: NextFunction) => {
    // Always generate a server-side UUID. Never trust the incoming header
    // to prevent log poisoning via malicious X-Correlation-Id values.
    const correlationId = randomUUID();

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
    'https://www.rentpropertyuae.com',
    'https://rentpropertyuae.com',
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
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const allowed =
        staticAllowedOrigins.has(normalizedOrigin) ||
        vercelPreviewPattern.test(normalizedOrigin);

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
   * Swagger — disabled in production by default.
   * Set SWAGGER_ENABLED=true to enable. In production, also set
   * SWAGGER_USER and SWAGGER_PASS to protect /docs with Basic Auth.
   * If SWAGGER_USER/SWAGGER_PASS are not set in production, /docs is blocked.
   */
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';

  if (swaggerEnabled) {
    const isProd = process.env.NODE_ENV === 'production';
    const swaggerUser = (process.env.SWAGGER_USER ?? '').trim();
    const swaggerPass = (process.env.SWAGGER_PASS ?? '').trim();

    if (isProd) {
      if (!swaggerUser || !swaggerPass) {
        console.warn(
          'SWAGGER_ENABLED=true in production but SWAGGER_USER/SWAGGER_PASS not set. /docs will be blocked.',
        );
        // Protect /docs with a 401 wall when credentials are missing
        app.use('/docs', (_req: Request, res: Response) => {
          res.status(401).json({ message: 'Swagger is not available.' });
        });
      } else {
        // Basic Auth guard for /docs in production
        app.use('/docs', (req: Request, res: Response, next: NextFunction) => {
          const authHeader = req.headers['authorization'] ?? '';
          const b64 = authHeader.startsWith('Basic ')
            ? authHeader.slice(6)
            : '';
          const decoded = Buffer.from(b64, 'base64').toString('utf8');
          const [user, ...passParts] = decoded.split(':');
          const pass = passParts.join(':');

          if (user === swaggerUser && pass === swaggerPass) {
            next();
            return;
          }

          res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
          res.status(401).json({ message: 'Unauthorized.' });
        });

        const swaggerConfig = new DocumentBuilder()
          .setTitle('Booking Marketplace API')
          .setDescription(
            'API for booking marketplace (customer / vendor / admin)',
          )
          .setVersion('1.0.0')
          .addBearerAuth()
          .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('docs', app, document);
        console.log('Swagger docs: /docs (Basic Auth protected)');
      }
    } else {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Booking Marketplace API')
        .setDescription(
          'API for booking marketplace (customer / vendor / admin)',
        )
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('docs', app, document);
      console.log('Swagger docs: /docs');
    }
  }

  const port = Number(process.env.PORT ?? 10000);

  console.log(`Starting API listener on 0.0.0.0:${port}...`);
  await app.listen(port, '0.0.0.0');

  console.log(`✅ API running on port ${port}`);
}

void bootstrap();
