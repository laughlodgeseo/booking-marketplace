import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class TelrWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const providedSignature = this.extractSignature(req);
    if (!providedSignature) {
      throw new HttpException(
        {
          ok: false,
          code: 'TELR_SIGNATURE_MISSING',
          message: 'TELR webhook signature is required.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const secret = (process.env.TELR_AUTH_KEY ?? '').trim();
    if (!secret) {
      throw new HttpException(
        {
          ok: false,
          code: 'TELR_WEBHOOK_NOT_CONFIGURED',
          message: 'TELR webhook secret is not configured.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const canonicalPayload = this.canonicalizePayload(req.body);
    const expectedSignature = createHmac('sha256', secret)
      .update(canonicalPayload)
      .digest('hex');

    const actual = this.normalizeSignature(providedSignature);
    if (!this.safeEquals(actual, expectedSignature)) {
      throw new HttpException(
        {
          ok: false,
          code: 'TELR_SIGNATURE_INVALID',
          message: 'Invalid TELR webhook signature.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private extractSignature(req: Request): string | null {
    const headerValue = req.headers['x-telr-signature'];
    if (typeof headerValue === 'string' && headerValue.trim()) {
      return headerValue.trim();
    }
    if (Array.isArray(headerValue)) {
      for (const value of headerValue) {
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
    }

    const body = this.asRecord(req.body);
    const bodySignature =
      this.readString(body['signature']) ??
      this.readString(body['sig']) ??
      this.readString(body['x_telr_signature']);

    return bodySignature?.trim() || null;
  }

  private canonicalizePayload(body: unknown): string {
    const record = this.asRecord(body);
    const sanitized: JsonRecord = {};

    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey === 'signature' ||
        normalizedKey === 'sig' ||
        normalizedKey === 'x_telr_signature'
      ) {
        continue;
      }
      sanitized[key] = value;
    }

    return this.stableStringify(sanitized);
  }

  private stableStringify(value: unknown): string {
    if (value === null) return 'null';

    const valueType = typeof value;
    if (
      valueType === 'string' ||
      valueType === 'number' ||
      valueType === 'boolean'
    ) {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      const serializedItems = value.map((item) => this.stableStringify(item));
      return `[${serializedItems.join(',')}]`;
    }

    if (valueType === 'object') {
      const record = value as JsonRecord;
      const entries = Object.entries(record).sort(([a], [b]) =>
        a.localeCompare(b),
      );
      const serializedEntries = entries.map(
        ([key, item]) => `${JSON.stringify(key)}:${this.stableStringify(item)}`,
      );
      return `{${serializedEntries.join(',')}}`;
    }

    return JSON.stringify(null);
  }

  private normalizeSignature(raw: string): string {
    const trimmed = raw.trim();
    const withoutPrefix = trimmed.toLowerCase().startsWith('sha256=')
      ? trimmed.slice('sha256='.length)
      : trimmed;
    return withoutPrefix.trim().toLowerCase();
  }

  private safeEquals(a: string, b: string): boolean {
    if (!a || !b) return false;

    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;

    return timingSafeEqual(aBuf, bBuf);
  }

  private asRecord(value: unknown): JsonRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as JsonRecord;
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
