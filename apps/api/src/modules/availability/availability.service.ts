import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  CalendarDayStatus,
  HoldStatus,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FxRatesService } from '../fx/fx-rates.service';
import { PricingService } from '../pricing/pricing.service';
import {
  assertValidRange,
  buildOverlapFilter,
  calculateNights,
  enumerateNights,
  isoDayToUtcDate,
  normalizeCheckIn,
  normalizeCheckOut,
  utcDateToIsoDay,
} from './availability.utils';
import { AvailabilityRangeResult } from './types/availability.types';
import { UpdateAvailabilitySettingsDto } from './dto/settings.dto';
import { UpsertCalendarDaysDto, BlockRangeDto } from './dto/calendar.dto';
import { CreateHoldDto } from './dto/holds.dto';
import {
  DEFAULT_DISPLAY_CURRENCY,
  normalizeDisplayCurrency,
  type DisplayCurrency,
} from '../../common/i18n/locale';
import { DubaiTaxService } from '../../common/pricing/dubai-tax.service';

type QuoteDto = {
  checkIn: string;
  checkOut: string;
  guests?: number | null;
  currency?: string;
};

type QuoteContext = {
  displayCurrency?: DisplayCurrency;
};

type HoldPricingSnapshot = {
  quotedTotalAed: number;
  quotedTotalDisplay: number;
  displayCurrency: DisplayCurrency;
  fxRate: number;
  fxAsOfDate: string | null;
  fxProvider: string | null;
  /** Full AED breakdown snapshot — stored on hold and propagated to booking. */
  quotedBreakdown?: Record<string, number> | null;
};

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fxRates: FxRatesService,
    private readonly pricing: PricingService,
    private readonly dubaiTax: DubaiTaxService,
  ) {}

  // -----------------------------
  // Helpers
  // -----------------------------

  private async assertVendorOwnsPropertyOrThrow(
    userId: string,
    propertyId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, vendorId: userId },
      select: { id: true },
    });

    if (!property)
      throw new ForbiddenException('You do not own this property.');
  }

  private hasStringId(value: unknown): value is { id: string } {
    if (typeof value !== 'object' || value === null) return false;
    return (
      'id' in value && typeof (value as Record<string, unknown>).id === 'string'
    );
  }

  private extractUserId(maybeUserOrId: unknown): string | null {
    if (!maybeUserOrId) return null;
    if (typeof maybeUserOrId === 'string') return maybeUserOrId;
    if (this.hasStringId(maybeUserOrId)) return maybeUserOrId.id;
    return null;
  }

  private resolveDisplayCurrency(
    dtoCurrency: string | undefined,
    context?: QuoteContext,
  ): DisplayCurrency {
    if (dtoCurrency) return normalizeDisplayCurrency(dtoCurrency);
    if (context?.displayCurrency) return context.displayCurrency;
    return DEFAULT_DISPLAY_CURRENCY;
  }

  private toDisplayAmount(amountAed: number, fxRate: number): number {
    return Math.round(amountAed * fxRate);
  }

  // -----------------------------
  // Settings
  // -----------------------------

  async getOrCreateSettings(propertyId: string) {
    return this.prisma.propertyAvailabilitySettings.upsert({
      where: { propertyId },
      update: {},
      create: {
        propertyId,
        defaultMinNights: 1,
        defaultMaxNights: null,
        advanceNoticeDays: 0,
        preparationDays: 0,
      },
    });
  }

  async vendorGetSettings(userId: string, propertyId: string) {
    await this.assertVendorOwnsPropertyOrThrow(userId, propertyId);
    return this.getOrCreateSettings(propertyId);
  }

  async vendorUpdateSettings(
    userId: string,
    propertyId: string,
    dto: UpdateAvailabilitySettingsDto,
  ) {
    await this.assertVendorOwnsPropertyOrThrow(userId, propertyId);

    if (
      dto.defaultMaxNights != null &&
      dto.defaultMaxNights < dto.defaultMinNights
    ) {
      throw new BadRequestException(
        'defaultMaxNights cannot be less than defaultMinNights.',
      );
    }

    return this.prisma.propertyAvailabilitySettings.upsert({
      where: { propertyId },
      update: {
        defaultMinNights: dto.defaultMinNights,
        defaultMaxNights: dto.defaultMaxNights ?? null,
        advanceNoticeDays: dto.advanceNoticeDays ?? 0,
        preparationDays: dto.preparationDays ?? 0,
      },
      create: {
        propertyId,
        defaultMinNights: dto.defaultMinNights,
        defaultMaxNights: dto.defaultMaxNights ?? null,
        advanceNoticeDays: dto.advanceNoticeDays ?? 0,
        preparationDays: dto.preparationDays ?? 0,
      },
    });
  }

  // -----------------------------
  // Calendar querying
  // -----------------------------

  async getAvailabilityRange(
    propertyId: string,
    fromIso: string,
    toIso: string,
  ): Promise<AvailabilityRangeResult> {
    const from = isoDayToUtcDate(fromIso);
    const to = isoDayToUtcDate(toIso);

    if (from.getTime() >= to.getTime()) {
      throw new BadRequestException('from must be earlier than to.');
    }

    const maxMs = 370 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxMs) {
      throw new BadRequestException('Range too large. Max 370 days.');
    }

    const settings = await this.getOrCreateSettings(propertyId);

    const overlapRange = buildOverlapFilter('checkIn', 'checkOut', from, to);

    const [overrides, activeHolds] = await Promise.all([
      this.prisma.propertyCalendarDay.findMany({
        where: { propertyId, date: { gte: from, lt: to } },
        select: {
          date: true,
          status: true,
          minNightsOverride: true,
          note: true,
        },
      }),
      this.prisma.propertyHold.findMany({
        where: {
          propertyId,
          status: HoldStatus.ACTIVE,
          expiresAt: { gt: new Date() },
          AND: overlapRange,
        },
        select: { checkIn: true, checkOut: true },
      }),
    ]);

    const overrideMap = new Map<string, (typeof overrides)[number]>();
    for (const o of overrides) overrideMap.set(utcDateToIsoDay(o.date), o);

    const heldNights = new Set<string>();
    for (const h of activeHolds) {
      const nights = enumerateNights(h.checkIn, h.checkOut);
      for (const n of nights) heldNights.add(utcDateToIsoDay(n));
    }

    const days: AvailabilityRangeResult['days'] = [];
    for (let t = from.getTime(); t < to.getTime(); t += 24 * 60 * 60 * 1000) {
      const d = new Date(t);
      const iso = utcDateToIsoDay(d);
      const override = overrideMap.get(iso);

      const status = override?.status ?? CalendarDayStatus.AVAILABLE;
      const minOverride = override?.minNightsOverride ?? null;

      days.push({
        date: iso,
        status: status === CalendarDayStatus.BLOCKED ? 'BLOCKED' : 'AVAILABLE',
        effectiveMinNights: minOverride ?? settings.defaultMinNights,
        minNightsOverride: minOverride,
        note: override?.note ?? null,
        isHeld: heldNights.has(iso),
      });
    }

    return { propertyId, from: fromIso, to: toIso, days };
  }

  async vendorGetCalendar(
    userId: string,
    propertyId: string,
    fromIso: string,
    toIso: string,
  ) {
    await this.assertVendorOwnsPropertyOrThrow(userId, propertyId);
    return this.getAvailabilityRange(propertyId, fromIso, toIso);
  }

  // -----------------------------
  // Calendar mutations
  // -----------------------------

  async vendorUpsertCalendarDays(
    userId: string,
    propertyId: string,
    dto: UpsertCalendarDaysDto,
  ) {
    await this.assertVendorOwnsPropertyOrThrow(userId, propertyId);

    const lastByDate = new Map<string, (typeof dto.days)[number]>();
    for (const day of dto.days) lastByDate.set(day.date, day);

    const rows = Array.from(lastByDate.values()).map((d) => ({
      propertyId,
      date: isoDayToUtcDate(d.date),
      status:
        d.status === 'BLOCKED'
          ? CalendarDayStatus.BLOCKED
          : CalendarDayStatus.AVAILABLE,
      minNightsOverride: d.minNightsOverride ?? null,
      note: d.note ?? null,
    }));

    return this.prisma.$transaction(async (tx) => {
      for (const r of rows) {
        await tx.propertyCalendarDay.upsert({
          where: {
            propertyId_date: { propertyId: r.propertyId, date: r.date },
          },
          update: {
            status: r.status,
            minNightsOverride: r.minNightsOverride,
            note: r.note,
          },
          create: r,
        });
      }
      return { ok: true, count: rows.length };
    });
  }

  async vendorBlockRange(
    userId: string,
    propertyId: string,
    dto: BlockRangeDto,
  ) {
    await this.assertVendorOwnsPropertyOrThrow(userId, propertyId);

    const from = isoDayToUtcDate(dto.from);
    const to = isoDayToUtcDate(dto.to);
    if (from.getTime() >= to.getTime())
      throw new BadRequestException('from must be earlier than to.');

    const days: Date[] = [];
    for (let t = from.getTime(); t < to.getTime(); t += 24 * 60 * 60 * 1000)
      days.push(new Date(t));

    return this.prisma.$transaction(async (tx) => {
      for (const day of days) {
        await tx.propertyCalendarDay.upsert({
          where: { propertyId_date: { propertyId, date: day } },
          update: { status: CalendarDayStatus.BLOCKED, note: dto.note ?? null },
          create: {
            propertyId,
            date: day,
            status: CalendarDayStatus.BLOCKED,
            note: dto.note ?? null,
          },
        });
      }
      return { ok: true, blockedDays: days.length };
    });
  }

  async vendorUnblockRange(
    userId: string,
    propertyId: string,
    dto: BlockRangeDto,
  ) {
    await this.assertVendorOwnsPropertyOrThrow(userId, propertyId);

    const from = isoDayToUtcDate(dto.from);
    const to = isoDayToUtcDate(dto.to);
    if (from.getTime() >= to.getTime())
      throw new BadRequestException('from must be earlier than to.');

    const days: Date[] = [];
    for (let t = from.getTime(); t < to.getTime(); t += 24 * 60 * 60 * 1000)
      days.push(new Date(t));

    return this.prisma.$transaction(async (tx) => {
      for (const day of days) {
        await tx.propertyCalendarDay.upsert({
          where: { propertyId_date: { propertyId, date: day } },
          update: {
            status: CalendarDayStatus.AVAILABLE,
            note: dto.note ?? null,
          },
          create: {
            propertyId,
            date: day,
            status: CalendarDayStatus.AVAILABLE,
            note: dto.note ?? null,
          },
        });
      }
      return { ok: true, unblockedDays: days.length };
    });
  }

  // -----------------------------
  // Holds (anti double-booking)
  // -----------------------------

  async createHold(
    userId: unknown,
    propertyId: string,
    dto: CreateHoldDto,
    pricingSnapshot?: HoldPricingSnapshot,
  ) {
    const checkIn = normalizeCheckIn(dto.checkIn);
    const checkOut = normalizeCheckOut(dto.checkOut);
    assertValidRange(checkIn, checkOut);

    const ttl = dto.ttlMinutes ?? 15;
    if (ttl < 5 || ttl > 60)
      throw new BadRequestException('ttlMinutes must be between 5 and 60.');

    const createdById = this.extractUserId(userId);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    return this.prisma.$transaction(async (tx) => {
      // SECURITY: Advisory lock uses Prisma tagged template — propertyId is parameterized.
      // Raw SQL required because Prisma ORM has no pg_advisory_xact_lock equivalent.
      await tx.$queryRaw<{ ok: number }[]>`
        WITH lock AS (
          SELECT pg_advisory_xact_lock((hashtext(${propertyId})::bigint))
        )
        SELECT 1 as ok
      `;

      // SECURITY: Verify property is published inside the lock so the check is
      // atomic with the hold creation. Prevents holds on draft/pending listings.
      const propertyForHold = await tx.property.findUnique({
        where: { id: propertyId },
        select: { status: true },
      });
      if (!propertyForHold) throw new NotFoundException('Property not found.');
      if (propertyForHold.status !== PropertyStatus.PUBLISHED) {
        throw new ForbiddenException('Property is not available for booking.');
      }

      const nights = enumerateNights(checkIn, checkOut);
      if (nights.length <= 0)
        throw new BadRequestException('Invalid date range.');

      const blocked = await tx.propertyCalendarDay.findFirst({
        where: {
          propertyId,
          status: CalendarDayStatus.BLOCKED,
          date: { in: nights },
        },
        select: { date: true },
      });

      if (blocked) {
        throw new BadRequestException(
          `Dates unavailable (blocked on ${utcDateToIsoDay(blocked.date)}).`,
        );
      }

      // Also protect against real bookings (confirmed/pending payment) overlapping
      const overlapBooking = await tx.booking.findFirst({
        where: {
          propertyId,
          status: {
            in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
          },
          AND: buildOverlapFilter('checkIn', 'checkOut', checkIn, checkOut),
        },
        select: { id: true },
      });

      if (overlapBooking) {
        throw new BadRequestException('Dates unavailable (already booked).');
      }

      const overlapHold = await tx.propertyHold.findFirst({
        where: {
          propertyId,
          status: HoldStatus.ACTIVE,
          expiresAt: { gt: new Date() },
          AND: buildOverlapFilter('checkIn', 'checkOut', checkIn, checkOut),
        },
        select: { id: true },
      });

      if (overlapHold) {
        throw new BadRequestException(
          'Dates temporarily unavailable (another checkout in progress).',
        );
      }

      if (!createdById) {
        throw new BadRequestException(
          'createdById is required to create a hold.',
        );
      }

      const hold = await tx.propertyHold.create({
        data: {
          propertyId,
          checkIn,
          checkOut,
          expiresAt,
          createdById,
          quotedTotalAed: pricingSnapshot?.quotedTotalAed ?? null,
          quotedTotalDisplay: pricingSnapshot?.quotedTotalDisplay ?? null,
          displayCurrency: pricingSnapshot?.displayCurrency ?? 'AED',
          fxRate: pricingSnapshot?.fxRate ?? 1,
          fxAsOfDate: pricingSnapshot?.fxAsOfDate
            ? isoDayToUtcDate(pricingSnapshot.fxAsOfDate)
            : null,
          fxProvider: pricingSnapshot?.fxProvider ?? null,
          quotedBreakdown: pricingSnapshot?.quotedBreakdown ?? undefined,
        },
        select: {
          id: true,
          propertyId: true,
          checkIn: true,
          checkOut: true,
          expiresAt: true,
          status: true,
          quotedTotalAed: true,
          quotedTotalDisplay: true,
          displayCurrency: true,
          fxRate: true,
          fxAsOfDate: true,
          fxProvider: true,
          quotedBreakdown: true,
        },
      });

      return {
        ...hold,
        checkIn: utcDateToIsoDay(hold.checkIn),
        checkOut: utcDateToIsoDay(hold.checkOut),
        expiresAt: hold.expiresAt.toISOString(),
        fxRate: Number(hold.fxRate),
        fxAsOfDate: hold.fxAsOfDate ? utcDateToIsoDay(hold.fxAsOfDate) : null,
      };
    });
  }

  // -----------------------------
  // Quote (read-only source of truth)
  // -----------------------------

  async quote(propertyId: string, dto: QuoteDto, context?: QuoteContext) {
    const checkIn = normalizeCheckIn(dto.checkIn);
    const checkOut = normalizeCheckOut(dto.checkOut);
    assertValidRange(checkIn, checkOut);

    const displayCurrency = this.resolveDisplayCurrency(dto.currency, context);
    const fx = await this.fxRates.resolveRate(displayCurrency);

    const nightsCount = calculateNights(checkIn, checkOut);
    if (nightsCount <= 0) throw new BadRequestException('Invalid date range.');

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        basePrice: true,
        cleaningFee: true,
        currency: true,
        maxGuests: true,
        status: true,
        starRating: true,
      },
    });

    if (!property) throw new BadRequestException('Property not found.');

    // SECURITY: Only PUBLISHED properties can be quoted or booked.
    // Prevents pricing data disclosure and holds on draft/pending/suspended listings.
    if (property.status !== PropertyStatus.PUBLISHED) {
      throw new ForbiddenException('Property is not available for booking.');
    }

    const guests = dto.guests ?? null;
    const reasons: string[] = [];

    if (guests != null && guests > property.maxGuests) {
      reasons.push(`Max guests exceeded (max ${property.maxGuests}).`);
    }

    const settings = await this.getOrCreateSettings(propertyId);
    const minNightsRequired = settings.defaultMinNights;

    if (nightsCount < minNightsRequired) {
      reasons.push(`Minimum stay is ${minNightsRequired} nights.`);
    }

    // Validate blocked days
    const nights = enumerateNights(checkIn, checkOut);
    const blocked = await this.prisma.propertyCalendarDay.findFirst({
      where: {
        propertyId,
        status: CalendarDayStatus.BLOCKED,
        date: { in: nights },
      },
      select: { date: true },
    });
    if (blocked) reasons.push(`Blocked on ${utcDateToIsoDay(blocked.date)}.`);

    // Validate holds overlap
    const overlapHold = await this.prisma.propertyHold.findFirst({
      where: {
        propertyId,
        status: HoldStatus.ACTIVE,
        expiresAt: { gt: new Date() },
        AND: buildOverlapFilter('checkIn', 'checkOut', checkIn, checkOut),
      },
      select: { id: true },
    });
    if (overlapHold)
      reasons.push('Temporarily unavailable (another checkout in progress).');

    // Validate existing bookings overlap (real production safety)
    const overlapBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId,
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
        },
        AND: buildOverlapFilter('checkIn', 'checkOut', checkIn, checkOut),
      },
      select: { id: true },
    });
    if (overlapBooking) reasons.push('Dates unavailable (already booked).');

    const canBook = reasons.length === 0;

    // Apply pricing rules per night (single source of truth via PricingService)
    const { nightlyBreakdown, subtotal: nightlySubtotalAed } =
      await this.pricing.calculateTotal(propertyId, checkIn, checkOut);

    const avgNightlyPriceAed =
      nightsCount > 0
        ? Math.round(nightlySubtotalAed / nightsCount)
        : property.basePrice;

    // ── Dubai Tax Calculation ─────────────────────────────────────────────────
    const cleaningFeeAed = property.cleaningFee ?? 0;
    const dubaiBreakdown = this.dubaiTax.calculate({
      baseTotalAed: nightlySubtotalAed,
      nights: nightsCount,
      cleaningFeeAed,
      starRating: property.starRating,
    });

    // Legacy single-field aliases (backward compatible with older consumers)
    const serviceFeeAed = dubaiBreakdown.serviceCharge;
    const taxesAed =
      dubaiBreakdown.municipalityFee +
      dubaiBreakdown.tourismFee +
      dubaiBreakdown.vat +
      dubaiBreakdown.tourismDirham;
    const totalAed = dubaiBreakdown.total;

    // Display-currency equivalents (apply FX rate)
    const r = fx.rate;
    const nightlySubtotal = this.toDisplayAmount(nightlySubtotalAed, r);
    const cleaningFee = this.toDisplayAmount(cleaningFeeAed, r);
    const serviceFee = this.toDisplayAmount(dubaiBreakdown.serviceCharge, r);
    const municipalityFee = this.toDisplayAmount(dubaiBreakdown.municipalityFee, r);
    const tourismFee = this.toDisplayAmount(dubaiBreakdown.tourismFee, r);
    const vat = this.toDisplayAmount(dubaiBreakdown.vat, r);
    const tourismDirham = this.toDisplayAmount(dubaiBreakdown.tourismDirham, r);
    const taxes = this.toDisplayAmount(taxesAed, r);
    const total = this.toDisplayAmount(totalAed, r);
    const basePricePerNight = this.toDisplayAmount(avgNightlyPriceAed, r);

    return {
      ok: true,
      canBook,
      reasons,
      propertyId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      nights: nightsCount,
      minNightsRequired,
      currency: displayCurrency,
      fxRate: fx.rate,
      fxAsOf: fx.asOfDate,
      fxProvider: fx.provider,
      breakdown: {
        nights: nightsCount,
        basePricePerNight,
        nightlySubtotal,
        baseAmount: nightlySubtotal,
        cleaningFee,
        // Granular Dubai fees (display currency)
        serviceCharge: serviceFee,
        municipalityFee,
        tourismFee,
        vat,
        tourismDirham,
        // Legacy aliases — sum of all government fees
        serviceFee,
        taxes,
        total,
        // AED canonical amounts
        basePricePerNightAed: avgNightlyPriceAed,
        nightlySubtotalAed,
        baseAmountAed: nightlySubtotalAed,
        cleaningFeeAed,
        serviceChargeAed: dubaiBreakdown.serviceCharge,
        municipalityFeeAed: dubaiBreakdown.municipalityFee,
        tourismFeeAed: dubaiBreakdown.tourismFee,
        vatAed: dubaiBreakdown.vat,
        tourismDirhamAed: dubaiBreakdown.tourismDirham,
        serviceFeeAed,
        taxesAed,
        totalAed,
        nightlyBreakdown,
      },
    };
  }

  async reserve(
    user: unknown,
    propertyId: string,
    dto: {
      checkIn: string;
      checkOut: string;
      guests?: number | null;
      ttlMinutes?: number | null;
      currency?: string;
    },
    context?: QuoteContext,
  ) {
    // 1) Quote first (source of truth)
    const quote = await this.quote(
      propertyId,
      {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        guests: dto.guests ?? null,
        currency: dto.currency,
      },
      context,
    );

    if (!quote.canBook) {
      return {
        ok: true,
        canReserve: false,
        reasons: quote.reasons,
        quote,
      };
    }

    // 2) Create hold (this enforces advisory lock + overlap checks again)
    const breakdown = quote.breakdown as {
      total: number;
      totalAed?: number;
      baseAmountAed?: number;
      cleaningFeeAed?: number;
      serviceChargeAed?: number;
      municipalityFeeAed?: number;
      tourismFeeAed?: number;
      vatAed?: number;
      tourismDirhamAed?: number;
    };
    const fxRate = typeof quote.fxRate === 'number' ? quote.fxRate : 1;
    const fxAsOfDate = typeof quote.fxAsOf === 'string' ? quote.fxAsOf : null;
    const fxProvider =
      typeof quote.fxProvider === 'string' ? quote.fxProvider : null;

    // Build AED breakdown snapshot to persist on the hold (and later the booking)
    const quotedBreakdown: Record<string, number> = {
      baseTotal: breakdown.baseAmountAed ?? 0,
      cleaningFee: breakdown.cleaningFeeAed ?? 0,
      serviceCharge: breakdown.serviceChargeAed ?? 0,
      municipalityFee: breakdown.municipalityFeeAed ?? 0,
      tourismFee: breakdown.tourismFeeAed ?? 0,
      vat: breakdown.vatAed ?? 0,
      tourismDirham: breakdown.tourismDirhamAed ?? 0,
      total: typeof breakdown.totalAed === 'number'
        ? breakdown.totalAed
        : Math.round(breakdown.total / fxRate),
    };

    const hold = await this.createHold(
      user,
      propertyId,
      {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        ttlMinutes: dto.ttlMinutes ?? 15,
      },
      {
        quotedTotalAed: quotedBreakdown.total,
        quotedTotalDisplay: breakdown.total,
        displayCurrency: this.resolveDisplayCurrency(dto.currency, context),
        fxRate,
        fxAsOfDate,
        fxProvider,
        quotedBreakdown,
      },
    );

    return {
      ok: true,
      canReserve: true,
      hold,
      quote,
    };
  }
}
