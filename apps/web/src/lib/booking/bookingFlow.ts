import { apiFetch } from "@/lib/apiFetch";

export type Quote = {
  ok: true;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  currency: string;
  fxRate: number;
  fxAsOf: string | null;
  totalAmount: number; // display currency total
  totalAmountAed: number;
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
  breakdown?: {
    total?: number;
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

export async function quoteProperty(propertyId: string, input: QuoteInput): Promise<Quote> {
  const res = await apiFetch<QuoteApiResponse>(`/properties/${propertyId}/quote`, {
    method: "POST",
    body: input,
    auth: "auto",
  });

  if (!res.ok) throw new Error(res.message);

  const d = res.data;

  const total = d.breakdown?.total;
  if (typeof total !== "number") throw new Error("Invalid quote: breakdown.total missing");
  const fxRate = typeof d.fxRate === "number" && d.fxRate > 0 ? d.fxRate : 1;
  const totalAed =
    typeof d.breakdown?.totalAed === "number"
      ? d.breakdown.totalAed
      : d.currency === "AED"
        ? total
        : Math.round(total / fxRate);

  return {
    ok: true,
    propertyId: d.propertyId ?? propertyId,
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    nights: d.nights,
    currency: d.currency,
    fxRate,
    fxAsOf: typeof d.fxAsOf === "string" ? d.fxAsOf : null,
    totalAmount: total,
    totalAmountAed: totalAed,
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
      propertyId: q.propertyId ?? propertyId,
      checkIn: q.checkIn,
      checkOut: q.checkOut,
      nights: q.nights,
      currency: q.currency,
      fxRate,
      fxAsOf: typeof q.fxAsOf === "string" ? q.fxAsOf : null,
      totalAmount: total,
      totalAmountAed: totalAed,
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
