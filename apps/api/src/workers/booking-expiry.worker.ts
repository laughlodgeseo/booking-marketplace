import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BookingStatus,
  CancellationMode,
  CancellationReason,
} from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';

@Injectable()
export class BookingExpiryWorker {
  private readonly logger = new Logger(BookingExpiryWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookings: BookingsService,
  ) {}

  /**
   * Runs every minute
   * Cancels unpaid, expired bookings
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cancelExpiredBookings() {
    const now = new Date();

    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        expiresAt: { lte: now },
      },
      select: { id: true },
    });

    if (expiredBookings.length === 0) return;

    let cancelledCount = 0;
    let alreadyCancelledCount = 0;
    let failedCount = 0;

    for (const booking of expiredBookings) {
      try {
        const result = await this.bookings.cancelBooking({
          bookingId: booking.id,
          actorUser: {
            id: 'system-booking-expiry-worker',
            role: 'SYSTEM',
          },
          dto: {
            reason: CancellationReason.AUTO_EXPIRED_UNPAID,
            mode: CancellationMode.SOFT,
            notes: 'Auto-expired unpaid booking by scheduler.',
          },
        });

        if (result.alreadyCancelled) alreadyCancelledCount += 1;
        else cancelledCount += 1;
      } catch (error) {
        failedCount += 1;
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown worker cancellation error';
        this.logger.error(
          `Failed to auto-expire booking ${booking.id}: ${message}`,
        );
      }
    }

    this.logger.warn(
      `Expiry worker processed ${expiredBookings.length} booking(s): cancelled=${cancelledCount}, alreadyCancelled=${alreadyCancelledCount}, failed=${failedCount}.`,
    );
  }
}
