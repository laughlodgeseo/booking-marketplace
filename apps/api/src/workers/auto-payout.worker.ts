import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentProvider, VendorStatementStatus } from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { VendorStatementsService } from '../modules/finance/services/vendor-statements.service';
import { PayoutsService } from '../modules/finance/services/payouts.service';
import { EventBusService } from '../events/event-bus.service';
import { DomainEventType } from '../events/domain-events';

/**
 * Monthly auto-payout pipeline.
 *
 * Runs at 02:00 UTC on the 2nd of every month.
 *
 * Sequence:
 * 1. Generate/refresh DRAFT statements for the PREVIOUS month (all vendors).
 * 2. Finalize DRAFT statements whose netPayable > 0.
 * 3. Create PENDING payout records for each newly finalized statement.
 * 4. Emit PayoutTriggered domain events so downstream systems are notified.
 *
 * Money movement (actual bank transfer) is still manual — this automates
 * the accounting/record side so finance admins only need to execute the
 * bank transfer and call adminMarkSucceeded.
 *
 * Safety rules:
 * - Idempotent: re-running on the same month is safe (upsert + reused checks).
 * - Processes at most MAX_VENDORS_PER_RUN per run to bound execution time.
 * - All errors per vendor are caught and logged; one failure never blocks others.
 */
@Injectable()
export class AutoPayoutWorker {
  private readonly logger = new Logger(AutoPayoutWorker.name);
  private static readonly SYSTEM_ACTOR_ID = 'auto-payout-worker';
  private static readonly MAX_VENDORS_PER_RUN = 200;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vendorStatements: VendorStatementsService,
    private readonly payouts: PayoutsService,
    private readonly eventBus: EventBusService,
  ) {}

  /** 02:00 UTC on the 2nd of every month. */
  @Cron('0 2 2 * *')
  async runMonthlyPayoutPipeline(): Promise<void> {
    const now = new Date();

    // Target: PREVIOUS calendar month (UTC)
    const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // 1-indexed

    this.logger.log(
      `auto_payout_worker starting year=${year} month=${month}`,
    );

    // ── Step 1: Generate statements for all vendors ────────────────────────
    let generateResult: Awaited<
      ReturnType<VendorStatementsService['adminGenerateMonthlyStatementsForAll']>
    >;

    try {
      generateResult = await this.vendorStatements.adminGenerateMonthlyStatementsForAll({
        adminUserId: AutoPayoutWorker.SYSTEM_ACTOR_ID,
        year,
        month,
        currency: 'AED',
      });
    } catch (err) {
      this.logger.error(
        `auto_payout_worker statement_generation_failed year=${year} month=${month}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    this.logger.log(
      `auto_payout_worker statements_generated vendorCount=${generateResult.vendorCount} skipped=${generateResult.skipped}`,
    );

    // ── Step 2: Finalize DRAFT statements with netPayable > 0 ─────────────
    const draftStatements = await this.prisma.vendorStatement.findMany({
      where: {
        id: { in: generateResult.statementIds },
        status: VendorStatementStatus.DRAFT,
        netPayable: { gt: 0 },
      },
      select: { id: true, vendorId: true, netPayable: true },
      take: AutoPayoutWorker.MAX_VENDORS_PER_RUN,
    });

    let finalized = 0;
    let payoutsCreated = 0;
    let payoutsFailed = 0;

    for (const st of draftStatements) {
      try {
        const finalizeResult = await this.vendorStatements.adminFinalizeStatement({
          adminUserId: AutoPayoutWorker.SYSTEM_ACTOR_ID,
          statementId: st.id,
          note: `Auto-finalized by ${AutoPayoutWorker.SYSTEM_ACTOR_ID} for ${year}-${String(month).padStart(2, '0')}`,
        });

        if (!finalizeResult.reused) finalized += 1;

        // ── Step 3: Create PENDING payout for this statement ───────────────
        try {
          const payoutResult = await this.payouts.adminCreatePayoutFromStatement({
            statementId: st.id,
            provider: PaymentProvider.MANUAL,
            providerRef: null,
          });

          if (!payoutResult.reused) {
            payoutsCreated += 1;

            // ── Step 4: Emit domain event ──────────────────────────────────
            this.eventBus.publish({
              type: DomainEventType.PAYOUT_TRIGGERED,
              payoutId: payoutResult.payout.id,
              vendorId: st.vendorId,
              statementId: st.id,
              amount: st.netPayable,
              currency: 'AED',
              occurredAt: new Date(),
            });

            this.logger.log(
              `auto_payout_worker payout_created payoutId=${payoutResult.payout.id} vendorId=${st.vendorId} amount=${st.netPayable}`,
            );
          }
        } catch (payoutErr) {
          payoutsFailed += 1;
          this.logger.error(
            `auto_payout_worker payout_creation_failed statementId=${st.id} vendorId=${st.vendorId}: ${payoutErr instanceof Error ? payoutErr.message : String(payoutErr)}`,
          );
        }
      } catch (finalizeErr) {
        payoutsFailed += 1;
        this.logger.error(
          `auto_payout_worker finalize_failed statementId=${st.id} vendorId=${st.vendorId}: ${finalizeErr instanceof Error ? finalizeErr.message : String(finalizeErr)}`,
        );
      }
    }

    this.logger.log(
      `auto_payout_worker completed year=${year} month=${month} finalized=${finalized} payoutsCreated=${payoutsCreated} payoutsFailed=${payoutsFailed}`,
    );
  }
}
