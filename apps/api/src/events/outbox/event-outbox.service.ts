import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import type { DomainEvent } from '../domain-events';

/**
 * Event Outbox Service.
 *
 * Writes domain events to the EventOutbox DB table BEFORE they are published
 * to any queue or in-memory bus. This guarantees durability:
 * - If the server crashes after the DB write but before the queue publish,
 *   the EventOutboxWorker will pick up the unprocessed event and re-publish it.
 * - Events are idempotent by design (ledger upserts, StripeWebhookEvent dedup).
 *
 * Flow:
 *   1. Financial operation completes (inside DB transaction)
 *   2. Call writeToOutbox(event) — DB insert in the SAME transaction (preferred)
 *      or immediately after (acceptable for fire-and-forget)
 *   3. EventOutboxWorker polls unprocessed events every 10s and enqueues them
 *   4. BullMQ processor handles the event (with retry on failure)
 *   5. EventOutboxWorker marks event as processed
 */
@Injectable()
export class EventOutboxService {
  private readonly logger = new Logger(EventOutboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write a domain event to the outbox table.
   * Should ideally be called inside the same DB transaction as the triggering operation.
   */
  async write(event: DomainEvent): Promise<string> {
    const record = await this.prisma.eventOutbox.create({
      data: {
        type: event.type,
        payload: JSON.stringify(event),
      },
    });

    this.logger.debug(`outbox_written id=${record.id} type=${event.type}`);
    return record.id;
  }

  /**
   * Batch write multiple events to the outbox (single DB round-trip).
   */
  async writeBatch(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.prisma.eventOutbox.createMany({
      data: events.map((e) => ({
        type: e.type,
        payload: JSON.stringify(e),
      })),
    });

    this.logger.debug(`outbox_written_batch count=${events.length}`);
  }

  /**
   * Fetch a batch of unprocessed events, ordered by creation time (FIFO).
   */
  async fetchUnprocessed(limit = 50): Promise<
    Array<{
      id: string;
      type: string;
      payload: string;
      attempts: number;
    }>
  > {
    return this.prisma.eventOutbox.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true, type: true, payload: true, attempts: true },
    });
  }

  /**
   * Mark an event as successfully processed.
   */
  async markProcessed(id: string): Promise<void> {
    await this.prisma.eventOutbox.update({
      where: { id },
      data: { processed: true, processedAt: new Date() },
    });
  }

  /**
   * Record a failed attempt (increments attempts, updates lastAttemptAt).
   */
  async recordFailure(id: string): Promise<void> {
    await this.prisma.eventOutbox.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  }

  /**
   * Permanently discard events that have failed more than maxAttempts times.
   * Called by the worker to prevent endless retries on poison events.
   */
  async discardStale(maxAttempts = 10): Promise<number> {
    const result = await this.prisma.eventOutbox.updateMany({
      where: {
        processed: false,
        attempts: { gte: maxAttempts },
      },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
    if (result.count > 0) {
      this.logger.warn(`outbox_discarded_stale count=${result.count} maxAttempts=${maxAttempts}`);
    }
    return result.count;
  }
}
