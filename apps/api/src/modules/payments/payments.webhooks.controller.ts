import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Optional,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type Stripe from 'stripe';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { StripePaymentsProvider } from './providers/stripe.provider';
import { QUEUE_NAMES } from '../../infra/queues/queues.constants';
import type { StripeWebhookJobPayload } from '../../infra/queues/processors/stripe-webhook.processor';

@ApiTags('payments-webhooks')
@Controller()
@Throttle({ default: { limit: 100, ttl: 60_000 } })
export class PaymentsWebhooksController {
  private readonly logger = new Logger(PaymentsWebhooksController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly stripeProvider: StripePaymentsProvider,
    /**
     * Queue is @Optional so the controller still works in environments
     * where Redis / BullMQ is unavailable (falls back to synchronous mode).
     */
    @Optional()
    @InjectQueue(QUEUE_NAMES.STRIPE_WEBHOOK)
    private readonly stripeWebhookQueue: Queue<StripeWebhookJobPayload> | null,
  ) {}

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  async stripe(@Req() req: Request) {
    const signature = this.readHeader(req, 'stripe-signature');
    const rawBody = this.readRawBody(req);

    if (!signature || !rawBody) {
      throw new BadRequestException('Stripe signature or raw payload missing.');
    }

    // ── Signature verification (synchronous, must happen before any async work) ──
    let event: Stripe.Event;
    try {
      event = this.stripeProvider.constructWebhookEvent({
        rawBody,
        signature,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      });
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }

    this.logger.log(`stripe_webhook received eventType=${event.type} eventId=${event.id}`);

    // ── Async path: enqueue and return 200 immediately ────────────────────────
    if (this.stripeWebhookQueue) {
      try {
        await this.stripeWebhookQueue.add(
          'process-stripe-event',
          {
            eventId: event.id,
            eventType: event.type,
            event,
          },
          {
            jobId: event.id,     // deduplication: same Stripe event ID → same job
            attempts: 3,
            backoff: { type: 'exponential', delay: 1_000 },
          },
        );
        this.logger.log(
          `stripe_webhook enqueued eventType=${event.type} eventId=${event.id}`,
        );
        return { received: true };
      } catch (queueError) {
        // Queue unavailable — fall through to synchronous processing.
        this.logger.warn(
          `stripe_webhook queue_unavailable, falling back to sync: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
      }
    }

    // ── Synchronous fallback (queue unavailable or not configured) ─────────────
    try {
      await this.processSynchronously(event);
    } catch (error: unknown) {
      this.logger.error(
        `stripe_webhook sync_processing_failed eventType=${event.type}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return { received: true };
  }

  /**
   * Synchronous processing path — used when BullMQ is unavailable.
   * Mirrors the StripeWebhookProcessor logic exactly.
   */
  private async processSynchronously(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const bookingId = this.readBookingIdFromCheckoutSession(session);
        this.logger.log(
          `stripe_webhook_sync eventType=${event.type} bookingId=${bookingId ?? 'n/a'}`,
        );
        const result = await this.payments.handleStripeCheckoutSessionCompleted({
          eventId: event.id,
          session,
        });
        this.logger.log(
          `stripe_webhook_sync handled eventType=${event.type} bookingId=${result.bookingId ?? 'n/a'} reused=${result.reused}`,
        );
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const bookingId = (paymentIntent.metadata?.bookingId ?? '').trim() || null;
        this.logger.log(
          `stripe_webhook_sync eventType=${event.type} bookingId=${bookingId ?? 'n/a'}`,
        );
        const result = await this.payments.handleStripePaymentIntentSucceeded({
          eventId: event.id,
          paymentIntent,
        });
        this.logger.log(
          `stripe_webhook_sync handled eventType=${event.type} reused=${result.reused}`,
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const bookingId = (paymentIntent.metadata?.bookingId ?? '').trim() || null;
        this.logger.log(
          `stripe_webhook_sync eventType=${event.type} bookingId=${bookingId ?? 'n/a'}`,
        );
        const result = await this.payments.handleStripePaymentIntentFailed({
          eventId: event.id,
          paymentIntent,
        });
        this.logger.log(
          `stripe_webhook_sync handled eventType=${event.type} reused=${result.reused}`,
        );
        break;
      }

      case 'payment_intent.processing': {
        const paymentIntent = event.data.object;
        const bookingId = (paymentIntent.metadata?.bookingId ?? '').trim() || null;
        this.logger.log(
          `stripe_webhook_sync eventType=${event.type} bookingId=${bookingId ?? 'n/a'}`,
        );
        const result = await this.payments.handleStripePaymentIntentProcessing({
          eventId: event.id,
          paymentIntent,
        });
        this.logger.log(
          `stripe_webhook_sync handled eventType=${event.type} reused=${result.reused}`,
        );
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        const bookingId = (paymentIntent.metadata?.bookingId ?? '').trim() || null;
        this.logger.log(
          `stripe_webhook_sync eventType=${event.type} bookingId=${bookingId ?? 'n/a'}`,
        );
        const result = await this.payments.handleStripePaymentIntentCanceled({
          eventId: event.id,
          paymentIntent,
        });
        this.logger.log(
          `stripe_webhook_sync handled eventType=${event.type} reused=${result.reused}`,
        );
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        this.logger.log(`stripe_webhook_sync eventType=${event.type}`);
        const result = await this.payments.handleStripeChargeRefunded({
          eventId: event.id,
          charge,
        });
        this.logger.log(
          `stripe_webhook_sync handled eventType=${event.type} reused=${result.reused}`,
        );
        break;
      }

      default:
        this.logger.log(`stripe_webhook_sync ignored eventType=${event.type}`);
    }
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

  private readRawBody(req: Request): Buffer | null {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') {
      return Buffer.from(req.body);
    }
    return null;
  }

  private readBookingIdFromCheckoutSession(
    session: Stripe.Checkout.Session,
  ): string | null {
    const bookingId = session.metadata?.bookingId;
    if (typeof bookingId !== 'string') return null;
    return bookingId.trim() || null;
  }
}
