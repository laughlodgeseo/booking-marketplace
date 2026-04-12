import { apiFetch } from "@/lib/apiFetch";

export type PaymentProvider = "MANUAL" | "STRIPE";
export type BookingCancellationReason =
  | "GUEST_REQUEST"
  | "OWNER_REQUEST"
  | "NO_PAYMENT"
  | "AUTO_EXPIRED_UNPAID"
  | "FORCE_MAJEURE"
  | "FRAUD"
  | "ADMIN_OVERRIDE";

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

// Keep your existing signature EXACTLY (based on your grep)
export async function createBookingFromHold(body: {
  holdId: string;
  idempotencyKey?: string | null;
}): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (body.idempotencyKey) headers["idempotency-key"] = body.idempotencyKey;

  const res = await apiFetch<unknown>(`/bookings`, {
    method: "POST",
    body: {
      holdId: body.holdId,
      idempotencyKey: body.idempotencyKey ?? undefined,
    },
    headers,
    auth: "auto",
  });
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export async function getUserBookings(params: {
  page: number;
  pageSize: number;
}): Promise<UserBookingsResponse> {
  const res = await apiFetch<UserBookingsResponse>(`/portal/user/bookings`, {
    method: "GET",
    query: { page: params.page, pageSize: params.pageSize },
    auth: "auto",
  });
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export async function getUserBookingDetail(args: { bookingId: string }): Promise<BookingDetail> {
  const res = await apiFetch<BookingDetail>(`/portal/user/bookings/${args.bookingId}`, {
    method: "GET",
    auth: "auto",
  });
  if (!res.ok) throw new Error(res.message);
  return res.data;
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

export async function cancelBooking(input: {
  bookingId: string;
  reason?: BookingCancellationReason;
}): Promise<{
  ok: true;
  bookingId: string;
  cancellationId: string;
  refundId: string | null;
  alreadyCancelled?: boolean;
}> {
  const res = await apiFetch<{
    ok: true;
    bookingId: string;
    cancellationId: string;
    refundId: string | null;
    alreadyCancelled?: boolean;
  }>(`/bookings/${input.bookingId}/cancel`, {
    method: "POST",
    auth: "auto",
    body: {
      reason: input.reason ?? "GUEST_REQUEST",
    },
  });
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export async function refetchPropertyAvailability(input: {
  propertyId: string;
  from: string;
  to: string;
}): Promise<unknown> {
  const res = await apiFetch<unknown>(
    `/properties/${encodeURIComponent(input.propertyId)}/availability`,
    {
      method: "GET",
      auth: "none",
      cache: "no-store",
      query: {
        from: input.from,
        to: input.to,
      },
    },
  );
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export async function authorizePayment(input: {
  bookingId: string;
  provider: PaymentProvider;
}): Promise<AuthorizePaymentResponse> {
  const res = await apiFetch<AuthorizePaymentResponse>(`/payments/authorize`, {
    method: "POST",
    body: input,
    auth: "auto",
  });
  if (!res.ok) throw new Error(res.message);
  return res.data;
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
