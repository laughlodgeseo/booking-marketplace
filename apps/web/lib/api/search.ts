import { apiFetch } from "../http";
import type { MapResponse, SearchResponse } from "../types/search";

export type BackendSort = "recommended" | "price_asc" | "price_desc" | "newest";

// UI can still use "relevance" — normalize to backend "recommended"
export type SearchParams = {
  q?: string;
  city?: string;
  area?: string;

  guests?: number;
  bedrooms?: number;
  bathrooms?: number;

  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD

  minPrice?: number;
  maxPrice?: number;

  // Amenity keys: WIFI,KITCHEN,... (sent as comma-separated string)
  amenities?: string[] | string;

  sort?: "relevance" | BackendSort;
  page?: number;
  pageSize?: number;
};

type RequestContext = {
  locale?: string;
  currency?: string;
};

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

export type MapViewportParams = {
  north: number;
  south: number;
  east: number;
  west: number;
  city?: string;
  area?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
};

function normalizeSort(sort: SearchParams["sort"]): BackendSort {
  if (!sort || sort === "relevance") return "recommended";
  return sort;
}

function normalizeAmenities(a: SearchParams["amenities"]): string | undefined {
  if (!a) return undefined;
  if (Array.isArray(a)) {
    const cleaned = a.map((x) => String(x).trim()).filter(Boolean);
    return cleaned.length ? cleaned.join(",") : undefined;
  }
  const s = String(a).trim();
  return s.length ? s : undefined;
}

export async function searchProperties(params: SearchParams, context?: RequestContext) {
  const amenities = normalizeAmenities(params.amenities);

  return apiFetch<SearchResponse>("/search/properties", {
    method: "GET",
    headers: withRequestHeaders(context),
    query: {
      q: params.q ?? undefined,
      city: params.city ?? undefined,
      area: params.area ?? undefined,

      guests: params.guests ?? undefined,
      bedrooms: params.bedrooms ?? undefined,
      bathrooms: params.bathrooms ?? undefined,

      checkIn: params.checkIn ?? undefined,
      checkOut: params.checkOut ?? undefined,

      minPrice: params.minPrice ?? undefined,
      maxPrice: params.maxPrice ?? undefined,

      amenities,

      page: params.page ?? 1,
      pageSize: params.pageSize ?? 12,
      sort: normalizeSort(params.sort),
    },
    next: { revalidate: 30 },
  });
}

export async function searchMapViewport(params: MapViewportParams, context?: RequestContext) {
  return apiFetch<MapResponse>("/search/map-viewport", {
    method: "GET",
    headers: withRequestHeaders(context),
    query: params,
    cache: "no-store",
  });
}
