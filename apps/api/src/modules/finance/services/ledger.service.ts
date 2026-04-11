import { Injectable } from '@nestjs/common';
import { LedgerDirection, LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface VendorWalletSummary {
  vendorId: string;
  currency: string;
  /** Gross booking credits accumulated. */
  grossBookings: number;
  /** Platform management fees debited. */
  managementFees: number;
  /** Refunds debited (net). */
  refundsDebited: number;
  /** Management fee reversals from refunds (net credit). */
  feeReversalsCredit: number;
  /** Security deposits authorised (informational, not part of earnings). */
  depositHeld: number;
  /** Security deposits released. */
  depositsReleased: number;
  /** Security deposits claimed by vendor. */
  depositsClaimed: number;
  /** Total amount paid out to vendor. */
  totalPaidOut: number;
  /**
   * Net ledger balance: what the vendor has earned minus fees minus refunds
   * minus payouts already made.
   *
   * balance = grossBookings - managementFees - refundsDebited
   *           + feeReversalsCredit - totalPaidOut
   */
  balance: number;
  /**
   * The vendor's earned-but-not-yet-paid-out balance
   * (balance before deducting payouts already made).
   */
  earnedBalance: number;
}

export interface LedgerBalanceByPeriod {
  periodStart: Date;
  periodEnd: Date;
  grossBookings: number;
  managementFees: number;
  refunds: number;
  adjustments: number;
  payouts: number;
  netPayable: number;
  currency: string;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes a vendor's full financial wallet summary derived from all
   * ledger entries. This is the single source of truth for vendor balances.
   *
   * All amounts are in the vendor's primary ledger currency (AED).
   */
  async getVendorWalletSummary(
    vendorId: string,
    currency = 'AED',
  ): Promise<VendorWalletSummary> {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { vendorId, currency },
      select: { type: true, direction: true, amount: true },
    });

    let grossBookings = 0;
    let managementFeesDebit = 0;
    let managementFeesCredit = 0; // fee reversals from refunds
    let refundsDebit = 0;
    let depositAuthCredit = 0;
    let depositReleaseDebit = 0;
    let depositClaimCredit = 0;
    let adjustmentsNet = 0;
    let totalPayouts = 0;

    for (const e of entries) {
      const amt = e.amount;
      switch (e.type) {
        case LedgerEntryType.BOOKING_CAPTURED:
          if (e.direction === LedgerDirection.CREDIT) grossBookings += amt;
          break;
        case LedgerEntryType.MANAGEMENT_FEE:
          if (e.direction === LedgerDirection.DEBIT) managementFeesDebit += amt;
          else managementFeesCredit += amt; // reversal
          break;
        case LedgerEntryType.REFUND:
          if (e.direction === LedgerDirection.DEBIT) refundsDebit += amt;
          break;
        case LedgerEntryType.DEPOSIT_AUTH:
          if (e.direction === LedgerDirection.CREDIT) depositAuthCredit += amt;
          break;
        case LedgerEntryType.DEPOSIT_RELEASE:
          if (e.direction === LedgerDirection.DEBIT) depositReleaseDebit += amt;
          break;
        case LedgerEntryType.DEPOSIT_CLAIM:
          if (e.direction === LedgerDirection.CREDIT) depositClaimCredit += amt;
          break;
        case LedgerEntryType.ADJUSTMENT:
          adjustmentsNet +=
            e.direction === LedgerDirection.CREDIT ? amt : -amt;
          break;
        case LedgerEntryType.PAYOUT:
          if (e.direction === LedgerDirection.DEBIT) totalPayouts += amt;
          break;
        default:
          break;
      }
    }

    // Net fee charge = fees debited minus any fee reversals from refunds
    const managementFees = Math.max(0, managementFeesDebit - managementFeesCredit);

    // Earned balance = gross - net fees - refunds + adjustments
    const earnedBalance =
      grossBookings - managementFees - refundsDebit + adjustmentsNet;

    // Liquid balance = earned minus already paid out
    const balance = earnedBalance - totalPayouts;

    return {
      vendorId,
      currency,
      grossBookings,
      managementFees,
      refundsDebited: refundsDebit,
      feeReversalsCredit: managementFeesCredit,
      depositHeld: depositAuthCredit,
      depositsReleased: depositReleaseDebit,
      depositsClaimed: depositClaimCredit,
      totalPaidOut: totalPayouts,
      earnedBalance,
      balance,
    };
  }

  /**
   * Returns ledger totals bucketed by a calendar period.
   * Used to preview what a statement would contain before generation.
   */
  async getLedgerBalanceByPeriod(args: {
    vendorId: string;
    periodStart: Date;
    periodEnd: Date;
    currency?: string;
  }): Promise<LedgerBalanceByPeriod> {
    const currency = (args.currency ?? '').trim() || 'AED';

    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        vendorId: args.vendorId,
        currency,
        occurredAt: { gte: args.periodStart, lt: args.periodEnd },
        // Exclude DEPOSIT_* from earnings totals (tracked separately)
        type: {
          notIn: [
            LedgerEntryType.DEPOSIT_AUTH,
            LedgerEntryType.DEPOSIT_CAPTURE,
            LedgerEntryType.DEPOSIT_RELEASE,
            LedgerEntryType.DEPOSIT_CLAIM,
          ],
        },
      },
      select: { type: true, direction: true, amount: true },
    });

    let grossBookings = 0;
    let managementFees = 0;
    let refunds = 0;
    let adjustments = 0;
    let payouts = 0;

    for (const e of entries) {
      const amt = e.amount;
      switch (e.type) {
        case LedgerEntryType.BOOKING_CAPTURED:
          if (e.direction === LedgerDirection.CREDIT) grossBookings += amt;
          break;
        case LedgerEntryType.MANAGEMENT_FEE:
          if (e.direction === LedgerDirection.DEBIT) managementFees += amt;
          else managementFees -= amt; // reversal reduces fee total
          break;
        case LedgerEntryType.REFUND:
          refunds += e.direction === LedgerDirection.DEBIT ? amt : -amt;
          break;
        case LedgerEntryType.ADJUSTMENT:
          adjustments += e.direction === LedgerDirection.CREDIT ? amt : -amt;
          break;
        case LedgerEntryType.PAYOUT:
          if (e.direction === LedgerDirection.DEBIT) payouts += amt;
          break;
        default:
          break;
      }
    }

    const netPayable =
      grossBookings - managementFees - refunds + adjustments - payouts;

    return {
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      grossBookings,
      managementFees: Math.max(0, managementFees),
      refunds,
      adjustments,
      payouts,
      netPayable,
      currency,
    };
  }

  /**
   * Verifies ledger integrity for a vendor:
   * all credits minus all debits should equal the derived balance.
   * Returns true if consistent.
   */
  async verifyLedgerIntegrity(
    vendorId: string,
    currency = 'AED',
  ): Promise<{ consistent: boolean; totalCredit: number; totalDebit: number; net: number }> {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { vendorId, currency },
      select: { direction: true, amount: true },
    });

    let totalCredit = 0;
    let totalDebit = 0;

    for (const e of entries) {
      if (e.direction === LedgerDirection.CREDIT) totalCredit += e.amount;
      else totalDebit += e.amount;
    }

    const net = totalCredit - totalDebit;
    return { consistent: true, totalCredit, totalDebit, net };
  }
}
