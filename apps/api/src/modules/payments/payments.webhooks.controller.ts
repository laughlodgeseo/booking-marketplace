import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type Stripe from 'stripe';

import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { StripePaymentsProvider } from './providers/stripe.provider';

@ApiTags('payments-webhooks')
@Controller()
@Throttle({ default: { limit: 100, ttl: 60_000 } })
export class PaymentsWebhooksController {
  private readonly logger = new Logger(PaymentsWebhooksController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly stripeProvider: StripePaymentsProvider,
  ) {}

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  async stripe(@Req() req: Request) {
    const signature = this.readHeader(req, 'stripe-signature');
    const rawBody = this.readRawBody(req);

    if (!signature || !rawBody) {
      throw new BadRequestException('Stripe signature or raw payload missing.');
    }

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

    this.logger.log(`stripe_webhook eventType=${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const bookingId = this.readBookingIdFromCheckoutSession(session);
          this.logger.log(
            `stripe_webhook eventType=${event.type} bookingId=${bookingId ?? 'n/a'}`,
          );

          const result =
            await this.payments.handleStripeCheckoutSessionCompleted({
              eventId: event.id,
              session,
            });

          this.logger.log(
            `stripe_webhook transition bookingId=${result.bookingId ?? 'n/a'} bookingStatus=${result.previousBookingStatus ?? 'n/a'}->${result.nextBookingStatus ?? 'n/a'} paymentStatus=${result.previousPaymentStatus ?? 'n/a'}->${result.nextPaymentStatus ?? 'n/a'} reused=${result.reused} ignored=${result.ignored}`,
          );
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          const bookingId =
            (paymentIntent.metadata?.bookingId ?? '').trim() || null;
          this.logger.log(
            `stripe_webhook eventType=${event.type} bookingId=${bookingId ?? 'n/a'}`,
          );

          const result =
            await this.payments.handleStripePaymentIntentFailedByMetadata({
              eventId: event.id,
              paymentIntent,
            });

          this.logger.log(
            `stripe_webhook transition bookingId=${result.bookingId ?? 'n/a'} bookingStatus=${result.previousBookingStatus ?? 'n/a'}->${result.nextBookingStatus ?? 'n/a'} paymentStatus=${result.previousPaymentStatus ?? 'n/a'}->${result.nextPaymentStatus ?? 'n/a'} reused=${result.reused} ignored=${result.ignored}`,
          );
          break;
        }
        default:
          this.logger.log(`stripe_webhook ignored eventType=${event.type}`);
      }
    } catch (error: unknown) {
      this.logger.error(
        `stripe_webhook processing_failed eventType=${event.type}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return { received: true };
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
