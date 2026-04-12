/**
 * Dubai Tourism & Government Tax Configuration
 * Matches real-world rates applied on platforms like Airbnb / Booking.com
 *
 * All rates are multiplicative fractions (not percentages).
 * Tourism Dirham is a fixed AED-per-room-per-night fee set by DTCM.
 */

/** Per-star-rating tourism dirham (AED / room / night). Keys are star ratings 1–5. */
const TOURISM_DIRHAM_BY_STAR: Record<number, number> = {
  5: 20,
  4: 15,
  3: 10,
  2: 10,
  1: 7,
};

/** Maximum nights for which the Tourism Dirham is charged (30-night cap). */
export const TOURISM_DIRHAM_NIGHT_CAP = 30;

/** Default star rating used when property has no rating set. */
export const DEFAULT_STAR_RATING = 3;

export const DUBAI_TAX_CONFIG = {
  /** UAE Value Added Tax — applied to the full subtotal (incl. fees). */
  vat: 0.05,
  /** DTCM service charge — applied to nightly base only. */
  serviceCharge: 0.1,
  /** Dubai municipality fee — applied to nightly base only. */
  municipalityFee: 0.07,
  /** DTCM tourism fee — applied to nightly base only. */
  tourismFee: 0.06,
  /** Lookup table: fixed AED/room/night by star rating. */
  tourismDirhamBystar: TOURISM_DIRHAM_BY_STAR,
} as const;

export function getTourismDirhamRate(
  starRating: number | null | undefined,
): number {
  const star = Math.round(starRating ?? DEFAULT_STAR_RATING);
  const clamped = Math.max(1, Math.min(5, star));
  return (
    TOURISM_DIRHAM_BY_STAR[clamped] ??
    TOURISM_DIRHAM_BY_STAR[DEFAULT_STAR_RATING]
  );
}
