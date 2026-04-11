import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  BookingStatus,
  CalendarDayStatus,
  HoldStatus,
  LocaleCode,
  Prisma,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchPropertiesQuery } from './dto/search-properties.query';
import { SearchMapQuery } from './dto/search-map.query';
import { SearchMapViewportQuery } from './dto/search-map-viewport.query';
import {
  assertValidRange,
  buildOverlapFilter,
  calculateNights,
  normalizeCheckIn,
  normalizeCheckOut,
  utcDateToIsoDay,
} from '../../common/date-range';
import {
  DEFAULT_DISPLAY_CURRENCY,
  normalizeDisplayCurrency,
  AppLocale,
  DisplayCurrency,
} from '../../common/i18n/locale';
import { FxRatesService } from '../fx/fx-rates.service';

type CacheEntry<T> = { expiresAt: number; value: T };

// Simple in-memory TTL cache (safe fallback).
// You can later replace this with Redis without changing API contracts.
const memCache = new Map<string, CacheEntry<unknown>>();
function cacheGet<T>(key: string): T | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value as T;
}
function cacheSet<T>(key: string, value: T, ttlMs: number) {
  memCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function stableStringify(obj: object) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function parseAmenityKeys(raw?: string): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );
}

type SearchQueryLike = {
  q?: string;
  city?: string;
  area?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  north?: number;
  south?: number;
  east?: number;
  west?: number;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  checkIn?: string;
  checkOut?: string;
  amenities?: string;
};

type SearchCard = {
  id: string;
  slug: string;
  title: string;
  propertyType: string;
  location: {
    city: string | null;
    area: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
  };
  capacity: {
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
  };
  coverImage: {
    url: string;
    alt: string | null;
    category: string;
  } | null;
  media: Array<{
    url: string;
    alt: string | null;
    category: string;
    sortOrder: number;
  }>;
  pricing: {
    nightly: number;
    cleaningFee: number;
    currency: string;
    nightlyAed?: number;
    cleaningFeeAed?: number;
    totalForStay?: number;
    totalForStayAed?: number;
    nights?: number;
    fxRate?: number;
    fxAsOf?: string | null;
    fxProvider?: string | null;
  };
  flags: {
    instantBook: boolean;
  };
};

type SearchPoint = {
  propertyId: string;
  lat: number;
  lng: number;
  priceFrom: number;
  currency: string;
  priceFromAed?: number;
  fxRate?: number;
  fxAsOf?: string | null;
  fxProvider?: string | null;
  slug?: string;
  title?: string;
  propertyType?: string;
  city?: string | null;
  area?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  coverImage?: {
    url: string;
    alt: string | null;
  } | null;
};

type SearchPropertiesResult = {
  ok: true;
  query: SearchPropertiesQuery & {
    page: number;
    limit: number;
    pageSize: number;
  };
  items: SearchCard[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

type SearchMapResult = {
  ok: true;
  query: SearchMapQuery;
  points: SearchPoint[];
};

type SearchMapViewportResult = {
  ok: true;
  query: SearchMapViewportQuery;
  points: SearchPoint[];
};

type SearchContext = {
  locale?: AppLocale;
  displayCurrency?: DisplayCurrency;
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly debugSearch = process.env.DEBUG_SEARCH === '1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly fxRates: FxRatesService,
  ) {}

  private resolveLocale(input?: AppLocale): LocaleCode {
    return input === 'ar' ? LocaleCode.ar : LocaleCode.en;
  }

  private pickTranslation<T extends { locale: LocaleCode }>(
    translations: T[] | undefined,
    locale: LocaleCode,
  ): T | null {
    if (!translations || translations.length === 0) return null;
    return (
      translations.find((item) => item.locale === locale) ??
      translations.find((item) => item.locale === LocaleCode.en) ??
      null
    );
  }

  private resolveDisplayCurrency(input?: DisplayCurrency): DisplayCurrency {
    if (!input) return DEFAULT_DISPLAY_CURRENCY;
    return normalizeDisplayCurrency(input);
  }

  private toDisplayAmount(amountAed: number, fxRate: number): number {
    return Math.round(amountAed * fxRate);
  }

  private buildGeoFilter(params: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    north?: number;
    south?: number;
    east?: number;
    west?: number;
  }): Prisma.PropertyWhereInput | null {
    const { lat, lng, radiusKm, north, south, east, west } = params;

    // Viewport bounds query (preferred when map is active)
    const hasBounds =
      north !== undefined &&
      south !== undefined &&
      east !== undefined &&
      west !== undefined;

    if (hasBounds) {
      // Anti-meridian support:
      // - normal: west <= east => lng BETWEEN west AND east
      // - wrap:   west > east  => (lng >= west) OR (lng <= east)
      const latClause: Prisma.PropertyWhereInput = {
        lat: { not: null, gte: south, lte: north },
      };

      if (west <= east) {
        return {
          ...latClause,
          lng: { not: null, gte: west, lte: east },
        };
      }

      // Wrap across -180/180: keep lat range AND apply OR on lng.
      return {
        AND: [
          latClause,
          {
            OR: [
              { lng: { not: null, gte: west } },
              { lng: { not: null, lte: east } },
            ],
          },
        ],
      };
    }

    // Radius query (approx bounding box; no PostGIS needed for V1)
    const hasRadius =
      lat !== undefined && lng !== undefined && radiusKm !== undefined;
    if (hasRadius) {
      const latDelta = radiusKm / 111; // ~111km per degree latitude
      const cos = Math.cos((lat * Math.PI) / 180);
      const lngDelta = radiusKm / (111 * Math.max(cos, 0.1)); // avoid division near poles
      return {
        lat: { not: null, gte: lat - latDelta, lte: lat + latDelta },
        lng: { not: null, gte: lng - lngDelta, lte: lng + lngDelta },
      };
    }

    return null;
  }

  private parseSearchDates(query: SearchQueryLike): {
    checkIn?: Date;
    checkOut?: Date;
    nights?: number;
    rawCheckIn?: string;
    rawCheckOut?: string;
  } {
    const rawCheckIn = query.checkIn?.trim() ?? '';
    const rawCheckOut = query.checkOut?.trim() ?? '';

    if (!rawCheckIn && !rawCheckOut) return {};
    if (!rawCheckIn || !rawCheckOut) return {};

    const checkIn = normalizeCheckIn(rawCheckIn);
    const checkOut = normalizeCheckOut(rawCheckOut);
    assertValidRange(checkIn, checkOut);

    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) throw new BadRequestException('Invalid date range');

    return { checkIn, checkOut, nights, rawCheckIn, rawCheckOut };
  }

  /**
   * Availability filter (best policy): if checkIn/checkOut are provided,
   * only return properties that are bookable for the full range.
   *
   * Rules:
   * - No BLOCKED calendar day in [checkIn, checkOut)
   * - No overlapping non-cancelled booking
   * - No overlapping ACTIVE hold that hasn't expired
   */
  private buildAvailabilityWhere(
    checkIn?: Date,
    checkOut?: Date,
  ): Prisma.PropertyWhereInput | null {
    if (!checkIn || !checkOut) return null;
    const overlap = buildOverlapFilter(
      'checkIn',
      'checkOut',
      checkIn,
      checkOut,
    );

    return {
      AND: [
        // No blocked calendar days inside stay range (checkIn inclusive, checkOut exclusive)
        {
          NOT: {
            calendarDays: {
              some: {
                status: CalendarDayStatus.BLOCKED,
                date: { gte: checkIn, lt: checkOut },
              },
            },
          },
        },

        // No overlapping bookings (pending payment + confirmed)
        {
          NOT: {
            bookings: {
              some: {
                status: {
                  in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
                },
                AND: overlap,
              },
            },
          },
        },

        // No overlapping ACTIVE holds that are not expired
        {
          NOT: {
            holds: {
              some: {
                status: HoldStatus.ACTIVE,
                expiresAt: { gt: new Date() },
                AND: overlap,
              },
            },
          },
        },
      ],
    };
  }

  private buildCoreWhere(
    q: SearchPropertiesQuery | SearchMapQuery | SearchMapViewportQuery,
    dateInfo?: {
      checkIn?: Date;
      checkOut?: Date;
      nights?: number;
    },
    opts?: { includeAvailability?: boolean },
  ) {
    const query: SearchQueryLike = q;
    const includeAvailability = opts?.includeAvailability !== false;
    const dates = dateInfo ?? this.parseSearchDates(query);

    const geo = this.buildGeoFilter({
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      north: query.north,
      south: query.south,
      east: query.east,
      west: query.west,
    });

    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.PUBLISHED,
    };

    if (q.city) where.city = q.city;
    if (q.area) where.area = q.area;
    if (query.q?.trim()) {
      const term = query.q.trim();
      where.OR = [
        { title: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { city: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { area: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    // Guests filtering: require property.maxGuests >= requested
    const guests = query.guests;
    if (guests !== undefined) {
      where.maxGuests = { gte: guests };
    }

    // Optional filters (if provided)
    const minPrice = query.minPrice;
    const maxPrice = query.maxPrice;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    const bedrooms = query.bedrooms;
    if (bedrooms !== undefined) where.bedrooms = { gte: bedrooms };

    const bathrooms = query.bathrooms;
    if (bathrooms !== undefined) where.bathrooms = { gte: bathrooms };

    const maxGuests = query.maxGuests;
    if (maxGuests !== undefined) where.maxGuests = { gte: maxGuests };

    const and: Prisma.PropertyWhereInput[] = [];
    if (geo) and.push(geo);

    const amenityKeys = parseAmenityKeys(query.amenities);
    for (const key of amenityKeys) {
      and.push({
        amenities: {
          some: {
            amenity: {
              key: { equals: key, mode: Prisma.QueryMode.insensitive },
            },
          },
        },
      });
    }

    // Dates availability
    if (dates.checkIn && dates.checkOut && dates.nights !== undefined) {
      const stayNights = dates.nights;

      // enforce min/max nights using availability settings (aligns with quote logic)
      and.push({
        OR: [
          { availabilitySettings: { is: null } },
          {
            availabilitySettings: {
              is: {
                defaultMinNights: { lte: stayNights },
                OR: [
                  { defaultMaxNights: null },
                  { defaultMaxNights: { gte: stayNights } },
                ],
              },
            },
          },
        ],
      });

      if (includeAvailability) {
        const avail = this.buildAvailabilityWhere(
          dates.checkIn,
          dates.checkOut,
        );
        if (avail) and.push(avail);
      }
    }

    if (and.length > 0) where.AND = and;

    return where;
  }

  private buildOrderBy(
    sort?: string,
  ): Prisma.PropertyOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ basePrice: 'asc' }, { id: 'asc' }];
      case 'price_desc':
        return [{ basePrice: 'desc' }, { id: 'asc' }];
      case 'newest':
        return [{ createdAt: 'desc' }, { id: 'asc' }];
      case 'recommended':
      default:
        // V1 recommended = newest first (we’ll later evolve with scoring)
        return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }

  private validateViewportBounds(q: SearchMapViewportQuery) {
    const { north, south, east, west } = q;

    if (!(north > south)) {
      throw new BadRequestException('Invalid viewport: north must be > south.');
    }

    // ✅ Allow anti-meridian wrapping:
    // - normal: west <= east
    // - wrap:   west > east  (crosses -180/180)
    // We only ensure values are within [-180, 180] via DTO validators.
    // Here we only compute “span” correctly for safety limits.
    const latSpan = north - south;

    // Compute lng span considering wrap.
    // Example: west=170, east=-170 => span = (180-170) + (-170 - (-180)) = 10 + 10 = 20
    const lngSpan = west <= east ? east - west : 180 - west + (east - -180);

    // Safety: prevent massive “whole-world” queries from map UI bugs.
    const MAX_LAT_SPAN = 5; // ~555km
    const MAX_LNG_SPAN = 5; // still generous for map viewport; tune later

    if (latSpan > MAX_LAT_SPAN || lngSpan > MAX_LNG_SPAN) {
      throw new BadRequestException(
        `Viewport too large. Please zoom in more. (max span: ${MAX_LAT_SPAN}° lat, ${MAX_LNG_SPAN}° lng)`,
      );
    }
  }

  async searchProperties(
    q: SearchPropertiesQuery,
    context?: SearchContext,
  ): Promise<SearchPropertiesResult> {
    const locale = this.resolveLocale(context?.locale);
    const displayCurrency = this.resolveDisplayCurrency(
      context?.displayCurrency,
    );
    const fx = await this.fxRates.resolveRate(displayCurrency);
    const page = q.page ?? 1;
    const limit = q.limit ?? q.pageSize ?? 20;
    const skip = (page - 1) * limit;

    // Cache policy:
    // - if dates are provided: short TTL (freshness matters)
    // - otherwise: slightly longer TTL
    const hasDates = Boolean(q.checkIn && q.checkOut);
    const ttlMs = hasDates ? 30_000 : 90_000;

    const cacheKey = `search:properties:${stableStringify({
      ...q,
      page,
      limit,
      pageSize: limit,
      locale,
      displayCurrency,
    })}`;
    const cached = cacheGet<SearchPropertiesResult>(cacheKey);
    if (cached) return cached;

    const dateInfo = this.parseSearchDates(q);
    const where = this.buildCoreWhere(q, dateInfo, {
      includeAvailability: true,
    });
    const orderBy = this.buildOrderBy(q.sort);

    let preAvailabilityCount: number | null = null;
    if (this.debugSearch && dateInfo.checkIn && dateInfo.checkOut) {
      const baseWhere = this.buildCoreWhere(q, dateInfo, {
        includeAvailability: false,
      });
      preAvailabilityCount = await this.prisma.property.count({
        where: baseWhere,
      });
    }

    const [total, rows] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          propertyType: true,
          city: true,
          area: true,
          translations: {
            where: { locale: { in: [locale, LocaleCode.en] } },
            select: {
              locale: true,
              title: true,
              areaLabel: true,
            },
            take: 2,
          },
          address: true,
          lat: true,
          lng: true,
          bedrooms: true,
          bathrooms: true,
          maxGuests: true,
          basePrice: true,
          cleaningFee: true,
          currency: true,
          isInstantBook: true,
          createdAt: true,
          media: {
            orderBy: { sortOrder: 'asc' },
            take: 8,
            select: { url: true, alt: true, category: true, sortOrder: true },
          },
        },
      }),
    ]);

    let stay: null | { nights: number; checkIn: string; checkOut: string } =
      null;
    if (
      dateInfo.checkIn &&
      dateInfo.checkOut &&
      dateInfo.nights !== undefined
    ) {
      stay = {
        nights: dateInfo.nights,
        checkIn: q.checkIn!,
        checkOut: q.checkOut!,
      };
    }

    if (
      this.debugSearch &&
      dateInfo.checkIn &&
      dateInfo.checkOut &&
      dateInfo.nights !== undefined
    ) {
      const rawCheckIn = dateInfo.rawCheckIn ?? q.checkIn ?? '';
      const rawCheckOut = dateInfo.rawCheckOut ?? q.checkOut ?? '';
      const normalizedCheckIn = utcDateToIsoDay(dateInfo.checkIn);
      const normalizedCheckOut = utcDateToIsoDay(dateInfo.checkOut);
      const baseCount = preAvailabilityCount ?? total;
      this.logger.debug(
        `search availability debug: raw=${rawCheckIn}/${rawCheckOut} normalized=${normalizedCheckIn}/${normalizedCheckOut} nights=${dateInfo.nights} preAvail=${baseCount} postAvail=${total}`,
      );
    }

    // ── Batch Pricing Rules ───────────────────────────────────────────────────
    // When dates are provided we need rule-adjusted prices for the search cards.
    // A single batch query avoids N+1 per property; in-memory computation is O(N*M).
    type SearchPricingRule = {
      propertyId: string;
      startDate: Date;
      endDate: Date;
      priceMultiplier: number;
      fixedPrice: number | null;
      priority: number;
    };

    // Map<propertyId, sorted-by-priority-desc rules[]>
    const rulesMap = new Map<string, SearchPricingRule[]>();

    if (stay && dateInfo.checkIn && dateInfo.checkOut && rows.length > 0) {
      const propertyIds = rows.map((r) => r.id);
      const allRules = await this.prisma.pricingRule.findMany({
        where: {
          propertyId: { in: propertyIds },
          isActive: true,
          startDate: { lte: dateInfo.checkOut },
          endDate: { gte: dateInfo.checkIn },
        },
        select: {
          propertyId: true,
          startDate: true,
          endDate: true,
          priceMultiplier: true,
          fixedPrice: true,
          priority: true,
        },
        orderBy: { priority: 'desc' },
      });

      for (const rule of allRules) {
        if (!rulesMap.has(rule.propertyId)) rulesMap.set(rule.propertyId, []);
        rulesMap.get(rule.propertyId)!.push({
          propertyId: rule.propertyId,
          startDate: rule.startDate,
          endDate: rule.endDate,
          priceMultiplier: Number(rule.priceMultiplier),
          fixedPrice:
            rule.fixedPrice !== null ? Number(rule.fixedPrice) : null,
          priority: Number(rule.priority),
        });
      }
    }

    /**
     * Compute the rule-adjusted nightly total for a property over a date range.
     * Mirrors PricingService.calculateTotal logic but uses the pre-fetched rules map.
     * Returns { nightlySum, avgNightlyPrice } in AED.
     */
    const computeRuleAdjustedNightlyAed = (
      propertyId: string,
      basePrice: number,
      checkIn: Date,
      checkOut: Date,
    ): { nightlySum: number; avgNightlyPrice: number } => {
      const rules = rulesMap.get(propertyId) ?? [];
      let nightlySum = 0;
      let nightCount = 0;

      const cur = new Date(checkIn);
      while (cur < checkOut) {
        const matchingRule = rules.find(
          (r) => cur >= r.startDate && cur <= r.endDate,
        );
        const price = matchingRule
          ? (matchingRule.fixedPrice ??
            Math.round(basePrice * matchingRule.priceMultiplier))
          : basePrice;
        nightlySum += price;
        nightCount += 1;
        cur.setDate(cur.getDate() + 1);
      }

      const avgNightlyPrice =
        nightCount > 0 ? Math.round(nightlySum / nightCount) : basePrice;
      return { nightlySum, avgNightlyPrice };
    };

    const items = rows.map((p) => {
      const translation = this.pickTranslation(p.translations, locale);
      const cover = p.media?.[0] ?? null;
      const cleaningFeeDisplay = this.toDisplayAmount(p.cleaningFee, fx.rate);

      // Compute rule-adjusted prices when dates are available.
      let nightlyAed = p.basePrice;
      let totalForStayAed: number | undefined;

      if (stay && dateInfo.checkIn && dateInfo.checkOut) {
        const { nightlySum, avgNightlyPrice } = computeRuleAdjustedNightlyAed(
          p.id,
          p.basePrice,
          dateInfo.checkIn,
          dateInfo.checkOut,
        );
        nightlyAed = avgNightlyPrice;
        totalForStayAed = nightlySum + p.cleaningFee;
      }

      const nightlyDisplay = this.toDisplayAmount(nightlyAed, fx.rate);
      const totalForStayDisplay =
        typeof totalForStayAed === 'number'
          ? this.toDisplayAmount(totalForStayAed, fx.rate)
          : undefined;

      // Flag whether pricing rules affected the shown price, so the UI
      // can optionally render "prices may vary per night" messaging.
      const hasPricingRules = (rulesMap.get(p.id) ?? []).length > 0;

      const price = {
        nightly: nightlyDisplay,
        cleaningFee: cleaningFeeDisplay,
        currency: displayCurrency,
        nightlyAed,
        cleaningFeeAed: p.cleaningFee,
        hasPricingRules,
        ...(stay
          ? {
              totalForStay: totalForStayDisplay,
              totalForStayAed,
              nights: stay.nights,
            }
          : {}),
        fxRate: fx.rate,
        fxAsOf: fx.asOfDate,
        fxProvider: fx.provider,
      };

      return {
        id: p.id,
        slug: p.slug,
        title: translation?.title ?? p.title,
        propertyType: p.propertyType,
        location: {
          city: p.city,
          area: translation?.areaLabel ?? p.area,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
        },
        capacity: {
          maxGuests: p.maxGuests,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
        },
        coverImage: cover
          ? { url: cover.url, alt: cover.alt, category: cover.category }
          : null,
        media: (p.media ?? []).map((m) => ({
          url: m.url,
          alt: m.alt,
          category: m.category,
          sortOrder: m.sortOrder,
        })),
        pricing: price,
        flags: {
          instantBook: p.isInstantBook,
        },
      };
    });

    const result: SearchPropertiesResult = {
      ok: true,
      query: {
        ...q,
        page,
        limit,
        pageSize: limit,
      },
      items,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + items.length < total,
      },
      // facets: {} // can be added later in a portal-driven way
    };

    cacheSet(cacheKey, result, ttlMs);
    return result;
  }

  async searchMap(
    q: SearchMapQuery,
    context?: SearchContext,
  ): Promise<SearchMapResult> {
    const displayCurrency = this.resolveDisplayCurrency(
      context?.displayCurrency,
    );
    const fx = await this.fxRates.resolveRate(displayCurrency);
    // Map endpoints often need bigger limits than cards.
    // Still enforce safety to avoid insane payloads.
    const hasDates = Boolean(q.checkIn && q.checkOut);
    const ttlMs = hasDates ? 30_000 : 90_000;

    const cacheKey = `search:map:${stableStringify({
      ...q,
      displayCurrency,
    })}`;
    const cached = cacheGet<SearchMapResult>(cacheKey);
    if (cached) return cached;

    const dateInfo = this.parseSearchDates(q);
    const where = this.buildCoreWhere(q, dateInfo, {
      includeAvailability: true,
    });

    // Map + card UI needs lightweight details for richer pin cards.
    const rows = await this.prisma.property.findMany({
      where,
      take: 2000,
      orderBy: [{ basePrice: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        propertyType: true,
        city: true,
        area: true,
        lat: true,
        lng: true,
        bedrooms: true,
        bathrooms: true,
        basePrice: true,
        currency: true,
      },
    });

    const points = rows
      .filter((r) => r.lat !== null && r.lng !== null)
      .map((r) => ({
        propertyId: r.id,
        lat: r.lat!,
        lng: r.lng!,
        priceFrom: this.toDisplayAmount(r.basePrice, fx.rate),
        currency: displayCurrency,
        priceFromAed: r.basePrice,
        fxRate: fx.rate,
        fxAsOf: fx.asOfDate,
        fxProvider: fx.provider,
        slug: r.slug,
        title: r.title,
        propertyType: r.propertyType,
        city: r.city,
        area: r.area,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
      }));

    const result: SearchMapResult = {
      ok: true,
      query: q,
      points,
    };

    cacheSet(cacheKey, result, ttlMs);
    return result;
  }

  /**
   * ✅ Google Maps viewport markers (pan/zoom)
   * Returns markers only inside the visible bounds.
   */
  async searchMapViewport(
    q: SearchMapViewportQuery,
    context?: SearchContext,
  ): Promise<SearchMapViewportResult> {
    const displayCurrency = this.resolveDisplayCurrency(
      context?.displayCurrency,
    );
    const fx = await this.fxRates.resolveRate(displayCurrency);
    this.validateViewportBounds(q);

    const hasDates = Boolean(q.checkIn && q.checkOut);

    // Cache shorter for map viewport because users pan quickly
    const ttlMs = hasDates ? 20_000 : 45_000;

    const cacheKey = `search:map-viewport:${stableStringify({
      ...q,
      displayCurrency,
    })}`;
    const cached = cacheGet<SearchMapViewportResult>(cacheKey);
    if (cached) return cached;

    const dateInfo = this.parseSearchDates(q);
    const where = this.buildCoreWhere(q, dateInfo, {
      includeAvailability: true,
    });

    const rows = await this.prisma.property.findMany({
      where,
      take: 2500,
      orderBy: [{ basePrice: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        propertyType: true,
        city: true,
        area: true,
        lat: true,
        lng: true,
        bedrooms: true,
        bathrooms: true,
        basePrice: true,
        currency: true,
        media: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: { url: true, alt: true },
        },
      },
    });

    const points = rows
      .filter((r) => r.lat !== null && r.lng !== null)
      .map((r) => {
        const cover = r.media?.[0] ?? null;
        return {
          propertyId: r.id,
          lat: r.lat!,
          lng: r.lng!,
          priceFrom: this.toDisplayAmount(r.basePrice, fx.rate),
          currency: displayCurrency,
          priceFromAed: r.basePrice,
          fxRate: fx.rate,
          fxAsOf: fx.asOfDate,
          fxProvider: fx.provider,
          slug: r.slug,
          title: r.title,
          propertyType: r.propertyType,
          city: r.city,
          area: r.area,
          bedrooms: r.bedrooms,
          bathrooms: r.bathrooms,
          coverImage: cover ? { url: cover.url, alt: cover.alt ?? null } : null,
        };
      });

    const result: SearchMapViewportResult = {
      ok: true,
      query: q,
      points,
    };

    cacheSet(cacheKey, result, ttlMs);
    return result;
  }
}
