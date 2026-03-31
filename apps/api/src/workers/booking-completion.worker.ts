import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class BookingCompletionWorker {
  private readonly logger = new Logger(BookingCompletionWorker.name);

  /**
   * Runs every 10 minutes.
   * Transitions CONFIRMED bookings to COMPLETED after checkout date has passed.
   */
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async completeExpiredBookings() {
    const now = new Date();

    // Batch size to avoid memory issues on large datasets
    const BATCH_SIZE = 200;

    const eligibleBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        checkOut: { lt: now },
      },
      select: { id: true },
      take: BATCH_SIZE,
    });

    if (eligibleBookings.length === 0) return;

    let completedCount = 0;
    let failedCount = 0;

    for (const booking of eligibleBookings) {
      try {
        await this.prisma.booking.update({
          where: {
            id: booking.id,
            // Re-check status to ensure idempotency (no double-complete)
            status: BookingStatus.CONFIRMED,
          },
          data: {
            status: BookingStatus.COMPLETED,
            completedAt: now,
          },
        });
        completedCount += 1;
      } catch (error) {
        // Prisma throws P2025 if the where condition doesn't match (already completed/cancelled)
        const code =
          error && typeof error === 'object' && 'code' in error
            ? (error as { code: string }).code
            : null;
        if (code === 'P2025') {
          // Already transitioned — skip silently (idempotent)
          continue;
        }
        failedCount += 1;
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to complete booking ${booking.id}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Completion worker processed ${eligibleBookings.length} booking(s): completed=${completedCount}, failed=${failedCount}.`,
    );
  }
}
