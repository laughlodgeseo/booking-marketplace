import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import {
  BlockRequestStatus,
  BookingStatus,
  CalendarDayStatus,
  HoldStatus,
  NotificationType,
  OpsTaskStatus,
  PaymentStatus,
  PropertyStatus,
  UserRole,
} from '@prisma/client';
import type {
  ChartResponse,
  Paginated,
  PortalCalendarEvent,
  PortalCalendarProperty,
  PortalCalendarResponse,
  TimeBucket,
} from '../common/portal.types';
import { formatLabel } from '../common/portal.utils';
import type { VendorPropertyListItemDto } from './dto/vendor-property-list-item.dto';
import { NotificationsService } from '../../modules/notifications/notifications.service';

type VendorOverview = {
  kpis: {
    propertiesPublished: number;
    propertiesUnderReview: number;
    bookingsUpcoming: number;
    bookingsTotal: number;
    revenueCaptured: number;
    opsTasksOpen: number;
  };
  recentBookings: Array<{
    id: string;
    propertyId: string;
    propertyTitle: string;
    checkIn: string;
    checkOut: string;
    status: BookingStatus;
    totalAmount: number;
    currency: string;
    createdAt: string;
  }>;
  openOpsTasks: Array<{
    id: string;
    type: string;
    status: OpsTaskStatus;
    scheduledFor: string;
    propertyId: string;
    propertyTitle: string;
    createdAt: string;
  }>;
};

@Injectable()
export class VendorPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private assertVendor(role: UserRole) {
    if (role !== UserRole.VENDOR) throw new ForbiddenException('Not allowed.');
  }

  private parseIsoDay(value: string, fieldName: string): Date {
    const raw = (value ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new BadRequestException(`${fieldName} must be YYYY-MM-DD.`);
    }
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`${fieldName} is invalid.`);
    }
    return parsed;
  }

  private toIsoDay(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private async getVendorPropertyIds(vendorUserId: string): Promise<string[]> {
    // ✅ schema-correct: Property.vendorId references User.id
    const props = await this.prisma.property.findMany({
      where: { vendorId: vendorUserId },
      select: { id: true },
    });
    return props.map((p) => p.id);
  }

  async getOverview(params: {
    userId: string;
    role: UserRole;
  }): Promise<VendorOverview> {
    this.assertVendor(params.role);

    const propertyIds = await this.getVendorPropertyIds(params.userId);
    const now = new Date();

    const [
      propertiesPublished,
      propertiesUnderReview,
      bookingsUpcoming,
      bookingsTotal,
      paymentsCapturedAgg,
      opsTasksOpen,
      recentBookings,
      openOpsTasks,
    ] = await Promise.all([
      this.prisma.property.count({
        where: { id: { in: propertyIds }, status: PropertyStatus.PUBLISHED },
      }),
      this.prisma.property.count({
        where: { id: { in: propertyIds }, status: PropertyStatus.UNDER_REVIEW },
      }),
      this.prisma.booking.count({
        where: {
          propertyId: { in: propertyIds },
          status: BookingStatus.CONFIRMED,
          checkIn: { gt: now },
        },
      }),
      this.prisma.booking.count({ where: { propertyId: { in: propertyIds } } }),
      this.prisma.payment.aggregate({
        where: {
          booking: { propertyId: { in: propertyIds } },
          status: PaymentStatus.CAPTURED,
        },
        _sum: { amount: true },
      }),
      this.prisma.opsTask.count({
        where: {
          propertyId: { in: propertyIds },
          status: {
            in: [
              OpsTaskStatus.PENDING,
              OpsTaskStatus.ASSIGNED,
              OpsTaskStatus.IN_PROGRESS,
            ],
          },
        },
      }),
      this.prisma.booking.findMany({
        where: { propertyId: { in: propertyIds } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          propertyId: true,
          checkIn: true,
          checkOut: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          property: { select: { title: true } },
        },
      }),
      this.prisma.opsTask.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: {
            in: [
              OpsTaskStatus.PENDING,
              OpsTaskStatus.ASSIGNED,
              OpsTaskStatus.IN_PROGRESS,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          type: true,
          status: true,
          scheduledFor: true,
          propertyId: true,
          createdAt: true,
          property: { select: { title: true } },
        },
      }),
    ]);

    const revenueCaptured = Number(paymentsCapturedAgg._sum.amount ?? 0);

    return {
      kpis: {
        propertiesPublished,
        propertiesUnderReview,
        bookingsUpcoming,
        bookingsTotal,
        revenueCaptured,
        opsTasksOpen,
      },
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        propertyId: b.propertyId,
        propertyTitle: b.property.title,
        checkIn: b.checkIn.toISOString(),
        checkOut: b.checkOut.toISOString(),
        status: b.status,
        totalAmount: b.totalAmount,
        currency: b.currency,
        createdAt: b.createdAt.toISOString(),
      })),
      openOpsTasks: openOpsTasks.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        scheduledFor: t.scheduledFor.toISOString(),
        propertyId: t.propertyId,
        propertyTitle: t.property.title,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async getBookings(params: {
    userId: string;
    role: UserRole;
    status?: BookingStatus;
    page: number;
    pageSize: number;
  }): Promise<
    Paginated<{
      id: string;
      status: BookingStatus;
      checkIn: string;
      checkOut: string;
      totalAmount: number;
      currency: string;
      propertyTitle: string;
      createdAt: string;
    }>
  > {
    this.assertVendor(params.role);

    const propertyIds = await this.getVendorPropertyIds(params.userId);

    const where = {
      propertyId: { in: propertyIds },
      ...(params.status ? { status: params.status } : {}),
    } as const;

    const [total, rows] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          status: true,
          checkIn: true,
          checkOut: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          property: { select: { title: true } },
        },
      }),
    ]);

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((b) => ({
        id: b.id,
        status: b.status,
        checkIn: b.checkIn.toISOString(),
        checkOut: b.checkOut.toISOString(),
        totalAmount: b.totalAmount,
        currency: b.currency,
        propertyTitle: b.property.title,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  }

  async getOpsTasks(params: {
    userId: string;
    role: UserRole;
    status?: OpsTaskStatus;
    page: number;
    pageSize: number;
  }): Promise<
    Paginated<{
      id: string;
      type: string;
      status: OpsTaskStatus;
      scheduledFor: string;
      propertyId: string;
      propertyTitle: string;
      bookingId: string | null;
      createdAt: string;
    }>
  > {
    this.assertVendor(params.role);

    const propertyIds = await this.getVendorPropertyIds(params.userId);

    const where = {
      propertyId: { in: propertyIds },
      ...(params.status ? { status: params.status } : {}),
    } as const;

    const [total, rows] = await Promise.all([
      this.prisma.opsTask.count({ where }),
      this.prisma.opsTask.findMany({
        where,
        orderBy: { scheduledFor: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          type: true,
          status: true,
          scheduledFor: true,
          propertyId: true,
          bookingId: true,
          createdAt: true,
          property: { select: { title: true } },
        },
      }),
    ]);

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        scheduledFor: t.scheduledFor.toISOString(),
        propertyId: t.propertyId,
        propertyTitle: t.property.title,
        bookingId: t.bookingId,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async getProperties(params: {
    userId: string;
    role: UserRole;
    page: number;
    pageSize: number;
  }): Promise<Paginated<VendorPropertyListItemDto>> {
    this.assertVendor(params.role);

    const where = { vendorId: params.userId } as const;

    const [total, rows] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          city: true,
          area: true,
          status: true,
          activationFee: true,
          activationFeeCurrency: true,
          activationPaymentStatus: true,
          basePrice: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { bookings: true } },
        },
      }),
    ]);

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        city: p.city ?? null,
        area: p.area ?? null,
        status: p.status,
        activationFee: p.activationFee,
        activationFeeCurrency: p.activationFeeCurrency,
        activationPaymentStatus: p.activationPaymentStatus,
        priceFrom: p.basePrice,
        bookingsCount: p._count.bookings,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  async getAnalytics(params: {
    userId: string;
    role: UserRole;
    from: Date;
    to: Date;
    bucket: TimeBucket;
  }): Promise<ChartResponse> {
    this.assertVendor(params.role);

    const propertyIds = await this.getVendorPropertyIds(params.userId);

    // SECURITY: bucketExpr is hardcoded ('day'|'week'|'month'), never from user input.
    // All raw queries below use Prisma tagged templates — params are parameterized.
    // propertyIds are fetched from DB (vendor's own properties), not from request.
    // Raw SQL required for date_trunc aggregation which Prisma ORM cannot express.
    const bucketExpr =
      params.bucket === 'day'
        ? 'day'
        : params.bucket === 'week'
          ? 'week'
          : 'month';

    const [
      payments,
      confirmedBookings,
      allBookings,
      upcomingStays,
      opsTasks,
      occupancyNights,
      bookingStatusRows,
      opsStatusRows,
    ] = await Promise.all([
      this.prisma.$queryRaw<Array<{ bucket: Date; amount: number }>>`
        SELECT date_trunc(${bucketExpr}, p."createdAt") AS bucket,
               COALESCE(SUM(p.amount), 0)::int AS amount
        FROM "Payment" p
        JOIN "Booking" b ON b.id = p."bookingId"
        WHERE p.status = 'CAPTURED'
          AND b."propertyId" = ANY(${propertyIds})
          AND p."createdAt" >= ${params.from}
          AND p."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, b."createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b."propertyId" = ANY(${propertyIds})
          AND b.status = 'CONFIRMED'
          AND b."createdAt" >= ${params.from}
          AND b."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, b."createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b."propertyId" = ANY(${propertyIds})
          AND b."createdAt" >= ${params.from}
          AND b."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, b."checkIn") AS bucket,
               COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b."propertyId" = ANY(${propertyIds})
          AND b.status = 'CONFIRMED'
          AND b."checkIn" >= ${params.from}
          AND b."checkIn" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, o."createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "OpsTask" o
        WHERE o."propertyId" = ANY(${propertyIds})
          AND o."createdAt" >= ${params.from}
          AND o."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; nights: number }>>`
        SELECT date_trunc(${bucketExpr}, b."checkIn") AS bucket,
               COALESCE(SUM(EXTRACT(EPOCH FROM (b."checkOut" - b."checkIn")) / 86400), 0)::int AS nights
        FROM "Booking" b
        WHERE b."propertyId" = ANY(${propertyIds})
          AND b.status = 'CONFIRMED'
          AND b."checkIn" >= ${params.from}
          AND b."checkIn" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { propertyId: { in: propertyIds } },
        _count: { _all: true },
      }),
      this.prisma.opsTask.groupBy({
        by: ['status'],
        where: { propertyId: { in: propertyIds } },
        _count: { _all: true },
      }),
    ]);

    const labelsMap = new Map<string, Date>();
    for (const r of payments)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of allBookings)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of confirmedBookings)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of upcomingStays)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of opsTasks)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of occupancyNights)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);

    const labels = Array.from(labelsMap.entries())
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([k]) => k);

    const payMap = new Map(
      payments.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.amount),
      ]),
    );
    const allBookingMap = new Map(
      allBookings.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.count),
      ]),
    );
    const confMap = new Map(
      confirmedBookings.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.count),
      ]),
    );
    const upcomingMap = new Map(
      upcomingStays.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.count),
      ]),
    );
    const opsMap = new Map(
      opsTasks.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.count),
      ]),
    );
    const occupancyMap = new Map(
      occupancyNights.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.nights),
      ]),
    );

    const bookingStatus = Object.fromEntries(
      bookingStatusRows.map((row) => [row.status, row._count._all]),
    );
    const opsTaskStatus = Object.fromEntries(
      opsStatusRows.map((row) => [row.status, row._count._all]),
    );

    return {
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      bucket: params.bucket,
      labels,
      kpis: {
        revenueCaptured: labels.reduce(
          (sum, l) => sum + (payMap.get(l) ?? 0),
          0,
        ),
        bookingsTotal: labels.reduce(
          (sum, l) => sum + (allBookingMap.get(l) ?? 0),
          0,
        ),
        bookingsConfirmed: labels.reduce(
          (sum, l) => sum + (confMap.get(l) ?? 0),
          0,
        ),
        upcomingStays: labels.reduce(
          (sum, l) => sum + (upcomingMap.get(l) ?? 0),
          0,
        ),
        opsTasks: labels.reduce((sum, l) => sum + (opsMap.get(l) ?? 0), 0),
        occupancyNights: labels.reduce(
          (sum, l) => sum + (occupancyMap.get(l) ?? 0),
          0,
        ),
      },
      series: [
        {
          key: 'revenueCaptured',
          points: labels.map((l) => payMap.get(l) ?? 0),
        },
        {
          key: 'bookingsTotal',
          points: labels.map((l) => allBookingMap.get(l) ?? 0),
        },
        {
          key: 'bookingsConfirmed',
          points: labels.map((l) => confMap.get(l) ?? 0),
        },
        {
          key: 'upcomingStays',
          points: labels.map((l) => upcomingMap.get(l) ?? 0),
        },
        {
          key: 'opsTasks',
          points: labels.map((l) => opsMap.get(l) ?? 0),
        },
        {
          key: 'occupancyNights',
          points: labels.map((l) => occupancyMap.get(l) ?? 0),
        },
      ],
      charts: {
        revenuePerPeriod: {
          labels,
          series: [
            {
              key: 'revenueCaptured',
              points: labels.map((l) => payMap.get(l) ?? 0),
            },
          ],
        },
        bookingsPerPeriod: {
          labels,
          series: [
            {
              key: 'bookingsTotal',
              points: labels.map((l) => allBookingMap.get(l) ?? 0),
            },
          ],
        },
        opsAndUpcoming: {
          labels,
          series: [
            {
              key: 'upcomingStays',
              points: labels.map((l) => upcomingMap.get(l) ?? 0),
            },
            { key: 'opsTasks', points: labels.map((l) => opsMap.get(l) ?? 0) },
          ],
        },
        occupancyTrend: {
          labels,
          series: [
            {
              key: 'occupancyNights',
              points: labels.map((l) => occupancyMap.get(l) ?? 0),
            },
          ],
        },
      },
      breakdowns: {
        bookingStatus,
        opsTaskStatus,
      },
    };
  }

  /**
   * Vendor Calendar (V1)
   * Returns events that overlap [from, to)
   */
  async getCalendar(params: {
    userId: string;
    role: UserRole;
    from: Date;
    to: Date;
    propertyId?: string;
  }): Promise<PortalCalendarResponse> {
    this.assertVendor(params.role);

    const propertyRows = await this.prisma.property.findMany({
      where: { vendorId: params.userId },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        city: true,
        status: true,
      },
    });

    if (propertyRows.length === 0) {
      return {
        from: params.from.toISOString(),
        to: params.to.toISOString(),
        selectedPropertyId: null,
        properties: [],
        events: [],
      };
    }

    const allPropertyIds = propertyRows.map((p) => p.id);
    if (params.propertyId && !allPropertyIds.includes(params.propertyId)) {
      throw new ForbiddenException('Property is not owned by this vendor.');
    }

    const selectedPropertyId = params.propertyId ?? propertyRows[0]?.id ?? null;
    const propertyIds = selectedPropertyId ? [selectedPropertyId] : [];

    const properties: PortalCalendarProperty[] = propertyRows.map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      status: p.status,
    }));

    // Overlap rule for ranges: start < to AND end > from
    const [bookings, holds, blockedDays] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: { not: BookingStatus.CANCELLED },
          checkIn: { lt: params.to },
          checkOut: { gt: params.from },
        },
        select: {
          id: true,
          propertyId: true,
          checkIn: true,
          checkOut: true,
          status: true,
          totalAmount: true,
          currency: true,
          property: { select: { title: true } },
          customer: { select: { fullName: true, email: true } },
        },
        orderBy: [{ checkIn: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.propertyHold.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: HoldStatus.ACTIVE,
          checkIn: { lt: params.to },
          checkOut: { gt: params.from },
        },
        select: {
          id: true,
          propertyId: true,
          checkIn: true,
          checkOut: true,
          status: true,
          expiresAt: true,
          property: { select: { title: true } },
        },
        orderBy: [{ checkIn: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.propertyCalendarDay.findMany({
        where: {
          propertyId: { in: propertyIds },
          status: CalendarDayStatus.BLOCKED,
          date: { gte: params.from, lt: params.to },
        },
        select: {
          id: true,
          propertyId: true,
          date: true,
          note: true,
          property: { select: { title: true } },
        },
        orderBy: [{ date: 'asc' }],
      }),
    ]);

    const blockedEvents: PortalCalendarEvent[] = blockedDays.map((d) => {
      const start = d.date;
      const end = new Date(d.date.getTime() + 24 * 60 * 60 * 1000);
      return {
        type: 'BLOCKED',
        id: d.id,
        bookingRef: null,
        propertyId: d.propertyId,
        propertyTitle: d.property.title,
        start: start.toISOString(),
        end: end.toISOString(),
        status: 'BLOCKED',
        guestName: null,
        guestDisplay: 'Blocked day',
        currency: null,
        totalAmount: null,
        note: d.note ?? null,
      };
    });

    const bookingEvents: PortalCalendarEvent[] = bookings.map((b) => ({
      type: 'BOOKING',
      id: b.id,
      bookingRef: b.id,
      propertyId: b.propertyId,
      propertyTitle: b.property.title,
      start: b.checkIn.toISOString(),
      end: b.checkOut.toISOString(),
      status: b.status,
      guestName: b.customer.fullName ?? b.customer.email ?? null,
      guestDisplay: b.customer.fullName ?? b.customer.email ?? 'Guest',
      note: null,
      totalAmount: b.totalAmount,
      currency: b.currency,
    }));

    const holdEvents: PortalCalendarEvent[] = holds.map((h) => ({
      type: 'HOLD',
      id: h.id,
      bookingRef: null,
      propertyId: h.propertyId,
      propertyTitle: h.property.title,
      start: h.checkIn.toISOString(),
      end: h.checkOut.toISOString(),
      status: h.status,
      guestName: null,
      guestDisplay: 'Temporary hold',
      currency: null,
      totalAmount: null,
      note: null,
      expiresAt: h.expiresAt.toISOString(),
    }));

    // One merged event list (frontend can color by type)
    const events = [...bookingEvents, ...holdEvents, ...blockedEvents].sort(
      (a, b) => {
        const aStart = new Date(a.start).getTime();
        const bStart = new Date(b.start).getTime();
        if (aStart !== bStart) return aStart - bStart;
        return a.type.localeCompare(b.type);
      },
    );

    return {
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      selectedPropertyId,
      properties,
      events,
    };
  }

  async getVendorReviews(vendorId: string, page: number, pageSize: number) {
    const where = {
      property: { vendorId },
      status: 'APPROVED' as const,
    };

    const [total, rows] = await Promise.all([
      this.prisma.guestReview.count({ where }),
      this.prisma.guestReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          createdAt: true,
          hostResponseText: true,
          hostResponseAt: true,
          property: { select: { id: true, title: true, slug: true } },
          customer: { select: { fullName: true } },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        hostResponseText: r.hostResponseText,
        hostResponseAt: r.hostResponseAt?.toISOString() ?? null,
        property: r.property,
        customer: { fullName: r.customer.fullName },
      })),
    };
  }

  async listBlockRequests(params: {
    userId: string;
    role: UserRole;
    propertyId?: string;
    status?: BlockRequestStatus;
    page: number;
    pageSize: number;
  }) {
    this.assertVendor(params.role);

    if (params.propertyId) {
      const ownedProperty = await this.prisma.property.findFirst({
        where: { id: params.propertyId, vendorId: params.userId },
        select: { id: true },
      });
      if (!ownedProperty) {
        throw new ForbiddenException('Property is not owned by this vendor.');
      }
    }

    const where = {
      vendorId: params.userId,
      ...(params.propertyId ? { propertyId: params.propertyId } : {}),
      ...(params.status ? { status: params.status } : {}),
    } as const;

    const [total, rows] = await Promise.all([
      this.prisma.blockRequest.count({ where }),
      this.prisma.blockRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          propertyId: true,
          startDate: true,
          endDate: true,
          reason: true,
          status: true,
          reviewNotes: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              area: true,
            },
          },
        },
      }),
    ]);

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((row) => ({
        id: row.id,
        propertyId: row.propertyId,
        property: row.property,
        startDate: this.toIsoDay(row.startDate),
        endDate: this.toIsoDay(row.endDate),
        reason: row.reason,
        status: row.status,
        reviewNotes: row.reviewNotes,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async createBlockRequest(params: {
    userId: string;
    role: UserRole;
    propertyId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    this.assertVendor(params.role);

    const property = await this.prisma.property.findFirst({
      where: { id: params.propertyId, vendorId: params.userId },
      select: { id: true, title: true },
    });
    if (!property) {
      throw new ForbiddenException('Property is not owned by this vendor.');
    }

    const startDate = this.parseIsoDay(params.startDate, 'startDate');
    const endDate = this.parseIsoDay(params.endDate, 'endDate');
    if (startDate.getTime() >= endDate.getTime()) {
      throw new BadRequestException('endDate must be after startDate.');
    }

    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId: params.propertyId,
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
        },
        checkIn: { lt: endDate },
        checkOut: { gt: startDate },
      },
      select: { id: true },
    });
    if (overlappingBooking) {
      throw new BadRequestException(
        'Cannot request blocked dates that overlap booked dates.',
      );
    }

    const created = await this.prisma.blockRequest.create({
      data: {
        propertyId: params.propertyId,
        vendorId: params.userId,
        startDate,
        endDate,
        reason: params.reason?.trim() || null,
        status: BlockRequestStatus.PENDING,
      },
      select: {
        id: true,
        propertyId: true,
        vendorId: true,
        startDate: true,
        endDate: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications
          .emit({
            type: NotificationType.MAINTENANCE_REQUEST_CREATED,
            entityType: 'BLOCK_REQUEST',
            entityId: created.id,
            recipientUserId: admin.id,
            payload: {
              title: 'Vendor block request submitted',
              blockRequest: {
                id: created.id,
                propertyId: created.propertyId,
                propertyTitle: property.title,
                startDate: this.toIsoDay(created.startDate),
                endDate: this.toIsoDay(created.endDate),
                reason: created.reason,
              },
            },
          })
          .catch(() => null),
      ),
    );

    return {
      id: created.id,
      propertyId: created.propertyId,
      vendorId: created.vendorId,
      startDate: this.toIsoDay(created.startDate),
      endDate: this.toIsoDay(created.endDate),
      reason: created.reason,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    };
  }
}
