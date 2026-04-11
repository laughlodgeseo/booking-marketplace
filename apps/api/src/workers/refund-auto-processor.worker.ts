import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentProvider, RefundStatus } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { PaymentsService } from '../modules/payments/payments.service';

/**
 * Automatically processes eligible PENDING Stripe refunds.
 *
 * Flow: booking cancellation stages a Refund record (status=PENDING).
 * This worker picks them up and executes the Stripe API call, so customers
 * receive their money without requiring manual admin intervention.
 *
 * Safety rules:
 * - Only processes STRIPE provider refunds (MANUAL requires explicit admin action).
 * - Waits ≥ 60s after creation before processing (allows Stripe payment to fully settle).
 * - Processes at most 20 refunds per run to bound execution time.
 * - Failures are logged and retried on the next cron tick (refund stays PENDING).
 */
@Injectable()
export class RefundAutoProcessorWorker {
  private readonly logger = new Logger(RefundAutoProcessorWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  /** Every 2 minutes. */
  @Cron('*/2 * * * *')
  async processEligibleRefunds(): Promise<void> {
    // Only process refunds created at least 60 seconds ago to let Stripe settle.
    const cutoff = new Date(Date.now() - 60_000);

    const pending = await this.prisma.refund.findMany({
      where: {
        status: RefundStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        createdAt: { lte: cutoff },
      },
      select: { id: true },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    if (pending.length === 0) return;

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const { id } of pending) {
      try {
        const result = await this.payments.processRefund({
          // Internal system actor — bypasses the UI-facing admin-only gate.
          actor: { id: 'refund-auto-processor', role: 'ADMIN' },
          refundId: id,
          idempotencyKey: `auto:${id}`,
          amountOverride: undefined,
        });

        if (result.reused) {
          skipped += 1;
        } else {
          processed += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.error(
          `refund_auto_processor failed refundId=${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `refund_auto_processor processed=${processed} skipped=${skipped} failed=${failed} total=${pending.length}`,
    );
  }
}
