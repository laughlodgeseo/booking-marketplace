import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type Stripe from 'stripe';
import { PaymentsService } from '../../../modules/payments/payments.service';
import { QUEUE_NAMES, JOB_NAMES } from '../queues.constants';

export type StripeWebhookJobPayload = {
  eventId: string;
  eventType: string;
  /** The full parsed Stripe.Event object (already signature-verified). */
  event: Stripe.Event;
};

/**
 * BullMQ processor for the stripe-webhook queue.
 *
 * The controller validates the Stripe signature and enqueues the job.
 * This processor runs the actual DB operations asynchronously, with:
 * - 3 retry attempts (exponential backoff, max ~8s)
 * - Full idempotency via StripeWebhookEvent deduplication in PaymentsService
 * - Concurrency: 5 (five events processed in parallel per worker instance)
 *
 * Stripe SLA: must return HTTP 200 within 30s.
 * With this pattern, the webhook endpoint returns 200 in < 50ms.
 */
@Processor(QUEUE_NAMES.STRIPE_WEBHOOK, { concurrency: 5 })
export class StripeWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(StripeWebhookProcessor.name);

  constructor(private readonly payments: PaymentsService) {
    super();
  }

  async process(job: Job<StripeWebhookJobPayload>): Promise<void> {
    const { eventId, eventType, event } = job.data;

    this.logger.log(
      `stripe_processor jobId=${job.id} eventType=${eventType} eventId=${eventId} attempt=${job.attemptsMade + 1}`,
    );

    try {
      switch (eventType) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const result =
            await this.payments.handleStripeCheckoutSessionCompleted({
              eventId,
              session,
            });
          this.logger.log(
            `stripe_processor handled eventType=${eventType} bookingId=${result.bookingId ?? 'n/a'} reused=${result.reused} ignored=${result.ignored}`,
          );
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result = await this.payments.handleStripePaymentIntentSucceeded(
            {
              eventId,
              paymentIntent,
            },
          );
          this.logger.log(
            `stripe_processor handled eventType=${eventType} reused=${result.reused} ignored=${result.ignored ?? false}`,
          );
          break;
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result = await this.payments.handleStripePaymentIntentFailed({
            eventId,
            paymentIntent,
          });
          this.logger.log(
            `stripe_processor handled eventType=${eventType} reused=${result.reused} ignored=${result.ignored ?? false}`,
          );
          break;
        }

        case 'payment_intent.processing': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result =
            await this.payments.handleStripePaymentIntentProcessing({
              eventId,
              paymentIntent,
            });
          this.logger.log(
            `stripe_processor handled eventType=${eventType} reused=${result.reused} ignored=${result.ignored ?? false}`,
          );
          break;
        }

        case 'payment_intent.canceled': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result = await this.payments.handleStripePaymentIntentCanceled({
            eventId,
            paymentIntent,
          });
          this.logger.log(
            `stripe_processor handled eventType=${eventType} reused=${result.reused} ignored=${result.ignored ?? false}`,
          );
          break;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          const result = await this.payments.handleStripeChargeRefunded({
            eventId,
            charge,
          });
          this.logger.log(
            `stripe_processor handled eventType=${eventType} reused=${result.reused} ignored=${result.ignored ?? false}`,
          );
          break;
        }

        default:
          // Unhandled but not an error — Stripe sends many event types.
          this.logger.debug(`stripe_processor ignored eventType=${eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `stripe_processor failed jobId=${job.id} eventType=${eventType} attempt=${job.attemptsMade + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Re-throw so BullMQ records the failure and retries with backoff.
      throw error;
    }
  }
}

// Satisfy the import reference used in queue.module.ts
export const STRIPE_WEBHOOK_JOB = JOB_NAMES.stripe.PROCESS_EVENT;
