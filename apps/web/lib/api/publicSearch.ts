import { apiUrl } from "@/lib/api/base";
import type { ApiErrorResponse, SearchPropertyCard } from "./publicTypes";

function toQuery(
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type FeaturedSearchParams = {
  pageSize: number;
  q?: string;
  city?: string;
  area?: string;
  sort?: "recommended" | "price_asc" | "price_desc" | "newest";
};

export type FeaturedSearchContext = {
  locale?: string;
  currency?: string;
};

/**
 * Backend response shape:
 * /api/search/properties -> { ok, query, items }
 */
type BackendSearchItem = {
  id: string;
  slug: string;
  title: string;
  location?: {
    city?: string | null;
    area?: string | null;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
  capacity?: {
    maxGuests?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
  } | null;
  coverImage?: {
    url?: string | null;
    alt?: string | null;
  } | null;
  pricing?: {
    nightly?: number | null;
    currency?: string | null;
  } | null;
};

type BackendSearchResponse = {
  ok: boolean;
  items: BackendSearchItem[];
  query?: {
    page?: number;
    pageSize?: number;
    limit?: number;
  };
};

type FeaturedOk = {
  ok: true;
  items: SearchPropertyCard[];
  total: number;
  page: number;
  pageSize: number;
};

type FeaturedFail = {
  ok: false;
  status: number;
  message: string;
  items: [];
  total: 0;
};

function mapItemToCard(it: BackendSearchItem): SearchPropertyCard {
  return {
    id: it.id,
    slug: it.slug,
    title: it.title,
    city: it.location?.city ?? null,
    area: it.location?.area ?? null,
    lat: it.location?.lat ?? null,
    lng: it.location?.lng ?? null,
    coverImageUrl: it.coverImage?.url ?? null,
    ratingAvg: null,
    ratingCount: null,
    priceFrom: it.pricing?.nightly ?? null,
    currency: it.pricing?.currency ?? null,
    bedrooms: it.capacity?.bedrooms ?? null,
    bathrooms: it.capacity?.bathrooms ?? null,
    guests: it.capacity?.maxGuests ?? null,
    badges: null,
  };
}

function safeMsgFromUnknown(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Network request failed (unknown error)";
}

export async function fetchFeaturedStays(
  params: FeaturedSearchParams,
  context?: FeaturedSearchContext,
): Promise<FeaturedOk | FeaturedFail> {
  const qs = toQuery({
    page: 1,
    pageSize: params.pageSize,
    sort: params.sort ?? "recommended",
    q: params.q ?? null,
    city: params.city ?? null,
    area: params.area ?? null,
  });

  const url = `${apiUrl("/search/properties")}${qs}`;

  let res: Response;
  try {
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    if (context?.locale) headers["x-locale"] = context.locale;
    if (context?.currency) headers["x-currency"] = context.currency;

    res = await fetch(url, {
      headers,
      next: { revalidate: 60 },
    });
  } catch (e: unknown) {
    return {
      ok: false,
      status: 0,
      message: `Backend fetch failed: ${safeMsgFromUnknown(e)}`,
      items: [],
      total: 0,
    };
  }

  if (!res.ok) {
    let err: ApiErrorResponse | null = null;
    try {
      err = (await res.json()) as ApiErrorResponse;
    } catch {
      err = null;
    }

    const message =
      (typeof err?.message === "string" && err.message) ||
      (Array.isArray(err?.message) && err.message.join(", ")) ||
      `Request failed (${res.status})`;

    return { ok: false, status: res.status, message, items: [], total: 0 };
  }

  let raw: BackendSearchResponse | null = null;
  try {
    raw = (await res.json()) as BackendSearchResponse;
  } catch (e: unknown) {
    return {
      ok: false,
      status: 200,
      message: `Invalid JSON from backend: ${safeMsgFromUnknown(e)}`,
      items: [],
      total: 0,
    };
  }

  if (!raw || raw.ok !== true || !Array.isArray(raw.items)) {
    return {
      ok: false,
      status: 200,
      message: "Unexpected backend response shape.",
      items: [],
      total: 0,
    };
  }

  const page = raw.query?.page ?? 1;
  const pageSize = raw.query?.pageSize ?? raw.query?.limit ?? params.pageSize;
  const total = raw.items.length;

  return {
    ok: true,
    items: raw.items.map(mapItemToCard),
    total,
    page,
    pageSize,
  };
}
