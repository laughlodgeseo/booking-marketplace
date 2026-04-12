import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { FxRatesService } from '../fx/fx-rates.service';
import { PricingService } from '../pricing/pricing.service';
import { DubaiTaxService } from '../../common/pricing/dubai-tax.service';

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
