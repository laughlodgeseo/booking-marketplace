import { apiFetch } from "../http";
import type { PropertyDetail, QuoteResponse, ReserveResponse } from "../types/property";

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
