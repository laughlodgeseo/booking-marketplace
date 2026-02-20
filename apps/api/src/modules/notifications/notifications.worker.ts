import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationChannel } from '@prisma/client';
import { NotificationEventsService } from './notification-events.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import nodemailer, { type SendMailOptions } from 'nodemailer';

type JsonObject = Record<string, unknown>;
type WorkerMetrics = {
  sent_count: number;
  failed_count: number;
  retry_count: number;
};
type SmtpConfig = {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  replyTo: string | undefined;
  maxConnections: number;
  maxMessages: number;
  rateDelta: number;
  rateLimit: number;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
};
type DeliveryResult = {
  to: string;
  attempt: number;
  latencyMs: number;
  messageId: string | null;
  smtpResponse: string | null;
};
type DeliveryErrorInfo = {
  retryable: boolean;
  reason: string;
  code: string | null;
  responseCode: number | null;
};
type DeliveryErrorContext = {
  to?: string;
  latencyMs?: number;
  smtpResponse?: string;
};
type ResolvedBrandLogo = {
  logoUrl: string;
  attachment: NonNullable<SendMailOptions['attachments']>[number] | null;
};

@Injectable()
export class NotificationsWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationsWorker.name);
  private readonly inlineBrandLogoCid = 'brand-logo';
  private readonly defaultRemoteBrandLogoUrl =
    'https://rentpropertyuae.com/brand/logo.svg';
  private readonly localBrandLogoPath = this.resolveLocalBrandLogoPath();

  // Outbox knobs
  private readonly batchSize = 10;
  private readonly maxAttempts = 3;
  private readonly retryBaseMs = 5_000;
  private readonly retryMaxMs = 5 * 60_000;
  private readonly metrics: WorkerMetrics = {
    sent_count: 0,
    failed_count: 0,
    retry_count: 0,
  };

  private cachedTransport: {
    key: string;
    transporter: nodemailer.Transporter;
  } | null = null;

  constructor(
    private readonly events: NotificationEventsService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.warnOnInsecureLogoUrl();
  }

  @Cron('*/5 * * * * *') // every 5 seconds
  async processOutbox() {
    const pending = await this.events.findPendingBatch(this.batchSize);
    if (pending.length === 0) return;

    for (const event of pending) {
      if (event.attempts >= this.maxAttempts) {
        await this.events.markFailed(event.id, 'Max attempts reached.');
        this.incrementMetric('failed_count');
        this.logEmailAttempt('error', {
          notificationEventId: event.id,
          type: String(event.type),
          to: null,
          attempts: event.attempts,
          latencyMs: null,
          messageId: null,
          smtpResponse: null,
          smtpCode: null,
          smtpResponseCode: null,
          retryable: false,
          status: 'failed',
          reason: 'max_attempts_reached',
          nextAttemptAt: null,
        });
        continue;
      }

      const claimed = await this.events.claimIfPending(
        event.id,
        event.attempts,
      );
      if (!claimed) continue;

      const attempt = event.attempts + 1;

      try {
        const payload = this.safeJson(event.payloadJson);
        const channel = String(event.channel);

        if (event.channel === NotificationChannel.EMAIL) {
          const result = await this.deliverEmail({
            notificationId: event.id,
            type: String(event.type),
            recipientUserId: event.recipientUserId,
            payload,
            attempt,
          });

          await this.events.markSent(event.id);
          this.incrementMetric('sent_count');
          this.logEmailAttempt('log', {
            notificationEventId: event.id,
            type: String(event.type),
            to: result.to,
            attempts: result.attempt,
            latencyMs: result.latencyMs,
            messageId: result.messageId,
            smtpResponse: result.smtpResponse,
            smtpCode: null,
            smtpResponseCode: null,
            retryable: false,
            status: 'sent',
            reason: 'delivered',
            nextAttemptAt: null,
          });
        } else {
          const entityType = event.entityType ?? 'unknown';
          const entityId = event.entityId ?? 'unknown';
          this.logger.log(
            `DELIVER (noop) notification id=${event.id} type=${event.type} channel=${channel} recipient=${event.recipientUserId} entity=${entityType}:${entityId}`,
          );
          await this.events.markSent(event.id);
        }
      } catch (err: unknown) {
        const msg = this.errMessage(err);
        const info = this.classifyDeliveryError(err);
        const context = this.extractErrorContext(err);

        if (!info.retryable || attempt >= this.maxAttempts) {
          await this.events.markFailed(event.id, msg);
          this.incrementMetric('failed_count');
          this.logEmailAttempt('error', {
            notificationEventId: event.id,
            type: String(event.type),
            to: context.to ?? null,
            attempts: attempt,
            latencyMs: context.latencyMs ?? null,
            messageId: null,
            smtpResponse: context.smtpResponse ?? null,
            smtpCode: info.code,
            smtpResponseCode: info.responseCode,
            retryable: false,
            status: 'failed',
            reason: info.reason,
            nextAttemptAt: null,
            error: msg,
          });
          continue;
        }

        const backoffMs = this.computeBackoffMs(attempt);
        const nextAttemptAt = new Date(Date.now() + backoffMs);
        await this.events.scheduleRetry(event.id, msg, nextAttemptAt);
        this.incrementMetric('retry_count');

        this.logEmailAttempt('warn', {
          notificationEventId: event.id,
          type: String(event.type),
          to: context.to ?? null,
          attempts: attempt,
          latencyMs: context.latencyMs ?? null,
          messageId: null,
          smtpResponse: context.smtpResponse ?? null,
          smtpCode: info.code,
          smtpResponseCode: info.responseCode,
          retryable: true,
          status: 'retry',
          reason: info.reason,
          nextAttemptAt: nextAttemptAt.toISOString(),
          error: msg,
        });
      }
    }
  }

  private async deliverEmail(input: {
    notificationId: string;
    type: string;
    recipientUserId: string;
    payload: JsonObject;
    attempt: number;
  }): Promise<DeliveryResult> {
    const payloadEmail = this.getNested(input.payload, 'email');
    const to =
      typeof payloadEmail === 'string' && payloadEmail.trim()
        ? payloadEmail.trim().toLowerCase()
        : await this.lookupUserEmail(input.recipientUserId);

    if (!to) {
      throw new Error('Recipient email not found');
    }

    const subject = this.mapSubject(input.type, input.payload);
    const html = this.renderTemplate(
      NotificationChannel.EMAIL,
      input.type,
      input.payload,
    );
    const text = this.renderTextTemplate(
      NotificationChannel.EMAIL,
      input.type,
      input.payload,
    );

    const smtp = this.smtpConfig();
    if (!smtp.configured) {
      throw new Error(
        'SMTP not configured. Required env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM',
      );
    }

    const transporter = this.getTransporter(smtp);
    const payloadBrand = this.getNested(input.payload, 'brand');
    const brandOverrides = this.isObject(payloadBrand) ? payloadBrand : {};
    const resolvedBrandLogo = this.resolveBrandLogo();
    const overrideLogoUrl = this.readLogoUrlFromOverrides(brandOverrides);
    const effectiveLogoUrl = overrideLogoUrl ?? resolvedBrandLogo.logoUrl;
    const attachments =
      resolvedBrandLogo.attachment &&
      effectiveLogoUrl === resolvedBrandLogo.logoUrl &&
      effectiveLogoUrl.startsWith('cid:')
        ? [resolvedBrandLogo.attachment]
        : undefined;

    const message: SendMailOptions = {
      from: smtp.from,
      to,
      replyTo: smtp.replyTo,
      subject,
      html,
      text,
      attachments,
    };

    const startedAt = Date.now();

    try {
      const rawInfo: unknown = await transporter.sendMail(message);
      const info = this.toRecord(rawInfo);
      const latencyMs = Date.now() - startedAt;
      const messageId = info.messageId;
      const smtpResponse = info.response;
      return {
        to,
        attempt: input.attempt,
        latencyMs,
        messageId:
          typeof messageId === 'string' && messageId.trim() ? messageId : null,
        smtpResponse:
          typeof smtpResponse === 'string' && smtpResponse.trim()
            ? smtpResponse
            : null,
      };
    } catch (err: unknown) {
      const context: DeliveryErrorContext = {
        to,
        latencyMs: Date.now() - startedAt,
      };
      throw this.withDeliveryContext(err, context);
    }
  }

  private async lookupUserEmail(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return u?.email?.trim().toLowerCase() ?? null;
  }

  private smtpConfig(): SmtpConfig {
    const host = (process.env.SMTP_HOST || '').trim();
    const portRaw = (process.env.SMTP_PORT || '').trim();
    const port = Number(portRaw || '587');

    // SSL on 465 is mandatory for cPanel SMTP.
    const secureFlag = (process.env.SMTP_SECURE || '').trim().toLowerCase();
    const secureFromEnv =
      secureFlag === 'true' || secureFlag === '1' || secureFlag === 'yes';
    const secure = port === 465 ? true : secureFromEnv;

    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim();
    const from =
      (process.env.SMTP_FROM || '').trim() ||
      'RentPropertyUAE <booking@rentpropertyuae.com>';
    const replyTo = (process.env.SMTP_REPLY_TO || '').trim() || undefined;

    const configured =
      Boolean(host) &&
      Number.isFinite(port) &&
      port > 0 &&
      Boolean(user) &&
      Boolean(pass) &&
      Boolean(from);

    return {
      configured,
      host,
      port,
      secure,
      user,
      pass,
      from,
      replyTo,
      maxConnections: this.readPositiveInt('SMTP_MAX_CONNECTIONS', 2),
      maxMessages: this.readPositiveInt('SMTP_MAX_MESSAGES', 50),
      rateDelta: this.readPositiveInt('SMTP_RATE_DELTA', 1000),
      rateLimit: this.readPositiveInt('SMTP_RATE_LIMIT', 5),
      connectionTimeout: this.readPositiveInt(
        'SMTP_CONNECTION_TIMEOUT_MS',
        15000,
      ),
      greetingTimeout: this.readPositiveInt('SMTP_GREETING_TIMEOUT_MS', 15000),
      socketTimeout: this.readPositiveInt('SMTP_SOCKET_TIMEOUT_MS', 20000),
    };
  }

  private getTransporter(smtp: SmtpConfig): nodemailer.Transporter {
    const key = [
      smtp.host,
      String(smtp.port),
      String(smtp.secure),
      smtp.user,
      smtp.from,
      smtp.replyTo ?? '',
      String(smtp.maxConnections),
      String(smtp.maxMessages),
      String(smtp.rateDelta),
      String(smtp.rateLimit),
      String(smtp.connectionTimeout),
      String(smtp.greetingTimeout),
      String(smtp.socketTimeout),
    ].join('|');

    if (this.cachedTransport && this.cachedTransport.key === key) {
      return this.cachedTransport.transporter;
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
      pool: true,
      maxConnections: smtp.maxConnections,
      maxMessages: smtp.maxMessages,
      rateDelta: smtp.rateDelta,
      rateLimit: smtp.rateLimit,
      connectionTimeout: smtp.connectionTimeout,
      greetingTimeout: smtp.greetingTimeout,
      socketTimeout: smtp.socketTimeout,
    });

    this.cachedTransport = { key, transporter };
    return transporter;
  }

  private warnOnInsecureLogoUrl() {
    const rawLogoUrl = (process.env.BRAND_LOGO_URL || '').trim();
    const resolvedBrandLogo = this.resolveBrandLogo();
    if (resolvedBrandLogo.attachment && this.localBrandLogoPath) {
      this.logger.log(
        `Using local inline brand logo from ${this.localBrandLogoPath}.`,
      );
      return;
    }

    if (!rawLogoUrl) {
      this.logger.warn(
        'BRAND_LOGO_URL is not set and local logo was not found. Set BRAND_LOGO_URL to an HTTPS logo URL.',
      );
      return;
    }

    const lower = rawLogoUrl.toLowerCase();
    if (!lower.startsWith('https://') && !lower.startsWith('cid:')) {
      this.logger.warn(
        'BRAND_LOGO_URL should use HTTPS (or cid: for inline assets) to avoid blocked images in email clients.',
      );
    }
  }

  private readPositiveInt(key: string, fallback: number): number {
    const raw = (process.env[key] || '').trim();
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return fallback;
    return Math.trunc(value);
  }

  private computeBackoffMs(attempt: number): number {
    const exponent = Math.max(0, attempt - 1);
    const delayMs = this.retryBaseMs * 2 ** exponent;
    return Math.min(delayMs, this.retryMaxMs);
  }

  private classifyDeliveryError(err: unknown): DeliveryErrorInfo {
    const message = this.errMessage(err).toLowerCase();
    const record = this.toRecord(err);

    const rawCode = record.code;
    const code = typeof rawCode === 'string' ? rawCode.toUpperCase() : null;

    const rawResponseCode = record.responseCode;
    const responseCode =
      typeof rawResponseCode === 'number'
        ? rawResponseCode
        : typeof rawResponseCode === 'string' &&
            Number.isFinite(Number(rawResponseCode))
          ? Number(rawResponseCode)
          : null;

    if (message.includes('template') || message.includes('interpolate')) {
      return {
        retryable: false,
        reason: 'template_error',
        code,
        responseCode,
      };
    }

    if (
      code === 'EAUTH' ||
      responseCode === 535 ||
      message.includes('535 ') ||
      message.includes('authentication failed')
    ) {
      return {
        retryable: false,
        reason: 'smtp_auth_failure',
        code,
        responseCode,
      };
    }

    if (
      responseCode === 550 ||
      message.includes('550 ') ||
      message.includes('invalid recipient')
    ) {
      return {
        retryable: false,
        reason: 'invalid_recipient',
        code,
        responseCode,
      };
    }

    const transientCodes = new Set([
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'EPIPE',
      'ESOCKET',
      'ECONNECTION',
      'ENOTFOUND',
      'EAI_AGAIN',
      'EHOSTUNREACH',
    ]);

    if (code && transientCodes.has(code)) {
      return {
        retryable: true,
        reason: 'network_transient',
        code,
        responseCode,
      };
    }

    if (responseCode !== null && responseCode >= 400 && responseCode < 500) {
      return {
        retryable: true,
        reason: 'smtp_4xx_transient',
        code,
        responseCode,
      };
    }

    return {
      retryable: false,
      reason: 'non_retryable',
      code,
      responseCode,
    };
  }

  private withDeliveryContext(
    err: unknown,
    context: DeliveryErrorContext,
  ): Error {
    const baseError =
      err instanceof Error ? err : new Error(this.errMessage(err));
    const output = baseError as Error & DeliveryErrorContext;

    if (context.to) output.to = context.to;
    if (typeof context.latencyMs === 'number')
      output.latencyMs = context.latencyMs;
    if (context.smtpResponse) output.smtpResponse = context.smtpResponse;

    return output;
  }

  private extractErrorContext(err: unknown): DeliveryErrorContext {
    const record = this.toRecord(err);
    const to = typeof record.to === 'string' ? record.to : undefined;
    const latencyMs =
      typeof record.latencyMs === 'number' ? record.latencyMs : undefined;
    const smtpResponse =
      typeof record.response === 'string'
        ? record.response
        : typeof record.smtpResponse === 'string'
          ? record.smtpResponse
          : undefined;
    return { to, latencyMs, smtpResponse };
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null) return {};
    return value as Record<string, unknown>;
  }

  private safeJson(s: string): JsonObject {
    try {
      const parsed: unknown = JSON.parse(s || '{}');
      return this.isObject(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private isObject(v: unknown): v is JsonObject {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  private errMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return 'Unknown notification delivery error';
  }

  private incrementMetric(metric: keyof WorkerMetrics) {
    this.metrics[metric] += 1;
    this.logger.log(
      `NOTIFICATION_EMAIL_METRICS ${JSON.stringify(this.metrics)}`,
    );
  }

  private logEmailAttempt(
    level: 'log' | 'warn' | 'error',
    payload: Record<string, unknown>,
  ) {
    const line = `NOTIFICATION_EMAIL_ATTEMPT ${JSON.stringify(payload)}`;
    if (level === 'warn') {
      this.logger.warn(line);
      return;
    }
    if (level === 'error') {
      this.logger.error(line);
      return;
    }
    this.logger.log(line);
  }

  private mapSubject(type: string, payload: JsonObject): string {
    switch (type) {
      case 'EMAIL_VERIFICATION_OTP':
        return 'Your verification code (OTP)';
      case 'BOOKING_CONFIRMED':
        return 'Booking confirmed';
      case 'BOOKING_CANCELLED':
      case 'BOOKING_CANCELLED_BY_GUEST':
        return 'Booking cancelled';
      case 'PAYMENT_FAILED':
        return 'Payment failed for your booking';
      case 'PAYMENT_PENDING':
        return 'Payment pending for your booking';
      case 'REFUND_PROCESSED':
        return 'Refund processed';
      case 'DOCUMENT_UPLOAD_REQUEST':
        return 'Action required: upload guest documents';
      case 'OPS_TASKS_CREATED':
        return 'Your stay services are scheduled';
      case 'PROPERTY_APPROVED_ACTIVATION_REQUIRED':
        return 'Property approved: activation payment required';
      default: {
        const ref = this.getNested(payload, 'booking.id');
        if (typeof ref === 'string' && ref.trim())
          return `Update for booking ${ref.trim()}`;
        return 'Account update';
      }
    }
  }

  private renderTemplate(
    channel: NotificationChannel,
    type: string,
    payload: JsonObject,
  ): string {
    if (channel !== NotificationChannel.EMAIL) {
      return JSON.stringify({ type, payload });
    }

    const templateBase = this.mapTemplateBase(type);
    const fileName = `${templateBase}.html`;
    const templatePath = this.resolveTemplatePath(fileName);

    if (!templatePath) {
      return JSON.stringify({ type, payload }, null, 2);
    }

    const html = fs.readFileSync(templatePath, 'utf8');
    const payloadBrand = this.getNested(payload, 'brand');
    const brandOverrides = this.isObject(payloadBrand) ? payloadBrand : {};

    const merged: JsonObject = {
      ...payload,
      brand: {
        ...this.defaultBrand(),
        ...brandOverrides,
      },
    };

    return this.simpleInterpolate(html, merged);
  }

  private renderTextTemplate(
    channel: NotificationChannel,
    type: string,
    payload: JsonObject,
  ): string {
    if (channel !== NotificationChannel.EMAIL) {
      return JSON.stringify({ type, payload });
    }

    const templateBase = this.mapTemplateBase(type);
    const txtPath = this.resolveTemplatePath(`${templateBase}.txt`);

    const payloadBrand = this.getNested(payload, 'brand');
    const brandOverrides = this.isObject(payloadBrand) ? payloadBrand : {};

    const merged: JsonObject = {
      ...payload,
      brand: {
        ...this.defaultBrand(),
        ...brandOverrides,
      },
    };

    if (txtPath) {
      const txt = fs.readFileSync(txtPath, 'utf8');
      return this.simpleInterpolate(txt, merged);
    }

    const html = this.renderTemplate(channel, type, payload);
    return this.stripHtml(html);
  }

  private defaultBrand() {
    const resolvedBrandLogo = this.resolveBrandLogo();
    return {
      name: 'RentPropertyUAE',
      legalName: 'RentPropertyUAE',
      domain: 'rentpropertyuae.com',
      supportEmail: 'info@rentpropertyuae.com',
      bookingEmail: 'booking@rentpropertyuae.com',
      phone: '+971 50 234 8756',
      country: 'United Arab Emirates',
      logoUrl: resolvedBrandLogo.logoUrl,
    };
  }

  private resolveBrandLogo(): ResolvedBrandLogo {
    const configuredLogoUrl = (process.env.BRAND_LOGO_URL || '').trim();
    const inlineLogoUrl = `cid:${this.inlineBrandLogoCid}`;
    const shouldPreferLocalInlineLogo =
      !configuredLogoUrl ||
      configuredLogoUrl.toLowerCase() ===
        this.defaultRemoteBrandLogoUrl.toLowerCase() ||
      configuredLogoUrl.toLowerCase() === inlineLogoUrl.toLowerCase();

    if (this.localBrandLogoPath && shouldPreferLocalInlineLogo) {
      return {
        logoUrl: inlineLogoUrl,
        attachment: {
          filename: path.basename(this.localBrandLogoPath),
          path: this.localBrandLogoPath,
          cid: this.inlineBrandLogoCid,
          contentType: 'image/svg+xml',
        },
      };
    }

    if (configuredLogoUrl) {
      return {
        logoUrl: configuredLogoUrl,
        attachment: null,
      };
    }

    return {
      logoUrl: this.defaultRemoteBrandLogoUrl,
      attachment: null,
    };
  }

  private resolveLocalBrandLogoPath(): string | null {
    const candidates = [
      path.join(process.cwd(), 'apps', 'web', 'public', 'brand', 'logo.svg'),
      path.join(process.cwd(), '..', 'web', 'public', 'brand', 'logo.svg'),
      path.join(process.cwd(), 'web', 'public', 'brand', 'logo.svg'),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'web',
        'public',
        'brand',
        'logo.svg',
      ),
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '..',
        'web',
        'public',
        'brand',
        'logo.svg',
      ),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }

    return null;
  }

  private readLogoUrlFromOverrides(brandOverrides: JsonObject): string | null {
    const rawLogoUrl = brandOverrides.logoUrl;
    if (typeof rawLogoUrl !== 'string') return null;
    const value = rawLogoUrl.trim();
    return value ? value : null;
  }

  private resolveTemplatePath(fileName: string): string | null {
    const candidates = [
      path.join(__dirname, 'templates', fileName),
      path.join(
        process.cwd(),
        'src',
        'modules',
        'notifications',
        'templates',
        fileName,
      ),
      path.join(
        process.cwd(),
        'dist',
        'src',
        'modules',
        'notifications',
        'templates',
        fileName,
      ),
      path.join(
        process.cwd(),
        'dist',
        'modules',
        'notifications',
        'templates',
        fileName,
      ),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }

    return null;
  }

  private mapTemplateBase(type: string) {
    switch (type) {
      case 'EMAIL_VERIFICATION_OTP':
        return 'email-verification-otp';
      case 'BOOKING_CONFIRMED':
        return 'booking-confirmed';
      case 'BOOKING_CANCELLED':
      case 'BOOKING_CANCELLED_BY_GUEST':
        return 'booking-cancelled';
      case 'PAYMENT_PENDING':
        return 'payment-pending';
      case 'PAYMENT_FAILED':
        return 'payment-failed';
      case 'REFUND_PROCESSED':
        return 'refund-processed';
      case 'DOCUMENT_UPLOAD_REQUEST':
        return 'document-upload-request';
      case 'OPS_TASKS_CREATED':
        return 'ops-tasks-created';
      case 'PROPERTY_APPROVED_ACTIVATION_REQUIRED':
        return 'property-approved-activation-required';
      default:
        return 'booking-confirmed';
    }
  }

  private simpleInterpolate(html: string, payload: JsonObject) {
    return html.replace(
      /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,
      (_m, key: string) => {
        const value = this.getNested(payload, key);
        if (value === null || value === undefined) return '';

        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          typeof value === 'bigint'
        ) {
          return this.escapeHtml(String(value));
        }
        if (value instanceof Date) {
          return this.escapeHtml(value.toISOString());
        }
        if (Array.isArray(value) || this.isObject(value)) {
          try {
            return this.escapeHtml(JSON.stringify(value));
          } catch {
            return '';
          }
        }
        return '';
      },
    );
  }

  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private stripHtml(input: string): string {
    return input
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<\/?(p|div|tr|table|h1|h2|h3|li|br)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private getNested(obj: JsonObject, key: string): unknown {
    return key.split('.').reduce<unknown>((acc, k) => {
      if (!this.isObject(acc)) return undefined;
      return acc[k];
    }, obj);
  }
}
