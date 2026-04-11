import { apiFetch } from "@/lib/http";
import type { HttpResult } from "@/lib/http";
import type { PortalCalendarResponse } from "@/lib/api/portal/calendar";
import type { PropertyType } from "@/lib/types/property-type";

function unwrap<T>(res: HttpResult<T>): T {
  if (!res.ok) throw new Error(res.message);
  return res.data;
}

export type AdminOverviewResponse = {
  kpis: Record<string, number>;
  queues?: Record<string, number>;
};

export type AdminAnalyticsResponse = {
  from?: string;
  to?: string;
  bucket?: string;
  labels?: string[];
  kpis?: Record<string, number>;
  series?: Array<{ key: string; points: number[] }>;
  breakdowns?: Record<string, Record<string, number>>;
  charts?: Record<
    string,
    {
      labels: string[];
      series: Array<{ key: string; points: number[] }>;
    }
  >;
};

export type AdminListResponse = {
  items: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
};

export type AdminVendorDetailResponse = {
  id: string;
  userId: string;
  displayName: string;
  companyName: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    createdAt: string;
  };
  agreements: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string | null;
    agreedManagementFeeBps: number;
    notes: string | null;
    approvedAt: string | null;
    servicePlan: {
      id: string;
      code: string;
      name: string;
      type: string;
      managementFeeBps: number;
    };
  }>;
  propertyCount: number;
  bookingsTotal: number;
  opsTasksOpen: number;
  properties: Array<{
    id: string;
    title: string;
    slug: string;
    city: string;
    area: string | null;
    status: string;
    basePrice: number;
    currency: string;
    coverUrl: string | null;
    bookingsCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type AdminPaymentDetailResponse = {
  id: string;
  bookingId: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  providerRef: string | null;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency: string;
    property: {
      id: string;
      title: string;
      slug: string;
    };
    customer: {
      id: string;
      email: string;
      fullName: string | null;
    };
  };
  events: Array<{
    id: string;
    type: string;
    label: string;
    providerRef: string | null;
    idempotencyKey: string | null;
    payloadJson: string | null;
    createdAt: string;
  }>;
  refunds: Array<{
    id: string;
    status: string;
    reason: string;
    amount: number;
    currency: string;
    provider: string;
    providerRefundRef: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type AdminRefundDetailResponse = {
  id: string;
  bookingId: string;
  paymentId: string | null;
  status: string;
  reason: string;
  amount: number;
  currency: string;
  provider: string;
  providerRefundRef: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency: string;
    property: {
      id: string;
      title: string;
      slug: string;
    };
    customer: {
      id: string;
      email: string;
      fullName: string | null;
    };
  };
  payment: {
    id: string;
    provider: string;
    status: string;
    amount: number;
    currency: string;
    providerRef: string | null;
  } | null;
  bookingCancellation: {
    id: string;
    actor: string;
    reason: string;
    mode: string;
    notes: string | null;
    cancelledAt: string;
    totalAmount: number;
    penaltyAmount: number;
    refundableAmount: number;
    currency: string;
    displayCurrency?: string;
    displayFxRate?: number;
    displayFxAsOfDate?: string | null;
    totalAmountDisplay?: number | null;
    penaltyAmountDisplay?: number | null;
    refundableAmountDisplay?: number | null;
  } | null;
};

export type AdminBlockRequest = {
  id: string;
  propertyId: string;
  vendorId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  property: {
    id: string;
    title: string;
    city: string;
    area: string | null;
  };
  vendor: {
    id: string;
    email: string;
    fullName: string | null;
  };
  reviewedByAdmin: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
};

export type AdminBookingDocument = {
  id: string;
  bookingId: string;
  uploadedByUserId: string;
  type: "PASSPORT" | "EMIRATES_ID" | "VISA" | "ARRIVAL_FORM" | "OTHER";
  notes: string | null;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes?: number;
  createdAt: string;
  uploadedByUser?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
};

export type AdminCustomerDocumentType =
  | "PASSPORT"
  | "EMIRATES_ID"
  | "VISA"
  | "SELFIE"
  | "OTHER";

export type AdminCustomerDocumentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type AdminCustomerDocument = {
  id: string;
  userId: string;
  type: AdminCustomerDocumentType;
  status: AdminCustomerDocumentStatus;
  originalName: string | null;
  mimeType: string | null;
  notes: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string;
  viewUrl?: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    createdAt: string;
  };
  reviewedByAdmin: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  requirement: {
    requiredTypes: AdminCustomerDocumentType[];
    missingTypes: AdminCustomerDocumentType[];
    requiresUpload: boolean;
    urgent: boolean;
    nextBooking: {
      id: string;
      checkIn: string;
      checkOut: string;
      property: {
        id: string;
        title: string;
        slug: string;
      };
    } | null;
  };
};

export type AdminBookingDetailResponse = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancelledBy: "CUSTOMER" | "VENDOR" | "ADMIN" | null;
  cancellationReason: string | null;
  canForceCancel: boolean;
  timeline: Array<{
    key: string;
    label: string;
    at: string;
    tone: "neutral" | "success" | "warning" | "danger";
  }>;
  customer: {
    id: string;
    email: string;
    fullName: string | null;
  };
  property: {
    id: string;
    title: string;
    slug: string;
    city: string;
    area: string | null;
    address: string | null;
    coverUrl: string | null;
    media: Array<{
      id: string;
      url: string;
      alt: string | null;
      sortOrder: number;
      category: string;
    }>;
    vendor: {
      id: string;
      email: string;
      fullName: string | null;
    };
  };
  payment: {
    id: string;
    status: string;
    provider: string;
    amount: number;
    currency: string;
    providerRef: string | null;
    createdAt: string;
    updatedAt: string;
    events: Array<{
      id: string;
      type: string;
      label: string;
      providerRef: string | null;
      idempotencyKey: string | null;
      createdAt: string;
    }>;
  } | null;
  cancellation: {
    id: string;
    actor: "CUSTOMER" | "VENDOR" | "ADMIN";
    reason: string;
    mode: "SOFT" | "HARD";
    notes: string | null;
    policyVersion: string | null;
    cancelledAt: string;
    totalAmount: number;
    managementFee: number;
    penaltyAmount: number;
    refundableAmount: number;
    currency: string;
    displayCurrency?: string;
    displayFxRate?: number;
    displayFxAsOfDate?: string | null;
    totalAmountDisplay?: number | null;
    penaltyAmountDisplay?: number | null;
    refundableAmountDisplay?: number | null;
    releasesInventory: boolean;
    refundId: string | null;
  } | null;
  refunds: Array<{
    id: string;
    status: string;
    reason: string;
    amount: number;
    currency: string;
    provider: string;
    providerRefundRef: string | null;
    idempotencyKey: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  documents: {
    count: number;
    items: Array<AdminBookingDocument & { downloadUrl: string }>;
  };
  opsTasks: Array<{
    id: string;
    type: string;
    status: string;
    scheduledFor: string;
    createdAt: string;
    cancelledAt: string | null;
  }>;
};

export type AdminGuestReview = {
  id: string;
  rating: number;
  cleanlinessRating: number;
  locationRating: number;
  communicationRating: number;
  valueRating: number;
  title: string | null;
  comment: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNotes: string | null;
  moderationNotes?: string | null;
  createdAt: string;
  reviewedAt: string | null;
  property: {
    id: string;
    title: string;
    slug: string;
    city: string;
  };
  customer: {
    id: string;
    fullName: string | null;
    email: string;
  };
};

export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  const res = await apiFetch<AdminOverviewResponse>("/portal/admin/overview", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function getAdminAnalytics(params?: { range?: string }): Promise<AdminAnalyticsResponse> {
  const range = params?.range ?? "30d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "180d" ? 180 : range === "365d" ? 365 : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const res = await apiFetch<AdminAnalyticsResponse>("/portal/admin/analytics", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      from: from.toISOString(),
      to: to.toISOString(),
      bucket: days > 120 ? "month" : "week",
    },
  });
  return unwrap(res);
}

export async function getAdminVendors(params?: { page?: number; pageSize?: number }): Promise<AdminListResponse> {
  const res = await apiFetch<AdminListResponse>("/portal/admin/vendors", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function getAdminVendorDetail(vendorId: string): Promise<AdminVendorDetailResponse> {
  const res = await apiFetch<AdminVendorDetailResponse>(
    `/portal/admin/vendors/${encodeURIComponent(vendorId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getAdminProperties(params?: { page?: number; pageSize?: number }): Promise<AdminListResponse> {
  const res = await apiFetch<AdminListResponse>("/portal/admin/properties", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function getAdminPortalPropertyDetail(propertyId: string): Promise<Record<string, unknown>> {
  const res = await apiFetch<Record<string, unknown>>(
    `/portal/admin/properties/${encodeURIComponent(propertyId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getAdminBookings(params?: { page?: number; pageSize?: number }): Promise<AdminListResponse> {
  const res = await apiFetch<AdminListResponse>("/portal/admin/bookings", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function getAdminBookingDetail(
  bookingId: string
): Promise<AdminBookingDetailResponse> {
  const res = await apiFetch<AdminBookingDetailResponse>(
    `/portal/admin/bookings/${encodeURIComponent(bookingId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getAdminCalendar(params?: {
  from?: string;
  to?: string;
  propertyId?: string;
}): Promise<PortalCalendarResponse> {
  const res = await apiFetch<PortalCalendarResponse>("/portal/admin/calendar", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      from: params?.from ?? "",
      to: params?.to ?? "",
      propertyId: params?.propertyId ?? "",
    },
  });
  return unwrap(res);
}

export async function getAdminPayments(params?: { page?: number; pageSize?: number }): Promise<AdminListResponse> {
  const res = await apiFetch<AdminListResponse>("/portal/admin/payments", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function getAdminPaymentDetail(paymentId: string): Promise<AdminPaymentDetailResponse> {
  const res = await apiFetch<AdminPaymentDetailResponse>(
    `/portal/admin/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getAdminRefunds(params?: { page?: number; pageSize?: number }): Promise<AdminListResponse> {
  const res = await apiFetch<AdminListResponse>("/portal/admin/refunds", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function getAdminRefundDetail(refundId: string): Promise<AdminRefundDetailResponse> {
  const res = await apiFetch<AdminRefundDetailResponse>(
    `/portal/admin/refunds/${encodeURIComponent(refundId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getAdminBlockRequests(params?: {
  page?: number;
  pageSize?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ALL";
}): Promise<{
  page: number;
  pageSize: number;
  total: number;
  items: AdminBlockRequest[];
}> {
  const res = await apiFetch<{
    page: number;
    pageSize: number;
    total: number;
    items: AdminBlockRequest[];
  }>("/portal/admin/block-requests", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      status: params?.status && params.status !== "ALL" ? params.status : "",
    },
  });
  return unwrap(res);
}

export async function approveAdminBlockRequest(
  blockRequestId: string,
  notes?: string
): Promise<AdminBlockRequest & { blockedDays: number }> {
  const res = await apiFetch<AdminBlockRequest & { blockedDays: number }>(
    `/portal/admin/block-requests/${encodeURIComponent(blockRequestId)}/approve`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: {
        notes: notes?.trim() || undefined,
      },
    }
  );
  return unwrap(res);
}

export async function rejectAdminBlockRequest(
  blockRequestId: string,
  notes?: string
): Promise<AdminBlockRequest> {
  const res = await apiFetch<AdminBlockRequest>(
    `/portal/admin/block-requests/${encodeURIComponent(blockRequestId)}/reject`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: {
        notes: notes?.trim() || undefined,
      },
    }
  );
  return unwrap(res);
}

export type AdminContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: "BOOKING" | "OWNERS" | "PARTNERS" | "OTHER";
  message: string;
  status: "OPEN" | "RESOLVED";
  resolvedAt: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedByAdmin?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
};

export async function getAdminContactSubmissions(params?: {
  page?: number;
  pageSize?: number;
  status?: "OPEN" | "RESOLVED" | "ALL";
  topic?: "BOOKING" | "OWNERS" | "PARTNERS" | "OTHER" | "ALL";
  q?: string;
}): Promise<{
  page: number;
  pageSize: number;
  total: number;
  items: AdminContactSubmission[];
}> {
  const res = await apiFetch<{
    page: number;
    pageSize: number;
    total: number;
    items: AdminContactSubmission[];
  }>("/admin/contact-submissions", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      status: params?.status && params.status !== "ALL" ? params.status : "",
      topic: params?.topic && params.topic !== "ALL" ? params.topic : "",
      q: params?.q ?? "",
    },
  });
  return unwrap(res);
}

export async function getAdminContactSubmissionDetail(
  submissionId: string
): Promise<AdminContactSubmission> {
  const res = await apiFetch<AdminContactSubmission>(
    `/admin/contact-submissions/${encodeURIComponent(submissionId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function updateAdminContactSubmissionStatus(
  submissionId: string,
  input: { status: "OPEN" | "RESOLVED"; notes?: string }
): Promise<{
  id: string;
  status: "OPEN" | "RESOLVED";
  resolvedAt: string | null;
  resolutionNotes: string | null;
  updatedAt: string;
}> {
  const res = await apiFetch<{
    id: string;
    status: "OPEN" | "RESOLVED";
    resolvedAt: string | null;
    resolutionNotes: string | null;
    updatedAt: string;
  }>(`/admin/contact-submissions/${encodeURIComponent(submissionId)}/status`, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    body: {
      status: input.status,
      notes: input.notes?.trim() || undefined,
    },
  });
  return unwrap(res);
}

export async function getAdminOpsTasks(params?: { page?: number; pageSize?: number }): Promise<AdminListResponse> {
  const res = await apiFetch<AdminListResponse>("/portal/admin/ops-tasks", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function listAdminBookingDocuments(
  bookingId: string
): Promise<AdminBookingDocument[]> {
  const res = await apiFetch<
    AdminBookingDocument[] | { items?: AdminBookingDocument[] }
  >(
    `/portal/admin/bookings/${encodeURIComponent(bookingId)}/documents`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  const data = unwrap(res);
  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items.map((item) => ({
    ...item,
    sizeBytes: typeof item.sizeBytes === "number" ? item.sizeBytes : 0,
  }));
}

export async function downloadAdminBookingDocument(
  bookingId: string,
  documentId: string
): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/portal/admin/bookings/${encodeURIComponent(bookingId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      responseType: "blob",
      headers: {
        Accept: "application/octet-stream",
      },
    }
  );
  return unwrap(res);
}

export async function getAdminCustomerDocuments(params?: {
  page?: number;
  pageSize?: number;
  status?: AdminCustomerDocumentStatus | "ALL";
  type?: AdminCustomerDocumentType | "ALL";
  userId?: string;
}): Promise<{
  page: number;
  pageSize: number;
  total: number;
  items: AdminCustomerDocument[];
}> {
  const res = await apiFetch<{
    page: number;
    pageSize: number;
    total: number;
    items: AdminCustomerDocument[];
  }>("/portal/admin/customer-documents", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      status: params?.status && params.status !== "ALL" ? params.status : "",
      type: params?.type && params.type !== "ALL" ? params.type : "",
      userId: params?.userId ?? "",
    },
  });
  return unwrap(res);
}

export async function getAdminCustomerDocument(documentId: string): Promise<AdminCustomerDocument> {
  const res = await apiFetch<AdminCustomerDocument>(
    `/portal/admin/customer-documents/${encodeURIComponent(documentId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function approveAdminCustomerDocument(
  documentId: string,
  notes?: string
): Promise<{
  id: string;
  status: AdminCustomerDocumentStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
}> {
  const res = await apiFetch<{
    id: string;
    status: AdminCustomerDocumentStatus;
    reviewNotes: string | null;
    reviewedAt: string | null;
    verifiedAt: string | null;
  }>(`/portal/admin/customer-documents/${encodeURIComponent(documentId)}/approve`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { notes: notes?.trim() || undefined },
  });
  return unwrap(res);
}

export async function rejectAdminCustomerDocument(
  documentId: string,
  notes?: string
): Promise<{
  id: string;
  status: AdminCustomerDocumentStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
}> {
  const res = await apiFetch<{
    id: string;
    status: AdminCustomerDocumentStatus;
    reviewNotes: string | null;
    reviewedAt: string | null;
    verifiedAt: string | null;
  }>(`/portal/admin/customer-documents/${encodeURIComponent(documentId)}/reject`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { notes: notes?.trim() || undefined },
  });
  return unwrap(res);
}

export async function downloadAdminCustomerDocument(documentId: string): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/portal/admin/customer-documents/${encodeURIComponent(documentId)}/download`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      responseType: "blob",
      headers: {
        Accept: "application/octet-stream",
      },
    }
  );
  return unwrap(res);
}

export async function viewAdminCustomerDocument(documentId: string): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/portal/admin/customer-documents/${encodeURIComponent(documentId)}/view`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      responseType: "blob",
      headers: {
        Accept: "application/pdf,image/*,*/*",
      },
    }
  );
  return unwrap(res);
}

export async function forceCancelAdminBooking(
  bookingId: string,
  input?: { notes?: string }
): Promise<{
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
  }>(`/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: {
      reason: "ADMIN_OVERRIDE",
      mode: "HARD",
      notes: input?.notes?.trim() || undefined,
    },
  });
  return unwrap(res);
}

export async function getAdminGuestReviews(params?: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  page?: number;
  pageSize?: number;
}): Promise<{
  items: AdminGuestReview[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const res = await apiFetch<{
    items: AdminGuestReview[];
    page: number;
    pageSize: number;
    total: number;
  }>("/admin/reviews", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      status: params?.status ?? "",
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
    },
  });
  return unwrap(res);
}

export async function approveAdminGuestReview(
  reviewId: string,
  adminNotes?: string
): Promise<{ ok: true }> {
  const res = await apiFetch<{ ok: true }>(
    `/admin/reviews/${encodeURIComponent(reviewId)}/approve`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { adminNotes: adminNotes?.trim() || undefined },
    }
  );
  return unwrap(res);
}

export async function rejectAdminGuestReview(
  reviewId: string,
  adminNotes?: string
): Promise<{ ok: true }> {
  const res = await apiFetch<{ ok: true }>(
    `/admin/reviews/${encodeURIComponent(reviewId)}/reject`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { adminNotes: adminNotes?.trim() || undefined },
    }
  );
  return unwrap(res);
}

/**
 * Admin Property Management (uses /api/admin/* endpoints behind canonical apiUrl()).
 * apiFetch() already resolves URL + cookies/auth correctly.
 */

export type MediaCategory =
  | "LIVING_ROOM"
  | "BEDROOM"
  | "BATHROOM"
  | "KITCHEN"
  | "COVER"
  | "DINING"
  | "ENTRY"
  | "HALLWAY"
  | "STUDY"
  | "LAUNDRY"
  | "BALCONY"
  | "TERRACE"
  | "VIEW"
  | "EXTERIOR"
  | "BUILDING"
  | "NEIGHBORHOOD"
  | "POOL"
  | "GYM"
  | "PARKING"
  | "AMENITY"
  | "FLOOR_PLAN"
  | "OTHER";

export type AdminPropertyCreateInput = {
  title: string;
  slug: string;
  propertyType?: PropertyType;
  description?: string | null;

  city: string;
  area?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;

  maxGuests: number;
  bedrooms: number;
  bathrooms: number;

  basePrice: number;
  cleaningFee?: number | null;
  currency: string;

  minNights?: number | null;
  maxNights?: number | null;

  vendorId?: string | null;
  publishNow?: boolean | null;

  translations?: Partial<
    Record<
      "en" | "ar",
      {
        title?: string;
        description?: string | null;
        areaLabel?: string | null;
        tagline?: string | null;
      }
    >
  >;
};

export type AdminPropertyUpdateInput = Partial<AdminPropertyCreateInput>;

export type AdminMediaItem = {
  id: string;
  url: string;
  alt?: string | null;
  sortOrder: number;
  category: MediaCategory;
};

export type AdminAmenitiesCatalogResponse = {
  amenitiesGrouped: Array<{
    group: { id: string; name: string } | null;
    amenities: Array<{
      id: string;
      key: string;
      name: string;
      icon: string | null;
      groupId: string | null;
    }>;
  }>;
};

export type AdminPropertyDeletionRequest = {
  id: string;
  propertyId: string | null;
  propertyTitleSnapshot: string;
  propertyCitySnapshot: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    title: string;
    city: string | null;
    status: string;
  } | null;
  requestedByVendor?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  reviewedByAdmin?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
};

export type AdminPropertyUnpublishRequest = {
  id: string;
  propertyId: string;
  propertyTitleSnapshot: string;
  propertyCitySnapshot: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  property?: {
    id: string;
    title: string;
    city: string | null;
    status: string;
  } | null;
  requestedByVendor?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  reviewedByAdmin?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
};

export type AdminPropertyDeletionRequestListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: AdminPropertyDeletionRequest[];
};

export type AdminPropertyUnpublishRequestListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: AdminPropertyUnpublishRequest[];
};

export type AdminPropertyDetail = Record<string, unknown> & {
  id: string;
  title?: string;
  slug?: string;
  propertyType?: PropertyType;
  status?: string;
  city?: string;
  area?: string | null;
  vendorId?: string | null;
  createdByAdminId?: string | null;
  media?: AdminMediaItem[];
  translations?: Array<{
    locale: "en" | "ar";
    title: string;
    description?: string | null;
    areaLabel?: string | null;
    tagline?: string | null;
  }>;
};

export async function createAdminProperty(input: AdminPropertyCreateInput): Promise<AdminPropertyDetail> {
  const res = await apiFetch<AdminPropertyDetail>("/admin/properties", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: input,
  });
  return unwrap(res);
}

export async function updateAdminProperty(propertyId: string, input: AdminPropertyUpdateInput): Promise<AdminPropertyDetail> {
  const res = await apiFetch<AdminPropertyDetail>(`/admin/properties/${encodeURIComponent(propertyId)}`, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    body: input,
  });
  return unwrap(res);
}

export async function publishAdminProperty(propertyId: string): Promise<AdminPropertyDetail> {
  const res = await apiFetch<AdminPropertyDetail>(`/admin/properties/${encodeURIComponent(propertyId)}/publish`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function unpublishAdminProperty(propertyId: string): Promise<AdminPropertyDetail> {
  const res = await apiFetch<AdminPropertyDetail>(`/admin/properties/${encodeURIComponent(propertyId)}/unpublish`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function getAdminPropertyDetail(propertyId: string): Promise<AdminPropertyDetail> {
  const res = await apiFetch<AdminPropertyDetail>(`/admin/properties/${encodeURIComponent(propertyId)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function uploadAdminPropertyMedia(propertyId: string, file: File): Promise<AdminMediaItem> {
  const res = await apiFetch<AdminMediaItem>(`/admin/properties/${encodeURIComponent(propertyId)}/media`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: (() => {
      const form = new FormData();
      form.append("file", file);
      return form;
    })(),
    // IMPORTANT: apiFetch should not set JSON headers when body is FormData
  });
  return unwrap(res);
}

/**
 * Register a Cloudinary URL that the browser uploaded directly.
 * The server only saves the URL to the DB — no file handling.
 */
export async function registerAdminPropertyMedia(
  propertyId: string,
  url: string,
): Promise<AdminMediaItem> {
  const res = await apiFetch<AdminMediaItem>(
    `/admin/properties/${encodeURIComponent(propertyId)}/media/register`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { url },
    }
  );
  return unwrap(res);
}

export async function updateAdminPropertyMediaCategory(
  propertyId: string,
  mediaId: string,
  category: MediaCategory
): Promise<AdminMediaItem> {
  const res = await apiFetch<AdminMediaItem>(
    `/admin/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(mediaId)}/category`,
    {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      body: { category },
    }
  );
  return unwrap(res);
}

export async function reorderAdminPropertyMedia(propertyId: string, orderedIds: string[]): Promise<AdminMediaItem[]> {
  const res = await apiFetch<AdminMediaItem[]>(`/admin/properties/${encodeURIComponent(propertyId)}/media/reorder`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { orderedMediaIds: orderedIds },
  });
  return unwrap(res);
}

export async function deleteAdminPropertyMedia(
  propertyId: string,
  mediaId: string,
  options?: { overrideReadiness?: boolean }
): Promise<AdminMediaItem[]> {
  const query = options?.overrideReadiness ? "?overrideReadiness=true" : "";
  const res = await apiFetch<AdminMediaItem[]>(
    `/admin/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(mediaId)}${query}`,
    {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function downloadAdminPropertyDocument(
  propertyId: string,
  documentId: string
): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/admin/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      responseType: "blob",
      headers: {
        Accept: "application/octet-stream",
      },
    }
  );
  return unwrap(res);
}

export async function viewAdminPropertyDocument(
  propertyId: string,
  documentId: string
): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/admin/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(documentId)}/view`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      responseType: "blob",
      headers: {
        Accept: "application/pdf,image/*,*/*",
      },
    }
  );
  return unwrap(res);
}

export async function deleteAdminPropertyDocument(
  propertyId: string,
  documentId: string
): Promise<{ ok: true; id: string }> {
  const res = await apiFetch<{ ok: true; id: string }>(
    `/admin/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getAdminAmenitiesCatalog(): Promise<AdminAmenitiesCatalogResponse> {
  const res = await apiFetch<AdminAmenitiesCatalogResponse>("/admin/properties/amenities/catalog", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function updateAdminPropertyAmenities(
  propertyId: string,
  amenityIds: string[]
): Promise<AdminPropertyDetail> {
  const res = await apiFetch<AdminPropertyDetail>(
    `/admin/properties/${encodeURIComponent(propertyId)}/amenities`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { amenityIds },
    }
  );
  return unwrap(res);
}

export async function getAdminPropertyDeletionRequests(params?: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  page?: number;
  pageSize?: number;
}): Promise<AdminPropertyDeletionRequestListResponse> {
  const res = await apiFetch<AdminPropertyDeletionRequestListResponse>(
    "/admin/properties/deletion-requests",
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      query: {
        status: params?.status ?? "",
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 20,
      },
    }
  );
  return unwrap(res);
}

export async function approveAdminPropertyDeletionRequest(
  requestId: string,
  notes?: string
): Promise<AdminPropertyDeletionRequest> {
  const res = await apiFetch<AdminPropertyDeletionRequest>(
    `/admin/properties/deletion-requests/${encodeURIComponent(requestId)}/approve`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { notes: notes?.trim() || undefined },
    }
  );
  return unwrap(res);
}

export async function rejectAdminPropertyDeletionRequest(
  requestId: string,
  notes?: string
): Promise<AdminPropertyDeletionRequest> {
  const res = await apiFetch<AdminPropertyDeletionRequest>(
    `/admin/properties/deletion-requests/${encodeURIComponent(requestId)}/reject`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { notes: notes?.trim() || undefined },
    }
  );
  return unwrap(res);
}

export async function getAdminPropertyUnpublishRequests(params?: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  page?: number;
  pageSize?: number;
}): Promise<AdminPropertyUnpublishRequestListResponse> {
  const res = await apiFetch<AdminPropertyUnpublishRequestListResponse>(
    "/admin/properties/unpublish-requests",
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      query: {
        status: params?.status ?? "",
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 20,
      },
    }
  );
  return unwrap(res);
}

export async function approveAdminPropertyUnpublishRequest(
  requestId: string,
  notes?: string
): Promise<AdminPropertyUnpublishRequest> {
  const res = await apiFetch<AdminPropertyUnpublishRequest>(
    `/admin/properties/unpublish-requests/${encodeURIComponent(requestId)}/approve`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { notes: notes?.trim() || undefined },
    }
  );
  return unwrap(res);
}

export async function rejectAdminPropertyUnpublishRequest(
  requestId: string,
  notes?: string
): Promise<AdminPropertyUnpublishRequest> {
  const res = await apiFetch<AdminPropertyUnpublishRequest>(
    `/admin/properties/unpublish-requests/${encodeURIComponent(requestId)}/reject`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { notes: notes?.trim() || undefined },
    }
  );
  return unwrap(res);
}

export async function deleteAdminOwnedProperty(propertyId: string): Promise<{ ok: true; id: string }> {
  const res = await apiFetch<{ ok: true; id: string }>(
    `/admin/properties/${encodeURIComponent(propertyId)}`,
    {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

// ─── Admin Pricing Rules ───────────────────────────────────────────────────

export type AdminPricingRuleType = "SEASONAL" | "WEEKEND" | "WEEKDAY" | "HOLIDAY" | "CUSTOM";

export type AdminPricingRule = {
  id: string;
  propertyId: string;
  type: AdminPricingRuleType;
  name: string | null;
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  fixedPrice: number | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
};

export async function listAdminPricingRules(propertyId: string): Promise<AdminPricingRule[]> {
  const res = await apiFetch<AdminPricingRule[]>(
    `/admin/properties/${encodeURIComponent(propertyId)}/pricing-rules`,
    { method: "GET", credentials: "include", cache: "no-store" }
  );
  return unwrap(res);
}

export async function createAdminPricingRule(
  propertyId: string,
  input: {
    type: AdminPricingRuleType;
    name?: string;
    startDate: string;
    endDate: string;
    priceMultiplier?: number;
    fixedPrice?: number;
    priority?: number;
  }
): Promise<AdminPricingRule> {
  const res = await apiFetch<AdminPricingRule>(
    `/admin/properties/${encodeURIComponent(propertyId)}/pricing-rules`,
    { method: "POST", credentials: "include", cache: "no-store", body: input }
  );
  return unwrap(res);
}

export async function updateAdminPricingRule(
  propertyId: string,
  ruleId: string,
  input: Partial<{
    name: string;
    startDate: string;
    endDate: string;
    priceMultiplier: number;
    fixedPrice: number | null;
    priority: number;
    isActive: boolean;
  }>
): Promise<AdminPricingRule> {
  const res = await apiFetch<AdminPricingRule>(
    `/admin/properties/${encodeURIComponent(propertyId)}/pricing-rules/${encodeURIComponent(ruleId)}`,
    { method: "PATCH", credentials: "include", cache: "no-store", body: input }
  );
  return unwrap(res);
}

export async function deleteAdminPricingRule(
  propertyId: string,
  ruleId: string
): Promise<void> {
  const res = await apiFetch<void>(
    `/admin/properties/${encodeURIComponent(propertyId)}/pricing-rules/${encodeURIComponent(ruleId)}`,
    { method: "DELETE", credentials: "include", cache: "no-store" }
  );
  unwrap(res);
}

// ─── Admin Review Delete ───────────────────────────────────────────────────

export async function deleteAdminGuestReview(
  reviewId: string
): Promise<{ deleted: boolean; reviewId: string }> {
  const res = await apiFetch<{ deleted: boolean; reviewId: string }>(
    `/admin/reviews/${encodeURIComponent(reviewId)}`,
    { method: "DELETE", credentials: "include", cache: "no-store" }
  );
  return unwrap(res);
}
