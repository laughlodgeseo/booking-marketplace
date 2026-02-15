import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { PaymentsService } from './payments.service';
import { TelrWebhookGuard } from './guards/telr-webhook.guard';

type TelrWebhookBody = Record<string, unknown>;
type TelrIntent = 'CAPTURED' | 'FAILED';

type ParsedTelrPayload =
  | {
      ok: true;
      bookingId: string;
      providerRef: string;
      transactionRef: string | null;
      status: string;
      intent: TelrIntent;
    }
  | { ok: false; reason: string };
type ValidTelrPayload = Exclude<ParsedTelrPayload, { ok: false }>;

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TELR_REF_REGEX = /^[A-Za-z0-9._:-]{3,128}$/;
const SUCCESS_STATUSES = new Set([
  '3',
  'paid',
  'captured',
  'authorised',
  'authorized',
  'success',
  'succeeded',
]);
const FAILED_STATUSES = new Set([
  'failed',
  'declined',
  'cancelled',
  'canceled',
  'void',
  'refunded',
  'chargeback',
]);

@ApiTags('payments-webhooks')
@Controller('payments/webhooks')
export class PaymentsWebhooksController {
  private readonly logger = new Logger(PaymentsWebhooksController.name);

  constructor(private readonly payments: PaymentsService) {}

  /**
   * TELR:
   * - ACK quickly (avoid webhook retry storms)
   * - NEVER confirm booking from payload alone
   * - We verify against Telr gateway (server-to-server "check") inside PaymentsService
   */
  @UseGuards(TelrWebhookGuard)
  @Post('telr')
  @HttpCode(HttpStatus.OK)
  async telr(@Body() body: TelrWebhookBody, @Req() req: Request) {
    const parsed = this.parseTelrPayload(body);
    if (!parsed.ok) {
      this.logger.warn(`TELR webhook ignored: ${parsed.reason}`);
      return this.ackIgnored(parsed.reason);
    }

    const webhookEventId = this.buildWebhookEventId(parsed);

    try {
      const devSimulation = this.parseDevSimulationRequest(req, body, parsed);
      if (devSimulation && parsed.intent === 'CAPTURED') {
        const result = await this.payments.handleTelrWebhookCapturedVerified({
          bookingId: parsed.bookingId,
          providerRef: parsed.providerRef,
          webhookEventId,
          currency: devSimulation.currency,
          amountMinor: devSimulation.amountMinor,
          statusCode: devSimulation.statusCode,
          statusText: devSimulation.statusText,
        });

        return {
          ok: true,
          action: 'captured_verified',
          reused: result.reused,
          simulated: true,
          webhookEventId,
        };
      }

      if (parsed.intent === 'FAILED') {
        await this.payments.handleWebhookPaymentFailed({
          provider: 'TELR',
          bookingId: parsed.bookingId,
          providerRef: parsed.providerRef,
          webhookEventId,
        });

        return {
          ok: true,
          action: 'failed_recorded',
          webhookEventId,
        };
      }

      const result = await this.payments.handleTelrWebhookCaptured({
        bookingId: parsed.bookingId,
        providerRef: parsed.providerRef,
        webhookEventId,
      });

      return {
        ok: true,
        action: 'captured_verified',
        reused: result.reused,
        webhookEventId,
      };
    } catch (error) {
      const mapped = this.mapClientCausedError(error);
      if (mapped) {
        this.logger.warn(`TELR webhook ignored: ${mapped}`);
        return this.ackIgnored(mapped);
      }
      throw error;
    }
  }

  private parseTelrPayload(body: TelrWebhookBody): ParsedTelrPayload {
    const bookingId =
      this.readString(body['cartid']) ??
      this.readString(body['ivp_cart']) ??
      '';
    const providerRef =
      this.readString(body['order_ref']) ??
      this.readString(body['orderref']) ??
      this.readString(body['ref']) ??
      '';

    const transactionRef =
      this.readString(body['tran_ref']) ?? this.readString(body['event_id']);

    const statusValue = this.extractStatus(body);
    const normalizedStatus = this.normalizeStatus(statusValue);

    if (!bookingId || !providerRef || !normalizedStatus) {
      return { ok: false, reason: 'missing_required_fields' };
    }

    if (!UUID_V4_REGEX.test(bookingId)) {
      return { ok: false, reason: 'invalid_booking_id_format' };
    }

    if (!TELR_REF_REGEX.test(providerRef)) {
      return { ok: false, reason: 'invalid_provider_ref_format' };
    }

    if (transactionRef && !TELR_REF_REGEX.test(transactionRef)) {
      return { ok: false, reason: 'invalid_transaction_ref_format' };
    }

    if (SUCCESS_STATUSES.has(normalizedStatus)) {
      return {
        ok: true,
        bookingId,
        providerRef,
        transactionRef: transactionRef ?? null,
        status: normalizedStatus,
        intent: 'CAPTURED',
      };
    }

    if (FAILED_STATUSES.has(normalizedStatus)) {
      return {
        ok: true,
        bookingId,
        providerRef,
        transactionRef: transactionRef ?? null,
        status: normalizedStatus,
        intent: 'FAILED',
      };
    }

    return { ok: false, reason: 'ignored_status' };
  }

  private buildWebhookEventId(payload: {
    bookingId: string;
    providerRef: string;
    transactionRef: string | null;
    status: string;
  }): string {
    const txPart = this.normalizeKeyPart(
      payload.transactionRef ?? payload.providerRef,
    );
    const statusPart = this.normalizeKeyPart(payload.status);
    const providerRefPart = this.normalizeKeyPart(payload.providerRef);
    const bookingPart = this.normalizeKeyPart(payload.bookingId);

    return `telr:${txPart}:${statusPart}:${providerRefPart}:${bookingPart}`;
  }

  private ackIgnored(reason: string) {
    return {
      ok: true,
      action: 'ignored',
      reason,
    };
  }

  private mapClientCausedError(error: unknown): string | null {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      if (status >= 400 && status < 500) {
        return 'invalid_or_unmatched_payload';
      }
      return null;
    }

    if (!(error instanceof Error)) return null;
    const message = (error.message ?? '').toLowerCase();

    if (message.startsWith('telr check:')) {
      return 'verification_rejected';
    }
    if (message.includes('telr check failed (http 4')) {
      return 'verification_rejected';
    }
    if (message.includes('telr returned non-json response (http 4')) {
      return 'verification_rejected';
    }

    return null;
  }

  private parseDevSimulationRequest(
    req: Request,
    body: TelrWebhookBody,
    parsed: ValidTelrPayload,
  ): {
    currency: string;
    amountMinor: number;
    statusCode: string;
    statusText: string;
  } | null {
    const simulationHeader = this.readHeader(req, 'x-dev-webhook-sim');
    if (simulationHeader !== '1') return null;

    if ((process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production') {
      throw new HttpException(
        {
          ok: false,
          code: 'DEV_WEBHOOK_SIM_DISABLED',
          message: 'DEV webhook simulation is not available in production.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (!this.isLocalRequest(req)) {
      throw new HttpException(
        {
          ok: false,
          code: 'DEV_WEBHOOK_SIM_FORBIDDEN',
          message: 'DEV webhook simulation is localhost-only.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (parsed.intent !== 'CAPTURED') {
      return null;
    }

    const currency = this.readString(body['sim_currency']);
    const amountMinor = this.readPositiveInt(body['sim_amount_minor']);

    if (!currency || amountMinor === null) {
      throw new HttpException(
        {
          ok: false,
          code: 'DEV_WEBHOOK_SIM_INVALID_PAYLOAD',
          message:
            'sim_currency (string) and sim_amount_minor (positive integer) are required for DEV simulation.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const statusCode =
      this.readString(body['sim_status_code']) ??
      `DEV_${parsed.status.toUpperCase()}`;
    const statusText =
      this.readString(body['sim_status_text']) ?? 'DEV_SIMULATED';

    return {
      currency,
      amountMinor,
      statusCode,
      statusText,
    };
  }

  private extractStatus(body: TelrWebhookBody): string | null {
    const direct =
      this.readString(body['status']) ?? this.readString(body['tran_status']);
    if (direct) return direct;

    const order = this.asRecord(body['order']);
    const orderStatus = this.asRecord(order['status']);
    const nestedOrderStatus =
      this.readString(orderStatus['code']) ??
      this.readString(orderStatus['text']);
    if (nestedOrderStatus) return nestedOrderStatus;

    const transaction = this.asRecord(body['transaction']);
    return this.readString(transaction['status']);
  }

  private normalizeStatus(value: string | null): string {
    return (value ?? '').trim().toLowerCase();
  }

  private normalizeKeyPart(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._:-]/g, '_');
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private readPositiveInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const n = Number.parseInt(value.trim(), 10);
      if (Number.isInteger(n) && n > 0) return n;
    }

    return null;
  }

  private readHeader(req: Request, name: string): string | null {
    const raw = req.headers[name];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === 'string' && item.trim()) return item.trim();
      }
    }
    return null;
  }

  private isLocalRequest(req: Request): boolean {
    const hostname = (req.hostname ?? '').toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    const ip = (req.ip ?? '').trim();
    return (
      ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.0.0.1')
    );
  }
}
