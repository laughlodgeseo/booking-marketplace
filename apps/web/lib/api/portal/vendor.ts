// lib/api/portal/vendor.ts
import { apiFetch } from "@/lib/http";
import type { HttpResult } from "@/lib/http";
import type { MediaCategory } from "@/lib/types/property";
import type { PortalCalendarResponse } from "@/lib/api/portal/calendar";
import type { PropertyType } from "@/lib/types/property-type";

function unwrap<T>(res: HttpResult<T>): T {
  if (!res.ok) {
    const details =
      res.details !== undefined ? `\n\nDETAILS:\n${JSON.stringify(res.details, null, 2)}` : "";
    throw new Error(`${res.message}${details}`);
  }
  return res.data;
}

export type VendorOverviewResponse = {
  kpis: Record<string, number>;
  recentBookings?: unknown[];
  recentOps?: unknown[];
};

export type VendorAnalyticsResponse = {
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

export type VendorBookingsResponse = {
  items: Array<{
    id: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency: string;
    propertyTitle: string;
    createdAt: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
};

export type VendorCalendarResponse = PortalCalendarResponse;

export type VendorOpsTasksResponse = {
  items: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  total: number;
};

export type VendorPropertyStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "APPROVED_PENDING_ACTIVATION_PAYMENT"
  | "APPROVED_PENDING_PAYMENT"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "PUBLISHED"
  | "SUSPENDED"
  | "ARCHIVED";

export type PropertyReviewHistoryAction =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED";

export type PropertyReviewHistoryEntry = {
  action: PropertyReviewHistoryAction;
  note: string | null;
  adminId: string | null;
  createdAt: string;
  snapshot: unknown;
};

export type PropertyDiffChange = {
  field: string;
  before: unknown;
  after: unknown;
};

export type PropertyChangesResponse = {
  propertyId: string;
  status: VendorPropertyStatus;
  baseline: {
    action: PropertyReviewHistoryAction;
    createdAt: string;
  } | null;
  changes: PropertyDiffChange[];
  reviewHistory: PropertyReviewHistoryEntry[];
  lastSubmittedAt: string | null;
  lastReviewedAt: string | null;
  lastEditedAt: string | null;
};

export type VendorPropertyListItem = {
  id: string;
  title: string;
  slug: string;
  status: VendorPropertyStatus;
  activationFee: number | null;
  activationFeeCurrency: string;
  activationPaymentStatus: "UNPAID" | "IN_PROGRESS" | "PAID";
  city: string;
  area: string | null;
  priceFrom: number;
  bookingsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VendorPropertiesResponse = {
  items: VendorPropertyListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type VendorBlockRequest = {
  id: string;
  propertyId: string;
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
};

export type VendorMaintenanceRequest = {
  id: string;
  propertyId: string;
  bookingId: string | null;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  workOrders: Array<{
    id: string;
    maintenanceRequestId: string;
    status: "DRAFT" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    assignedToUserId: string | null;
    costEstimate: number | null;
    actualCost: number | null;
    currency: string;
    notes: string | null;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type VendorPropertyMedia = {
  id: string;
  propertyId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  category: MediaCategory;
  createdAt: string;
};

export type PropertyDocumentType =
  | "OWNERSHIP_PROOF"
  | "AUTHORIZATION_PROOF"
  | "OWNER_ID"
  | "ADDRESS_PROOF"
  | "HOLIDAY_HOME_PERMIT"
  | "OTHER";

export type PropertyDocumentRequirement = {
  id: PropertyDocumentType;
  label: string;
  required: boolean;
  type: "file";
  accept: string[];
  maxSizeMB: number;
};

export type VendorPropertyDocument = {
  id: string;
  propertyId: string;
  type: PropertyDocumentType;
  url: string | null;
  storageKey: string | null;
  originalName: string | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorPropertyActivationInvoice = {
  id: string;
  propertyId: string;
  vendorId: string;
  amount: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  provider: "STRIPE" | "MANUAL" | "OTHER";
  providerRef: string | null;
  stripePaymentIntentId: string | null;
  lastError: string | null;
  createdAt: string;
  paidAt: string | null;
  updatedAt: string;
};

export type VendorPropertyDeletionRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type VendorPropertyDeletionRequest = {
  id: string;
  propertyId: string | null;
  propertyTitleSnapshot: string;
  propertyCitySnapshot: string | null;
  status: VendorPropertyDeletionRequestStatus;
  reason: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorPropertyUnpublishRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type VendorPropertyUnpublishRequest = {
  id: string;
  propertyId: string;
  propertyTitleSnapshot: string;
  propertyCitySnapshot: string | null;
  status: VendorPropertyUnpublishRequestStatus;
  reason: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorAmenityGroup = {
  id: string;
  name: string;
};

export type VendorAmenity = {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  groupId: string | null;
};

export type AmenitiesCatalogGroup = {
  group: VendorAmenityGroup;
  amenities: VendorAmenity[];
};

export type AmenitiesCatalogResponse = {
  amenitiesGrouped: AmenitiesCatalogGroup[];
};

export type VendorPropertyAmenity = {
  amenity: {
    id: string;
    key: string;
    name: string;
    group: { id: string; key: string; name: string } | null;
  };
};

export type PropertyLocaleTextInput = {
  title?: string;
  description?: string | null;
  areaLabel?: string | null;
  tagline?: string | null;
};

export type PropertyTranslationsInput = Partial<
  Record<"en" | "ar", PropertyLocaleTextInput>
>;

export type VendorPropertyDetail = {
  id: string;
  title: string;
  slug: string;
  propertyType: PropertyType;
  description: string | null;

  city: string;
  area: string | null;
  address: string | null;

  lat: number | null;
  lng: number | null;

  maxGuests: number;
  bedrooms: number;
  bathrooms: number;

  basePrice: number;
  cleaningFee: number;
  currency: string;

  minNights: number;
  maxNights: number | null;

  checkInFromMin: number | null;
  checkInToMax: number | null;
  checkOutMin: number | null;

  isInstantBook: boolean;

  status: VendorPropertyStatus;
  documentUrl?: string | null;
  documentPublicId?: string | null;
  documentStatus?: string;
  documentRejectionReason?: string | null;
  activationFee: number | null;
  activationFeeCurrency: string;
  activationPaymentStatus: "UNPAID" | "IN_PROGRESS" | "PAID";
  reviewHistory?: PropertyReviewHistoryEntry[];
  lastSubmittedAt?: string | null;
  lastReviewedAt?: string | null;
  lastEditedAt?: string | null;

  createdAt: string;
  updatedAt: string;

  media: VendorPropertyMedia[];
  documents: VendorPropertyDocument[];
  amenities: VendorPropertyAmenity[];
  translations?: Array<{
    locale: "en" | "ar";
    title: string;
    description?: string | null;
    areaLabel?: string | null;
    tagline?: string | null;
  }>;
};

export type VendorPropertyDraftInput = {
  title: string;
  slug?: string;
  propertyType?: PropertyType;
  description?: string;

  city: string;
  area?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;

  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;

  basePrice: number;
  cleaningFee?: number;
  currency?: string;

  minNights?: number;
  maxNights?: number | null;

  checkInFromMin?: number | null;
  checkInToMax?: number | null;
  checkOutMin?: number | null;

  isInstantBook?: boolean;
  translations?: PropertyTranslationsInput;
};

export type UpdateVendorPropertyLocationInput = {
  city: string;
  area?: string | null;
  address?: string | null;
  lat: number;
  lng: number;
};

export async function getVendorOverview(): Promise<VendorOverviewResponse> {
  const res = await apiFetch<VendorOverviewResponse>("/portal/vendor/overview", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function getVendorAnalytics(params?: { range?: string }): Promise<VendorAnalyticsResponse> {
  const range = params?.range ?? "30d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : range === "180d" ? 180 : range === "365d" ? 365 : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const res = await apiFetch<VendorAnalyticsResponse>("/portal/vendor/analytics", {
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

export async function getVendorBookings(params?: {
  page?: number;
  pageSize?: number;
}): Promise<VendorBookingsResponse> {
  const res = await apiFetch<VendorBookingsResponse>("/portal/vendor/bookings", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function getVendorCalendar(params?: {
  from?: string;
  to?: string;
  propertyId?: string;
}): Promise<VendorCalendarResponse> {
  const res = await apiFetch<VendorCalendarResponse>("/portal/vendor/calendar", {
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

export async function blockVendorPropertyDates(
  propertyId: string,
  input: { from: string; to: string; note?: string }
): Promise<{ ok: true; blockedDays: number }> {
  const res = await apiFetch<{ ok: true; blockedDays: number }>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/availability/block`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: {
        from: input.from,
        to: input.to,
        note: input.note?.trim() || undefined,
      },
    }
  );
  return unwrap(res);
}

export async function unblockVendorPropertyDates(
  propertyId: string,
  input: { from: string; to: string; note?: string }
): Promise<{ ok: true; unblockedDays: number }> {
  const res = await apiFetch<{ ok: true; unblockedDays: number }>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/availability/unblock`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: {
        from: input.from,
        to: input.to,
        note: input.note?.trim() || undefined,
      },
    }
  );
  return unwrap(res);
}

export async function getVendorOpsTasks(params?: {
  page?: number;
  pageSize?: number;
}): Promise<VendorOpsTasksResponse> {
  const res = await apiFetch<VendorOpsTasksResponse>("/portal/vendor/ops-tasks", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function getVendorProperties(params?: {
  page?: number;
  pageSize?: number;
}): Promise<VendorPropertiesResponse> {
  const res = await apiFetch<VendorPropertiesResponse>("/portal/vendor/properties", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function getPropertyDocumentRequirements(): Promise<PropertyDocumentRequirement[]> {
  const res = await apiFetch<PropertyDocumentRequirement[]>("/properties/document-requirements", {
    method: "GET",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function getVendorBlockRequests(params?: {
  page?: number;
  pageSize?: number;
  propertyId?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "ALL";
}): Promise<{
  page: number;
  pageSize: number;
  total: number;
  items: VendorBlockRequest[];
}> {
  const res = await apiFetch<{
    page: number;
    pageSize: number;
    total: number;
    items: VendorBlockRequest[];
  }>("/portal/vendor/block-requests", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      propertyId: params?.propertyId ?? "",
      status: params?.status && params.status !== "ALL" ? params.status : "",
    },
  });
  return unwrap(res);
}

export async function createVendorBlockRequest(input: {
  propertyId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<VendorBlockRequest> {
  const res = await apiFetch<VendorBlockRequest>("/vendor/calendar/block", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: {
      propertyId: input.propertyId,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason?.trim() || undefined,
    },
  });
  return unwrap(res);
}

export async function getVendorMaintenanceRequests(params?: {
  page?: number;
  pageSize?: number;
  propertyId?: string;
  status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED" | "ALL";
}): Promise<{
  page: number;
  limit: number;
  total: number;
  items: VendorMaintenanceRequest[];
}> {
  const res = await apiFetch<{
    page: number;
    limit: number;
    total: number;
    items: VendorMaintenanceRequest[];
  }>("/operator/maintenance/requests", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      page: params?.page ?? 1,
      limit: params?.pageSize ?? 20,
      propertyId: params?.propertyId ?? "",
      status: params?.status && params.status !== "ALL" ? params.status : "",
    },
  });
  return unwrap(res);
}

/**
 * Amenities catalog (vendor)
 * GET /vendor/properties/amenities/catalog
 */
export async function getAmenitiesCatalog(): Promise<AmenitiesCatalogResponse> {
  const res = await apiFetch<AmenitiesCatalogResponse>("/vendor/properties/amenities/catalog", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

/**
 * Update property amenities (vendor)
 * POST /vendor/properties/:id/amenities
 * Body: { amenityIds: string[] }
 */
export async function updateVendorPropertyAmenities(
  propertyId: string,
  amenityIds: string[]
): Promise<VendorPropertyDetail> {
  const res = await apiFetch<VendorPropertyDetail>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/amenities`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { amenityIds },
    }
  );
  return unwrap(res);
}

/**
 * Draft create/edit flow
 * - POST   /vendor/properties
 * - GET    /vendor/properties/:id
 * - PATCH  /vendor/properties/:id
 */
export async function createVendorPropertyDraft(
  input: VendorPropertyDraftInput
): Promise<VendorPropertyDetail> {
  const res = await apiFetch<VendorPropertyDetail>("/vendor/properties", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: input,
  });
  return unwrap(res);
}

export async function getVendorPropertyDraft(id: string): Promise<VendorPropertyDetail> {
  const res = await apiFetch<VendorPropertyDetail>(`/vendor/properties/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function updateVendorPropertyDraft(
  id: string,
  input: VendorPropertyDraftInput
): Promise<VendorPropertyDetail> {
  const res = await apiFetch<VendorPropertyDetail>(`/vendor/properties/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    body: input,
  });
  return unwrap(res);
}

/**
 * PATCH /vendor/properties/:id/location
 */
export async function updateVendorPropertyLocation(
  id: string,
  input: UpdateVendorPropertyLocationInput
): Promise<VendorPropertyDetail> {
  const res = await apiFetch<VendorPropertyDetail>(
    `/vendor/properties/${encodeURIComponent(id)}/location`,
    {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      body: input,
    }
  );
  return unwrap(res);
}

/**
 * POST /vendor/properties/:id/media  (field: file)
 */
export async function uploadVendorPropertyMedia(
  propertyId: string,
  file: File
): Promise<VendorPropertyMedia> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await apiFetch<VendorPropertyMedia>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/media`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: fd,
    }
  );

  return unwrap(res);
}

/**
 * POST /vendor/properties/:id/media/register
 * Register a Cloudinary URL the browser uploaded directly.
 */
export async function registerVendorPropertyMedia(
  propertyId: string,
  url: string,
): Promise<VendorPropertyMedia> {
  const res = await apiFetch<VendorPropertyMedia>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/media/register`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { url },
    }
  );
  return unwrap(res);
}

/**
 * PATCH /vendor/properties/:propertyId/media/:mediaId/category
 */
export async function updateVendorPropertyMediaCategory(
  propertyId: string,
  mediaId: string,
  category: MediaCategory
): Promise<VendorPropertyMedia> {
  const res = await apiFetch<VendorPropertyMedia>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(mediaId)}/category`,
    {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      body: { category },
    }
  );
  return unwrap(res);
}

/**
 * POST /vendor/properties/:id/media/reorder
 */
export async function reorderVendorPropertyMedia(
  propertyId: string,
  orderedMediaIds: string[]
): Promise<VendorPropertyMedia[]> {
  const res = await apiFetch<VendorPropertyMedia[]>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/media/reorder`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { orderedMediaIds },
    }
  );
  return unwrap(res);
}

export async function deleteVendorPropertyMedia(
  propertyId: string,
  mediaId: string
): Promise<VendorPropertyMedia[]> {
  const res = await apiFetch<VendorPropertyMedia[]>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/media/${encodeURIComponent(mediaId)}`,
    {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

/**
 * POST /vendor/properties/:id/documents (multipart)
 * fields: type, document
 */
export async function uploadVendorPropertyDocument(
  propertyId: string,
  type: PropertyDocumentType,
  file: File
): Promise<VendorPropertyDocument> {
  const fd = new FormData();
  fd.append("type", type);
  fd.append("document", file);

  const res = await apiFetch<VendorPropertyDocument>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/documents`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: fd,
    }
  );

  return unwrap(res);
}

/**
 * GET /vendor/properties/:propertyId/documents/:documentId/download
 * ✅ returns Blob so we can trigger browser download (Authorization included).
 */
export async function downloadVendorPropertyDocument(
  propertyId: string,
  documentId: string
): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(
      documentId
    )}/download`,
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

export async function viewVendorPropertyDocument(
  propertyId: string,
  documentId: string
): Promise<Blob> {
  const res = await apiFetch<Blob>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(
      documentId
    )}/view`,
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

export async function deleteVendorPropertyDocument(
  propertyId: string,
  documentId: string
): Promise<{ ok: true; id: string }> {
  const res = await apiFetch<{ ok: true; id: string }>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getVendorPropertyActivation(
  propertyId: string
): Promise<{
  propertyId: string;
  propertyStatus: VendorPropertyStatus;
  activationFee: number | null;
  activationFeeCurrency: string;
  activationPaymentStatus: "UNPAID" | "IN_PROGRESS" | "PAID";
  activationRequired: boolean;
  invoice: VendorPropertyActivationInvoice | null;
}> {
  const res = await apiFetch<{
    propertyId: string;
    propertyStatus: VendorPropertyStatus;
    activationFee: number | null;
    activationFeeCurrency: string;
    activationPaymentStatus: "UNPAID" | "IN_PROGRESS" | "PAID";
    activationRequired: boolean;
    invoice: VendorPropertyActivationInvoice | null;
  }>(`/vendor/properties/${encodeURIComponent(propertyId)}/activation`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function createVendorActivationPaymentIntent(
  propertyId: string,
  input?: { idempotencyKey?: string }
): Promise<{
  propertyId: string;
  propertyStatus: VendorPropertyStatus;
  activationPaymentStatus: "UNPAID" | "IN_PROGRESS" | "PAID";
  invoice: VendorPropertyActivationInvoice;
  clientSecret: string;
  amount: number;
  currency: string;
  paymentIntentId: string;
  publishableKey: string | null;
  reused: boolean;
}> {
  const headers: Record<string, string> = {};
  const idempotencyKey = input?.idempotencyKey?.trim();
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await apiFetch<{
    propertyId: string;
    propertyStatus: VendorPropertyStatus;
    activationPaymentStatus: "UNPAID" | "IN_PROGRESS" | "PAID";
    invoice: VendorPropertyActivationInvoice;
    clientSecret: string;
    amount: number;
    currency: string;
    paymentIntentId: string;
    publishableKey: string | null;
    reused: boolean;
  }>(`/vendor/properties/${encodeURIComponent(propertyId)}/pay-activation`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers,
    body: {},
  });

  return unwrap(res);
}

export async function createVendorPropertyActivationInvoice(
  propertyId: string,
  input?: { provider?: VendorPropertyActivationInvoice["provider"]; providerRef?: string }
): Promise<{
  propertyId: string;
  propertyStatus: VendorPropertyStatus;
  invoice: VendorPropertyActivationInvoice;
}> {
  const res = await apiFetch<{
    propertyId: string;
    propertyStatus: VendorPropertyStatus;
    invoice: VendorPropertyActivationInvoice;
  }>(`/vendor/properties/${encodeURIComponent(propertyId)}/activation/invoice`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: {
      provider: input?.provider ?? "MANUAL",
      providerRef: input?.providerRef?.trim() || undefined,
    },
  });
  return unwrap(res);
}

export async function confirmVendorPropertyActivationManual(
  propertyId: string,
  input?: { invoiceId?: string; providerRef?: string }
): Promise<{
  ok: true;
  invoice: VendorPropertyActivationInvoice;
  propertyStatus: VendorPropertyStatus;
}> {
  const res = await apiFetch<{
    ok: true;
    invoice: VendorPropertyActivationInvoice;
    propertyStatus: VendorPropertyStatus;
  }>(`/vendor/properties/${encodeURIComponent(propertyId)}/activation/manual-confirm`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: {
      invoiceId: input?.invoiceId,
      providerRef: input?.providerRef?.trim() || undefined,
    },
  });
  return unwrap(res);
}

/**
 * POST /vendor/properties/:id/submit
 */
export async function submitVendorPropertyForReview(propertyId: string): Promise<VendorPropertyDetail> {
  const res = await apiFetch<VendorPropertyDetail>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/submit`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

/**
 * POST /vendor/properties/:id/resubmit
 */
export async function resubmitVendorPropertyForReview(propertyId: string): Promise<VendorPropertyDetail> {
  const res = await apiFetch<VendorPropertyDetail>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/resubmit`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

/**
 * GET /vendor/properties/:id/changes
 */
export async function getVendorPropertyChanges(propertyId: string): Promise<PropertyChangesResponse> {
  const res = await apiFetch<PropertyChangesResponse>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/changes`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

/**
 * POST /vendor/properties/:id/publish
 * POST /vendor/properties/:id/unpublish
 */
export async function publishVendorProperty(propertyId: string): Promise<VendorPropertyDetail> {
  const res = await apiFetch<VendorPropertyDetail>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/publish`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function unpublishVendorProperty(
  propertyId: string
): Promise<VendorPropertyUnpublishRequest> {
  const res = await apiFetch<VendorPropertyUnpublishRequest>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/unpublish`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function getVendorPropertyUnpublishRequest(
  propertyId: string
): Promise<VendorPropertyUnpublishRequest | null> {
  const res = await apiFetch<VendorPropertyUnpublishRequest | null>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/unpublish-request`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function requestVendorPropertyUnpublish(
  propertyId: string,
  reason?: string
): Promise<VendorPropertyUnpublishRequest> {
  const res = await apiFetch<VendorPropertyUnpublishRequest>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/unpublish-request`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { reason: reason?.trim() || undefined },
    }
  );
  return unwrap(res);
}

export async function getVendorPropertyDeletionRequest(
  propertyId: string
): Promise<VendorPropertyDeletionRequest | null> {
  const res = await apiFetch<VendorPropertyDeletionRequest | null>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/deletion-request`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function requestVendorPropertyDeletion(
  propertyId: string,
  reason?: string
): Promise<VendorPropertyDeletionRequest> {
  const res = await apiFetch<VendorPropertyDeletionRequest>(
    `/vendor/properties/${encodeURIComponent(propertyId)}/deletion-request`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { reason: reason?.trim() || undefined },
    }
  );
  return unwrap(res);
}
