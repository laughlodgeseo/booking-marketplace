import { apiFetch, type HttpResult } from "@/lib/apiFetch";

/**
 * Existing booking helper names (keep compatibility).
 * If you previously used createBookingFromHold somewhere, it will still work.
 */
export type Booking = {
  id: string;
  status: string;
  propertyId: string;
  [key: string]: unknown;
};

type CreateBookingApiResponse =
  | { booking: Booking }
  | Booking;

function unwrap<T>(r: HttpResult<T>): T {
  if (!r.ok) throw new Error(r.message);
  return r.data;
}

/** Compatibility: create booking from hold */
export async function createBookingFromHold(input: {
  holdId: string;
  idempotencyKey?: string | null;
  propertyId?: string;
  guests?: number;
}): Promise<{ ok: true; booking: Booking }> {
  const headers: Record<string, string> = {};
  if (input.idempotencyKey) headers["idempotency-key"] = input.idempotencyKey;

  const res = await apiFetch<CreateBookingApiResponse>(`/bookings`, {
    method: "POST",
    body: {
      holdId: input.holdId,
      idempotencyKey: input.idempotencyKey ?? undefined,
    },
    headers,
    auth: "auto",
  });

  const d = unwrap(res);
  const booking = "booking" in (d as Record<string, unknown>) ? (d as { booking: Booking }).booking : (d as Booking);

  if (!booking?.id || !booking?.status) throw new Error("Invalid booking response");
  return { ok: true, booking };
}

/** Portal booking list item (user portal) */
export type BookingListItem = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  currency?: string | null;
  totalAmount?: number | null;

  propertyId?: string | null;
  propertyTitle?: string | null;
  propertySlug?: string | null;

  expiresAt?: string | null;
  createdAt?: string | null;
};

export type BookingDetail = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  nights: number;
  totalAmount: number;
  currency: string;
  fxRate?: number | null;
  expiresAt?: string | null;
  property: {
    id: string;
    title: string;
    slug: string | null;
    city: string | null;
    area: string | null;
    basePrice?: number | null;
    cleaningFee?: number | null;
    coverUrl?: string | null;
  };
};

export type UserBookingsResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: BookingListItem[];
};

export async function getUserBookings(params: {
  page: number;
  pageSize: number;
}): Promise<UserBookingsResponse> {
  const res = await apiFetch<UserBookingsResponse>(`/portal/user/bookings`, {
    method: "GET",
    query: { page: params.page, pageSize: params.pageSize },
    auth: "auto",
  });

  return unwrap(res);
}

export async function findUserBookingById(args: {
  bookingId: string;
  maxPages?: number;
  pageSize?: number;
}): Promise<BookingListItem | null> {
  const maxPages = args.maxPages ?? 6;
  const pageSize = args.pageSize ?? 20;

  for (let page = 1; page <= maxPages; page++) {
    const data = await getUserBookings({ page, pageSize });
    const hit = data.items.find((b) => b.id === args.bookingId);
    if (hit) return hit;

    const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
    if (page >= totalPages) break;
  }

  return null;
}

export async function getUserBookingDetail(args: { bookingId: string }): Promise<BookingDetail> {
  const res = await apiFetch<BookingDetail>(`/portal/user/bookings/${args.bookingId}`, {
    method: "GET",
    auth: "auto",
  });

  return unwrap(res);
}

export async function cancelBooking(bookingId: string): Promise<{ ok: true; id?: string; status?: string }> {
  const res = await apiFetch<{ ok: true; id?: string; status?: string }>(`/bookings/${bookingId}/cancel`, {
    method: "POST",
    auth: "auto",
  });

  return unwrap(res);
}

export type PaymentProvider = "MANUAL" | "STRIPE";

export type AuthorizePaymentResponse = {
  ok?: boolean;
  provider?: PaymentProvider;
  bookingId?: string;

  clientSecret?: string;
  publishableKey?: string;
  redirectUrl?: string;

  paymentId?: string;
  status?: string;
};

export type CreateStripeIntentResponse = {
  ok?: boolean;
  reused?: boolean;
  provider?: PaymentProvider;
  bookingId?: string;
  clientSecret?: string;
  publishableKey?: string;
  payment?: unknown;
};

export async function authorizePayment(input: {
  bookingId: string;
  provider: PaymentProvider;
}): Promise<AuthorizePaymentResponse> {
  const res = await apiFetch<AuthorizePaymentResponse>(`/payments/authorize`, {
    method: "POST",
    body: input,
    auth: "auto",
  });

  return unwrap(res);
}

export async function createStripePaymentIntent(input: {
  bookingId: string;
  idempotencyKey?: string | null;
}): Promise<CreateStripeIntentResponse> {
  const headers: Record<string, string> = {};
  if (input.idempotencyKey) headers["idempotency-key"] = input.idempotencyKey;

  const res = await apiFetch<CreateStripeIntentResponse>(`/payments/create-intent`, {
    method: "POST",
    body: { bookingId: input.bookingId },
    headers,
    auth: "auto",
  });

  if (!res.ok) {
    console.error("❌ Payment API error:", {
      status: res.status,
      message: res.message,
      details: res.details,
    });

    if (res.status === 401) {
      throw new Error("Unauthorized (401). Please sign in to continue payment.");
    }

    throw new Error(res.message || "Unable to start payment. Please try again or refresh.");
  }

  return res.data;
}
