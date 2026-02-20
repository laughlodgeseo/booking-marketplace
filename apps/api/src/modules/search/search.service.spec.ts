import {
  BookingStatus,
  CalendarDayStatus,
  HoldStatus,
  PropertyStatus,
} from '@prisma/client';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { FxRatesService } from '../fx/fx-rates.service';
import {
  calculateNights,
  normalizeCheckIn,
  normalizeCheckOut,
} from '../../common/date-range';

type TestBooking = {
  status: BookingStatus;
  checkIn: Date;
  checkOut: Date;
};

type TestHold = {
  status: HoldStatus;
  checkIn: Date;
  checkOut: Date;
  expiresAt: Date;
};

type TestCalendarDay = {
  status: CalendarDayStatus;
  date: Date;
};

type TestProperty = {
  id: string;
  slug: string;
  title: string;
  city: string;
  area: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePrice: number;
  cleaningFee: number;
  currency: string;
  isInstantBook: boolean;
  createdAt: Date;
  media: Array<{
    url: string;
    alt: string | null;
    category: string;
    sortOrder: number;
  }>;
  status: PropertyStatus;
  minNights: number;
  maxNights: number | null;
  availabilitySettings: {
    defaultMinNights: number;
    defaultMaxNights: number | null;
  } | null;
  bookings: TestBooking[];
  holds: TestHold[];
  calendarDays: TestCalendarDay[];
};

const baseProperty = (): TestProperty => ({
  id: 'property_1',
  slug: 'property-1',
  title: 'Test Property',
  city: 'Dubai',
  area: 'Marina',
  address: null,
  lat: null,
  lng: null,
  bedrooms: 1,
  bathrooms: 1,
  maxGuests: 4,
  basePrice: 400,
  cleaningFee: 100,
  currency: 'AED',
  isInstantBook: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  media: [],
  status: PropertyStatus.PUBLISHED,
  minNights: 1,
  maxNights: null,
  availabilitySettings: null,
  bookings: [],
  holds: [],
  calendarDays: [],
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toComparable(value: unknown): number | string | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (value === null) return null;
  return null;
}

function matchesScalarFilter(value: unknown, filter: unknown): boolean {
  if (!isRecord(filter) || filter instanceof Date) {
    return value === filter;
  }

  if ('equals' in filter)
    return value === (filter as { equals: unknown }).equals;
  if ('in' in filter) {
    const list = (filter as { in: unknown[] }).in;
    return Array.isArray(list) ? list.includes(value as never) : false;
  }
  if ('not' in filter) return value !== (filter as { not: unknown }).not;

  const left = toComparable(value);
  if (left === null || left === undefined) return false;

  if ('lt' in filter) {
    const right = toComparable((filter as { lt: unknown }).lt);
    if (right === null || right === undefined || !(left < right)) return false;
  }
  if ('lte' in filter) {
    const right = toComparable((filter as { lte: unknown }).lte);
    if (right === null || right === undefined || !(left <= right)) return false;
  }
  if ('gt' in filter) {
    const right = toComparable((filter as { gt: unknown }).gt);
    if (right === null || right === undefined || !(left > right)) return false;
  }
  if ('gte' in filter) {
    const right = toComparable((filter as { gte: unknown }).gte);
    if (right === null || right === undefined || !(left >= right)) return false;
  }

  return true;
}

function matchesFilter(
  record: Record<string, unknown>,
  where: unknown,
): boolean {
  if (!where) return true;
  if (!isRecord(where)) return true;

  if (Array.isArray(where)) {
    return where.every((w) => matchesFilter(record, w));
  }

  if ('AND' in where) {
    const andList = (where as { AND: unknown[] }).AND;
    if (!Array.isArray(andList)) return false;
    if (!andList.every((w) => matchesFilter(record, w))) return false;
  }

  if ('OR' in where) {
    const orList = (where as { OR: unknown[] }).OR;
    if (!Array.isArray(orList)) return false;
    if (!orList.some((w) => matchesFilter(record, w))) return false;
  }

  if ('NOT' in where) {
    const notRaw = (where as { NOT: unknown }).NOT;
    const notList = Array.isArray(notRaw) ? notRaw : [notRaw];
    if (notList.some((w) => matchesFilter(record, w))) return false;
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') continue;
    if (value === undefined) continue;

    if (isRecord(value) && 'some' in value) {
      const rel = record[key];
      if (!Array.isArray(rel)) return false;
      const some = (value as { some: unknown }).some;
      if (
        !rel.some((item) =>
          matchesFilter(item as Record<string, unknown>, some),
        )
      )
        return false;
      continue;
    }

    if (isRecord(value) && 'is' in value) {
      const rel = record[key] as Record<string, unknown> | null | undefined;
      const relFilter = (value as { is: unknown }).is;
      if (relFilter === null) {
        if (rel !== null && rel !== undefined) return false;
      } else {
        if (!rel || !matchesFilter(rel, relFilter)) return false;
      }
      continue;
    }

    if (!matchesScalarFilter(record[key], value)) return false;
  }

  return true;
}

function setupSearchService(
  properties: TestProperty[],
  options?: { rate?: number; quoteCurrency?: 'AED' | 'USD' | 'SAR' | 'EUR' | 'GBP' },
) {
  const property = {
    count: jest.fn().mockImplementation(({ where }) => {
      return properties.filter((p) =>
        matchesFilter(p as unknown as Record<string, unknown>, where),
      ).length;
    }),
    findMany: jest.fn().mockImplementation(({ where, skip, take }) => {
      const filtered = properties.filter((p) =>
        matchesFilter(p as unknown as Record<string, unknown>, where),
      );
      const start = typeof skip === 'number' ? skip : 0;
      const end = typeof take === 'number' ? start + take : undefined;
      return filtered.slice(start, end);
    }),
  };

  const prisma = { property } as unknown as PrismaService;
  const quoteCurrency = options?.quoteCurrency ?? 'AED';
  const rate = options?.rate ?? 1;
  const fxRates = {
    resolveRate: jest.fn().mockResolvedValue({
      baseCurrency: 'AED',
      quoteCurrency,
      rate,
      asOfDate: null,
      provider: 'spec',
    }),
  } as unknown as FxRatesService;
  return { service: new SearchService(prisma, fxRates), prisma, fxRates };
}

describe('SearchService availability filtering', () => {
  it('returns available property for a clean range', async () => {
    const property = baseProperty();
    const { service } = setupSearchService([property]);

    const res = await service.searchProperties({
      checkIn: '2026-03-10',
      checkOut: '2026-03-12',
    } as unknown as Parameters<SearchService['searchProperties']>[0]);

    expect(res.items).toHaveLength(1);
  });

  it('allows checkout day (no overlap on boundary)', async () => {
    const booking: TestBooking = {
      status: BookingStatus.CONFIRMED,
      checkIn: normalizeCheckIn('2026-03-10'),
      checkOut: normalizeCheckOut('2026-03-12'),
    };

    const property = {
      ...baseProperty(),
      bookings: [booking],
    };

    const { service } = setupSearchService([property]);

    const res = await service.searchProperties({
      checkIn: '2026-03-12',
      checkOut: '2026-03-14',
    } as unknown as Parameters<SearchService['searchProperties']>[0]);

    expect(res.items).toHaveLength(1);
  });

  it('blocks overlapping bookings', async () => {
    const booking: TestBooking = {
      status: BookingStatus.CONFIRMED,
      checkIn: normalizeCheckIn('2026-03-10'),
      checkOut: normalizeCheckOut('2026-03-12'),
    };

    const property = {
      ...baseProperty(),
      bookings: [booking],
    };

    const { service } = setupSearchService([property]);

    const res = await service.searchProperties({
      checkIn: '2026-03-11',
      checkOut: '2026-03-13',
    } as unknown as Parameters<SearchService['searchProperties']>[0]);

    expect(res.items).toHaveLength(0);
  });

  it('ignores expired holds', async () => {
    const now = Date.now();
    const hold: TestHold = {
      status: HoldStatus.ACTIVE,
      checkIn: normalizeCheckIn('2026-03-20'),
      checkOut: normalizeCheckOut('2026-03-22'),
      expiresAt: new Date(now - 60_000),
    };

    const property = {
      ...baseProperty(),
      holds: [hold],
    };

    const { service } = setupSearchService([property]);

    const res = await service.searchProperties({
      checkIn: '2026-03-20',
      checkOut: '2026-03-22',
    } as unknown as Parameters<SearchService['searchProperties']>[0]);

    expect(res.items).toHaveLength(1);
  });

  it('normalizes date-only inputs to UTC midnight', () => {
    const checkIn = normalizeCheckIn('2026-03-10');
    const checkOut = normalizeCheckOut('2026-03-12');

    expect(checkIn.toISOString()).toBe('2026-03-10T00:00:00.000Z');
    expect(checkOut.toISOString()).toBe('2026-03-12T00:00:00.000Z');
    expect(calculateNights(checkIn, checkOut)).toBe(2);
  });

  it('respects availability settings min nights', async () => {
    const property = {
      ...baseProperty(),
      availabilitySettings: { defaultMinNights: 3, defaultMaxNights: null },
    };

    const { service } = setupSearchService([property]);

    const tooShort = await service.searchProperties({
      checkIn: '2026-04-10',
      checkOut: '2026-04-12',
    } as unknown as Parameters<SearchService['searchProperties']>[0]);

    expect(tooShort.items).toHaveLength(0);

    const longEnough = await service.searchProperties({
      checkIn: '2026-04-10',
      checkOut: '2026-04-13',
    } as unknown as Parameters<SearchService['searchProperties']>[0]);

    expect(longEnough.items).toHaveLength(1);
  });

  it('converts pricing to requested display currency', async () => {
    const property = baseProperty();
    const { service } = setupSearchService([property], {
      quoteCurrency: 'USD',
      rate: 0.2726,
    });

    const res = await service.searchProperties(
      {
        checkIn: '2026-04-10',
        checkOut: '2026-04-12',
      } as unknown as Parameters<SearchService['searchProperties']>[0],
      { displayCurrency: 'USD' },
    );

    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.pricing.currency).toBe('USD');
    expect(res.items[0]?.pricing.nightly).toBe(
      Math.round(property.basePrice * 0.2726),
    );
    expect(res.items[0]?.pricing.cleaningFee).toBe(
      Math.round(property.cleaningFee * 0.2726),
    );
    expect(res.items[0]?.pricing.nightlyAed).toBe(property.basePrice);
  });
});
