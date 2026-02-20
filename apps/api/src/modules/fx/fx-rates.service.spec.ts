import { Prisma } from '@prisma/client';
import { FxRatesService } from './fx-rates.service';
import type { PrismaService } from '../prisma/prisma.service';

type FxRateFindFirstArgs = {
  where?: {
    baseCurrency?: string;
    quoteCurrency?: 'SAR' | 'USD' | 'EUR' | 'GBP';
  };
};

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

describe('FxRatesService SAR fallback', () => {
  const originalRedisUrl = process.env.REDIS_URL;

  beforeEach(() => {
    process.env.REDIS_URL = '';
  });

  afterAll(() => {
    process.env.REDIS_URL = originalRedisUrl;
  });

  it('derives SAR from USD in latest payload when SAR row is missing', async () => {
    const latestAsOf = new Date('2026-02-20T00:00:00.000Z');

    const prisma = {
      fxRate: {
        findFirst: jest.fn().mockResolvedValue({
          asOfDate: latestAsOf,
          provider: 'provider:test',
        }),
        findMany: jest.fn().mockResolvedValue([
          { quoteCurrency: 'USD', rate: decimal(0.2726) },
          { quoteCurrency: 'EUR', rate: decimal(0.2511) },
          { quoteCurrency: 'GBP', rate: decimal(0.2148) },
        ]),
      },
    } as unknown as PrismaService;

    const service = new FxRatesService(prisma);
    const payload = await service.getLatestRates();

    expect(payload.baseCurrency).toBe('AED');
    expect(payload.rates.USD).toBeCloseTo(0.2726, 8);
    expect(payload.rates.SAR).toBeCloseTo(1.02225, 8);
  });

  it('resolves SAR from latest USD quote fallback when SAR is unavailable', async () => {
    const latestAsOf = new Date('2026-02-20T00:00:00.000Z');
    const usdAsOf = new Date('2026-02-19T00:00:00.000Z');

    const findFirst = jest.fn((args?: FxRateFindFirstArgs) => {
      const quoteCurrency = args?.where?.quoteCurrency;
      if (quoteCurrency === 'USD') {
        return {
          rate: decimal(0.2726),
          asOfDate: usdAsOf,
          provider: 'provider:test',
        };
      }
      if (quoteCurrency === 'SAR') {
        return null;
      }
      return {
        asOfDate: latestAsOf,
        provider: 'provider:test',
      };
    });

    const prisma = {
      fxRate: {
        findFirst,
        findMany: jest.fn().mockResolvedValue([
          // intentionally no SAR and no USD in the latest day snapshot
          { quoteCurrency: 'EUR', rate: decimal(0.2511) },
          { quoteCurrency: 'GBP', rate: decimal(0.2148) },
        ]),
      },
    } as unknown as PrismaService;

    const service = new FxRatesService(prisma);
    const resolved = await service.resolveRate('SAR');

    expect(resolved.quoteCurrency).toBe('SAR');
    expect(resolved.rate).toBeCloseTo(1.02225, 8);
    expect(resolved.asOfDate).toBe('2026-02-19');
  });
});
