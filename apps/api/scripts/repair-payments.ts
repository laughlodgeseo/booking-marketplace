/**
 * repair-payments.ts
 *
 * Backfill script: finds bookings that are CONFIRMED with a CAPTURED payment
 * but whose paymentStatus is still PENDING, and updates them to SUCCESS.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/repair-payments.ts
 *
 * Dry-run (no writes):
 *   DRY_RUN=1 pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/repair-payments.ts
 */

import {
  PrismaClient,
  BookingStatus,
  BookingPaymentStatus,
  PaymentStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === '1';

async function main() {
  console.log('=== repair-payments ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log('Scanning for mismatched bookings...\n');

  const candidates = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      paymentStatus: { not: BookingPaymentStatus.SUCCESS },
      payment: {
        status: PaymentStatus.CAPTURED,
      },
    },
    include: {
      payment: true,
    },
  });

  if (candidates.length === 0) {
    console.log('✅ No mismatched bookings found. Database is consistent.');
    return;
  }

  console.log(`Found ${candidates.length} booking(s) to repair:\n`);

  for (const booking of candidates) {
    const paymentRef = booking.payment?.stripePaymentIntentId ?? booking.payment?.providerRef ?? '(no ref)';
    console.log(
      `  [${booking.id}] status=${booking.status} paymentStatus=${booking.paymentStatus} ` +
      `payment.status=${booking.payment?.status} ref=${paymentRef}`,
    );
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — no changes written. Remove DRY_RUN=1 to apply.');
    return;
  }

  console.log('\nApplying repairs...');
  let repaired = 0;
  let failed = 0;

  for (const booking of candidates) {
    try {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: BookingPaymentStatus.SUCCESS },
      });
      console.log(`  ✅ [${booking.id}] paymentStatus → SUCCESS`);
      repaired++;
    } catch (err) {
      console.error(`  ❌ [${booking.id}] Failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Repaired : ${repaired}`);
  console.log(`  Failed   : ${failed}`);
  console.log(`  Total    : ${candidates.length}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
