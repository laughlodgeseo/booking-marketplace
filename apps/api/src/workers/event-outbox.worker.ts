import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { EventOutboxService } from '../events/outbox/event-outbox.service';
import { EventBusService } from '../events/event-bus.service';
import { QUEUE_NAMES } from '../infra/queues/queues.constants';
import type { DomainEvent } from '../events/domain-events';

/**
 * Event Outbox Worker.
 *
 * Polls the EventOutbox table every 10 seconds for unprocessed events.
 *
 * For each event:
 * 1. Publishes to the in-memory EventBusService (same-process subscribers)
 * 2. If BullMQ is available, also enqueues in the appropriate durable queue
 * 3. Marks event as processed on success
 *
 * This ensures domain events survive server restarts:
 * - If the server crashes mid-emit, the event remains unprocessed in the DB.
 * - On restart, this worker picks it up and re-emits it.
 * - All consumers are idempotent, so re-delivery is safe.
 *
 * Max 5 retries per event, then discarded to the stale log.
 */
@Injectable()
export class EventOutboxWorker {
  private readonly logger = new Logger(EventOutboxWorker.name);
  private static readonly BATCH_SIZE = 50;
  private static readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly outbox: EventOutboxService,
    private readonly eventBus: EventBusService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue | null,
  ) {}

  /** Every 10 seconds. */
  @Cron('*/10 * * * * *')
  async processOutbox(): Promise<void> {
    // Discard poison events that have exceeded max attempts
    await this.outbox.discardStale(EventOutboxWorker.MAX_ATTEMPTS);

    const events = await this.outbox.fetchUnprocessed(
      EventOutboxWorker.BATCH_SIZE,
    );
    if (events.length === 0) return;

    let processed = 0;
    let failed = 0;

    for (const record of events) {
      try {
        const event = JSON.parse(record.payload) as DomainEvent;

        // Re-publish to in-memory bus for same-process subscribers (e.g. cache invalidation)
        this.eventBus.publish(event);

        // Route to durable queues for cross-service subscribers
        await this.routeToDurableQueue(event);

        await this.outbox.markProcessed(record.id);
        processed += 1;
      } catch (err) {
        failed += 1;
        await this.outbox.recordFailure(record.id).catch(() => {});
        this.logger.warn(
          `outbox_processing_failed id=${record.id} type=${record.type} attempt=${record.attempts + 1}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (processed > 0 || failed > 0) {
      this.logger.log(
        `outbox_cycle processed=${processed} failed=${failed} total=${events.length}`,
      );
    }
  }

  /**
   * Route domain events to the appropriate BullMQ queue.
   * Currently only notification events go to the notification queue.
   * Future: add payment/refund/payout routing here.
   */
  private async routeToDurableQueue(event: DomainEvent): Promise<void> {
    if (!this.notificationQueue) return;

    // Notification-worthy events
    const notificationTypes = new Set([
      'PaymentSucceeded',
      'RefundSucceeded',
      'PayoutTriggered',
      'DepositReleased',
      'DepositClaimed',
    ]);

    if (notificationTypes.has(event.type)) {
      await this.notificationQueue.add(
        'send-notification',
        { event },
        {
          jobId: `notif:${event.type}:${JSON.stringify(event).slice(0, 50)}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2_000 },
        },
      );
    }
  }
}
