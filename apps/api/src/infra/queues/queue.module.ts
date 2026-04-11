import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queues.constants';
import { StripeWebhookProcessor } from './processors/stripe-webhook.processor';
import { PaymentsModule } from '../../modules/payments/payments.module';

/**
 * BullMQ queue registration.
 *
 * All queues share a single Redis connection derived from REDIS_URL.
 * Each queue has:
 * - exponential backoff retry (3 attempts, max 30s delay)
 * - job TTL of 7 days before auto-removal
 * - concurrency tuned per queue criticality
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          url: process.env.REDIS_URL ?? 'redis://localhost:6379',
          maxRetriesPerRequest: 3,
          enableOfflineQueue: false,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1_000,
          },
          removeOnComplete: { age: 7 * 24 * 3600, count: 1_000 },
          removeOnFail: { age: 30 * 24 * 3600 },
        },
      }),
    }),

    BullModule.registerQueue(
      { name: QUEUE_NAMES.STRIPE_WEBHOOK },
      { name: QUEUE_NAMES.REFUND },
      { name: QUEUE_NAMES.PAYOUT },
      { name: QUEUE_NAMES.NOTIFICATION },
    ),

    // Processor dependencies
    PaymentsModule,
  ],
  providers: [StripeWebhookProcessor],
  exports: [BullModule],
})
export class QueueModule {}
