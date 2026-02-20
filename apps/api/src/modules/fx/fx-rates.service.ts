import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FxQuoteCurrency, Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertFxRatesDto } from './dto/upsert-fx-rates.dto';
import type { DisplayCurrency } from '../../common/i18n/locale';

type FxRatesPayload = {
  baseCurrency: 'AED';
  asOfDate: string | null;
  provider: string | null;
  rates: {
    SAR: number | null;
    USD: number | null;
    EUR: number | null;
    GBP: number | null;
  };
  source: 'cache' | 'database';
};

function toIsoDay(value: Date): string {
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDayToUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toNumber(input: Prisma.Decimal | null | undefined): number | null {
  if (!input) return null;
  const n = Number(input.toString());
  return Number.isFinite(n) ? n : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type FxRateResolution = {
  baseCurrency: 'AED';
  quoteCurrency: DisplayCurrency;
  rate: number;
  asOfDate: string | null;
  provider: string | null;
};

const USD_TO_SAR_PEG = 3.75;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed <= 0) return fallback;
  return Math.floor(parsed);
}

@Injectable()
export class FxRatesService implements OnModuleDestroy {
  private readonly logger = new Logger(FxRatesService.name);
  private readonly cacheKey = 'fx:latest:AED';
  private readonly cacheTtlSeconds = parsePositiveInt(
    process.env.FX_CACHE_TTL_SECONDS,
    24 * 60 * 60,
  );
  private readonly providerName =
    (process.env.FX_PROVIDER ?? 'exchangerate-api').trim() ||
    'exchangerate-api';
  private readonly redis: Redis | null;

  constructor(private readonly prisma: PrismaService) {
    const redisUrl = (process.env.REDIS_URL ?? '').trim();
    if (!redisUrl) {
      this.redis = null;
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
    } catch {
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (!this.redis) return;
    try {
      await this.redis.quit();
    } catch {
      // ignore shutdown cache issues
    }
  }

  private async getCachedLatest(): Promise<FxRatesPayload | null> {
    if (!this.redis) return null;

    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      const raw = await this.redis.get(this.cacheKey);
      if (!raw) return null;

      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) return null;
      if (parsed.baseCurrency !== 'AED') return null;

      const ratesRaw = parsed.rates;
      if (!isRecord(ratesRaw)) return null;

      const sar = typeof ratesRaw.SAR === 'number' ? ratesRaw.SAR : null;
      const usd = typeof ratesRaw.USD === 'number' ? ratesRaw.USD : null;
      const eur = typeof ratesRaw.EUR === 'number' ? ratesRaw.EUR : null;
      const gbp = typeof ratesRaw.GBP === 'number' ? ratesRaw.GBP : null;

      return this.withDerivedRates({
        baseCurrency: 'AED',
        asOfDate: typeof parsed.asOfDate === 'string' ? parsed.asOfDate : null,
        provider: typeof parsed.provider === 'string' ? parsed.provider : null,
        rates: { SAR: sar, USD: usd, EUR: eur, GBP: gbp },
        source: 'cache',
      });
    } catch {
      return null;
    }
  }

  private isValidRate(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  }

  private deriveSarFromUsd(usdRate: number | null | undefined): number | null {
    if (!this.isValidRate(usdRate)) return null;
    return Number((usdRate * USD_TO_SAR_PEG).toFixed(8));
  }

  private withDerivedRates(payload: FxRatesPayload): FxRatesPayload {
    if (this.isValidRate(payload.rates.SAR)) return payload;

    const derivedSar = this.deriveSarFromUsd(payload.rates.USD);
    if (!this.isValidRate(derivedSar)) return payload;

    return {
      ...payload,
      rates: {
        ...payload.rates,
        SAR: derivedSar,
      },
    };
  }

  private async findLatestQuoteRate(
    quoteCurrency: FxQuoteCurrency,
  ): Promise<{ rate: number; asOfDate: string | null; provider: string | null } | null> {
    const row = await this.prisma.fxRate.findFirst({
      where: {
        baseCurrency: 'AED',
        quoteCurrency,
      },
      orderBy: [{ asOfDate: 'desc' }, { updatedAt: 'desc' }],
      select: {
        rate: true,
        asOfDate: true,
        provider: true,
      },
    });

    const rate = toNumber(row?.rate);
    if (!this.isValidRate(rate) || !row) return null;

    return {
      rate,
      asOfDate: toIsoDay(row.asOfDate),
      provider: row.provider ?? null,
    };
  }

  private async setCachedLatest(payload: FxRatesPayload): Promise<void> {
    if (!this.redis) return;
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      await this.redis.set(
        this.cacheKey,
        JSON.stringify(payload),
        'EX',
        this.cacheTtlSeconds,
      );
    } catch {
      // ignore cache set failures
    }
  }

  async getLatestRates(): Promise<FxRatesPayload> {
    const cached = await this.getCachedLatest();
    if (cached) return cached;

    const latest = await this.prisma.fxRate.findFirst({
      where: { baseCurrency: 'AED' },
      orderBy: [{ asOfDate: 'desc' }, { updatedAt: 'desc' }],
      select: { asOfDate: true, provider: true },
    });

    if (!latest) {
      const emptyPayload: FxRatesPayload = {
        baseCurrency: 'AED',
        asOfDate: null,
        provider: null,
        rates: { SAR: null, USD: null, EUR: null, GBP: null },
        source: 'database',
      };
      await this.setCachedLatest(emptyPayload);
      return emptyPayload;
    }

    const rows = await this.prisma.fxRate.findMany({
      where: {
        baseCurrency: 'AED',
        asOfDate: latest.asOfDate,
      },
      select: { quoteCurrency: true, rate: true },
    });

    const payload: FxRatesPayload = {
      baseCurrency: 'AED',
      asOfDate: toIsoDay(latest.asOfDate),
      provider: latest.provider ?? null,
      rates: {
        SAR: null,
        USD: null,
        EUR: null,
        GBP: null,
      },
      source: 'database',
    };

    for (const row of rows) {
      const n = toNumber(row.rate);
      if (row.quoteCurrency === FxQuoteCurrency.SAR) payload.rates.SAR = n;
      if (row.quoteCurrency === FxQuoteCurrency.USD) payload.rates.USD = n;
      if (row.quoteCurrency === FxQuoteCurrency.EUR) payload.rates.EUR = n;
      if (row.quoteCurrency === FxQuoteCurrency.GBP) payload.rates.GBP = n;
    }

    const normalizedPayload = this.withDerivedRates(payload);
    await this.setCachedLatest(normalizedPayload);
    return normalizedPayload;
  }

  private async upsertRates(input: {
    asOfDate: Date;
    sar: number;
    usd: number;
    eur: number;
    gbp: number;
    provider: string;
  }): Promise<FxRatesPayload> {
    const asOfDate = input.asOfDate;

    await this.prisma.$transaction([
      this.prisma.fxRate.upsert({
        where: {
          baseCurrency_quoteCurrency_asOfDate: {
            baseCurrency: 'AED',
            quoteCurrency: FxQuoteCurrency.SAR,
            asOfDate,
          },
        },
        update: {
          rate: new Prisma.Decimal(input.sar),
          provider: input.provider,
        },
        create: {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.SAR,
          rate: new Prisma.Decimal(input.sar),
          asOfDate,
          provider: input.provider,
        },
      }),
      this.prisma.fxRate.upsert({
        where: {
          baseCurrency_quoteCurrency_asOfDate: {
            baseCurrency: 'AED',
            quoteCurrency: FxQuoteCurrency.USD,
            asOfDate,
          },
        },
        update: {
          rate: new Prisma.Decimal(input.usd),
          provider: input.provider,
        },
        create: {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.USD,
          rate: new Prisma.Decimal(input.usd),
          asOfDate,
          provider: input.provider,
        },
      }),
      this.prisma.fxRate.upsert({
        where: {
          baseCurrency_quoteCurrency_asOfDate: {
            baseCurrency: 'AED',
            quoteCurrency: FxQuoteCurrency.EUR,
            asOfDate,
          },
        },
        update: {
          rate: new Prisma.Decimal(input.eur),
          provider: input.provider,
        },
        create: {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.EUR,
          rate: new Prisma.Decimal(input.eur),
          asOfDate,
          provider: input.provider,
        },
      }),
      this.prisma.fxRate.upsert({
        where: {
          baseCurrency_quoteCurrency_asOfDate: {
            baseCurrency: 'AED',
            quoteCurrency: FxQuoteCurrency.GBP,
            asOfDate,
          },
        },
        update: {
          rate: new Prisma.Decimal(input.gbp),
          provider: input.provider,
        },
        create: {
          baseCurrency: 'AED',
          quoteCurrency: FxQuoteCurrency.GBP,
          rate: new Prisma.Decimal(input.gbp),
          asOfDate,
          provider: input.provider,
        },
      }),
    ]);

    const payload: FxRatesPayload = {
      baseCurrency: 'AED',
      asOfDate: toIsoDay(asOfDate),
      provider: input.provider,
      rates: {
        SAR: input.sar,
        USD: input.usd,
        EUR: input.eur,
        GBP: input.gbp,
      },
      source: 'database',
    };

    await this.setCachedLatest(payload);
    return payload;
  }

  async adminUpsertManual(dto: UpsertFxRatesDto): Promise<FxRatesPayload> {
    const now = new Date();
    const asOfDate = dto.asOfDate
      ? parseIsoDayToUtc(dto.asOfDate)
      : parseIsoDayToUtc(toIsoDay(now));

    return this.upsertRates({
      asOfDate,
      sar: dto.sar,
      usd: dto.usd,
      eur: dto.eur,
      gbp: dto.gbp,
      provider: 'manual',
    });
  }

  async resolveRate(
    quoteCurrency: DisplayCurrency,
  ): Promise<FxRateResolution> {
    if (quoteCurrency === 'AED') {
      return {
        baseCurrency: 'AED',
        quoteCurrency: 'AED',
        rate: 1,
        asOfDate: null,
        provider: null,
      };
    }

    const latest = await this.getLatestRates();
    const latestRate = latest.rates[quoteCurrency];

    if (this.isValidRate(latestRate)) {
      return {
        baseCurrency: 'AED',
        quoteCurrency,
        rate: latestRate,
        asOfDate: latest.asOfDate,
        provider: latest.provider,
      };
    }

    const fromQuote = await this.findLatestQuoteRate(quoteCurrency);
    if (fromQuote && this.isValidRate(fromQuote.rate)) {
      return {
        baseCurrency: 'AED',
        quoteCurrency,
        rate: fromQuote.rate,
        asOfDate: fromQuote.asOfDate,
        provider: fromQuote.provider,
      };
    }

    if (quoteCurrency === 'SAR') {
      const usdQuote = await this.findLatestQuoteRate(FxQuoteCurrency.USD);
      const derivedSar = this.deriveSarFromUsd(usdQuote?.rate ?? null);
      if (this.isValidRate(derivedSar)) {
        return {
          baseCurrency: 'AED',
          quoteCurrency: 'SAR',
          rate: derivedSar,
          asOfDate: usdQuote?.asOfDate ?? latest.asOfDate,
          provider: usdQuote?.provider ?? latest.provider,
        };
      }
    }

    throw new BadRequestException(
      `FX rate unavailable for currency ${quoteCurrency}.`,
    );
  }

  @Cron('10 4 * * *')
  async syncDailyFromProvider() {
    const apiKey = (process.env.FX_PROVIDER_API_KEY ?? '').trim();
    if (!apiKey) return;

    const providerBase =
      (process.env.FX_PROVIDER_URL ?? '').trim() ||
      'https://v6.exchangerate-api.com/v6';

    const endpoint = `${providerBase.replace(/\/+$/, '')}/${encodeURIComponent(apiKey)}/latest/AED`;

    try {
      const res = await fetch(endpoint, {
        headers: { accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`FX sync failed: provider returned ${res.status}`);
        return;
      }

      const payload: unknown = await res.json();
      if (!isRecord(payload)) {
        this.logger.warn('FX sync failed: invalid payload');
        return;
      }

      const rates = payload.conversion_rates;
      if (!isRecord(rates)) {
        this.logger.warn('FX sync failed: missing conversion_rates');
        return;
      }

      const sar = typeof rates.SAR === 'number' ? rates.SAR : null;
      const usd = typeof rates.USD === 'number' ? rates.USD : null;
      const eur = typeof rates.EUR === 'number' ? rates.EUR : null;
      const gbp = typeof rates.GBP === 'number' ? rates.GBP : null;

      if (!sar || !usd || !eur || !gbp) {
        this.logger.warn(
          'FX sync failed: missing one or more quote currencies',
        );
        return;
      }

      const asOfDate = parseIsoDayToUtc(toIsoDay(new Date()));

      await this.upsertRates({
        asOfDate,
        sar,
        usd,
        eur,
        gbp,
        provider: `provider:${this.providerName
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`FX sync failed: ${message}`);
    }
  }
}
