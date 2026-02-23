import { createHash } from 'crypto';
import {
  BookingStatus,
  CalendarDayStatus,
  CancellationActor,
  CancellationMode,
  CancellationReason,
  HoldStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  OpsTaskStatus,
  OpsTaskType,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  PrismaClient,
  RefundReason,
  RefundStatus,
} from '@prisma/client';

type UserRef = {
  id: string;
  email: string;
};

type SeededPropertyForBookings = {
  id: string;
  slug: string;
  title: string;
  minNights: number;
  basePrice: number;
  cleaningFee: number;
  vendorId: string;
};

type BookingSeedContext = {
  prisma: PrismaClient;
  adminUserId: string;
  propertyBySlug: Map<string, SeededPropertyForBookings>;
  customerByKey: Record<string, UserRef>;
  vendorByKey: Record<string, UserRef>;
  bookingWindowStart: Date;
  bookingWindowEnd: Date;
};

type BookingPlan = {
  key: string;
  guestKey: string;
  guestType: 'customer' | 'vendor';
  propertySlug: string;
  checkInIso: string;
  checkOutIso: string;
  status: BookingStatus;
  cancellation?: {
    actor: CancellationActor;
    reason: CancellationReason;
    refundStatus: RefundStatus;
    refundRatio: number;
    note: string;
  };
};

export type DemoBookingSeedResult = {
  bookingIds: string[];
  confirmedBookingIds: string[];
  cancelledBookingIds: string[];
  pendingBookingIds: string[];
  refundProcessedBookingIds: string[];
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

const BOOKING_PLANS: BookingPlan[] = [
  {
    key: 'ayaan-downtown-confirmed-1',
    guestKey: 'customer.ayaan',
    guestType: 'customer',
    propertySlug: 'demo-burj-vista-suite-downtown-dubai',
    checkInIso: '2026-02-23',
    checkOutIso: '2026-02-27',
    status: BookingStatus.CONFIRMED,
  },
  {
    key: 'sara-business-confirmed-1',
    guestKey: 'customer.sara',
    guestType: 'customer',
    propertySlug: 'demo-canal-heights-residence-business-bay',
    checkInIso: '2026-02-24',
    checkOutIso: '2026-02-28',
    status: BookingStatus.CONFIRMED,
  },
  {
    key: 'omar-marina-confirmed-1',
    guestKey: 'customer.omar',
    guestType: 'customer',
    propertySlug: 'demo-marina-horizon-apartment-dubai-marina',
    checkInIso: '2026-02-26',
    checkOutIso: '2026-03-01',
    status: BookingStatus.CONFIRMED,
  },
  {
    key: 'huda-jbr-cancelled-admin',
    guestKey: 'customer.huda',
    guestType: 'customer',
    propertySlug: 'demo-sea-breeze-flat-jbr',
    checkInIso: '2026-02-28',
    checkOutIso: '2026-03-03',
    status: BookingStatus.CANCELLED,
    cancellation: {
      actor: CancellationActor.ADMIN,
      reason: CancellationReason.ADMIN_OVERRIDE,
      refundStatus: RefundStatus.PROCESSING,
      refundRatio: 0.65,
      note: 'Admin cancellation for compliance mismatch pre-arrival.',
    },
  },
  {
    key: 'zain-palm-confirmed-1',
    guestKey: 'customer.zain',
    guestType: 'customer',
    propertySlug: 'demo-palm-shore-retreat-palm-jumeirah',
    checkInIso: '2026-03-01',
    checkOutIso: '2026-03-06',
    status: BookingStatus.CONFIRMED,
  },
  {
    key: 'ayaan-jlt-confirmed-2',
    guestKey: 'customer.ayaan',
    guestType: 'customer',
    propertySlug: 'demo-jlt-lakeview-residence-jlt',
    checkInIso: '2026-03-04',
    checkOutIso: '2026-03-08',
    status: BookingStatus.CONFIRMED,
  },
  {
    key: 'sara-citywalk-cancelled-customer',
    guestKey: 'customer.sara',
    guestType: 'customer',
    propertySlug: 'demo-city-walk-urban-home-city-walk',
    checkInIso: '2026-03-06',
    checkOutIso: '2026-03-10',
    status: BookingStatus.CANCELLED,
    cancellation: {
      actor: CancellationActor.CUSTOMER,
      reason: CancellationReason.GUEST_REQUEST,
      refundStatus: RefundStatus.SUCCEEDED,
      refundRatio: 0.8,
      note: 'Guest requested cancellation after change in travel dates.',
    },
  },
  {
    key: 'omar-difc-pending-2',
    guestKey: 'customer.omar',
    guestType: 'customer',
    propertySlug: 'demo-difc-skyline-suite-difc',
    checkInIso: '2026-03-09',
    checkOutIso: '2026-03-12',
    status: BookingStatus.PENDING_PAYMENT,
  },
  {
    key: 'vendor-oasis-business-confirmed',
    guestKey: 'vendor.oasis',
    guestType: 'vendor',
    propertySlug: 'demo-canal-heights-residence-business-bay',
    checkInIso: '2026-03-12',
    checkOutIso: '2026-03-16',
    status: BookingStatus.CONFIRMED,
  },
];

function stableUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function toDate(isoDay: string): Date {
  const parsed = new Date(`${isoDay}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO day: ${isoDay}`);
  }
  return parsed;
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * ONE_HOUR_MS);
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * ONE_DAY_MS);
}

function toIsoDay(input: Date): string {
  const y = input.getUTCFullYear();
  const m = String(input.getUTCMonth() + 1).padStart(2, '0');
  const d = String(input.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daySpan(checkIn: Date, checkOut: Date): string[] {
  const result: string[] = [];
  let cursor = new Date(checkIn);
  while (cursor.getTime() < checkOut.getTime()) {
    result.push(toIsoDay(cursor));
    cursor = addDays(cursor, 1);
  }
  return result;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[demo-seed] ${message}`);
  }
}

async function createNotification(params: {
  prisma: PrismaClient;
  type: NotificationType;
  entityType: string;
  entityId: string;
  recipientUserId: string;
  payload: Record<string, unknown>;
  at: Date;
}) {
  const { prisma, type, entityType, entityId, recipientUserId, payload, at } =
    params;

  await prisma.notificationEvent.create({
    data: {
      type,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.SENT,
      entityType,
      entityId,
      recipientUserId,
      payloadJson: JSON.stringify(payload),
      attempts: 1,
      nextAttemptAt: at,
      createdAt: at,
      sentAt: at,
    },
  });
}

export async function seedDemoBookings(
  context: BookingSeedContext,
): Promise<DemoBookingSeedResult> {
  const { prisma, propertyBySlug, customerByKey, vendorByKey } = context;

  const propertyIds = Array.from(propertyBySlug.values()).map((property) => property.id);

  const blockedRows = await prisma.propertyCalendarDay.findMany({
    where: {
      propertyId: { in: propertyIds },
      status: CalendarDayStatus.BLOCKED,
    },
    select: {
      propertyId: true,
      date: true,
    },
  });

  const blockedByProperty = new Map<string, Set<string>>();
  for (const row of blockedRows) {
    if (!blockedByProperty.has(row.propertyId)) {
      blockedByProperty.set(row.propertyId, new Set());
    }
    blockedByProperty.get(row.propertyId)?.add(toIsoDay(row.date));
  }

  const existingBookings = await prisma.booking.findMany({
    where: {
      propertyId: { in: propertyIds },
      checkIn: { lt: context.bookingWindowEnd },
      checkOut: { gt: context.bookingWindowStart },
    },
    select: {
      id: true,
      propertyId: true,
      checkIn: true,
      checkOut: true,
    },
  });

  const occupancy = new Map<string, Array<{ checkIn: Date; checkOut: Date }>>();
  for (const row of existingBookings) {
    if (!occupancy.has(row.propertyId)) {
      occupancy.set(row.propertyId, []);
    }
    occupancy.get(row.propertyId)?.push({
      checkIn: row.checkIn,
      checkOut: row.checkOut,
    });
  }

  const serviceConfigRows = await prisma.propertyServiceConfig.findMany({
    where: { propertyId: { in: propertyIds } },
    select: {
      propertyId: true,
      cleaningRequired: true,
      inspectionRequired: true,
      linenChangeRequired: true,
      restockRequired: true,
    },
  });

  const serviceConfigByProperty = new Map(
    serviceConfigRows.map((row) => [row.propertyId, row]),
  );

  const cancellationPolicies = await prisma.cancellationPolicyConfig.findMany({
    where: { propertyId: { in: propertyIds } },
    select: {
      propertyId: true,
      version: true,
    },
  });

  const cancellationPolicyByProperty = new Map(
    cancellationPolicies.map((row) => [row.propertyId, row.version]),
  );

  const bookingIds: string[] = [];
  const confirmedBookingIds: string[] = [];
  const cancelledBookingIds: string[] = [];
  const pendingBookingIds: string[] = [];
  const refundProcessedBookingIds: string[] = [];

  for (const plan of BOOKING_PLANS) {
    const guest =
      plan.guestType === 'customer'
        ? customerByKey[plan.guestKey]
        : vendorByKey[plan.guestKey];

    assert(guest, `Guest account not found for key ${plan.guestKey}.`);

    const property = propertyBySlug.get(plan.propertySlug);
    assert(property, `Property not found for slug ${plan.propertySlug}.`);

    const checkIn = toDate(plan.checkInIso);
    const checkOut = toDate(plan.checkOutIso);

    assert(
      checkIn.getTime() >= context.bookingWindowStart.getTime(),
      `Booking ${plan.key} check-in is before demo window.`,
    );
    assert(
      checkOut.getTime() <= context.bookingWindowEnd.getTime(),
      `Booking ${plan.key} check-out is after demo window.`,
    );

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / ONE_DAY_MS);
    assert(nights >= property.minNights, `Booking ${plan.key} violates min nights.`);

    if (!occupancy.has(property.id)) {
      occupancy.set(property.id, []);
    }
    const intervals = occupancy.get(property.id) ?? [];

    for (const interval of intervals) {
      const overlaps =
        checkIn.getTime() < interval.checkOut.getTime() &&
        checkOut.getTime() > interval.checkIn.getTime();
      assert(!overlaps, `Booking ${plan.key} overlaps existing booking window.`);
    }

    const blockedDays = blockedByProperty.get(property.id) ?? new Set<string>();
    for (const day of daySpan(checkIn, checkOut)) {
      assert(
        !blockedDays.has(day),
        `Booking ${plan.key} collides with blocked day ${day}.`,
      );
    }

    const createdAt = addDays(checkIn, -12);
    const holdId = stableUuid(`demo-hold:${plan.key}`);
    const bookingId = stableUuid(`demo-booking:${plan.key}`);

    const totalAmount = property.basePrice * nights + property.cleaningFee;

    await prisma.propertyHold.create({
      data: {
        id: holdId,
        propertyId: property.id,
        checkIn,
        checkOut,
        status: HoldStatus.ACTIVE,
        expiresAt: addHours(createdAt, 6),
        createdById: guest.id,
        createdAt,
      },
    });

    const isCancelled = plan.status === BookingStatus.CANCELLED;
    const booking = await prisma.booking.create({
      data: {
        id: bookingId,
        customerId: guest.id,
        propertyId: property.id,
        holdId,
        checkIn,
        checkOut,
        adults: 2,
        children: 0,
        status: plan.status,
        totalAmount,
        currency: 'AED',
        totalAmountAed: totalAmount,
        displayTotalAmount: totalAmount,
        displayCurrency: 'AED',
        fxRate: 1,
        fxAsOfDate: createdAt,
        fxProvider: 'manual-demo',
        idempotencyKey: `demo-idempotency-${plan.key}`,
        expiresAt:
          plan.status === BookingStatus.PENDING_PAYMENT
            ? new Date('2026-03-08T12:00:00.000Z')
            : null,
        cancelledAt: isCancelled ? addHours(checkIn, -30) : null,
        cancelledBy: isCancelled ? plan.cancellation?.actor : null,
        cancellationReason: isCancelled ? plan.cancellation?.reason : null,
        createdAt,
      },
      select: {
        id: true,
        customerId: true,
        propertyId: true,
        status: true,
        checkIn: true,
        checkOut: true,
        totalAmount: true,
      },
    });

    await prisma.propertyHold.update({
      where: { id: holdId },
      data: {
        status: HoldStatus.CONVERTED,
        bookingId: booking.id,
        convertedAt: addHours(createdAt, 1),
      },
    });

    const paymentId = stableUuid(`demo-payment:${plan.key}`);
    const paymentStatus =
      plan.status === BookingStatus.PENDING_PAYMENT
        ? PaymentStatus.REQUIRES_ACTION
        : PaymentStatus.CAPTURED;

    await prisma.payment.create({
      data: {
        id: paymentId,
        bookingId: booking.id,
        provider: PaymentProvider.MANUAL,
        status: paymentStatus,
        amount: totalAmount,
        currency: 'AED',
        providerRef: `demo-manual-${plan.key}`,
        createdAt: addHours(createdAt, 1),
      },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId,
        type: PaymentEventType.AUTHORIZE,
        idempotencyKey: `demo-auth-${plan.key}`,
        providerRef: `demo-auth-${plan.key}`,
        payloadJson: JSON.stringify({
          stage: 'authorized',
          bookingId: booking.id,
          source: 'demo-seed',
        }),
        createdAt: addHours(createdAt, 2),
      },
    });

    if (plan.status !== BookingStatus.PENDING_PAYMENT) {
      await prisma.paymentEvent.create({
        data: {
          paymentId,
          type: PaymentEventType.CAPTURE,
          idempotencyKey: `demo-capture-${plan.key}`,
          providerRef: `demo-capture-${plan.key}`,
          payloadJson: JSON.stringify({
            stage: 'captured',
            bookingId: booking.id,
            source: 'demo-seed',
          }),
          createdAt: addHours(createdAt, 3),
        },
      });
    }

    const propertyRecipients = Array.from(
      new Set([property.vendorId, context.adminUserId]),
    );

    if (plan.status === BookingStatus.CONFIRMED) {
      const checkoutTime = addHours(checkOut, 11);
      const serviceConfig = serviceConfigByProperty.get(property.id);
      const taskTypes: OpsTaskType[] = [];

      if (serviceConfig?.cleaningRequired ?? true) {
        taskTypes.push(OpsTaskType.CLEANING);
      }
      if (serviceConfig?.inspectionRequired ?? true) {
        taskTypes.push(OpsTaskType.INSPECTION);
      }
      if (serviceConfig?.linenChangeRequired ?? true) {
        taskTypes.push(OpsTaskType.LINEN);
      }
      if (serviceConfig?.restockRequired ?? false) {
        taskTypes.push(OpsTaskType.RESTOCK);
      }

      for (let i = 0; i < taskTypes.length; i += 1) {
        const taskType = taskTypes[i];
        const scheduledFor = addHours(checkoutTime, i * 2);
        await prisma.opsTask.create({
          data: {
            propertyId: property.id,
            bookingId: booking.id,
            type: taskType,
            status: OpsTaskStatus.PENDING,
            scheduledFor,
            dueAt: addHours(scheduledFor, 6),
            notes: `Demo seeded ${taskType.toLowerCase()} task for booking turnover.`,
            createdAt: addHours(createdAt, 4 + i),
          },
        });
      }

      await createNotification({
        prisma,
        type: NotificationType.BOOKING_CONFIRMED,
        entityType: 'BOOKING',
        entityId: booking.id,
        recipientUserId: booking.customerId,
        payload: {
          bookingId: booking.id,
          propertyTitle: property.title,
          checkIn: booking.checkIn.toISOString(),
          checkOut: booking.checkOut.toISOString(),
          status: booking.status,
        },
        at: addHours(createdAt, 5),
      });

      for (const recipientUserId of propertyRecipients) {
        await createNotification({
          prisma,
          type: NotificationType.NEW_BOOKING_RECEIVED,
          entityType: 'BOOKING',
          entityId: booking.id,
          recipientUserId,
          payload: {
            bookingId: booking.id,
            guestId: booking.customerId,
            propertyId: property.id,
            totalAmount,
          },
          at: addHours(createdAt, 6),
        });

        await createNotification({
          prisma,
          type: NotificationType.OPS_TASKS_CREATED,
          entityType: 'BOOKING',
          entityId: booking.id,
          recipientUserId,
          payload: {
            bookingId: booking.id,
            propertyId: property.id,
            taskCount: taskTypes.length,
          },
          at: addHours(createdAt, 7),
        });
      }

      confirmedBookingIds.push(booking.id);
    }

    if (plan.status === BookingStatus.CANCELLED) {
      const cancellation = plan.cancellation;
      assert(cancellation, `Cancellation config missing for ${plan.key}.`);

      const refundableAmount = Math.round(totalAmount * cancellation.refundRatio);
      const penaltyAmount = totalAmount - refundableAmount;

      const refundId = stableUuid(`demo-refund:${plan.key}`);
      const policyVersion =
        cancellationPolicyByProperty.get(property.id) ?? 'demo-policy-v1';

      await prisma.refund.create({
        data: {
          id: refundId,
          bookingId: booking.id,
          paymentId,
          status: cancellation.refundStatus,
          reason: RefundReason.CANCELLATION,
          amount: refundableAmount,
          currency: 'AED',
          provider: PaymentProvider.MANUAL,
          providerRefundRef: `demo-refund-${plan.key}`,
          idempotencyKey: `demo-refund-${plan.key}`,
          createdAt: addHours(createdAt, 6),
        },
      });

      await prisma.bookingCancellation.create({
        data: {
          bookingId: booking.id,
          actor: cancellation.actor,
          reason: cancellation.reason,
          notes: cancellation.note,
          mode: CancellationMode.SOFT,
          policyVersion,
          cancelledAt: addHours(checkIn, -30),
          totalAmount,
          managementFee: 0,
          penaltyAmount,
          refundableAmount,
          currency: 'AED',
          displayCurrency: 'AED',
          displayFxRate: 1,
          totalAmountDisplay: totalAmount,
          penaltyAmountDisplay: penaltyAmount,
          refundableAmountDisplay: refundableAmount,
          releasesInventory: true,
          refundId,
          createdAt: addHours(createdAt, 7),
        },
      });

      await prisma.paymentEvent.create({
        data: {
          paymentId,
          type: PaymentEventType.REFUND,
          idempotencyKey: `demo-refund-event-${plan.key}`,
          providerRef: `demo-refund-event-${plan.key}`,
          payloadJson: JSON.stringify({
            bookingId: booking.id,
            refundId,
            stage:
              cancellation.refundStatus === RefundStatus.SUCCEEDED
                ? 'executed'
                : 'staged',
            source: 'demo-seed',
          }),
          createdAt: addHours(createdAt, 8),
        },
      });

      if (cancellation.refundStatus === RefundStatus.SUCCEEDED) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.REFUNDED },
        });
      }

      for (const recipientUserId of [booking.customerId, ...propertyRecipients]) {
        await createNotification({
          prisma,
          type: NotificationType.BOOKING_CANCELLED,
          entityType: 'BOOKING',
          entityId: booking.id,
          recipientUserId,
          payload: {
            bookingId: booking.id,
            actor: cancellation.actor,
            reason: cancellation.reason,
            refundableAmount,
            penaltyAmount,
          },
          at: addHours(createdAt, 9),
        });
      }

      if (cancellation.refundStatus === RefundStatus.SUCCEEDED) {
        await createNotification({
          prisma,
          type: NotificationType.REFUND_PROCESSED,
          entityType: 'REFUND',
          entityId: refundId,
          recipientUserId: booking.customerId,
          payload: {
            bookingId: booking.id,
            refundId,
            amount: refundableAmount,
            status: cancellation.refundStatus,
          },
          at: addHours(createdAt, 10),
        });
        refundProcessedBookingIds.push(booking.id);
      }

      cancelledBookingIds.push(booking.id);
    }

    if (plan.status === BookingStatus.PENDING_PAYMENT) {
      pendingBookingIds.push(booking.id);
    }

    bookingIds.push(booking.id);
    intervals.push({ checkIn, checkOut });
  }

  return {
    bookingIds,
    confirmedBookingIds,
    cancelledBookingIds,
    pendingBookingIds,
    refundProcessedBookingIds,
  };
}
