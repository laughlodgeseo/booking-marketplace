import { apiFetch } from "@/lib/apiFetch";

export type ReviewQueueItem = {
  id: string;
  title: string | null;
  slug: string | null;
  status: string | null;
  vendorId: string | null;
  createdAt: string;
  // allow backend to include additional fields without breaking UI
  [key: string]: unknown;
};

type ReviewQueueResponse = {
  items: ReviewQueueItem[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function requireString(value: unknown, field: string): string {
  const s = asString(value);
  if (!s) throw new Error(`Invalid response: ${field} is missing`);
  return s;
}

function parseReviewQueueItem(raw: unknown): ReviewQueueItem {
  if (!isObject(raw)) {
    throw new Error("Invalid review queue item");
  }

  const id = requireString(raw.id, "id");
  const createdAt = requireString(raw.createdAt, "createdAt");

  const title = asString(raw.title);
  const slug = asString(raw.slug);
  const status = asString(raw.status);
  const vendorId = asString(raw.vendorId);

  return { ...raw, id, createdAt, title, slug, status, vendorId };
}

export async function getReviewQueue(): Promise<ReviewQueueResponse> {
  // Backend route: /admin/properties/review-queue
  const res = await apiFetch<unknown>("/admin/properties/review-queue", { method: "GET" });
  if (!res.ok) {
    throw new Error(res.message);
  }

  const data = res.data;

  if (!isObject(data)) throw new Error("Invalid response: expected object");
  const itemsRaw = data.items;

  if (!Array.isArray(itemsRaw)) {
    return { items: [] };
  }

  return { items: itemsRaw.map(parseReviewQueueItem) };
}

export async function approveProperty(propertyId: string): Promise<void> {
  const res = await apiFetch(`/admin/properties/${propertyId}/approve`, { method: "POST" });
  if (!res.ok) throw new Error(res.message);
}

export async function requestChangesProperty(propertyId: string, body: { message: string }): Promise<void> {
  const res = await apiFetch(`/admin/properties/${propertyId}/request-changes`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(res.message);
}

export async function rejectProperty(propertyId: string, body: { reason: string }): Promise<void> {
  const res = await apiFetch(`/admin/properties/${propertyId}/reject`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(res.message);
}
