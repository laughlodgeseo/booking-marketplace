import { apiFetch } from "@/lib/apiFetch";

export type QuoteBreakdown = {
  nights: number;
  basePricePerNight: number;
  nightlySubtotal: number;
  baseAmount: number;
  cleaningFee: number;
  // Granular Dubai fees (display currency)
  serviceCharge: number;   // 10% of base
  municipalityFee: number; // 7% of base
  tourismFee: number;      // 6% of base
  vat: number;             // 5% of subtotal-before-VAT
  tourismDirham: number;   // Fixed/night by star rating (capped 30 nights)
  // Legacy aliases kept for backward compat
  serviceFee: number;
  taxes: number;
  total: number;
  // AED canonical amounts
  basePricePerNightAed: number;
  nightlySubtotalAed: number;
  baseAmountAed: number;
  cleaningFeeAed: number;
  serviceChargeAed: number;
  municipalityFeeAed: number;
  tourismFeeAed: number;
  vatAed: number;
  tourismDirhamAed: number;
  serviceFeeAed: number;
  taxesAed: number;
  totalAed: number;
};

export type Quote = {
  ok: true;
  canBook: boolean;
  reasons: string[];
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  minNightsRequired?: number;
  currency: string;
  fxRate: number;
  fxAsOf: string | null;
  totalAmount: number; // display currency total
  totalAmountAed: number;
  breakdown: QuoteBreakdown;
};

type QuoteApiResponse = {
  ok: true;
  canBook?: boolean;
  reasons?: string[];
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
  fxRate?: number;
  fxAsOf?: string | null;
  minNightsRequired?: number;
  breakdown?: {
    nights?: number;
    basePricePerNight?: number;
    nightlySubtotal?: number;
    baseAmount?: number;
    cleaningFee?: number;
    serviceCharge?: number;
    municipalityFee?: number;
    tourismFee?: number;
    vat?: number;
    tourismDirham?: number;
    serviceFee?: number;
    taxes?: number;
    total?: number;
    basePricePerNightAed?: number;
    nightlySubtotalAed?: number;
    baseAmountAed?: number;
    cleaningFeeAed?: number;
    serviceChargeAed?: number;
    municipalityFeeAed?: number;
    tourismFeeAed?: number;
    vatAed?: number;
    tourismDirhamAed?: number;
    serviceFeeAed?: number;
    taxesAed?: number;
    totalAed?: number;
  };
};

type ReserveApiResponse = {
  ok: true;
  canReserve: boolean;
  reasons?: string[];
  hold: {
    id: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
    expiresAt: string;
    status: string;
  };
  quote: QuoteApiResponse;
};

export type ReserveResult = {
  ok: true;
  propertyId: string;
  holdId: string;
  holdExpiresAt: string;
  quote: Quote;
};

export type Booking = {
  id: string;
  status: string;
  propertyId: string;
  [key: string]: unknown;
};

type CreateBookingApiResponse =
  | { booking: Booking }
  | Booking;

export type QuoteInput = {
  checkIn: string;
  checkOut: string;
  guests: number;
  currency?: string;
};

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function quoteProperty(propertyId: string, input: QuoteInput): Promise<Quote> {
  const res = await apiFetch<QuoteApiResponse>(`/properties/${propertyId}/quote`, {
    method: "POST",
    body: input,
    auth: "auto",
  });

  if (!res.ok) throw new Error(res.message);

  const d = res.data;
  const reasons = Array.isArray(d.reasons) ? d.reasons.filter((x): x is string => typeof x === "string") : [];
  const canBook = d.canBook !== false;

  const total = d.breakdown?.total;
  if (typeof total !== "number") throw new Error("Invalid quote: breakdown.total missing");
  const fxRate = typeof d.fxRate === "number" && d.fxRate > 0 ? d.fxRate : 1;
  const totalAed =
    typeof d.breakdown?.totalAed === "number"
      ? d.breakdown.totalAed
      : d.currency === "AED"
        ? total
        : Math.round(total / fxRate);
  const nights = numberOr(d.nights, 0);
  const nightlySubtotal = numberOr(d.breakdown?.nightlySubtotal, total);
  const breakdown: QuoteBreakdown = {
    nights: numberOr(d.breakdown?.nights, nights),
    basePricePerNight: numberOr(d.breakdown?.basePricePerNight, Math.round(nightlySubtotal / Math.max(1, nights))),
    nightlySubtotal,
    baseAmount: numberOr(d.breakdown?.baseAmount, nightlySubtotal),
    cleaningFee: numberOr(d.breakdown?.cleaningFee, 0),
    serviceCharge: numberOr(d.breakdown?.serviceCharge, 0),
    municipalityFee: numberOr(d.breakdown?.municipalityFee, 0),
    tourismFee: numberOr(d.breakdown?.tourismFee, 0),
    vat: numberOr(d.breakdown?.vat, 0),
    tourismDirham: numberOr(d.breakdown?.tourismDirham, 0),
    serviceFee: numberOr(d.breakdown?.serviceFee, numberOr(d.breakdown?.serviceCharge, 0)),
    taxes: numberOr(d.breakdown?.taxes, 0),
    total,
    basePricePerNightAed: numberOr(
      d.breakdown?.basePricePerNightAed,
      d.currency === "AED"
        ? numberOr(d.breakdown?.basePricePerNight, Math.round(nightlySubtotal / Math.max(1, nights)))
        : Math.round(numberOr(d.breakdown?.basePricePerNight, Math.round(nightlySubtotal / Math.max(1, nights))) / fxRate),
    ),
    nightlySubtotalAed: numberOr(d.breakdown?.nightlySubtotalAed, d.currency === "AED" ? nightlySubtotal : Math.round(nightlySubtotal / fxRate)),
    baseAmountAed: numberOr(d.breakdown?.baseAmountAed, d.currency === "AED" ? numberOr(d.breakdown?.baseAmount, nightlySubtotal) : Math.round(numberOr(d.breakdown?.baseAmount, nightlySubtotal) / fxRate)),
    cleaningFeeAed: numberOr(
      d.breakdown?.cleaningFeeAed,
      d.currency === "AED" ? numberOr(d.breakdown?.cleaningFee, 0) : Math.round(numberOr(d.breakdown?.cleaningFee, 0) / fxRate),
    ),
    serviceChargeAed: numberOr(
      d.breakdown?.serviceChargeAed,
      d.currency === "AED" ? numberOr(d.breakdown?.serviceCharge, 0) : Math.round(numberOr(d.breakdown?.serviceCharge, 0) / fxRate),
    ),
    municipalityFeeAed: numberOr(
      d.breakdown?.municipalityFeeAed,
      d.currency === "AED" ? numberOr(d.breakdown?.municipalityFee, 0) : Math.round(numberOr(d.breakdown?.municipalityFee, 0) / fxRate),
    ),
    tourismFeeAed: numberOr(
      d.breakdown?.tourismFeeAed,
      d.currency === "AED" ? numberOr(d.breakdown?.tourismFee, 0) : Math.round(numberOr(d.breakdown?.tourismFee, 0) / fxRate),
    ),
    vatAed: numberOr(
      d.breakdown?.vatAed,
      d.currency === "AED" ? numberOr(d.breakdown?.vat, 0) : Math.round(numberOr(d.breakdown?.vat, 0) / fxRate),
    ),
    tourismDirhamAed: numberOr(
      d.breakdown?.tourismDirhamAed,
      d.currency === "AED" ? numberOr(d.breakdown?.tourismDirham, 0) : Math.round(numberOr(d.breakdown?.tourismDirham, 0) / fxRate),
    ),
    serviceFeeAed: numberOr(
      d.breakdown?.serviceFeeAed,
      d.currency === "AED" ? numberOr(d.breakdown?.serviceFee, numberOr(d.breakdown?.serviceCharge, 0)) : Math.round(numberOr(d.breakdown?.serviceFee, numberOr(d.breakdown?.serviceCharge, 0)) / fxRate),
    ),
    taxesAed: numberOr(
      d.breakdown?.taxesAed,
      d.currency === "AED" ? numberOr(d.breakdown?.taxes, 0) : Math.round(numberOr(d.breakdown?.taxes, 0) / fxRate),
    ),
    totalAed,
  };

  return {
    ok: true,
    canBook,
    reasons,
    propertyId: d.propertyId ?? propertyId,
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    nights,
    minNightsRequired:
      typeof d.minNightsRequired === "number" ? d.minNightsRequired : undefined,
    currency: d.currency,
    fxRate,
    fxAsOf: typeof d.fxAsOf === "string" ? d.fxAsOf : null,
    totalAmount: total,
    totalAmountAed: totalAed,
    breakdown,
  };
}

export async function reserveHold(propertyId: string, input: QuoteInput): Promise<ReserveResult> {
  const res = await apiFetch<ReserveApiResponse>(`/properties/${propertyId}/reserve`, {
    method: "POST",
    body: input,
    auth: "auto",
  });

  if (!res.ok) throw new Error(res.message);

  const d = res.data;
  if (!d.canReserve) {
    const reasons = Array.isArray(d.reasons) ? d.reasons.filter((x) => typeof x === "string") : [];
    const reasonText = reasons.length > 0 ? reasons.join(" ") : "Selected dates are unavailable.";
    throw new Error(reasonText);
  }

  const holdId = d.hold?.id;
  if (!holdId) throw new Error("Invalid reserve: hold.id missing");

  const q = d.quote;
  const total = q.breakdown?.total;
  if (typeof total !== "number") throw new Error("Invalid reserve quote: breakdown.total missing");
  const fxRate = typeof q.fxRate === "number" && q.fxRate > 0 ? q.fxRate : 1;
  const totalAed =
    typeof q.breakdown?.totalAed === "number"
      ? q.breakdown.totalAed
      : q.currency === "AED"
        ? total
        : Math.round(total / fxRate);

  return {
    ok: true,
    propertyId: d.hold.propertyId ?? propertyId,
    holdId,
    holdExpiresAt: d.hold.expiresAt,
    quote: {
      ok: true,
      canBook: true,
      reasons: [],
      propertyId: q.propertyId ?? propertyId,
      checkIn: q.checkIn,
      checkOut: q.checkOut,
      nights: q.nights,
      minNightsRequired:
        typeof q.minNightsRequired === "number" ? q.minNightsRequired : undefined,
      currency: q.currency,
      fxRate,
      fxAsOf: typeof q.fxAsOf === "string" ? q.fxAsOf : null,
      totalAmount: total,
      totalAmountAed: totalAed,
      breakdown: {
        nights: numberOr(q.breakdown?.nights, q.nights),
        basePricePerNight: numberOr(q.breakdown?.basePricePerNight, Math.round(total / Math.max(1, q.nights))),
        nightlySubtotal: numberOr(q.breakdown?.nightlySubtotal, total),
        baseAmount: numberOr(q.breakdown?.baseAmount, numberOr(q.breakdown?.nightlySubtotal, total)),
        cleaningFee: numberOr(q.breakdown?.cleaningFee, 0),
        serviceCharge: numberOr(q.breakdown?.serviceCharge, 0),
        municipalityFee: numberOr(q.breakdown?.municipalityFee, 0),
        tourismFee: numberOr(q.breakdown?.tourismFee, 0),
        vat: numberOr(q.breakdown?.vat, 0),
        tourismDirham: numberOr(q.breakdown?.tourismDirham, 0),
        serviceFee: numberOr(q.breakdown?.serviceFee, numberOr(q.breakdown?.serviceCharge, 0)),
        taxes: numberOr(q.breakdown?.taxes, 0),
        total,
        basePricePerNightAed: numberOr(
          q.breakdown?.basePricePerNightAed,
          q.currency === "AED"
            ? numberOr(q.breakdown?.basePricePerNight, Math.round(total / Math.max(1, q.nights)))
            : Math.round(numberOr(q.breakdown?.basePricePerNight, Math.round(total / Math.max(1, q.nights))) / fxRate),
        ),
        nightlySubtotalAed: numberOr(
          q.breakdown?.nightlySubtotalAed,
          q.currency === "AED" ? numberOr(q.breakdown?.nightlySubtotal, total) : Math.round(numberOr(q.breakdown?.nightlySubtotal, total) / fxRate),
        ),
        baseAmountAed: numberOr(
          q.breakdown?.baseAmountAed,
          q.currency === "AED" ? numberOr(q.breakdown?.baseAmount, numberOr(q.breakdown?.nightlySubtotal, total)) : Math.round(numberOr(q.breakdown?.baseAmount, numberOr(q.breakdown?.nightlySubtotal, total)) / fxRate),
        ),
        cleaningFeeAed: numberOr(
          q.breakdown?.cleaningFeeAed,
          q.currency === "AED" ? numberOr(q.breakdown?.cleaningFee, 0) : Math.round(numberOr(q.breakdown?.cleaningFee, 0) / fxRate),
        ),
        serviceChargeAed: numberOr(
          q.breakdown?.serviceChargeAed,
          q.currency === "AED" ? numberOr(q.breakdown?.serviceCharge, 0) : Math.round(numberOr(q.breakdown?.serviceCharge, 0) / fxRate),
        ),
        municipalityFeeAed: numberOr(
          q.breakdown?.municipalityFeeAed,
          q.currency === "AED" ? numberOr(q.breakdown?.municipalityFee, 0) : Math.round(numberOr(q.breakdown?.municipalityFee, 0) / fxRate),
        ),
        tourismFeeAed: numberOr(
          q.breakdown?.tourismFeeAed,
          q.currency === "AED" ? numberOr(q.breakdown?.tourismFee, 0) : Math.round(numberOr(q.breakdown?.tourismFee, 0) / fxRate),
        ),
        vatAed: numberOr(
          q.breakdown?.vatAed,
          q.currency === "AED" ? numberOr(q.breakdown?.vat, 0) : Math.round(numberOr(q.breakdown?.vat, 0) / fxRate),
        ),
        tourismDirhamAed: numberOr(
          q.breakdown?.tourismDirhamAed,
          q.currency === "AED" ? numberOr(q.breakdown?.tourismDirham, 0) : Math.round(numberOr(q.breakdown?.tourismDirham, 0) / fxRate),
        ),
        serviceFeeAed: numberOr(
          q.breakdown?.serviceFeeAed,
          q.currency === "AED" ? numberOr(q.breakdown?.serviceFee, numberOr(q.breakdown?.serviceCharge, 0)) : Math.round(numberOr(q.breakdown?.serviceFee, numberOr(q.breakdown?.serviceCharge, 0)) / fxRate),
        ),
        taxesAed: numberOr(
          q.breakdown?.taxesAed,
          q.currency === "AED" ? numberOr(q.breakdown?.taxes, 0) : Math.round(numberOr(q.breakdown?.taxes, 0) / fxRate),
        ),
        totalAed,
      },
    },
  };
}

export type CreateBookingInput = {
  propertyId: string;
  holdId: string;
  guests: number;
};

export async function createBooking(input: CreateBookingInput): Promise<{ ok: true; booking: Booking }> {
  const res = await apiFetch<CreateBookingApiResponse>(`/bookings`, {
    method: "POST",
    body: input,
    auth: "auto",
  });

  if (!res.ok) throw new Error(res.message);

  const d = res.data;
  const booking = "booking" in (d as Record<string, unknown>) ? (d as { booking: Booking }).booking : (d as Booking);

  if (!booking?.id || !booking?.status) throw new Error("Invalid booking response");
  return { ok: true, booking };
}
