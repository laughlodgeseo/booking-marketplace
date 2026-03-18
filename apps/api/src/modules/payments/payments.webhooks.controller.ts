import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type Stripe from 'stripe';

import { PaymentsService } from './payments.service';
import { StripePaymentsProvider } from './providers/stripe.provider';

@ApiTags('payments-webhooks')
@Controller('webhooks')
export class PaymentsWebhooksController {
  private readonly logger = new Logger(PaymentsWebhooksController.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly stripeProvider: StripePaymentsProvider,
  ) {}

  /**
   * STRIPE:
   * - Verify webhook signature (STRIPE_WEBHOOK_SECRET)
   * - Never trust frontend for confirmation
   * - Idempotent handling based on Stripe event.id
   */
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async stripe(@Req() req: Request) {
    const signature = this.readHeader(req, 'stripe-signature');
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    if (!signature || !rawBody) {
      throw new HttpException(
        {
          ok: false,
          code: 'STRIPE_SIGNATURE_MISSING',
          message: 'Stripe webhook signature or payload missing.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripeProvider.constructWebhookEvent({
        rawBody,
        signature,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      });
    } catch (error) {
      this.logger.warn('Stripe webhook signature verification failed.');
      throw new HttpException(
        {
          ok: false,
          code: 'STRIPE_SIGNATURE_INVALID',
          message: 'Invalid Stripe webhook signature.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result = await this.payments.handleStripePaymentIntentSucceeded(
            {
              eventId: event.id,
              paymentIntent,
            },
          );
          return {
            ok: true,
            action: 'payment_intent_succeeded',
            reused: result.reused,
            ignored: result.ignored ?? false,
          };
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result = await this.payments.handleStripePaymentIntentFailed({
            eventId: event.id,
            paymentIntent,
          });
          return {
            ok: true,
            action: 'payment_intent_failed',
            reused: result.reused,
            ignored: result.ignored ?? false,
          };
        }
        case 'payment_intent.canceled': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result = await this.payments.handleStripePaymentIntentCanceled({
            eventId: event.id,
            paymentIntent,
          });
          return {
            ok: true,
            action: 'payment_intent_canceled',
            reused: result.reused,
            ignored: result.ignored ?? false,
          };
        }
        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          const result = await this.payments.handleStripeChargeRefunded({
            eventId: event.id,
            charge,
          });
          return {
            ok: true,
            action: 'charge_refunded',
            reused: result.reused,
            ignored: result.ignored ?? false,
          };
        }
        default:
          return { ok: true, action: 'ignored', type: event.type };
      }
    } catch (error) {
      const mapped = this.mapClientCausedError(error);
      if (mapped) {
        this.logger.warn(`Stripe webhook ignored: ${mapped}`);
        return { ok: true, action: 'ignored', reason: mapped };
      }
      throw error;
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

  private mapClientCausedError(error: unknown): string | null {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      if (status >= 400 && status < 500) {
        return 'invalid_or_unmatched_payload';
      }
    }

    return null;
  }
}
