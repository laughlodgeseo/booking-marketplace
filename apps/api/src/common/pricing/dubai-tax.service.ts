import { Injectable } from '@nestjs/common';
import {
  DUBAI_TAX_CONFIG,
  TOURISM_DIRHAM_NIGHT_CAP,
  getTourismDirhamRate,
} from './dubai-tax.config';

export interface DubaiPriceBreakdown {
  /** Nightly base total (PricingService result — applies pricing rules) */
  baseTotal: number;
  /** Cleaning / end-of-stay fee */
  cleaningFee: number;
  /** DTCM service charge (10% of baseTotal) */
  serviceCharge: number;
  /** Dubai municipality fee (7% of baseTotal) */
  municipalityFee: number;
  /** DTCM tourism fee (6% of baseTotal) */
  tourismFee: number;
  /** Subtotal before VAT */
  subtotalBeforeVat: number;
  /** UAE VAT (5% of subtotalBeforeVat) */
  vat: number;
  /** Fixed DTCM Tourism Dirham (per room / per night, capped at 30 nights) */
  tourismDirham: number;
  /** Grand total */
  total: number;
}

@Injectable()
export class DubaiTaxService {
  /**
   * Calculate the full Dubai tax breakdown for a booking.
   * All amounts are in AED (canonical currency).
   *
   * Calculation order matches Airbnb / Booking.com:
   *   1. Base (nightly subtotal from PricingService)
   *   2. Cleaning fee
   *   3. Service Charge   10% of baseTotal
   *   4. Municipality Fee  7% of baseTotal
   *   5. Tourism Fee       6% of baseTotal
   *   6. Subtotal before VAT (sum of all above)
   *   7. VAT               5% of subtotalBeforeVat
   *   8. Tourism Dirham    fixed/night (capped at 30 nights)
   *   9. Total             subtotalBeforeVat + VAT + tourismDirham
   */
  calculate(input: {
    baseTotalAed: number;
    nights: number;
    cleaningFeeAed: number;
    starRating?: number | null;
  }): DubaiPriceBreakdown {
    const { baseTotalAed, nights, cleaningFeeAed, starRating } = input;

    // ── Step 1 & 2 ─────────────────────────────────────────────────────────
    const baseTotal = Math.round(baseTotalAed);
    const cleaningFee = Math.round(cleaningFeeAed);

    // ── Step 3 ─────────────────────────────────────────────────────────────
    const serviceCharge = Math.round(
      baseTotal * DUBAI_TAX_CONFIG.serviceCharge,
    );

    // ── Step 4 ─────────────────────────────────────────────────────────────
    const municipalityFee = Math.round(
      baseTotal * DUBAI_TAX_CONFIG.municipalityFee,
    );

    // ── Step 5 ─────────────────────────────────────────────────────────────
    const tourismFee = Math.round(baseTotal * DUBAI_TAX_CONFIG.tourismFee);

    // ── Step 6 ─────────────────────────────────────────────────────────────
    const subtotalBeforeVat =
      baseTotal + cleaningFee + serviceCharge + municipalityFee + tourismFee;

    // ── Step 7 ─────────────────────────────────────────────────────────────
    const vat = Math.round(subtotalBeforeVat * DUBAI_TAX_CONFIG.vat);

    // ── Step 8 — Tourism Dirham (capped at 30 nights) ───────────────────────
    const dirhamRate = getTourismDirhamRate(starRating);
    const chargeableNights = Math.min(nights, TOURISM_DIRHAM_NIGHT_CAP);
    const tourismDirham = dirhamRate * chargeableNights;

    // ── Step 9 ─────────────────────────────────────────────────────────────
    const total = subtotalBeforeVat + vat + tourismDirham;

    return {
      baseTotal,
      cleaningFee,
      serviceCharge,
      municipalityFee,
      tourismFee,
      subtotalBeforeVat,
      vat,
      tourismDirham,
      total,
    };
  }
}
