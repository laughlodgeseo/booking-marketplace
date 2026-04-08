import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationChannel } from '@prisma/client';
import { NotificationEventsService } from './notification-events.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { Resend } from 'resend';

type JsonObject = Record<string, unknown>;
type WorkerMetrics = {
  sent_count: number;
  failed_count: number;
  retry_count: number;
};
type ResendConfig = {
  configured: boolean;
  apiKey: string;
  from: string;
  replyTo: string | undefined;
};
type DeliveryResult = {
  to: string;
  attempt: number;
  latencyMs: number;
  messageId: string | null;
  resendId: string | null;
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
};

@Injectable()
export class NotificationsWorker implements OnModuleInit {
  private readonly logger = new Logger(NotificationsWorker.name);
  private readonly defaultRemoteBrandLogoUrl =
    'https://rentpropertyuae.com/brand/logo.svg';

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

  private cachedResendClient: { key: string; client: Resend } | null = null;

  constructor(
    private readonly events: NotificationEventsService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.warnOnInsecureLogoUrl();
    this.warnOnMissingResendConfig();
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
          resendId: null,
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
            resendId: result.resendId,
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
            resendId: null,
            resendCode: info.code,
            statusCode: info.responseCode,
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
          resendId: null,
          resendCode: info.code,
          statusCode: info.responseCode,
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

    const config = this.resendConfig();
    if (!config.configured) {
      throw new Error(
        'Resend is not configured. Set RESEND_API_KEY environment variable.',
      );
    }

    const startedAt = Date.now();
    return await this.sendViaResend({
      config,
      to,
      subject,
      html,
      text,
      attempt: input.attempt,
      startedAt,
    });
  }

  private async sendViaResend(input: {
    config: ResendConfig;
    to: string;
    subject: string;
    html: string;
    text: string;
    attempt: number;
    startedAt: number;
  }): Promise<DeliveryResult> {
    const client = this.getResendClient(input.config);

    const { data, error } = await client.emails.send({
      from: input.config.from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.config.replyTo ? { reply_to: input.config.replyTo } : {}),
    });

    if (error) {
      const resendError = new Error(error.message) as Error & {
        name: string;
        statusCode?: number;
      };
      resendError.name = error.name;
      const statusCode =
        'statusCode' in error && typeof error.statusCode === 'number'
          ? error.statusCode
          : undefined;
      if (statusCode !== undefined) resendError.statusCode = statusCode;

      this.logger.error(
        `RESEND_SEND_ERROR ${JSON.stringify({
          to: input.to,
          attempt: input.attempt,
          name: error.name,
          message: error.message,
          statusCode,
        })}`,
      );

      throw resendError;
    }

    const latencyMs = Date.now() - input.startedAt;
    const resendId = data?.id ?? null;

    this.logger.log(
      `RESEND_SEND_SUCCESS ${JSON.stringify({
        to: input.to,
        attempt: input.attempt,
        latencyMs,
        resendId,
      })}`,
    );

    return {
      to: input.to,
      attempt: input.attempt,
      latencyMs,
      messageId: resendId,
      resendId,
    };
  }

  private resendConfig(): ResendConfig {
    const apiKey = this.readEnv('RESEND_API_KEY');
    const from =
      this.readEnv('SMTP_FROM') ||
      'RentPropertyUAE <booking@rentpropertyuae.com>';
    const replyTo = this.readEnv('SMTP_REPLY_TO') || undefined;

    return {
      configured: Boolean(apiKey),
      apiKey,
      from,
      replyTo,
    };
  }

  private getResendClient(config: ResendConfig): Resend {
    if (
      this.cachedResendClient &&
      this.cachedResendClient.key === config.apiKey
    ) {
      return this.cachedResendClient.client;
    }

    const client = new Resend(config.apiKey);
    this.cachedResendClient = { key: config.apiKey, client };
    return client;
  }

  private async lookupUserEmail(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return u?.email?.trim().toLowerCase() ?? null;
  }

  private warnOnMissingResendConfig() {
    const config = this.resendConfig();
    if (config.configured) return;

    this.logger.error(
      'Resend is not configured. Email notifications (including verification OTP) will fail until RESEND_API_KEY is set.',
    );
  }

  private warnOnInsecureLogoUrl() {
    const rawLogoUrl = (process.env.BRAND_LOGO_URL || '').trim();

    if (!rawLogoUrl) {
      this.logger.warn(
        'BRAND_LOGO_URL is not set. Set BRAND_LOGO_URL to an HTTPS logo URL.',
      );
      return;
    }

    const lower = rawLogoUrl.toLowerCase();
    if (!lower.startsWith('https://')) {
      this.logger.warn(
        'BRAND_LOGO_URL should use HTTPS to ensure images render correctly in email clients.',
      );
    }
  }

  private readEnv(key: string): string {
    const raw = (process.env[key] || '').trim();
    if (raw.length >= 2) {
      const first = raw[0];
      const last = raw[raw.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return raw.slice(1, -1).trim();
      }
    }
    return raw;
  }

  private computeBackoffMs(attempt: number): number {
    const exponent = Math.max(0, attempt - 1);
    const delayMs = this.retryBaseMs * 2 ** exponent;
    return Math.min(delayMs, this.retryMaxMs);
  }

  private classifyDeliveryError(err: unknown): DeliveryErrorInfo {
    const message = this.errMessage(err).toLowerCase();
    const record = this.toRecord(err);

    const rawCode = record.code ?? record.name;
    const code = typeof rawCode === 'string' ? rawCode.toUpperCase() : null;

    const rawStatusCode = record.statusCode;
    const responseCode =
      typeof rawStatusCode === 'number'
        ? rawStatusCode
        : typeof rawStatusCode === 'string' &&
            Number.isFinite(Number(rawStatusCode))
          ? Number(rawStatusCode)
          : null;

    if (message.includes('template') || message.includes('interpolate')) {
      return { retryable: false, reason: 'template_error', code, responseCode };
    }

    // Auth failures
    if (
      responseCode === 401 ||
      responseCode === 403 ||
      message.includes('api key') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return {
        retryable: false,
        reason: 'api_auth_failure',
        code,
        responseCode,
      };
    }

    // Invalid recipient / validation
    if (
      responseCode === 422 ||
      (message.includes('invalid') && message.includes('email'))
    ) {
      return {
        retryable: false,
        reason: 'invalid_recipient',
        code,
        responseCode,
      };
    }

    // Bad request (non-retryable)
    if (responseCode === 400) {
      return { retryable: false, reason: 'bad_request', code, responseCode };
    }

    // Rate limited — retryable
    if (responseCode === 429 || message.includes('rate limit')) {
      return { retryable: true, reason: 'rate_limited', code, responseCode };
    }

    // Server errors — retryable
    if (responseCode !== null && responseCode >= 500) {
      return { retryable: true, reason: 'server_error', code, responseCode };
    }

    // Network transient errors
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

    if (message.includes('timeout') || message.includes('network')) {
      return {
        retryable: true,
        reason: 'network_transient',
        code,
        responseCode,
      };
    }

    return { retryable: false, reason: 'non_retryable', code, responseCode };
  }

  private extractErrorContext(err: unknown): DeliveryErrorContext {
    const record = this.toRecord(err);
    const to = typeof record.to === 'string' ? record.to : undefined;
    const latencyMs =
      typeof record.latencyMs === 'number' ? record.latencyMs : undefined;
    return { to, latencyMs };
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
    const logoUrl =
      (process.env.BRAND_LOGO_URL || '').trim() ||
      this.defaultRemoteBrandLogoUrl;
    return {
      name: 'RentPropertyUAE',
      legalName: 'RentPropertyUAE',
      domain: 'rentpropertyuae.com',
      supportEmail: 'info@rentpropertyuae.com',
      bookingEmail: 'booking@rentpropertyuae.com',
      phone: '+971 50 234 8756',
      country: 'United Arab Emirates',
      logoUrl,
    };
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
