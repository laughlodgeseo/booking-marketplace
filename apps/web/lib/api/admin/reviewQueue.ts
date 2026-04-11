// lib/api/admin/reviewQueue.ts
import { apiFetch } from "@/lib/http";
import type { HttpResult } from "@/lib/http";

function unwrap<T>(res: HttpResult<T>): T {
  if (!res.ok) {
    const details =
      res.details !== undefined ? `\n\nDETAILS:\n${JSON.stringify(res.details, null, 2)}` : "";
    throw new Error(`${res.message}${details}`);
  }
  return res.data;
}

export type ReviewQueueStatus =
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "APPROVED_PENDING_ACTIVATION_PAYMENT"
  | "REJECTED";

export type ReviewHistoryAction =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED";

export type ReviewHistoryEntry = {
  action: ReviewHistoryAction;
  note: string | null;
  adminId: string | null;
  createdAt: string;
  snapshot: unknown;
};

export type AdminPropertyChange = {
  field: string;
  before: unknown;
  after: unknown;
};

export type AdminPropertyChangesResponse = {
  propertyId: string;
  status: string;
  baseline: { action: ReviewHistoryAction; createdAt: string } | null;
  changes: AdminPropertyChange[];
  reviewHistory: ReviewHistoryEntry[];
  lastSubmittedAt: string | null;
  lastReviewedAt: string | null;
  lastEditedAt: string | null;
};

export type AdminReviewQueueItem = {
  id: string;
  title: string;
  slug: string;
  status: ReviewQueueStatus;

  city: string;
  area: string | null;

  createdAt: string;
  updatedAt: string;

  // optional fields if backend includes them
  submittedAt?: string | null;
  vendorId?: string;
  vendorName?: string | null;

  media?: Array<{ id?: string; url: string; category?: string; sortOrder?: number }>;
  documents?: Array<{ id: string; type: string; originalName?: string | null; mimeType?: string | null }>;
  amenities?: unknown[];
};

export type AdminReviewQueueResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: AdminReviewQueueItem[];
};

type RawReviewQueueItem = Record<string, unknown>;

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function mapItem(raw: RawReviewQueueItem): AdminReviewQueueItem {
  const vendor = asRecord(raw.vendor);
  const city = asString(raw.city) ?? "";
  const area = asString(raw.area);
  return {
    id: asString(raw.id) ?? "",
    title: asString(raw.title) ?? "Untitled",
    slug: asString(raw.slug) ?? "",
    status: (asString(raw.status) as ReviewQueueStatus) ?? "UNDER_REVIEW",
    city,
    area,
    createdAt: asString(raw.createdAt) ?? new Date(0).toISOString(),
    updatedAt: asString(raw.updatedAt) ?? new Date(0).toISOString(),
    submittedAt: asString(raw.submittedAt),
    vendorId: asString(raw.vendorId) ?? asString(vendor?.id ?? null) ?? undefined,
    vendorName:
      asString(raw.vendorName) ??
      asString(vendor?.fullName ?? null) ??
      asString(vendor?.email ?? null) ??
      undefined,
    media: asArray(raw.media).filter((x): x is { id?: string; url: string; category?: string; sortOrder?: number } => {
      const m = asRecord(x);
      return Boolean(m && typeof m.url === "string");
    }) as Array<{ id?: string; url: string; category?: string; sortOrder?: number }>,
    documents: asArray(raw.documents).filter((x): x is { id: string; type: string; originalName?: string | null; mimeType?: string | null } => {
      const d = asRecord(x);
      return Boolean(d && typeof d.id === "string" && typeof d.type === "string");
    }) as Array<{ id: string; type: string; originalName?: string | null; mimeType?: string | null }>,
    amenities: asArray(raw.amenities),
  };
}

/**
 * ✅ Backend: GET /admin/properties/review-queue?status=UNDER_REVIEW&page&pageSize
 */
export async function getAdminReviewQueue(params?: {
  status?: ReviewQueueStatus;
  page?: number;
  pageSize?: number;
}): Promise<AdminReviewQueueResponse> {
  const reqPage = params?.page ?? 1;
  const reqPageSize = params?.pageSize ?? 10;
  const res = await apiFetch<Record<string, unknown>>("/admin/properties/review-queue", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: {
      status: params?.status ?? "UNDER_REVIEW",
      page: reqPage,
      pageSize: reqPageSize,
    },
  });
  const raw = unwrap(res);
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  const items = itemsRaw
    .map((row) => asRecord(row))
    .filter((row): row is RawReviewQueueItem => row !== null)
    .map(mapItem);

  return {
    page: typeof raw.page === "number" ? raw.page : reqPage,
    pageSize: typeof raw.pageSize === "number" ? raw.pageSize : reqPageSize,
    total: typeof raw.total === "number" ? raw.total : items.length,
    items,
  };
}

/**
 * ✅ Backend verified: POST /admin/properties/:id/approve
 */
export async function approveAdminProperty(propertyId: string): Promise<AdminReviewQueueItem> {
  const body: Record<string, unknown> = {};
  const res = await apiFetch<Record<string, unknown>>(`/admin/properties/${encodeURIComponent(propertyId)}/approve`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body,
  });
  const raw = unwrap(res);
  const item = asRecord(raw.item ?? raw);
  if (!item) throw new Error("Invalid approve response");
  return mapItem(item);
}

export async function approveAdminPropertyWithActivationFee(
  propertyId: string,
  input: { activationFee: number; activationFeeCurrency?: string; notes?: string }
): Promise<AdminReviewQueueItem> {
  const body: Record<string, unknown> = {
    activationFee: input.activationFee,
  };
  if (typeof input.activationFeeCurrency === "string" && input.activationFeeCurrency.trim()) {
    body.activationFeeCurrency = input.activationFeeCurrency.trim();
  }
  if (typeof input.notes === "string" && input.notes.trim()) {
    body.notes = input.notes.trim();
  }

  const res = await apiFetch<Record<string, unknown>>(`/admin/properties/${encodeURIComponent(propertyId)}/approve`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body,
  });
  const raw = unwrap(res);
  const item = asRecord(raw.item ?? raw);
  if (!item) throw new Error("Invalid approve response");
  return mapItem(item);
}

/**
 * These may exist in your backend. If not, UI will show the backend error cleanly.
 */
export async function rejectAdminProperty(propertyId: string, reason?: string): Promise<AdminReviewQueueItem> {
  const res = await apiFetch<Record<string, unknown>>(`/admin/properties/${encodeURIComponent(propertyId)}/reject`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: reason ? { reason } : {},
  });
  const raw = unwrap(res);
  const item = asRecord(raw.item ?? raw);
  if (!item) throw new Error("Invalid reject response");
  return mapItem(item);
}

export async function requestChangesAdminProperty(propertyId: string, note?: string): Promise<AdminReviewQueueItem> {
  const res = await apiFetch<Record<string, unknown>>(`/admin/properties/${encodeURIComponent(propertyId)}/request-changes`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: note ? { notes: note } : {},
  });
  const raw = unwrap(res);
  const item = asRecord(raw.item ?? raw);
  if (!item) throw new Error("Invalid request-changes response");
  return mapItem(item);
}

export async function getAdminPropertyChanges(propertyId: string): Promise<AdminPropertyChangesResponse> {
  const res = await apiFetch<AdminPropertyChangesResponse>(`/admin/properties/${encodeURIComponent(propertyId)}/changes`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}
