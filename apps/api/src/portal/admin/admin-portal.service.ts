// src/portal/admin/admin-portal.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import {
  BlockRequestStatus,
  BookingStatus,
  CalendarDayStatus,
  CustomerDocumentStatus,
  CustomerDocumentType,
  HoldStatus,
  NotificationType,
  OpsTaskStatus,
  PaymentStatus,
  PropertyStatus,
  RefundStatus,
  UserRole,
  VendorStatus,
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
import { existsSync } from 'fs';
import { join } from 'path';
import {
  BOOKING_DOCUMENTS_DIR,
  CUSTOMER_DOCUMENTS_DIR,
} from '../../common/upload/storage-paths';
import { NotificationsService } from '../../modules/notifications/notifications.service';

type AdminOverview = {
  kpis: {
    usersTotal: number;
    vendorsPending: number;
    propertiesUnderReview: number;
    propertiesPublished: number;

    bookingsPendingPayment: number;
    bookingsConfirmed: number;
    bookingsCancelled: number;

    revenueCaptured: number;
    refundsPending: number;

    opsTasksOpen: number;
  };
};

@Injectable()
export class AdminPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private assertAdmin(role: UserRole) {
    if (role !== UserRole.ADMIN) throw new ForbiddenException('Not allowed.');
  }

  private labelFromEnum(value: string): string {
    return value
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (token) => token.toUpperCase());
  }

  private toIsoDay(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  async getOverview(params: {
    userId: string;
    role: UserRole;
  }): Promise<AdminOverview> {
    this.assertAdmin(params.role);

    const [
      usersTotal,
      vendorsPending,
      propertiesUnderReview,
      propertiesPublished,
      bookingsPendingPayment,
      bookingsConfirmed,
      bookingsCancelled,
      paymentsCapturedAgg,
      refundsPending,
      opsTasksOpen,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.vendorProfile.count({
        where: { status: VendorStatus.PENDING },
      }),
      this.prisma.property.count({
        where: { status: PropertyStatus.UNDER_REVIEW },
      }),
      this.prisma.property.count({
        where: { status: PropertyStatus.PUBLISHED },
      }),
      this.prisma.booking.count({
        where: { status: BookingStatus.PENDING_PAYMENT },
      }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.CAPTURED },
        _sum: { amount: true },
      }),
      this.prisma.refund.count({ where: { status: RefundStatus.PENDING } }),
      this.prisma.opsTask.count({
        where: {
          status: {
            in: [
              OpsTaskStatus.PENDING,
              OpsTaskStatus.ASSIGNED,
              OpsTaskStatus.IN_PROGRESS,
            ],
          },
        },
      }),
    ]);

    const revenueCaptured = Number(paymentsCapturedAgg._sum.amount ?? 0);

    return {
      kpis: {
        usersTotal,
        vendorsPending,
        propertiesUnderReview,
        propertiesPublished,
        bookingsPendingPayment,
        bookingsConfirmed,
        bookingsCancelled,
        revenueCaptured,
        refundsPending,
        opsTasksOpen,
      },
    };
  }

  async getAnalytics(params: {
    userId: string;
    role: UserRole;
    from: Date;
    to: Date;
    bucket: TimeBucket;
  }): Promise<ChartResponse> {
    this.assertAdmin(params.role);

    const bucketExpr =
      params.bucket === 'day'
        ? 'day'
        : params.bucket === 'week'
          ? 'week'
          : 'month';

    const [
      revenue,
      bookingsTotal,
      confirmedBookings,
      cancellations,
      paymentCaptures,
      refundsSucceeded,
      bookingStatusRows,
      opsStatusRows,
      paymentStatusRows,
      refundStatusRows,
    ] = await Promise.all([
      this.prisma.$queryRaw<Array<{ bucket: Date; amount: number }>>`
        SELECT date_trunc(${bucketExpr}, p."createdAt") AS bucket,
               COALESCE(SUM(p.amount), 0)::int AS amount
        FROM "Payment" p
        WHERE p.status = 'CAPTURED'
          AND p."createdAt" >= ${params.from}
          AND p."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, b."createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b."createdAt" >= ${params.from}
          AND b."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, b."createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b.status = 'CONFIRMED'
          AND b."createdAt" >= ${params.from}
          AND b."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, b."createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "Booking" b
        WHERE b.status = 'CANCELLED'
          AND b."createdAt" >= ${params.from}
          AND b."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, p."createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "Payment" p
        WHERE p.status = 'CAPTURED'
          AND p."createdAt" >= ${params.from}
          AND p."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.$queryRaw<Array<{ bucket: Date; count: number }>>`
        SELECT date_trunc(${bucketExpr}, r."createdAt") AS bucket,
               COUNT(*)::int AS count
        FROM "Refund" r
        WHERE r.status = 'SUCCEEDED'
          AND r."createdAt" >= ${params.from}
          AND r."createdAt" < ${params.to}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.opsTask.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.refund.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const labelsMap = new Map<string, Date>();
    for (const r of revenue)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of bookingsTotal)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of confirmedBookings)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of cancellations)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of paymentCaptures)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);
    for (const r of refundsSucceeded)
      labelsMap.set(formatLabel(r.bucket, params.bucket), r.bucket);

    const labels = Array.from(labelsMap.entries())
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([k]) => k);

    const revMap = new Map(
      revenue.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.amount),
      ]),
    );
    const bookingsMap = new Map(
      bookingsTotal.map((r) => [
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
    const cancMap = new Map(
      cancellations.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.count),
      ]),
    );
    const captureMap = new Map(
      paymentCaptures.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.count),
      ]),
    );
    const refundMap = new Map(
      refundsSucceeded.map((r) => [
        formatLabel(r.bucket, params.bucket),
        Number(r.count),
      ]),
    );

    const bookingStatus = Object.fromEntries(
      bookingStatusRows.map((row) => [row.status, row._count._all]),
    );
    const opsTaskStatus = Object.fromEntries(
      opsStatusRows.map((row) => [row.status, row._count._all]),
    );
    const paymentStatus = Object.fromEntries(
      paymentStatusRows.map((row) => [row.status, row._count._all]),
    );
    const refundStatus = Object.fromEntries(
      refundStatusRows.map((row) => [row.status, row._count._all]),
    );

    return {
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      bucket: params.bucket,
      labels,
      kpis: {
        bookingsTotal: labels.reduce(
          (sum, l) => sum + (bookingsMap.get(l) ?? 0),
          0,
        ),
        bookingsConfirmed: labels.reduce(
          (sum, l) => sum + (confMap.get(l) ?? 0),
          0,
        ),
        bookingsCancelled: labels.reduce(
          (sum, l) => sum + (cancMap.get(l) ?? 0),
          0,
        ),
        revenueCaptured: labels.reduce(
          (sum, l) => sum + (revMap.get(l) ?? 0),
          0,
        ),
        paymentCaptures: labels.reduce(
          (sum, l) => sum + (captureMap.get(l) ?? 0),
          0,
        ),
        refundsSucceeded: labels.reduce(
          (sum, l) => sum + (refundMap.get(l) ?? 0),
          0,
        ),
      },
      series: [
        {
          key: 'bookingsTotal',
          points: labels.map((l) => bookingsMap.get(l) ?? 0),
        },
        {
          key: 'revenueCaptured',
          points: labels.map((l) => revMap.get(l) ?? 0),
        },
        {
          key: 'bookingsConfirmed',
          points: labels.map((l) => confMap.get(l) ?? 0),
        },
        {
          key: 'bookingsCancelled',
          points: labels.map((l) => cancMap.get(l) ?? 0),
        },
        {
          key: 'paymentCaptures',
          points: labels.map((l) => captureMap.get(l) ?? 0),
        },
        {
          key: 'refundsSucceeded',
          points: labels.map((l) => refundMap.get(l) ?? 0),
        },
      ],
      charts: {
        bookingsPerPeriod: {
          labels,
          series: [
            {
              key: 'bookingsTotal',
              points: labels.map((l) => bookingsMap.get(l) ?? 0),
            },
          ],
        },
        revenuePerPeriod: {
          labels,
          series: [
            {
              key: 'revenueCaptured',
              points: labels.map((l) => revMap.get(l) ?? 0),
            },
          ],
        },
        paymentVsRefunds: {
          labels,
          series: [
            {
              key: 'paymentCaptures',
              points: labels.map((l) => captureMap.get(l) ?? 0),
            },
            {
              key: 'refundsSucceeded',
              points: labels.map((l) => refundMap.get(l) ?? 0),
            },
          ],
        },
      },
      breakdowns: {
        bookingStatus,
        opsTaskStatus,
        paymentStatus,
        refundStatus,
      },
    };
  }

  async getCalendar(params: {
    userId: string;
    role: UserRole;
    from: Date;
    to: Date;
    propertyId?: string;
  }): Promise<PortalCalendarResponse> {
    this.assertAdmin(params.role);

    const propertyRows = await this.prisma.property.findMany({
      where: params.propertyId ? { id: params.propertyId } : undefined,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: params.propertyId ? undefined : 200,
      select: {
        id: true,
        title: true,
        city: true,
        status: true,
      },
    });

    if (params.propertyId && propertyRows.length === 0) {
      throw new ForbiddenException('Property not found.');
    }

    if (propertyRows.length === 0) {
      return {
        from: params.from.toISOString(),
        to: params.to.toISOString(),
        selectedPropertyId: null,
        properties: [],
        events: [],
      };
    }

    const selectedPropertyId = params.propertyId ?? propertyRows[0]?.id ?? null;
    const propertyIds = selectedPropertyId ? [selectedPropertyId] : [];

    const properties: PortalCalendarProperty[] = propertyRows.map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      status: p.status,
    }));

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
      currency: b.currency,
      totalAmount: b.totalAmount,
      note: null,
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

    const blockedEvents: PortalCalendarEvent[] = blockedDays.map((d) => {
      const end = new Date(d.date.getTime() + 24 * 60 * 60 * 1000);
      return {
        type: 'BLOCKED',
        id: d.id,
        bookingRef: null,
        propertyId: d.propertyId,
        propertyTitle: d.property.title,
        start: d.date.toISOString(),
        end: end.toISOString(),
        status: 'BLOCKED',
        guestName: null,
        guestDisplay: 'Blocked day',
        currency: null,
        totalAmount: null,
        note: d.note ?? null,
      };
    });

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

  async listVendors(params: {
    userId: string;
    role: UserRole;
    status?: VendorStatus;
    page: number;
    pageSize: number;
  }): Promise<
    Paginated<{
      id: string;
      userId: string;
      email: string;
      displayName: string;
      status: VendorStatus;
      createdAt: string;
    }>
  > {
    this.assertAdmin(params.role);

    const where = params.status ? { status: params.status } : {};

    const [total, rows] = await Promise.all([
      this.prisma.vendorProfile.count({ where }),
      this.prisma.vendorProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          userId: true,
          displayName: true,
          status: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((v) => ({
        id: v.id,
        userId: v.userId,
        email: v.user.email,
        displayName: v.displayName,
        status: v.status,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }

  async getVendorDetail(params: {
    userId: string;
    role: UserRole;
    vendorId: string;
  }) {
    this.assertAdmin(params.role);

    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: params.vendorId },
      select: {
        id: true,
        userId: true,
        displayName: true,
        companyName: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            createdAt: true,
          },
        },
        serviceAgreements: {
          orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
          take: 20,
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            agreedManagementFeeBps: true,
            notes: true,
            approvedAt: true,
            servicePlan: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                managementFeeBps: true,
              },
            },
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found.');
    }

    const [properties, bookingsTotal, opsTasksOpen] = await Promise.all([
      this.prisma.property.findMany({
        where: { vendorId: vendor.userId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 100,
        select: {
          id: true,
          title: true,
          slug: true,
          city: true,
          area: true,
          status: true,
          basePrice: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          media: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            take: 1,
            select: {
              id: true,
              url: true,
              category: true,
            },
          },
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.booking.count({
        where: { property: { vendorId: vendor.userId } },
      }),
      this.prisma.opsTask.count({
        where: {
          property: { vendorId: vendor.userId },
          status: {
            in: [
              OpsTaskStatus.PENDING,
              OpsTaskStatus.ASSIGNED,
              OpsTaskStatus.IN_PROGRESS,
            ],
          },
        },
      }),
    ]);

    return {
      id: vendor.id,
      userId: vendor.userId,
      displayName: vendor.displayName,
      companyName: vendor.companyName,
      phone: vendor.phone,
      status: vendor.status,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
      user: {
        ...vendor.user,
        createdAt: vendor.user.createdAt.toISOString(),
      },
      agreements: vendor.serviceAgreements.map((agreement) => ({
        ...agreement,
        startDate: agreement.startDate.toISOString(),
        endDate: agreement.endDate?.toISOString() ?? null,
        approvedAt: agreement.approvedAt?.toISOString() ?? null,
      })),
      propertyCount: properties.length,
      bookingsTotal,
      opsTasksOpen,
      properties: properties.map((property) => ({
        id: property.id,
        title: property.title,
        slug: property.slug,
        city: property.city,
        area: property.area,
        status: property.status,
        basePrice: property.basePrice,
        currency: property.currency,
        coverUrl: property.media[0]?.url ?? null,
        bookingsCount: property._count.bookings,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt.toISOString(),
      })),
    };
  }

  async listProperties(params: {
    userId: string;
    role: UserRole;
    status?: PropertyStatus;
    page: number;
    pageSize: number;
  }): Promise<
    Paginated<{
      id: string;
      title: string;
      city: string;
      area: string | null;
      status: PropertyStatus;
      vendorEmail: string;
      createdAt: string;
      updatedAt: string; // ✅ FIX
    }>
  > {
    this.assertAdmin(params.role);

    const where = params.status ? { status: params.status } : {};

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
          city: true,
          area: true,
          status: true,
          createdAt: true,
          updatedAt: true, // ✅ FIX
          vendor: { select: { email: true } },
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
        city: p.city,
        area: p.area,
        status: p.status,
        vendorEmail: p.vendor.email,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(), // ✅ FIX
      })),
    };
  }

  async getPropertyDetail(params: {
    userId: string;
    role: UserRole;
    propertyId: string;
  }) {
    this.assertAdmin(params.role);

    const property = await this.prisma.property.findUnique({
      where: { id: params.propertyId },
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
        status: true,
        basePrice: true,
        cleaningFee: true,
        currency: true,
        maxGuests: true,
        bedrooms: true,
        bathrooms: true,
        minNights: true,
        maxNights: true,
        checkInFromMin: true,
        checkInToMax: true,
        checkOutMin: true,
        isInstantBook: true,
        vendorId: true,
        createdByAdminId: true,
        createdAt: true,
        updatedAt: true,
        vendor: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        media: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            url: true,
            alt: true,
            sortOrder: true,
            category: true,
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            originalName: true,
            mimeType: true,
            createdAt: true,
            updatedAt: true,
            uploadedByUser: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
        amenities: {
          orderBy: { amenity: { name: 'asc' } },
          select: {
            amenity: {
              select: {
                id: true,
                key: true,
                name: true,
                group: {
                  select: {
                    id: true,
                    key: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found.');
    }

    const [bookingStats, upcomingBookings] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { propertyId: property.id },
        _count: { _all: true },
      }),
      this.prisma.booking.findMany({
        where: {
          propertyId: property.id,
          status: {
            in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
          },
          checkOut: { gt: new Date() },
        },
        orderBy: { checkIn: 'asc' },
        take: 20,
        select: {
          id: true,
          status: true,
          checkIn: true,
          checkOut: true,
          totalAmount: true,
          currency: true,
          customer: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    const statusBreakdown = Object.fromEntries(
      bookingStats.map((item) => [item.status, item._count._all]),
    );

    return {
      ...property,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
      documents: property.documents.map((doc) => ({
        ...doc,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        downloadUrl: `/api/admin/properties/${property.id}/documents/${doc.id}/download`,
        viewUrl: `/api/admin/properties/${property.id}/documents/${doc.id}/view`,
      })),
      bookingStatusBreakdown: statusBreakdown,
      upcomingBookings: upcomingBookings.map((booking) => ({
        ...booking,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
      })),
    };
  }

  async listBookings(params: {
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
      customerEmail: string;
      createdAt: string;
    }>
  > {
    this.assertAdmin(params.role);

    const where = params.status ? { status: params.status } : {};

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
          customer: { select: { email: true } },
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
        customerEmail: b.customer.email,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  }

  async getBookingDetail(params: {
    userId: string;
    role: UserRole;
    bookingId: string;
  }) {
    this.assertAdmin(params.role);

    const booking = await this.prisma.booking.findUnique({
      where: { id: params.bookingId },
      select: {
        id: true,
        status: true,
        checkIn: true,
        checkOut: true,
        adults: true,
        children: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        cancelledAt: true,
        cancelledBy: true,
        cancellationReason: true,
        customer: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            slug: true,
            city: true,
            area: true,
            address: true,
            vendor: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
            media: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              take: 20,
              select: {
                id: true,
                url: true,
                alt: true,
                sortOrder: true,
                category: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            provider: true,
            amount: true,
            currency: true,
            providerRef: true,
            createdAt: true,
            updatedAt: true,
            events: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                type: true,
                providerRef: true,
                idempotencyKey: true,
                createdAt: true,
              },
            },
          },
        },
        cancellation: {
          select: {
            id: true,
            actor: true,
            reason: true,
            mode: true,
            notes: true,
            policyVersion: true,
            cancelledAt: true,
            totalAmount: true,
            managementFee: true,
            penaltyAmount: true,
            refundableAmount: true,
            currency: true,
            displayCurrency: true,
            displayFxRate: true,
            displayFxAsOfDate: true,
            totalAmountDisplay: true,
            penaltyAmountDisplay: true,
            refundableAmountDisplay: true,
            releasesInventory: true,
            refundId: true,
          },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            reason: true,
            amount: true,
            currency: true,
            provider: true,
            providerRefundRef: true,
            idempotencyKey: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            bookingId: true,
            uploadedByUserId: true,
            type: true,
            originalName: true,
            mimeType: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            uploadedByUser: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
        opsTasks: {
          orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            type: true,
            status: true,
            scheduledFor: true,
            createdAt: true,
            cancelledAt: true,
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');

    const timeline: Array<{
      key: string;
      label: string;
      at: string;
      tone: 'neutral' | 'success' | 'warning' | 'danger';
    }> = [
      {
        key: 'BOOKING_CREATED',
        label: 'Booking created',
        at: booking.createdAt.toISOString(),
        tone: 'neutral',
      },
    ];

    if (booking.expiresAt) {
      timeline.push({
        key: 'PAYMENT_DEADLINE',
        label: 'Payment deadline',
        at: booking.expiresAt.toISOString(),
        tone: 'warning',
      });
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      timeline.push({
        key: 'BOOKING_CONFIRMED',
        label: 'Booking confirmed',
        at: booking.updatedAt.toISOString(),
        tone: 'success',
      });
    }

    if (booking.status === BookingStatus.COMPLETED) {
      timeline.push({
        key: 'BOOKING_COMPLETED',
        label: 'Booking completed',
        at: booking.updatedAt.toISOString(),
        tone: 'success',
      });
    }

    if (booking.status === BookingStatus.CANCELLED) {
      timeline.push({
        key: 'BOOKING_CANCELLED',
        label: 'Booking cancelled',
        at:
          booking.cancelledAt?.toISOString() ?? booking.updatedAt.toISOString(),
        tone: 'danger',
      });
    }

    if (booking.cancellation) {
      timeline.push({
        key: `CANCELLATION_${booking.cancellation.reason}`,
        label: `Cancellation reason: ${this.labelFromEnum(booking.cancellation.reason)}`,
        at: booking.cancellation.cancelledAt.toISOString(),
        tone: 'danger',
      });
    }

    for (const event of booking.payment?.events ?? []) {
      timeline.push({
        key: `PAYMENT_${event.id}`,
        label: `Payment ${this.labelFromEnum(event.type)}`,
        at: event.createdAt.toISOString(),
        tone:
          event.type === 'CAPTURE'
            ? 'success'
            : event.type === 'REFUND'
              ? 'danger'
              : 'neutral',
      });
    }

    for (const refund of booking.refunds) {
      timeline.push({
        key: `REFUND_${refund.id}`,
        label: `Refund ${this.labelFromEnum(refund.status)}`,
        at: refund.createdAt.toISOString(),
        tone:
          refund.status === RefundStatus.SUCCEEDED
            ? 'success'
            : refund.status === RefundStatus.FAILED ||
                refund.status === RefundStatus.CANCELLED
              ? 'danger'
              : 'warning',
      });
    }

    timeline.sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );

    const canForceCancel =
      booking.status === BookingStatus.PENDING_PAYMENT ||
      booking.status === BookingStatus.CONFIRMED;

    return {
      id: booking.id,
      status: booking.status,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      adults: booking.adults,
      children: booking.children,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      expiresAt: booking.expiresAt?.toISOString() ?? null,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      cancelledBy: booking.cancelledBy,
      cancellationReason: booking.cancellationReason,
      canForceCancel,
      timeline,
      customer: booking.customer,
      property: {
        ...booking.property,
        coverUrl: booking.property.media[0]?.url ?? null,
      },
      payment: booking.payment
        ? {
            ...booking.payment,
            createdAt: booking.payment.createdAt.toISOString(),
            updatedAt: booking.payment.updatedAt.toISOString(),
            events: booking.payment.events.map((event) => ({
              ...event,
              label: this.labelFromEnum(event.type),
              createdAt: event.createdAt.toISOString(),
            })),
          }
        : null,
      cancellation: booking.cancellation
        ? {
            ...booking.cancellation,
            cancelledAt: booking.cancellation.cancelledAt.toISOString(),
            displayFxRate: Number(booking.cancellation.displayFxRate),
            displayFxAsOfDate: booking.cancellation.displayFxAsOfDate
              ? booking.cancellation.displayFxAsOfDate.toISOString()
              : null,
          }
        : null,
      refunds: booking.refunds.map((refund) => ({
        ...refund,
        createdAt: refund.createdAt.toISOString(),
        updatedAt: refund.updatedAt.toISOString(),
      })),
      documents: {
        count: booking.documents.length,
        items: booking.documents.map((doc) => ({
          ...doc,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
          downloadUrl: `/api/portal/admin/bookings/${booking.id}/documents/${doc.id}/download`,
        })),
      },
      opsTasks: booking.opsTasks.map((task) => ({
        ...task,
        scheduledFor: task.scheduledFor.toISOString(),
        createdAt: task.createdAt.toISOString(),
        cancelledAt: task.cancelledAt?.toISOString() ?? null,
      })),
    };
  }

  async listBookingDocuments(params: {
    userId: string;
    role: UserRole;
    bookingId: string;
  }) {
    this.assertAdmin(params.role);

    const booking = await this.prisma.booking.findUnique({
      where: { id: params.bookingId },
      select: { id: true, property: { select: { title: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found.');

    const items = await this.prisma.bookingDocument.findMany({
      where: { bookingId: params.bookingId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedByUser: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });

    return {
      booking: {
        id: booking.id,
        propertyTitle: booking.property.title,
      },
      items: items.map((doc) => ({
        ...doc,
        downloadUrl: `/api/portal/admin/bookings/${params.bookingId}/documents/${doc.id}/download`,
      })),
    };
  }

  async getBookingDocumentDownload(params: {
    userId: string;
    role: UserRole;
    bookingId: string;
    documentId: string;
  }) {
    this.assertAdmin(params.role);

    const doc = await this.prisma.bookingDocument.findUnique({
      where: { id: params.documentId },
      select: {
        id: true,
        bookingId: true,
        storageKey: true,
        originalName: true,
        mimeType: true,
      },
    });

    if (!doc || doc.bookingId !== params.bookingId) {
      throw new NotFoundException('Document not found.');
    }

    const absolutePath = join(BOOKING_DOCUMENTS_DIR, doc.storageKey);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Document file not found on disk.');
    }

    return {
      absolutePath,
      mimeType: doc.mimeType ?? 'application/octet-stream',
      downloadName: doc.originalName ?? doc.storageKey,
    };
  }

  async listCustomerDocuments(params: {
    userId: string;
    role: UserRole;
    status?: CustomerDocumentStatus;
    type?: string;
    customerId?: string;
    page: number;
    pageSize: number;
  }) {
    this.assertAdmin(params.role);

    const normalizedType = params.type?.trim()
      ? (params.type.trim() as CustomerDocumentType)
      : undefined;
    if (
      normalizedType &&
      !Object.values(CustomerDocumentType).includes(normalizedType)
    ) {
      throw new BadRequestException('Invalid customer document type filter.');
    }

    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(normalizedType ? { type: normalizedType } : {}),
      ...(params.customerId ? { userId: params.customerId } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customerDocument.count({ where }),
      this.prisma.customerDocument.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          userId: true,
          type: true,
          status: true,
          fileKey: true,
          originalName: true,
          mimeType: true,
          notes: true,
          reviewNotes: true,
          reviewedAt: true,
          verifiedAt: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              createdAt: true,
            },
          },
          reviewedByAdmin: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    const userIds = Array.from(new Set(rows.map((row) => row.userId)));
    const requiredTypes: CustomerDocumentType[] = [
      CustomerDocumentType.PASSPORT,
      CustomerDocumentType.EMIRATES_ID,
    ];
    const now = new Date();

    const [verifiedRequiredRows, upcomingBookings] = userIds.length
      ? await Promise.all([
          this.prisma.customerDocument.findMany({
            where: {
              userId: { in: userIds },
              type: { in: requiredTypes },
              status: CustomerDocumentStatus.VERIFIED,
            },
            select: {
              userId: true,
              type: true,
            },
          }),
          this.prisma.booking.findMany({
            where: {
              customerId: { in: userIds },
              status: BookingStatus.CONFIRMED,
              checkOut: { gt: now },
            },
            orderBy: { checkIn: 'asc' },
            select: {
              id: true,
              customerId: true,
              checkIn: true,
              checkOut: true,
              property: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          }),
        ])
      : [[], []];

    const verifiedByUser = new Map<string, Set<CustomerDocumentType>>();
    for (const row of verifiedRequiredRows) {
      const set =
        verifiedByUser.get(row.userId) ?? new Set<CustomerDocumentType>();
      set.add(row.type);
      verifiedByUser.set(row.userId, set);
    }

    const nextBookingByUser = new Map<
      string,
      {
        id: string;
        checkIn: Date;
        checkOut: Date;
        property: {
          id: string;
          title: string;
          slug: string;
        };
      }
    >();
    for (const booking of upcomingBookings) {
      if (!nextBookingByUser.has(booking.customerId)) {
        nextBookingByUser.set(booking.customerId, booking);
      }
    }

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((row) => {
        const verifiedTypes = verifiedByUser.get(row.userId) ?? new Set();
        const missingTypes = requiredTypes.filter(
          (type) => !verifiedTypes.has(type),
        );
        const nextBooking = nextBookingByUser.get(row.userId) ?? null;
        const requiresUpload = Boolean(nextBooking) && missingTypes.length > 0;
        const hoursToCheckIn = nextBooking
          ? (nextBooking.checkIn.getTime() - now.getTime()) / (60 * 60 * 1000)
          : null;
        const urgent =
          requiresUpload && hoursToCheckIn !== null && hoursToCheckIn <= 48;

        return {
          ...row,
          reviewedAt: row.reviewedAt?.toISOString() ?? null,
          verifiedAt: row.verifiedAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          downloadUrl: `/api/portal/admin/customer-documents/${row.id}/download`,
          viewUrl: `/api/portal/admin/customer-documents/${row.id}/view`,
          requirement: {
            requiredTypes,
            missingTypes,
            requiresUpload,
            urgent,
            nextBooking: nextBooking
              ? {
                  id: nextBooking.id,
                  checkIn: nextBooking.checkIn.toISOString(),
                  checkOut: nextBooking.checkOut.toISOString(),
                  property: nextBooking.property,
                }
              : null,
          },
        };
      }),
    };
  }

  async getCustomerDocumentDetail(params: {
    userId: string;
    role: UserRole;
    documentId: string;
  }) {
    this.assertAdmin(params.role);

    const row = await this.prisma.customerDocument.findUnique({
      where: { id: params.documentId },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        fileKey: true,
        originalName: true,
        mimeType: true,
        notes: true,
        reviewNotes: true,
        reviewedAt: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            createdAt: true,
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!row) throw new NotFoundException('Customer document not found.');

    const requiredTypes: CustomerDocumentType[] = [
      CustomerDocumentType.PASSPORT,
      CustomerDocumentType.EMIRATES_ID,
    ];
    const now = new Date();

    const [verifiedRequiredRows, nextBooking] = await Promise.all([
      this.prisma.customerDocument.findMany({
        where: {
          userId: row.userId,
          type: { in: requiredTypes },
          status: CustomerDocumentStatus.VERIFIED,
        },
        select: {
          type: true,
        },
      }),
      this.prisma.booking.findFirst({
        where: {
          customerId: row.userId,
          status: BookingStatus.CONFIRMED,
          checkOut: { gt: now },
        },
        orderBy: { checkIn: 'asc' },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          property: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    const verifiedTypes = new Set(
      verifiedRequiredRows.map((item) => item.type),
    );
    const missingTypes = requiredTypes.filter(
      (type) => !verifiedTypes.has(type),
    );
    const requiresUpload = Boolean(nextBooking) && missingTypes.length > 0;
    const hoursToCheckIn = nextBooking
      ? (nextBooking.checkIn.getTime() - now.getTime()) / (60 * 60 * 1000)
      : null;
    const urgent =
      requiresUpload && hoursToCheckIn !== null && hoursToCheckIn <= 48;

    return {
      ...row,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      downloadUrl: `/api/portal/admin/customer-documents/${row.id}/download`,
      viewUrl: `/api/portal/admin/customer-documents/${row.id}/view`,
      requirement: {
        requiredTypes,
        missingTypes,
        requiresUpload,
        urgent,
        nextBooking: nextBooking
          ? {
              id: nextBooking.id,
              checkIn: nextBooking.checkIn.toISOString(),
              checkOut: nextBooking.checkOut.toISOString(),
              property: nextBooking.property,
            }
          : null,
      },
    };
  }

  async getCustomerDocumentDownload(params: {
    userId: string;
    role: UserRole;
    documentId: string;
  }) {
    this.assertAdmin(params.role);

    const doc = await this.prisma.customerDocument.findUnique({
      where: { id: params.documentId },
      select: {
        id: true,
        fileKey: true,
        originalName: true,
        mimeType: true,
      },
    });

    if (!doc) throw new NotFoundException('Customer document not found.');

    const absolutePath = join(CUSTOMER_DOCUMENTS_DIR, doc.fileKey);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Document file not found on disk.');
    }

    return {
      absolutePath,
      mimeType: doc.mimeType ?? 'application/octet-stream',
      downloadName: doc.originalName ?? doc.fileKey,
    };
  }

  async approveCustomerDocument(params: {
    userId: string;
    role: UserRole;
    documentId: string;
    notes?: string;
  }) {
    this.assertAdmin(params.role);

    const existing = await this.prisma.customerDocument.findUnique({
      where: { id: params.documentId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Customer document not found.');

    const now = new Date();
    const updated = await this.prisma.customerDocument.update({
      where: { id: params.documentId },
      data: {
        status: CustomerDocumentStatus.VERIFIED,
        reviewedByAdminId: params.userId,
        reviewedAt: now,
        reviewNotes: params.notes?.trim() || null,
        verifiedAt: now,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        notes: true,
        reviewNotes: true,
        reviewedAt: true,
        verifiedAt: true,
        updatedAt: true,
        reviewedByAdmin: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });

    return {
      ...updated,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      verifiedAt: updated.verifiedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async rejectCustomerDocument(params: {
    userId: string;
    role: UserRole;
    documentId: string;
    notes?: string;
  }) {
    this.assertAdmin(params.role);

    const existing = await this.prisma.customerDocument.findUnique({
      where: { id: params.documentId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Customer document not found.');

    const updated = await this.prisma.customerDocument.update({
      where: { id: params.documentId },
      data: {
        status: CustomerDocumentStatus.REJECTED,
        reviewedByAdminId: params.userId,
        reviewedAt: new Date(),
        reviewNotes: params.notes?.trim() || null,
        verifiedAt: null,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        notes: true,
        reviewNotes: true,
        reviewedAt: true,
        verifiedAt: true,
        updatedAt: true,
        reviewedByAdmin: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });

    return {
      ...updated,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      verifiedAt: updated.verifiedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async listPayments(params: {
    userId: string;
    role: UserRole;
    status?: PaymentStatus;
    page: number;
    pageSize: number;
  }): Promise<
    Paginated<{
      id: string;
      provider: string;
      status: PaymentStatus;
      amount: number;
      currency: string;
      bookingId: string;
      createdAt: string;
    }>
  > {
    this.assertAdmin(params.role);

    const where = params.status ? { status: params.status } : {};

    const [total, rows] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
          currency: true,
          bookingId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((p) => ({
        id: p.id,
        provider: p.provider,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        bookingId: p.bookingId,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }

  async getPaymentDetail(params: {
    userId: string;
    role: UserRole;
    paymentId: string;
  }) {
    this.assertAdmin(params.role);

    const payment = await this.prisma.payment.findUnique({
      where: { id: params.paymentId },
      select: {
        id: true,
        bookingId: true,
        provider: true,
        status: true,
        amount: true,
        currency: true,
        providerRef: true,
        createdAt: true,
        updatedAt: true,
        booking: {
          select: {
            id: true,
            status: true,
            checkIn: true,
            checkOut: true,
            totalAmount: true,
            currency: true,
            property: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            customer: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            providerRef: true,
            idempotencyKey: true,
            payloadJson: true,
            createdAt: true,
          },
        },
        refunds: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            reason: true,
            amount: true,
            currency: true,
            provider: true,
            providerRefundRef: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return {
      ...payment,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      booking: {
        ...payment.booking,
        checkIn: payment.booking.checkIn.toISOString(),
        checkOut: payment.booking.checkOut.toISOString(),
      },
      events: payment.events.map((event) => ({
        ...event,
        label: this.labelFromEnum(event.type),
        createdAt: event.createdAt.toISOString(),
      })),
      refunds: payment.refunds.map((refund) => ({
        ...refund,
        createdAt: refund.createdAt.toISOString(),
        updatedAt: refund.updatedAt.toISOString(),
      })),
    };
  }

  async listRefunds(params: {
    userId: string;
    role: UserRole;
    status?: RefundStatus;
    page: number;
    pageSize: number;
  }): Promise<
    Paginated<{
      id: string;
      status: RefundStatus;
      reason: string;
      amount: number;
      currency: string;
      bookingId: string;
      createdAt: string;
    }>
  > {
    this.assertAdmin(params.role);

    const where = params.status ? { status: params.status } : {};

    const [total, rows] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          status: true,
          reason: true,
          amount: true,
          currency: true,
          bookingId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      page: params.page,
      pageSize: params.pageSize,
      total,
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        amount: r.amount,
        currency: r.currency,
        bookingId: r.bookingId,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async getRefundDetail(params: {
    userId: string;
    role: UserRole;
    refundId: string;
  }) {
    this.assertAdmin(params.role);

    const refund = await this.prisma.refund.findUnique({
      where: { id: params.refundId },
      select: {
        id: true,
        bookingId: true,
        paymentId: true,
        status: true,
        reason: true,
        amount: true,
        currency: true,
        provider: true,
        providerRefundRef: true,
        idempotencyKey: true,
        createdAt: true,
        updatedAt: true,
        booking: {
          select: {
            id: true,
            status: true,
            checkIn: true,
            checkOut: true,
            totalAmount: true,
            currency: true,
            property: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
            customer: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            provider: true,
            status: true,
            amount: true,
            currency: true,
            providerRef: true,
          },
        },
        bookingCancellation: {
          select: {
            id: true,
            actor: true,
            reason: true,
            mode: true,
            notes: true,
            cancelledAt: true,
            totalAmount: true,
            penaltyAmount: true,
            refundableAmount: true,
            currency: true,
            displayCurrency: true,
            displayFxRate: true,
            displayFxAsOfDate: true,
            totalAmountDisplay: true,
            penaltyAmountDisplay: true,
            refundableAmountDisplay: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found.');
    }

    return {
      ...refund,
      createdAt: refund.createdAt.toISOString(),
      updatedAt: refund.updatedAt.toISOString(),
      booking: {
        ...refund.booking,
        checkIn: refund.booking.checkIn.toISOString(),
        checkOut: refund.booking.checkOut.toISOString(),
      },
      bookingCancellation: refund.bookingCancellation
        ? {
            ...refund.bookingCancellation,
            cancelledAt: refund.bookingCancellation.cancelledAt.toISOString(),
            displayFxRate: Number(refund.bookingCancellation.displayFxRate),
            displayFxAsOfDate: refund.bookingCancellation.displayFxAsOfDate
              ? refund.bookingCancellation.displayFxAsOfDate.toISOString()
              : null,
          }
        : null,
    };
  }

  async listBlockRequests(params: {
    userId: string;
    role: UserRole;
    status?: BlockRequestStatus;
    propertyId?: string;
    vendorId?: string;
    page: number;
    pageSize: number;
  }) {
    this.assertAdmin(params.role);

    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.propertyId ? { propertyId: params.propertyId } : {}),
      ...(params.vendorId ? { vendorId: params.vendorId } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.blockRequest.count({ where }),
      this.prisma.blockRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          propertyId: true,
          vendorId: true,
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
          vendor: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
          reviewedByAdmin: {
            select: {
              id: true,
              email: true,
              fullName: true,
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
        vendorId: row.vendorId,
        property: row.property,
        vendor: row.vendor,
        startDate: this.toIsoDay(row.startDate),
        endDate: this.toIsoDay(row.endDate),
        reason: row.reason,
        status: row.status,
        reviewNotes: row.reviewNotes,
        reviewedAt: row.reviewedAt?.toISOString() ?? null,
        reviewedByAdmin: row.reviewedByAdmin,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async approveBlockRequest(params: {
    userId: string;
    role: UserRole;
    blockRequestId: string;
    notes?: string;
  }) {
    this.assertAdmin(params.role);

    const request = await this.prisma.blockRequest.findUnique({
      where: { id: params.blockRequestId },
      select: {
        id: true,
        propertyId: true,
        vendorId: true,
        startDate: true,
        endDate: true,
        reason: true,
        status: true,
        property: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!request) throw new NotFoundException('Block request not found.');
    if (request.status !== BlockRequestStatus.PENDING) {
      throw new BadRequestException(
        `Block request is already ${request.status.toLowerCase()}.`,
      );
    }

    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId: request.propertyId,
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
        },
        checkIn: { lt: request.endDate },
        checkOut: { gt: request.startDate },
      },
      select: { id: true },
    });
    if (overlappingBooking) {
      throw new BadRequestException(
        'Cannot approve block request because it overlaps booked dates.',
      );
    }

    const days: Date[] = [];
    for (
      let t = request.startDate.getTime();
      t < request.endDate.getTime();
      t += 24 * 60 * 60 * 1000
    ) {
      days.push(new Date(t));
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const day of days) {
        await tx.propertyCalendarDay.upsert({
          where: {
            propertyId_date: { propertyId: request.propertyId, date: day },
          },
          update: {
            status: CalendarDayStatus.BLOCKED,
            note: request.reason ?? 'Blocked by approved vendor request',
          },
          create: {
            propertyId: request.propertyId,
            date: day,
            status: CalendarDayStatus.BLOCKED,
            note: request.reason ?? 'Blocked by approved vendor request',
          },
        });
      }

      return tx.blockRequest.update({
        where: { id: request.id },
        data: {
          status: BlockRequestStatus.APPROVED,
          reviewedByAdminId: params.userId,
          reviewedAt: new Date(),
          reviewNotes: params.notes?.trim() || null,
        },
        select: {
          id: true,
          propertyId: true,
          vendorId: true,
          startDate: true,
          endDate: true,
          reason: true,
          status: true,
          reviewNotes: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    await this.notifications
      .emit({
        type: NotificationType.MAINTENANCE_REQUEST_CREATED,
        entityType: 'BLOCK_REQUEST',
        entityId: updated.id,
        recipientUserId: updated.vendorId,
        payload: {
          title: 'Block request approved',
          blockRequest: {
            id: updated.id,
            propertyId: updated.propertyId,
            propertyTitle: request.property.title,
            startDate: this.toIsoDay(updated.startDate),
            endDate: this.toIsoDay(updated.endDate),
            status: updated.status,
            reviewNotes: updated.reviewNotes,
          },
        },
      })
      .catch(() => null);

    return {
      ...updated,
      startDate: this.toIsoDay(updated.startDate),
      endDate: this.toIsoDay(updated.endDate),
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      blockedDays: days.length,
    };
  }

  async rejectBlockRequest(params: {
    userId: string;
    role: UserRole;
    blockRequestId: string;
    notes?: string;
  }) {
    this.assertAdmin(params.role);

    const request = await this.prisma.blockRequest.findUnique({
      where: { id: params.blockRequestId },
      select: {
        id: true,
        vendorId: true,
        propertyId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });

    if (!request) throw new NotFoundException('Block request not found.');
    if (request.status !== BlockRequestStatus.PENDING) {
      throw new BadRequestException(
        `Block request is already ${request.status.toLowerCase()}.`,
      );
    }

    const updated = await this.prisma.blockRequest.update({
      where: { id: request.id },
      data: {
        status: BlockRequestStatus.REJECTED,
        reviewedByAdminId: params.userId,
        reviewedAt: new Date(),
        reviewNotes: params.notes?.trim() || null,
      },
      select: {
        id: true,
        propertyId: true,
        vendorId: true,
        startDate: true,
        endDate: true,
        reason: true,
        status: true,
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.notifications
      .emit({
        type: NotificationType.MAINTENANCE_REQUEST_CREATED,
        entityType: 'BLOCK_REQUEST',
        entityId: updated.id,
        recipientUserId: updated.vendorId,
        payload: {
          title: 'Block request rejected',
          blockRequest: {
            id: updated.id,
            propertyId: updated.propertyId,
            startDate: this.toIsoDay(updated.startDate),
            endDate: this.toIsoDay(updated.endDate),
            status: updated.status,
            reviewNotes: updated.reviewNotes,
          },
        },
      })
      .catch(() => null);

    return {
      ...updated,
      startDate: this.toIsoDay(updated.startDate),
      endDate: this.toIsoDay(updated.endDate),
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async listOpsTasks(params: {
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
      propertyTitle: string;
      bookingId: string | null;
      createdAt: string;
    }>
  > {
    this.assertAdmin(params.role);

    const where = params.status ? { status: params.status } : {};

    const [total, rows] = await Promise.all([
      this.prisma.opsTask.count({ where }),
      this.prisma.opsTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          type: true,
          status: true,
          scheduledFor: true,
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
        propertyTitle: t.property.title,
        bookingId: t.bookingId,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }
}
