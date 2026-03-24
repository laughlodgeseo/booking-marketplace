import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import {
  BookingDocumentType,
  BookingStatus,
  CalendarDayStatus,
  CustomerDocumentStatus,
  CustomerDocumentType,
  GuestReviewStatus,
  HoldStatus,
  MessageCounterpartyRole,
  RefundStatus,
  UserRole,
} from '@prisma/client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  BOOKING_DOCUMENTS_DIR,
  CUSTOMER_DOCUMENTS_DIR,
} from '../../common/upload/storage-paths';
import type {
  Paginated,
  PortalCalendarEvent,
  PortalCalendarProperty,
  PortalCalendarResponse,
} from '../common/portal.types';

type UserOverview = {
  kpis: {
    bookingsUpcoming: number;
    bookingsTotal: number;
    refundsTotal: number;
  };
  documentCompliance: {
    requiredTypes: CustomerDocumentType[];
    missingTypes: CustomerDocumentType[];
    hasVerifiedRequiredDocuments: boolean;
    requiresUpload: boolean;
    urgent: boolean;
    nextBooking: {
      id: string;
      checkIn: string;
      checkOut: string;
      property: {
        id: string;
        title: string;
        slug: string;
      };
    } | null;
  };
  upcoming: Array<{
    id: string;
    propertyTitle: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    currency: string;
    status: BookingStatus;
  }>;
};

@Injectable()
export class UserPortalService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly requiredCustomerDocumentTypes: CustomerDocumentType[] = [
    CustomerDocumentType.PASSPORT,
    CustomerDocumentType.EMIRATES_ID,
  ];

  private assertCustomer(role: UserRole) {
    if (role !== UserRole.CUSTOMER)
      throw new ForbiddenException('Not allowed.');
  }

  private labelFromEnum(value: string): string {
    return value
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (token) => token.toUpperCase());
  }

  private assertRatingValue(value: number, field: string) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new BadRequestException(
        `${field} must be an integer between 1 and 5.`,
      );
    }
  }

  private async getCustomerDocumentRequirementSummary(userId: string) {
    const now = new Date();

    const [requiredDocs, nextBooking] = await Promise.all([
      this.prisma.customerDocument.findMany({
        where: {
          userId,
          type: { in: this.requiredCustomerDocumentTypes },
        },
        select: {
          id: true,
          type: true,
          status: true,
          verifiedAt: true,
          reviewedAt: true,
          reviewNotes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.booking.findFirst({
        where: {
          customerId: userId,
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
      requiredDocs
        .filter((doc) => doc.status === CustomerDocumentStatus.VERIFIED)
        .map((doc) => doc.type),
    );
    const missingTypes = this.requiredCustomerDocumentTypes.filter(
      (type) => !verifiedTypes.has(type),
    );

    const hasUpcomingConfirmedBooking = Boolean(nextBooking);
    const requiresUpload =
      hasUpcomingConfirmedBooking && missingTypes.length > 0;

    const hoursToCheckIn = nextBooking
      ? (nextBooking.checkIn.getTime() - now.getTime()) / (60 * 60 * 1000)
      : null;
    const urgent =
      requiresUpload && hoursToCheckIn !== null && hoursToCheckIn <= 48;

    return {
      requiredTypes: this.requiredCustomerDocumentTypes,
      missingTypes,
      hasVerifiedRequiredDocuments: missingTypes.length === 0,
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
    };
  }

  async getOverview(params: {
    userId: string;
    role: UserRole;
  }): Promise<UserOverview> {
    this.assertCustomer(params.role);

    const now = new Date();

    const [bookingsUpcoming, bookingsTotal, refundsTotal, upcoming] =
      await Promise.all([
        this.prisma.booking.count({
          where: {
            customerId: params.userId,
            status: BookingStatus.CONFIRMED,
            checkIn: { gt: now },
          },
        }),
        this.prisma.booking.count({ where: { customerId: params.userId } }),
        this.prisma.refund.count({
          where: { booking: { customerId: params.userId } },
        }),
        this.prisma.booking.findMany({
          where: {
            customerId: params.userId,
            status: BookingStatus.CONFIRMED,
            checkIn: { gt: now },
          },
          orderBy: { checkIn: 'asc' },
          take: 5,
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            totalAmount: true,
            currency: true,
            status: true,
            property: { select: { title: true } },
          },
        }),
      ]);

    const documentCompliance = await this.getCustomerDocumentRequirementSummary(
      params.userId,
    );

    return {
      kpis: { bookingsUpcoming, bookingsTotal, refundsTotal },
      documentCompliance,
      upcoming: upcoming.map((b) => ({
        id: b.id,
        propertyTitle: b.property.title,
        checkIn: b.checkIn.toISOString(),
        checkOut: b.checkOut.toISOString(),
        totalAmount: b.totalAmount,
        currency: b.currency,
        status: b.status,
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
    this.assertCustomer(params.role);

    const where = {
      customerId: params.userId,
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

  async getBookingDetail(params: {
    userId: string;
    role: UserRole;
    bookingId: string;
  }) {
    this.assertCustomer(params.role);

    const booking = await this.prisma.booking.findUnique({
      where: { id: params.bookingId },
      select: {
        id: true,
        customerId: true,
        status: true,
        checkIn: true,
        checkOut: true,
        adults: true,
        children: true,
        totalAmount: true,
        currency: true,
        fxRate: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        cancelledAt: true,
        property: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            city: true,
            area: true,
            address: true,
            maxGuests: true,
            bedrooms: true,
            bathrooms: true,
            basePrice: true,
            cleaningFee: true,
            minNights: true,
            maxNights: true,
            checkInFromMin: true,
            checkInToMax: true,
            checkOutMin: true,
            isInstantBook: true,
            media: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              take: 30,
              select: {
                id: true,
                url: true,
                alt: true,
                sortOrder: true,
                category: true,
              },
            },
            cancellationPolicyConfig: {
              select: {
                version: true,
                isActive: true,
                freeCancelBeforeHours: true,
                partialRefundBeforeHours: true,
                noRefundWithinHours: true,
                penaltyType: true,
                penaltyValue: true,
                defaultMode: true,
                chargeFirstNightOnLateCancel: true,
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
                createdAt: true,
              },
            },
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
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.customerId !== params.userId) {
      throw new ForbiddenException('Not allowed to access this booking.');
    }

    const requiredDocumentTypes: BookingDocumentType[] = [
      BookingDocumentType.PASSPORT,
    ];
    const uploadedTypes = new Set(booking.documents.map((doc) => doc.type));
    const missingTypes = requiredDocumentTypes.filter(
      (docType) => !uploadedTypes.has(docType),
    );

    const timeline: Array<{
      key: string;
      label: string;
      at: string;
    }> = [
      {
        key: 'BOOKING_CREATED',
        label: 'Booking created',
        at: booking.createdAt.toISOString(),
      },
    ];

    if (booking.expiresAt) {
      timeline.push({
        key: 'PAYMENT_DEADLINE',
        label: 'Payment deadline',
        at: booking.expiresAt.toISOString(),
      });
    }

    if (
      booking.status === BookingStatus.CONFIRMED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      timeline.push({
        key: 'BOOKING_CONFIRMED',
        label: 'Booking confirmed',
        at: booking.updatedAt.toISOString(),
      });
    }

    if (booking.cancelledAt) {
      timeline.push({
        key: 'BOOKING_CANCELLED',
        label: 'Booking cancelled',
        at: booking.cancelledAt.toISOString(),
      });
    }

    for (const event of booking.payment?.events ?? []) {
      timeline.push({
        key: `PAYMENT_${event.type}`,
        label: `Payment ${this.labelFromEnum(event.type)}`,
        at: event.createdAt.toISOString(),
      });
    }

    timeline.sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );

    const threads = await this.prisma.messageThread.findMany({
      where: {
        counterpartyUserId: params.userId,
        counterpartyRole: MessageCounterpartyRole.CUSTOMER,
      },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        subject: true,
        topic: true,
        lastMessageAt: true,
        lastMessagePreview: true,
        counterpartyLastReadAt: true,
        admin: { select: { id: true, email: true, fullName: true } },
      },
    });

    const messageThreads = await Promise.all(
      threads.map(async (thread) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            threadId: thread.id,
            senderId: { not: params.userId },
            ...(thread.counterpartyLastReadAt
              ? { createdAt: { gt: thread.counterpartyLastReadAt } }
              : {}),
          },
        });

        return {
          id: thread.id,
          subject: thread.subject,
          topic: thread.topic,
          admin: thread.admin,
          lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
          lastMessagePreview: thread.lastMessagePreview,
          unreadCount,
        };
      }),
    );

    const nightMs = 24 * 60 * 60 * 1000;
    const nights = Math.max(
      1,
      Math.ceil(
        (booking.checkOut.getTime() - booking.checkIn.getTime()) / nightMs,
      ),
    );

    return {
      id: booking.id,
      status: booking.status,
      checkIn: booking.checkIn.toISOString(),
      checkOut: booking.checkOut.toISOString(),
      adults: booking.adults,
      children: booking.children,
      nights,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      fxRate: Number(booking.fxRate ?? 1),
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      expiresAt: booking.expiresAt?.toISOString() ?? null,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      timeline,
      property: {
        id: booking.property.id,
        title: booking.property.title,
        slug: booking.property.slug,
        description: booking.property.description,
        city: booking.property.city,
        area: booking.property.area,
        address: booking.property.address,
        maxGuests: booking.property.maxGuests,
        bedrooms: booking.property.bedrooms,
        bathrooms: booking.property.bathrooms,
        basePrice: booking.property.basePrice,
        cleaningFee: booking.property.cleaningFee,
        minNights: booking.property.minNights,
        maxNights: booking.property.maxNights,
        checkInFromMin: booking.property.checkInFromMin,
        checkInToMax: booking.property.checkInToMax,
        checkOutMin: booking.property.checkOutMin,
        isInstantBook: booking.property.isInstantBook,
        media: booking.property.media,
        coverUrl: booking.property.media[0]?.url ?? null,
        cancellationPolicy: booking.property.cancellationPolicyConfig?.isActive
          ? booking.property.cancellationPolicyConfig
          : null,
      },
      payment: booking.payment
        ? {
            ...booking.payment,
            createdAt: booking.payment.createdAt.toISOString(),
            updatedAt: booking.payment.updatedAt.toISOString(),
            events: booking.payment.events.map((event) => ({
              id: event.id,
              type: event.type,
              label: this.labelFromEnum(event.type),
              providerRef: event.providerRef,
              createdAt: event.createdAt.toISOString(),
            })),
          }
        : null,
      documents: {
        requiredTypes: requiredDocumentTypes,
        uploadedTypes: Array.from(uploadedTypes.values()),
        missingTypes,
        items: booking.documents.map((doc) => ({
          id: doc.id,
          bookingId: doc.bookingId,
          uploadedByUserId: doc.uploadedByUserId,
          type: doc.type,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          notes: doc.notes,
          createdAt: doc.createdAt.toISOString(),
          downloadUrl: `/api/portal/user/bookings/${booking.id}/documents/${doc.id}/download`,
        })),
      },
      messages: {
        threads: messageThreads,
      },
    };
  }

  async getRefunds(params: {
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
    this.assertCustomer(params.role);

    const where = {
      booking: { customerId: params.userId },
      ...(params.status ? { status: params.status } : {}),
    } as const;

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

  async getCalendar(params: {
    userId: string;
    role: UserRole;
    from: Date;
    to: Date;
    propertyId?: string;
  }): Promise<PortalCalendarResponse> {
    this.assertCustomer(params.role);

    const [me, bookedPropertyRows] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { fullName: true, email: true },
      }),
      this.prisma.property.findMany({
        where: {
          bookings: {
            some: { customerId: params.userId },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 120,
        select: { id: true, title: true, city: true, status: true },
      }),
    ]);

    const map = new Map<string, PortalCalendarProperty>();
    for (const p of bookedPropertyRows) {
      map.set(p.id, {
        id: p.id,
        title: p.title,
        city: p.city,
        status: p.status,
      });
    }

    const properties = Array.from(map.values());
    if (properties.length === 0) {
      return {
        from: params.from.toISOString(),
        to: params.to.toISOString(),
        selectedPropertyId: null,
        properties: [],
        events: [],
      };
    }

    if (params.propertyId && !map.has(params.propertyId)) {
      throw new ForbiddenException('Property not available for this view.');
    }

    const selectedPropertyId =
      params.propertyId ??
      bookedPropertyRows[0]?.id ??
      properties[0]?.id ??
      null;
    const propertyIds = selectedPropertyId ? [selectedPropertyId] : [];

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
          customerId: true,
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

    const selfName = me?.fullName ?? me?.email ?? 'You';

    const bookingEvents: PortalCalendarEvent[] = bookings.map((b) => {
      const isMine = b.customerId === params.userId;
      return {
        type: 'BOOKING',
        id: b.id,
        bookingRef: b.id,
        propertyId: b.propertyId,
        propertyTitle: b.property.title,
        start: b.checkIn.toISOString(),
        end: b.checkOut.toISOString(),
        status: b.status,
        guestName: isMine
          ? (b.customer.fullName ?? b.customer.email ?? selfName)
          : null,
        guestDisplay: isMine
          ? (b.customer.fullName ?? b.customer.email ?? selfName)
          : 'Reserved guest',
        currency: b.currency,
        totalAmount: b.totalAmount,
        note: null,
      };
    });

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

  private async assertBookingOwnership(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        customerId: true,
        propertyId: true,
        status: true,
        checkOut: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.customerId !== userId) {
      throw new ForbiddenException('Not allowed to access this booking.');
    }

    return booking;
  }

  async uploadBookingDocument(params: {
    userId: string;
    bookingId: string;
    type: BookingDocumentType;
    notes?: string;
    file?: Express.Multer.File;
  }) {
    const file = params.file;
    if (!file) throw new BadRequestException('File upload failed.');

    await this.assertBookingOwnership(params.userId, params.bookingId);

    const doc = await this.prisma.bookingDocument.create({
      data: {
        bookingId: params.bookingId,
        uploadedByUserId: params.userId,
        type: params.type,
        storageKey: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        notes: params.notes?.trim() || null,
      },
      select: {
        id: true,
        bookingId: true,
        uploadedByUserId: true,
        type: true,
        storageKey: true,
        originalName: true,
        mimeType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...doc,
      downloadUrl: `/api/portal/user/bookings/${params.bookingId}/documents/${doc.id}/download`,
    };
  }

  async listBookingDocuments(params: { userId: string; bookingId: string }) {
    await this.assertBookingOwnership(params.userId, params.bookingId);

    const docs = await this.prisma.bookingDocument.findMany({
      where: { bookingId: params.bookingId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        bookingId: true,
        uploadedByUserId: true,
        type: true,
        storageKey: true,
        originalName: true,
        mimeType: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      items: docs.map((doc) => ({
        ...doc,
        downloadUrl: `/api/portal/user/bookings/${params.bookingId}/documents/${doc.id}/download`,
      })),
    };
  }

  async getBookingDocumentDownload(params: {
    userId: string;
    role: UserRole;
    bookingId: string;
    documentId: string;
  }) {
    if (params.role === UserRole.CUSTOMER) {
      await this.assertBookingOwnership(params.userId, params.bookingId);
    }

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

  async listCustomerDocuments(params: { userId: string; role: UserRole }) {
    this.assertCustomer(params.role);

    const [requirement, docs] = await Promise.all([
      this.getCustomerDocumentRequirementSummary(params.userId),
      this.prisma.customerDocument.findMany({
        where: { userId: params.userId },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
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
      requirement,
      items: docs.map((doc) => ({
        ...doc,
        reviewedAt: doc.reviewedAt?.toISOString() ?? null,
        verifiedAt: doc.verifiedAt?.toISOString() ?? null,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        downloadUrl: `/api/portal/user/documents/${doc.id}/download`,
        viewUrl: `/api/portal/user/documents/${doc.id}/view`,
      })),
    };
  }

  async uploadCustomerDocument(params: {
    userId: string;
    role: UserRole;
    type: CustomerDocumentType;
    notes?: string;
    file?: Express.Multer.File;
  }) {
    this.assertCustomer(params.role);
    const file = params.file;
    if (!file) throw new BadRequestException('File upload failed.');

    const doc = await this.prisma.customerDocument.upsert({
      where: {
        userId_type: {
          userId: params.userId,
          type: params.type,
        },
      },
      update: {
        status: CustomerDocumentStatus.PENDING,
        fileKey: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        notes: params.notes?.trim() || null,
        reviewNotes: null,
        reviewedAt: null,
        reviewedByAdminId: null,
        verifiedAt: null,
      },
      create: {
        userId: params.userId,
        type: params.type,
        status: CustomerDocumentStatus.PENDING,
        fileKey: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        notes: params.notes?.trim() || null,
      },
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
      },
    });

    return {
      ...doc,
      reviewedAt: doc.reviewedAt?.toISOString() ?? null,
      verifiedAt: doc.verifiedAt?.toISOString() ?? null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      downloadUrl: `/api/portal/user/documents/${doc.id}/download`,
      viewUrl: `/api/portal/user/documents/${doc.id}/view`,
    };
  }

  async getCustomerDocumentDownload(params: {
    userId: string;
    role: UserRole;
    documentId: string;
  }) {
    if (params.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Not allowed to access this document.');
    }

    const doc = await this.prisma.customerDocument.findUnique({
      where: { id: params.documentId },
      select: {
        id: true,
        userId: true,
        fileKey: true,
        originalName: true,
        mimeType: true,
      },
    });

    if (!doc) throw new NotFoundException('Document not found.');
    if (doc.userId !== params.userId) {
      throw new ForbiddenException('Not allowed to access this document.');
    }

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

  async deleteCustomerDocument(params: {
    userId: string;
    role: UserRole;
    documentId: string;
  }) {
    if (params.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Not allowed to delete this document.');
    }

    const doc = await this.prisma.customerDocument.findUnique({
      where: { id: params.documentId },
      select: {
        id: true,
        userId: true,
        fileKey: true,
      },
    });

    if (!doc) throw new NotFoundException('Document not found.');
    if (doc.userId !== params.userId) {
      throw new ForbiddenException('Not allowed to delete this document.');
    }

    await this.prisma.customerDocument.delete({
      where: { id: doc.id },
    });

    const absolutePath = join(CUSTOMER_DOCUMENTS_DIR, doc.fileKey);
    if (existsSync(absolutePath)) {
      try {
        unlinkSync(absolutePath);
      } catch {
        // best effort cleanup
      }
    }

    return { ok: true, id: doc.id };
  }

  async createReview(params: {
    userId: string;
    role: UserRole;
    bookingId: string;
    rating?: number;
    cleanlinessRating?: number;
    locationRating?: number;
    communicationRating?: number;
    valueRating?: number;
    title?: string;
    comment?: string;
  }) {
    this.assertCustomer(params.role);
    const categoryValues = [
      params.cleanlinessRating,
      params.locationRating,
      params.communicationRating,
      params.valueRating,
    ];
    const hasCategories = categoryValues.every(
      (value) => typeof value === 'number',
    );
    if (!hasCategories && typeof params.rating !== 'number') {
      throw new BadRequestException(
        'Provide rating or category ratings for the review.',
      );
    }

    const cleanlinessRating = params.cleanlinessRating ?? params.rating ?? 5;
    const locationRating = params.locationRating ?? params.rating ?? 5;
    const communicationRating =
      params.communicationRating ?? params.rating ?? 5;
    const valueRating = params.valueRating ?? params.rating ?? 5;

    this.assertRatingValue(cleanlinessRating, 'cleanlinessRating');
    this.assertRatingValue(locationRating, 'locationRating');
    this.assertRatingValue(communicationRating, 'communicationRating');
    this.assertRatingValue(valueRating, 'valueRating');

    const rating =
      params.rating ??
      Math.round(
        (cleanlinessRating +
          locationRating +
          communicationRating +
          valueRating) /
          4,
      );
    this.assertRatingValue(rating, 'rating');

    const booking = await this.prisma.booking.findUnique({
      where: { id: params.bookingId },
      select: {
        id: true,
        customerId: true,
        propertyId: true,
        checkOut: true,
        status: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.customerId !== params.userId) {
      throw new ForbiddenException('You can only review your own booking.');
    }

    if (booking.checkOut >= new Date()) {
      throw new BadRequestException(
        'Reviews are allowed only after the stay has ended.',
      );
    }

    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Only completed or confirmed stays can be reviewed.',
      );
    }

    const existing = await this.prisma.guestReview.findUnique({
      where: { bookingId: booking.id },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('This booking already has a review.');
    }

    return this.prisma.guestReview.create({
      data: {
        propertyId: booking.propertyId,
        bookingId: booking.id,
        customerId: params.userId,
        rating,
        cleanlinessRating,
        locationRating,
        communicationRating,
        valueRating,
        title: params.title?.trim() || null,
        comment: params.comment?.trim() || null,
        status: GuestReviewStatus.PENDING,
      },
    });
  }

  async listMyReviews(params: {
    userId: string;
    role: UserRole;
    page: number;
    pageSize: number;
  }) {
    this.assertCustomer(params.role);

    const page = params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize > 0 ? params.pageSize : 20;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.guestReview.count({ where: { customerId: params.userId } }),
      this.prisma.guestReview.findMany({
        where: { customerId: params.userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          property: { select: { id: true, title: true, slug: true } },
          booking: { select: { id: true, checkIn: true, checkOut: true } },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      items,
    };
  }
}
