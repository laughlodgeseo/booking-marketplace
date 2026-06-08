import { isIsoDay } from "@/lib/date-range";

export type RawSearchParams = Record<string, string | string[] | undefined>;

// All date-related query keys the app might use (canonical + legacy aliases).
export const DATE_QUERY_KEYS = [
  "checkIn",
  "checkOut",
  "startDate",
  "endDate",
  "dateFrom",
  "dateTo",
] as const;

export type DateQueryKey = (typeof DATE_QUERY_KEYS)[number];

export type PropertyDetailSearchContext = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
};

function todayIsoDay(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isStrictIsoDay(value?: string | null): value is string {
  if (!isIsoDay(value)) return false;

  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function isValidFutureIsoRange(
  checkIn?: string | null,
  checkOut?: string | null,
  options: { today?: string } = {},
): checkIn is string {
  if (!isStrictIsoDay(checkIn) || !isStrictIsoDay(checkOut)) return false;
  const today = options.today ?? todayIsoDay();
  return checkIn >= today && checkOut > checkIn;
}

function clampBookingGuests(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(16, Math.trunc(value)));
}

function pickParam(
  source: RawSearchParams | URLSearchParams | PropertyDetailSearchContext,
  key: keyof PropertyDetailSearchContext,
): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined;
  }

  const value = source[key];
  if (typeof value === "number") return String(value);
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function parsePropertyDetailSearchContext(
  source: RawSearchParams | URLSearchParams | PropertyDetailSearchContext,
  options: { today?: string } = {},
): PropertyDetailSearchContext {
  const checkIn = pickParam(source, "checkIn")?.trim();
  const checkOut = pickParam(source, "checkOut")?.trim();
  const guestsRaw = pickParam(source, "guests")?.trim();
  const guestsNumber = guestsRaw ? Number(guestsRaw) : Number.NaN;
  const context: PropertyDetailSearchContext = {};

  if (isValidFutureIsoRange(checkIn, checkOut, options)) {
    context.checkIn = checkIn;
    context.checkOut = checkOut;
  }

  if (Number.isFinite(guestsNumber)) {
    context.guests = clampBookingGuests(guestsNumber);
  }

  return context;
}

export function buildPropertyDetailHref(args: {
  slug: string;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  hash?: string;
  today?: string;
}): string {
  const context = parsePropertyDetailSearchContext(
    {
      checkIn: args.checkIn ?? undefined,
      checkOut: args.checkOut ?? undefined,
      guests: args.guests ?? undefined,
    },
    { today: args.today },
  );
  const params = new URLSearchParams();

  if (context.checkIn && context.checkOut) {
    params.set("checkIn", context.checkIn);
    params.set("checkOut", context.checkOut);
  }
  if (context.guests) {
    params.set("guests", String(context.guests));
  }

  const query = params.toString();
  const hash = args.hash ? `#${args.hash.replace(/^#/, "")}` : "";
  return `/properties/${args.slug}${query ? `?${query}` : ""}${hash}`;
}

/** Returns a new URLSearchParams with every known date key removed. */
export function removeDateParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  for (const key of DATE_QUERY_KEYS) {
    next.delete(key);
  }
  return next;
}

/** Builds a /properties URL string from URLSearchParams. */
export function buildPropertiesUrl(params: URLSearchParams): string {
  const query = params.toString();
  return query ? `/properties?${query}` : "/properties";
}

/** True if any date key is present in the params (may be partial/invalid). */
export function hasActiveDates(params: URLSearchParams): boolean {
  return DATE_QUERY_KEYS.some((k) => Boolean(params.get(k)));
}

/** True only when both checkIn and checkOut are valid ISO dates with checkOut > checkIn. */
export function hasCompleteDateRange(params: URLSearchParams): boolean {
  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  return isIsoDay(checkIn) && isIsoDay(checkOut) && checkOut > checkIn;
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function pickNumber(v: string | string[] | undefined): number | undefined {
  const s = pickString(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function pickStrings(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.flatMap((x) => x.split(",").map((s) => s.trim())).filter(Boolean);
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export type PropertiesQuery = {
  q?: string;
  city?: string;
  area?: string;

  guests?: number;
  bedrooms?: number;
  bathrooms?: number;

  checkIn?: string;
  checkOut?: string;

  minPrice?: number;
  maxPrice?: number;

  amenities?: string[];

  sort?: "relevance" | "recommended" | "price_asc" | "price_desc" | "newest";
  page: number;
  pageSize: number;
};

export function parsePropertiesQuery(sp: RawSearchParams): PropertiesQuery {
  const q = pickString(sp.q);
  const city = pickString(sp.city);
  const area = pickString(sp.area);

  const guests = pickNumber(sp.guests);
  const bedrooms = pickNumber(sp.bedrooms);
  const bathrooms = pickNumber(sp.bathrooms);

  const checkIn = pickString(sp.checkIn);
  const checkOut = pickString(sp.checkOut);

  const minPrice = pickNumber(sp.minPrice);
  const maxPrice = pickNumber(sp.maxPrice);

  const amenities = pickStrings(sp.amenities);

  const sortRaw = pickString(sp.sort);
  const sort =
    sortRaw === "recommended" ||
    sortRaw === "price_asc" ||
    sortRaw === "price_desc" ||
    sortRaw === "newest"
      ? sortRaw
      : sortRaw === "relevance"
        ? "relevance"
        : undefined;

  const page = Math.max(1, pickNumber(sp.page) ?? 1);
  const pageSize = Math.min(60, Math.max(6, pickNumber(sp.pageSize) ?? 12));

  return {
    q: q?.trim() || undefined,
    city: city?.trim() || undefined,
    area: area?.trim() || undefined,

    guests: guests ?? undefined,
    bedrooms: bedrooms ?? undefined,
    bathrooms: bathrooms ?? undefined,

    checkIn: checkIn?.trim() || undefined,
    checkOut: checkOut?.trim() || undefined,

    minPrice: minPrice ?? undefined,
    maxPrice: maxPrice ?? undefined,

    amenities: amenities.length ? amenities : undefined,

    sort,
    page,
    pageSize,
  };
}

export function buildPropertiesSearchParams(q: PropertiesQuery): URLSearchParams {
  const sp = new URLSearchParams();

  if (q.q) sp.set("q", q.q);
  if (q.city) sp.set("city", q.city);
  if (q.area) sp.set("area", q.area);

  if (q.guests) sp.set("guests", String(q.guests));
  if (q.bedrooms) sp.set("bedrooms", String(q.bedrooms));
  if (q.bathrooms) sp.set("bathrooms", String(q.bathrooms));

  if (q.checkIn) sp.set("checkIn", q.checkIn);
  if (q.checkOut) sp.set("checkOut", q.checkOut);

  if (q.minPrice !== undefined && q.minPrice !== null) sp.set("minPrice", String(q.minPrice));
  if (q.maxPrice !== undefined && q.maxPrice !== null) sp.set("maxPrice", String(q.maxPrice));

  if (q.amenities && q.amenities.length) sp.set("amenities", q.amenities.join(","));

  if (q.sort) sp.set("sort", q.sort);
  if (q.page && q.page !== 1) sp.set("page", String(q.page));
  if (q.pageSize && q.pageSize !== 12) sp.set("pageSize", String(q.pageSize));

  return sp;
}

export function withPage(q: PropertiesQuery, page: number): PropertiesQuery {
  return { ...q, page: Math.max(1, page) };
}

export function withResetPage(q: PropertiesQuery): PropertiesQuery {
  return { ...q, page: 1 };
}

export function stableStringifyQuery(q: PropertiesQuery): string {
  // used for memo keys / shallow equality
  const sp = buildPropertiesSearchParams(q);
  return sp.toString();
}
