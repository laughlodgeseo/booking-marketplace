import { apiFetch } from "../http";
import type { PropertyDetail, QuoteResponse, ReserveResponse } from "../types/property";

type RequestContext = {
  locale?: string;
  currency?: string;
};

export type PropertyPreviewData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  price: number;
  currency: string;
  location: {
    address: string | null;
    city: string | null;
    area: string | null;
    lat: number | null;
    lng: number | null;
  };
  images: string[];
  amenities: string[];
  host: {
    id: string;
    name: string;
    avatar: string | null;
  };
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  minNights: number;
  maxNights: number | null;
  createdAt: string;
  updatedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizePropertyPreview(data: unknown): PropertyPreviewData {
  const rec = asRecord(data) ?? {};
  const locationRec = asRecord(rec.location) ?? {};

  const imageList = Array.isArray(rec.images) ? rec.images : [];
  const images = imageList
    .map((item) => {
      if (typeof item === "string") return item;
      const maybeObj = asRecord(item);
      return typeof maybeObj?.url === "string" ? maybeObj.url : null;
    })
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  const amenityList = Array.isArray(rec.amenities) ? rec.amenities : [];
  const amenities = amenityList
    .map((item) => {
      if (typeof item === "string") return item;
      const maybeObj = asRecord(item);
      return typeof maybeObj?.name === "string" ? maybeObj.name : null;
    })
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  const hostRec = asRecord(rec.host) ?? {};

  return {
    id: asString(rec.id),
    title: asString(rec.title, "Untitled property"),
    description: asNullableString(rec.description),
    status: asString(rec.status, "UNKNOWN"),
    price: asNumber(rec.price, 0),
    currency: asString(rec.currency, "AED"),
    location: {
      address: asNullableString(locationRec.address),
      city: asNullableString(locationRec.city),
      area: asNullableString(locationRec.area),
      lat: asNullableNumber(locationRec.lat),
      lng: asNullableNumber(locationRec.lng),
    },
    images,
    amenities,
    host: {
      id: asString(hostRec.id),
      name: asString(hostRec.name, "Host"),
      avatar: asNullableString(hostRec.avatar),
    },
    maxGuests: asNumber(rec.maxGuests, 0),
    bedrooms: asNumber(rec.bedrooms, 0),
    bathrooms: asNumber(rec.bathrooms, 0),
    minNights: asNumber(rec.minNights, 1),
    maxNights: asNullableNumber(rec.maxNights),
    createdAt: asString(rec.createdAt),
    updatedAt: asString(rec.updatedAt),
  };
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function withRequestHeaders(context?: RequestContext): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  const locale = context?.locale ?? readCookieValue("locale");
  const currency = context?.currency ?? readCookieValue("currency");
  if (locale) headers["x-locale"] = locale;
  if (currency) headers["x-currency"] = currency;
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export async function getPropertyBySlug(slug: string, context?: RequestContext) {
  // Backend truth (verified via curl):
  // GET /api/properties/:slug
  return apiFetch<PropertyDetail>(`/properties/${encodeURIComponent(slug)}`, {
    method: "GET",
    headers: withRequestHeaders(context),
    next: { revalidate: 60 },
  });
}

export async function quote(
  propertyId: string,
  body: { checkIn: string; checkOut: string; guests: number; currency?: string }
) {
  return apiFetch<QuoteResponse>(`/properties/${encodeURIComponent(propertyId)}/quote`, {
    method: "POST",
    headers: withRequestHeaders({ currency: body.currency }),
    body,
    cache: "no-store",
    credentials: "include",
  });
}

export async function reserve(
  propertyId: string,
  body: { checkIn: string; checkOut: string; guests: number; currency?: string }
) {
  return apiFetch<ReserveResponse>(`/properties/${encodeURIComponent(propertyId)}/reserve`, {
    method: "POST",
    headers: withRequestHeaders({ currency: body.currency }),
    body,
    cache: "no-store",
    credentials: "include",
  });
}

export async function getPropertyCalendarBySlug(
  slug: string,
  params?: { from?: string; to?: string }
) {
  return apiFetch<{
    propertyId: string;
    slug: string;
    from: string;
    to: string;
    days: Array<{ date: string; status: "AVAILABLE" | "BOOKED" | "HOLD" | "BLOCKED" }>;
  }>(`/properties/${encodeURIComponent(slug)}/calendar`, {
    method: "GET",
    cache: "no-store",
    query: {
      from: params?.from ?? "",
      to: params?.to ?? "",
    },
  });
}

export async function getPropertyPreviewById(
  propertyId: string
): Promise<PropertyPreviewData> {
  const res = await apiFetch<unknown>(`/properties/${encodeURIComponent(propertyId)}/preview`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const details = res.details !== undefined ? `\n\nDETAILS:\n${JSON.stringify(res.details, null, 2)}` : "";
    throw new Error(`${res.message}${details}`);
  }

  return normalizePropertyPreview(res.data);
}
