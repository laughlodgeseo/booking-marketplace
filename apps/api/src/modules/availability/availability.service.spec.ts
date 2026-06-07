import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, HoldStatus, PropertyStatus } from '@prisma/client';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { FxRatesService } from '../fx/fx-rates.service';
import { PricingService } from '../pricing/pricing.service';
import { DubaiTaxService } from '../../common/pricing/dubai-tax.service';

// ── replaceHold tests ──────────────────────────────────────────────────────────

describe('AvailabilityService.replaceHold', () => {
  const PROPERTY_ID = 'prop_replace_1';
  const USER_ID = 'user_replace_1';
  const OLD_HOLD_ID = 'hold_old_1';
  const NEW_HOLD_ID = 'hold_new_1';

  const activeHold = {
    id: OLD_HOLD_ID,
    propertyId: PROPERTY_ID,
    createdById: USER_ID,
    status: HoldStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    bookingId: null,
    booking: null,
  };

  function buildTx(overrides: Record<string, unknown> = {}) {
    return {
      $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]),
      propertyHold: {
        findUnique: jest.fn().mockResolvedValue(activeHold),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue({
          id: NEW_HOLD_ID,
          propertyId: PROPERTY_ID,
          checkIn: new Date('2026-06-01T00:00:00.000Z'),
          checkOut: new Date('2026-06-05T00:00:00.000Z'),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          adults: 2,
          children: 0,
          status: HoldStatus.ACTIVE,
          quotedTotalAed: null,
          quotedTotalDisplay: null,
          displayCurrency: 'AED',
          fxRate: 1,
          fxAsOfDate: null,
          fxProvider: null,
          quotedBreakdown: null,
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      property: {
        findUnique: jest.fn().mockResolvedValue({
          status: PropertyStatus.PUBLISHED,
          maxGuests: 10,
        }),
      },
      propertyCalendarDay: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      bookingBlockedDate: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      booking: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      ...overrides,
    };
  }

  function buildService(txOverrides: Record<string, unknown> = {}) {
    const tx = buildTx(txOverrides);

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)),
      propertyAvailabilitySettings: {
        upsert: jest.fn().mockResolvedValue({ defaultMinNights: 1 }),
      },
      property: {
        findUnique: jest.fn().mockResolvedValue({
          id: PROPERTY_ID,
          basePrice: 1000,
          cleaningFee: 200,
          currency: 'AED',
          maxGuests: 10,
          status: PropertyStatus.PUBLISHED,
          starRating: 5,
        }),
      },
      propertyCalendarDay: { findFirst: jest.fn().mockResolvedValue(null) },
      propertyHold: { findFirst: jest.fn().mockResolvedValue(null) },
      booking: { findFirst: jest.fn().mockResolvedValue(null) },
      bookingBlockedDate: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    const fxRates = {
      resolveRate: jest.fn().mockResolvedValue({ rate: 1, asOfDate: '2026-06-01', provider: 'test' }),
    } as unknown as FxRatesService;

    const pricing = {
      calculateTotal: jest.fn().mockResolvedValue({ nightlyBreakdown: [], subtotal: 4000 }),
    } as unknown as PricingService;

    const dubaiTax = {
      calculate: jest.fn().mockReturnValue({
        serviceCharge: 400, municipalityFee: 280, tourismFee: 240,
        vat: 196, tourismDirham: 40, total: 5156,
      }),
    } as unknown as DubaiTaxService;

    return { service: new AvailabilityService(prisma, fxRates, pricing, dubaiTax), tx };
  }

  it('cancels old hold and creates new hold for updated dates', async () => {
    const { service, tx } = buildService();

    const result = await service.replaceHold(USER_ID, PROPERTY_ID, OLD_HOLD_ID, {
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      guests: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.replacedHoldId).toBe(OLD_HOLD_ID);
    expect(result.hold.id).toBe(NEW_HOLD_ID);

    // Old hold must be CANCELLED before new one is created
    expect(tx.propertyHold.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: OLD_HOLD_ID },
        data: { status: HoldStatus.CANCELLED },
      }),
    );
    expect(tx.propertyHold.create).toHaveBeenCalled();
  });

  it('excludes own hold so another-user hold still blocks', async () => {
    const { service, tx } = buildService();

    // Simulate another user's hold overlapping the new dates
    (tx.propertyHold.findFirst as jest.Mock).mockResolvedValue({ id: 'hold_other' });

    await expect(
      service.replaceHold(USER_ID, PROPERTY_ID, OLD_HOLD_ID, {
        checkIn: '2026-06-01',
        checkOut: '2026-06-05',
        guests: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Old hold was CANCELLED (transaction rolled back, but mock records the call)
    expect(tx.propertyHold.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: HoldStatus.CANCELLED } }),
    );
    // New hold must NOT have been created
    expect(tx.propertyHold.create).not.toHaveBeenCalled();
  });

  it('rejects if hold not found', async () => {
    const { service } = buildService({
      propertyHold: { findUnique: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      service.replaceHold(USER_ID, PROPERTY_ID, OLD_HOLD_ID, {
        checkIn: '2026-06-01', checkOut: '2026-06-05', guests: 2,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects if caller does not own the hold', async () => {
    const { service } = buildService({
      propertyHold: {
        findUnique: jest.fn().mockResolvedValue({ ...activeHold, createdById: 'other_user' }),
      },
    });

    await expect(
      service.replaceHold(USER_ID, PROPERTY_ID, OLD_HOLD_ID, {
        checkIn: '2026-06-01', checkOut: '2026-06-05', guests: 2,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects expired hold', async () => {
    const { service } = buildService({
      propertyHold: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeHold,
          status: HoldStatus.EXPIRED,
        }),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.replaceHold(USER_ID, PROPERTY_ID, OLD_HOLD_ID, {
        checkIn: '2026-06-01', checkOut: '2026-06-05', guests: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects converted hold with paid booking', async () => {
    const { service } = buildService({
      propertyHold: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeHold,
          status: HoldStatus.CONVERTED,
          bookingId: 'booking_1',
          booking: { id: 'booking_1', status: BookingStatus.CONFIRMED },
        }),
        update: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.replaceHold(USER_ID, PROPERTY_ID, OLD_HOLD_ID, {
        checkIn: '2026-06-01', checkOut: '2026-06-05', guests: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when booked dates block new range', async () => {
    const { service } = buildService({
      bookingBlockedDate: {
        findFirst: jest.fn().mockResolvedValue({ date: new Date('2026-06-02T00:00:00.000Z') }),
      },
    });

    await expect(
      service.replaceHold(USER_ID, PROPERTY_ID, OLD_HOLD_ID, {
        checkIn: '2026-06-01', checkOut: '2026-06-05', guests: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ── AvailabilityService currency snapshot flow ─────────────────────────────────

describe('AvailabilityService currency snapshot flow', () => {
  function buildService() {
    const prisma = {
      propertyAvailabilitySettings: {
        upsert: jest.fn().mockResolvedValue({
          propertyId: 'property_1',
          defaultMinNights: 1,
          defaultMaxNights: null,
        }),
      },
      property: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'property_1',
          basePrice: 1000,
          cleaningFee: 200,
          currency: 'AED',
          maxGuests: 6,
          status: 'PUBLISHED',
        }),
      },
      propertyCalendarDay: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      propertyHold: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      booking: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      bookingBlockedDate: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const fxRates = {
      resolveRate: jest.fn().mockResolvedValue({
        baseCurrency: 'AED',
        quoteCurrency: 'USD',
        rate: 0.25,
        asOfDate: '2026-02-20',
        provider: 'spec',
      }),
    } as unknown as FxRatesService;

    const pricing = {
      calculateTotal: jest.fn().mockResolvedValue({
        nightlyBreakdown: [
          { date: '2026-03-10', price: 1000, ruleId: null },
          { date: '2026-03-11', price: 1000, ruleId: null },
        ],
        subtotal: 2000,
      }),
    } as unknown as PricingService;

    const dubaiTax = {
      // total=2200 so that totalAed=2200 and FX total=2200*0.25=550 match test expectations
      calculate: jest.fn().mockReturnValue({
        baseTotal: 2000,
        cleaningFee: 200,
        serviceCharge: 0,
        municipalityFee: 0,
        tourismFee: 0,
        subtotalBeforeVat: 2200,
        vat: 0,
        tourismDirham: 0,
        total: 2200,
      }),
    } as unknown as DubaiTaxService;

    return {
      service: new AvailabilityService(prisma, fxRates, pricing, dubaiTax),
      prisma,
      fxRates,
    };
  }

  it('returns quote totals converted by backend FX rate', async () => {
    const { service } = buildService();

    const result = await service.quote('property_1', {
      checkIn: '2026-03-10',
      checkOut: '2026-03-12',
      guests: 2,
      currency: 'USD',
    });

    expect(result.currency).toBe('USD');
    expect(result.fxRate).toBe(0.25);
    expect(result.breakdown.totalAed).toBe(2200);
    expect(result.breakdown.total).toBe(550);
    expect(result.breakdown.basePricePerNightAed).toBe(1000);
    expect(result.breakdown.basePricePerNight).toBe(250);
  });

  it('passes quote FX snapshot into hold creation during reserve', async () => {
    const { service } = buildService();

    jest.spyOn(service, 'quote').mockResolvedValue({
      ok: true,
      canBook: true,
      reasons: [],
      propertyId: 'property_1',
      checkIn: '2026-03-10',
      checkOut: '2026-03-12',
      nights: 2,
      minNightsRequired: 1,
      currency: 'USD',
      fxRate: 0.25,
      fxAsOf: '2026-02-20',
      fxProvider: 'spec',
      breakdown: {
        nights: 2,
        basePricePerNight: 250,
        nightlySubtotal: 500,
        baseAmount: 500,
        cleaningFee: 50,
        serviceCharge: 50,
        municipalityFee: 35,
        tourismFee: 30,
        vat: 33,
        tourismDirham: 5,
        serviceFee: 50,
        taxes: 103,
        total: 550,
        basePricePerNightAed: 1000,
        nightlySubtotalAed: 2000,
        baseAmountAed: 2000,
        cleaningFeeAed: 200,
        serviceChargeAed: 200,
        municipalityFeeAed: 140,
        tourismFeeAed: 120,
        vatAed: 133,
        tourismDirhamAed: 20,
        serviceFeeAed: 200,
        taxesAed: 413,
        totalAed: 2200,
        nightlyBreakdown: [
          { date: '2026-03-10', price: 1000, ruleId: null },
          { date: '2026-03-11', price: 1000, ruleId: null },
        ],
      },
    });

    const createHoldSpy = jest.spyOn(service, 'createHold').mockResolvedValue({
      id: 'hold_1',
      propertyId: 'property_1',
      checkIn: '2026-03-10',
      checkOut: '2026-03-12',
      expiresAt: '2026-03-10T01:00:00.000Z',
      status: 'ACTIVE',
      quotedTotalAed: 2200,
      quotedTotalDisplay: 550,
      displayCurrency: 'USD',
      fxRate: 0.25,
      fxAsOfDate: '2026-02-20',
      fxProvider: 'spec',
      quotedBreakdown: null,
    } as any);

    const result = await service.reserve(
      { id: 'customer_1' },
      'property_1',
      {
        checkIn: '2026-03-10',
        checkOut: '2026-03-12',
        guests: 2,
        currency: 'USD',
      },
      { displayCurrency: 'USD' },
    );

    expect(result.ok).toBe(true);
    expect(result.canReserve).toBe(true);
    expect(createHoldSpy).toHaveBeenCalledWith(
      { id: 'customer_1' },
      'property_1',
      expect.objectContaining({
        checkIn: '2026-03-10',
        checkOut: '2026-03-12',
      }),
      expect.objectContaining({
        quotedTotalAed: 2200,
        quotedTotalDisplay: 550,
        displayCurrency: 'USD',
        fxRate: 0.25,
        fxAsOfDate: '2026-02-20',
        fxProvider: 'spec',
      }),
    );
  });
});
