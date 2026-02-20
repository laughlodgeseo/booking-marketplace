import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BookingStatus,
  CalendarDayStatus,
  GuestReviewStatus,
  HoldStatus,
  LocaleCode,
  Prisma,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FxRatesService } from '../fx/fx-rates.service';
import { ListPropertiesDto } from './dto/list-properties.dto';
import {
  buildOverlapFilter,
  tryIsoDayToUtcDate,
  utcDateToIsoDay,
} from '../../common/date-range';
import {
  DEFAULT_DISPLAY_CURRENCY,
  normalizeDisplayCurrency,
  type AppLocale,
  type DisplayCurrency,
} from '../../common/i18n/locale';

type AmenityGroupDto = {
  id: string;
  key: string;
  name: string;
  sortOrder: number;
};

type AmenityDto = {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  group: AmenityGroupDto | null;
};

type RequestContext = {
  locale?: AppLocale;
  displayCurrency?: DisplayCurrency;
};

@Injectable()
export class PropertiesService {
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
    return input ? normalizeDisplayCurrency(input) : DEFAULT_DISPLAY_CURRENCY;
  }

  private toDisplayAmount(amountAed: number, fxRate: number): number {
    return Math.round(amountAed * fxRate);
  }

  private parseIsoDay(value: string, fallback?: Date): Date {
    const raw = value.trim();
    if (!raw) {
      if (fallback) return fallback;
      throw new BadRequestException('Invalid date range. Use YYYY-MM-DD.');
    }
    const parsed = tryIsoDayToUtcDate(raw);
    if (parsed) return parsed;
    if (fallback) return fallback;
    throw new BadRequestException('Invalid date range. Use YYYY-MM-DD.');
  }

  async list(input: ListPropertiesDto, context?: RequestContext) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 12;
    const skip = (page - 1) * limit;
    const locale = this.resolveLocale(context?.locale);
    const displayCurrency = this.resolveDisplayCurrency(
      context?.displayCurrency,
    );
    const fx = await this.fxRates.resolveRate(displayCurrency);

    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.PUBLISHED,
      ...(input.city
        ? { city: { equals: input.city, mode: Prisma.QueryMode.insensitive } }
        : {}),
      ...(input.q
        ? {
            OR: [
              {
                title: {
                  contains: input.q,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                area: { contains: input.q, mode: Prisma.QueryMode.insensitive },
              },
              {
                city: { contains: input.q, mode: Prisma.QueryMode.insensitive },
              },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.PropertyOrderByWithRelationInput =
      input.sort === 'price_asc'
        ? { basePrice: 'asc' }
        : input.sort === 'price_desc'
          ? { basePrice: 'desc' }
          : { createdAt: 'desc' };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          city: true,
          area: true,
          maxGuests: true,
          bedrooms: true,
          bathrooms: true,
          basePrice: true,
          cleaningFee: true,
          currency: true,
          translations: {
            where: { locale: { in: [locale, LocaleCode.en] } },
            select: {
              locale: true,
              title: true,
              areaLabel: true,
            },
            take: 2,
          },
          media: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { url: true, alt: true },
          },
          guestReviews: {
            where: { status: GuestReviewStatus.APPROVED },
            select: { rating: true },
            take: 200,
          },
        },
      }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items: items.map((p) => {
        const { translations, ...rest } = p;
        const localized = this.pickTranslation(translations, locale);
        const basePriceDisplay = this.toDisplayAmount(p.basePrice, fx.rate);
        const cleaningFeeDisplay = this.toDisplayAmount(p.cleaningFee, fx.rate);
        return {
          ratingAvg:
            p.guestReviews.length > 0
              ? p.guestReviews.reduce((sum, row) => sum + row.rating, 0) /
                p.guestReviews.length
              : null,
          ratingCount: p.guestReviews.length,
          ...rest,
          title: localized?.title ?? p.title,
          area: localized?.areaLabel ?? p.area,
          basePrice: basePriceDisplay,
          cleaningFee: cleaningFeeDisplay,
          currency: displayCurrency,
          priceFrom: basePriceDisplay,
          basePriceAed: p.basePrice,
          cleaningFeeAed: p.cleaningFee,
          priceFromAed: p.basePrice,
          fxRate: fx.rate,
          fxAsOf: fx.asOfDate,
          fxProvider: fx.provider,
          cover: p.media[0] ?? null,
        };
      }),
    };
  }

  async bySlug(slug: string, context?: RequestContext) {
    const locale = this.resolveLocale(context?.locale);
    const displayCurrency = this.resolveDisplayCurrency(
      context?.displayCurrency,
    );
    const fx = await this.fxRates.resolveRate(displayCurrency);
    // ✅ Public safety: only show PUBLISHED listings
    const property = await this.prisma.property.findFirst({
      where: { slug, status: PropertyStatus.PUBLISHED },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        city: true,
        area: true,
        address: true,
        lat: true,
        lng: true,
        maxGuests: true,
        bedrooms: true,
        bathrooms: true,
        basePrice: true,
        cleaningFee: true,
        currency: true,
        status: true,
        translations: {
          where: { locale: { in: [locale, LocaleCode.en] } },
          select: {
            locale: true,
            title: true,
            description: true,
            areaLabel: true,
          },
          take: 2,
        },
        media: {
          orderBy: { sortOrder: 'asc' },
          select: { url: true, alt: true, sortOrder: true, category: true },
        },
        guestReviews: {
          where: { status: GuestReviewStatus.APPROVED },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            createdAt: true,
            customer: {
              select: {
                fullName: true,
              },
            },
          },
        },

        // ✅ Amenities + groups (Frank Porter style)
        amenities: {
          select: {
            amenity: {
              select: {
                id: true,
                key: true,
                name: true,
                icon: true,
                sortOrder: true,
                isActive: true,
                translations: {
                  where: { locale: { in: [locale, LocaleCode.en] } },
                  select: { locale: true, name: true },
                  take: 2,
                },
                group: {
                  select: {
                    id: true,
                    key: true,
                    name: true,
                    sortOrder: true,
                    translations: {
                      where: { locale: { in: [locale, LocaleCode.en] } },
                      select: { locale: true, name: true },
                      take: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!property) return null;

    const propertyTranslation = this.pickTranslation(
      property.translations,
      locale,
    );

    const amenities: AmenityDto[] = (property.amenities ?? [])
      .map((pa) => {
        const amenityTranslation = this.pickTranslation(
          pa.amenity.translations,
          locale,
        );
        const groupTranslation = pa.amenity.group
          ? this.pickTranslation(pa.amenity.group.translations, locale)
          : null;

        return {
          id: pa.amenity.id,
          key: pa.amenity.key,
          name: amenityTranslation?.name ?? pa.amenity.name,
          icon: pa.amenity.icon,
          sortOrder: pa.amenity.sortOrder,
          isActive: pa.amenity.isActive,
          group: pa.amenity.group
            ? {
                id: pa.amenity.group.id,
                key: pa.amenity.group.key,
                name: groupTranslation?.name ?? pa.amenity.group.name,
                sortOrder: pa.amenity.group.sortOrder,
              }
            : null,
        };
      })
      .filter((a) => a.isActive)
      .sort((a, b) => {
        const ga = a.group?.sortOrder ?? 9999;
        const gb = b.group?.sortOrder ?? 9999;
        if (ga !== gb) return ga - gb;

        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

        return a.name.localeCompare(b.name);
      });

    const groupsMap = new Map<
      string,
      { group: AmenityGroupDto | null; amenities: AmenityDto[] }
    >();

    for (const a of amenities) {
      const key = a.group?.id ?? 'ungrouped';
      const existing = groupsMap.get(key);
      if (existing) existing.amenities.push(a);
      else groupsMap.set(key, { group: a.group ?? null, amenities: [a] });
    }

    const amenitiesGrouped = Array.from(groupsMap.values()).sort((x, y) => {
      const sx = x.group?.sortOrder ?? 9999;
      const sy = y.group?.sortOrder ?? 9999;
      if (sx !== sy) return sx - sy;

      const nx = x.group?.name ?? 'Other';
      const ny = y.group?.name ?? 'Other';
      return nx.localeCompare(ny);
    });

    const basePriceDisplay = this.toDisplayAmount(property.basePrice, fx.rate);
    const cleaningFeeDisplay = this.toDisplayAmount(
      property.cleaningFee,
      fx.rate,
    );

    return {
      ...property,
      title: propertyTranslation?.title ?? property.title,
      description: propertyTranslation?.description ?? property.description,
      area: propertyTranslation?.areaLabel ?? property.area,
      basePrice: basePriceDisplay,
      cleaningFee: cleaningFeeDisplay,
      currency: displayCurrency,
      priceFrom: basePriceDisplay,
      basePriceAed: property.basePrice,
      cleaningFeeAed: property.cleaningFee,
      priceFromAed: property.basePrice,
      fxRate: fx.rate,
      fxAsOf: fx.asOfDate,
      fxProvider: fx.provider,
      ratingAvg:
        property.guestReviews.length > 0
          ? property.guestReviews.reduce((sum, row) => sum + row.rating, 0) /
            property.guestReviews.length
          : null,
      ratingCount: property.guestReviews.length,
      amenities,
      amenitiesGrouped,
    };
  }

  async publicCalendarBySlug(slug: string, fromRaw?: string, toRaw?: string) {
    const property = await this.prisma.property.findFirst({
      where: { slug, status: PropertyStatus.PUBLISHED },
      select: { id: true, slug: true },
    });
    if (!property) return null;

    const now = new Date();
    const defaultFrom = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const defaultTo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
    );

    const from = this.parseIsoDay(fromRaw?.trim() ?? '', defaultFrom);
    const to = this.parseIsoDay(toRaw?.trim() ?? '', defaultTo);

    const rangeDays = Math.ceil(
      (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (rangeDays <= 0 || rangeDays > 120) {
      throw new BadRequestException(
        'Invalid date range. Max 120 days and to must be after from.',
      );
    }

    const [bookings, blockedDays, holds] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: {
          propertyId: property.id,
          status: {
            in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
          },
          AND: buildOverlapFilter('checkIn', 'checkOut', from, to),
        },
        select: { checkIn: true, checkOut: true },
      }),
      this.prisma.propertyCalendarDay.findMany({
        where: {
          propertyId: property.id,
          status: CalendarDayStatus.BLOCKED,
          date: { gte: from, lt: to },
        },
        select: { date: true },
      }),
      this.prisma.propertyHold.findMany({
        where: {
          propertyId: property.id,
          status: HoldStatus.ACTIVE,
          expiresAt: { gt: new Date() },
          AND: buildOverlapFilter('checkIn', 'checkOut', from, to),
        },
        select: { checkIn: true, checkOut: true },
      }),
    ]);

    const blockedSet = new Set(
      blockedDays.map((row) => utcDateToIsoDay(row.date)),
    );

    const bookedSet = new Set<string>();
    for (const booking of bookings) {
      const start =
        booking.checkIn.getTime() > from.getTime() ? booking.checkIn : from;
      const end =
        booking.checkOut.getTime() < to.getTime() ? booking.checkOut : to;

      for (
        let t = start.getTime();
        t < end.getTime();
        t += 24 * 60 * 60 * 1000
      ) {
        bookedSet.add(utcDateToIsoDay(new Date(t)));
      }
    }

    const heldSet = new Set<string>();
    for (const hold of holds) {
      const start =
        hold.checkIn.getTime() > from.getTime() ? hold.checkIn : from;
      const end = hold.checkOut.getTime() < to.getTime() ? hold.checkOut : to;

      for (
        let t = start.getTime();
        t < end.getTime();
        t += 24 * 60 * 60 * 1000
      ) {
        heldSet.add(utcDateToIsoDay(new Date(t)));
      }
    }

    const days: Array<{
      date: string;
      status: 'AVAILABLE' | 'BOOKED' | 'HOLD' | 'BLOCKED';
    }> = [];

    for (let t = from.getTime(); t < to.getTime(); t += 24 * 60 * 60 * 1000) {
      const iso = utcDateToIsoDay(new Date(t));
      const status = bookedSet.has(iso)
        ? 'BOOKED'
        : blockedSet.has(iso)
          ? 'BLOCKED'
          : heldSet.has(iso)
            ? 'HOLD'
            : 'AVAILABLE';
      days.push({ date: iso, status });
    }

    return {
      propertyId: property.id,
      slug: property.slug,
      from: utcDateToIsoDay(from),
      to: utcDateToIsoDay(to),
      days,
    };
  }
}
