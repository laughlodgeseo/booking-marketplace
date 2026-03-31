import { BadRequestException } from '@nestjs/common';
import {
  BookingStatus,
  CancellationActor,
  CancellationMode,
  CancellationReason,
  HoldStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { CancellationPolicyService } from './policies/cancellation.policy';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { PricingService } from '../modules/pricing/pricing.service';

describe('BookingsService critical paths', () => {
  function buildService(deps?: {
    prisma?: PrismaService;
    cancellationPolicy?: CancellationPolicyService;
    notifications?: NotificationsService;
  }) {
    const prisma =
      deps?.prisma ??
      ({
        booking: { findFirst: jest.fn() },
        $transaction: jest.fn(),
      } as unknown as PrismaService);
    const cancellationPolicy =
      deps?.cancellationPolicy ??
      ({ decide: jest.fn() } as unknown as CancellationPolicyService);
    const notifications =
      deps?.notifications ??
      ({
        emit: jest.fn().mockResolvedValue(undefined),
      } as unknown as NotificationsService);
    const pricing = {
      calculateTotal: jest.fn().mockResolvedValue({ nightlyBreakdown: [], subtotal: 0 }),
    } as unknown as PricingService;

    return {
      service: new BookingsService(prisma, cancellationPolicy, notifications, pricing),
      prisma,
      cancellationPolicy,
      notifications,
    };
  }

  it('reuses booking for same idempotency key', async () => {
    const existingBooking = {
      id: 'booking_existing_1',
      customerId: 'customer_1',
      idempotencyKey: 'idem-1',
      status: BookingStatus.PENDING_PAYMENT,
    };

    const bookingFindFirst = jest.fn().mockResolvedValue(existingBooking);
    const tx = jest.fn();

    const { service } = buildService({
      prisma: {
        booking: { findFirst: bookingFindFirst },
        $transaction: tx,
      } as unknown as PrismaService,
    });

    const result = await service.createFromHold({
      userId: 'customer_1',
      userRole: UserRole.CUSTOMER,
      holdId: 'hold_1',
      idempotencyKey: 'idem-1',
    });

    expect(result.ok).toBe(true);
    expect(result.reused).toBe(true);
    expect(result.booking).toBe(existingBooking);
    expect(tx).not.toHaveBeenCalled();
  });

  it('rejects booking creation when overlap exists', async () => {
    const hold = {
      id: 'hold_2',
      createdById: 'customer_2',
      propertyId: 'property_2',
      checkIn: new Date('2026-04-01T00:00:00.000Z'),
      checkOut: new Date('2026-04-05T00:00:00.000Z'),
      status: HoldStatus.ACTIVE,
      expiresAt: new Date('2026-04-10T00:00:00.000Z'),
    };

    const prismaMock = {
      booking: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    (prismaMock.$transaction as unknown as jest.Mock).mockImplementation(
      async (
        fn: (tx: {
          propertyHold: { findUnique: jest.Mock };
          booking: { findFirst: jest.Mock };
        }) => Promise<unknown>,
      ) =>
        fn({
          propertyHold: { findUnique: jest.fn().mockResolvedValue(hold) },
          booking: {
            findFirst: jest.fn().mockResolvedValue({ id: 'overlap_1' }),
          },
        }),
    );

    const { service } = buildService({ prisma: prismaMock });

    await expect(
      service.createFromHold({
        userId: 'customer_2',
        userRole: UserRole.CUSTOMER,
        holdId: 'hold_2',
        idempotencyKey: 'idem-2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('inherits hold FX snapshot totals when creating booking', async () => {
    const hold = {
      id: 'hold_fx_1',
      createdById: 'customer_fx_1',
      propertyId: 'property_fx_1',
      checkIn: new Date('2026-04-01T00:00:00.000Z'),
      checkOut: new Date('2026-04-03T00:00:00.000Z'),
      status: HoldStatus.ACTIVE,
      expiresAt: new Date('2026-04-02T12:00:00.000Z'),
      quotedTotalAed: 120000,
      quotedTotalDisplay: 32712,
      displayCurrency: 'USD',
      fxRate: new Prisma.Decimal('0.2726'),
      fxAsOfDate: new Date('2026-04-01T00:00:00.000Z'),
      fxProvider: 'provider:test',
    };

    type BookingCreateArgs = {
      data: {
        totalAmount: number;
        currency: string;
        totalAmountAed: number;
        displayTotalAmount: number;
        displayCurrency: string;
      };
    };

    type BookingCreateResult = {
      id: string;
      totalAmount: number;
      currency: string;
      totalAmountAed: number;
      displayTotalAmount: number;
      displayCurrency: string;
    };

    const bookingCreate = jest
      .fn<Promise<BookingCreateResult>, [BookingCreateArgs]>()
      .mockResolvedValue({
        id: 'booking_fx_1',
        totalAmount: 32712,
        currency: 'USD',
        totalAmountAed: 120000,
        displayTotalAmount: 32712,
        displayCurrency: 'USD',
      });

    const prismaMock = {
      booking: { findFirst: jest.fn().mockResolvedValue(null) },
      property: {
        findUnique: jest.fn().mockResolvedValue({
          basePrice: 60000,
          cleaningFee: 0,
        }),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    (prismaMock.$transaction as unknown as jest.Mock).mockImplementation(
      async (
        fn: (tx: {
          propertyHold: {
            findUnique: jest.Mock;
            findFirst: jest.Mock;
            update: jest.Mock;
          };
          booking: {
            findFirst: jest.Mock;
            create: jest.Mock;
          };
          propertyCalendarDay: { findFirst: jest.Mock };
        }) => Promise<unknown>,
      ) =>
        fn({
          propertyHold: {
            findUnique: jest.fn().mockResolvedValue(hold),
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({
              id: hold.id,
              status: HoldStatus.CONVERTED,
            }),
          },
          booking: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: bookingCreate,
          },
          propertyCalendarDay: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        }),
    );

    const { service } = buildService({ prisma: prismaMock });

    const result = await service.createFromHold({
      userId: 'customer_fx_1',
      userRole: UserRole.CUSTOMER,
      holdId: 'hold_fx_1',
      idempotencyKey: 'idem-fx-1',
    });

    expect(result.ok).toBe(true);
    expect(result.reused).toBe(false);
    const [createArgs] = bookingCreate.mock.calls[0];
    expect(createArgs.data).toMatchObject({
      totalAmount: 32712,
      currency: 'USD',
      totalAmountAed: 120000,
      displayTotalAmount: 32712,
      displayCurrency: 'USD',
    });
  });

  it('creates SYSTEM cancellation snapshot for auto-expiry and is idempotent on rerun', async () => {
    const bookingId = 'booking_auto_expire_1';
    let bookingStatus: BookingStatus = BookingStatus.PENDING_PAYMENT;
    let cancellationRecord: {
      id: string;
      actor: CancellationActor;
      reason: CancellationReason;
    } | null = null;

    const cancellationCreate = jest.fn().mockImplementation(
      (args: {
        data: {
          actor: CancellationActor;
          reason: CancellationReason;
        };
      }) => {
        cancellationRecord = {
          id: 'cancel_1',
          actor: args.data.actor,
          reason: args.data.reason,
        };
        return {
          id: 'cancel_1',
          ...args.data,
        };
      },
    );

    const prismaMock = {
      $transaction: jest.fn(),
      customerDocument: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    (prismaMock.$transaction as unknown as jest.Mock).mockImplementation(
      async (
        fn: (tx: {
          booking: {
            findUnique: jest.Mock;
            update: jest.Mock;
          };
          cancellationPolicyConfig: { findFirst: jest.Mock };
          bookingCancellation: { create: jest.Mock };
          refund: { create: jest.Mock };
          opsTask: { updateMany: jest.Mock };
        }) => Promise<unknown>,
      ) =>
        fn({
          booking: {
            findUnique: jest.fn().mockImplementation(() => ({
              id: bookingId,
              status: bookingStatus,
              customerId: 'customer_3',
              propertyId: 'property_3',
              checkIn: new Date('2026-05-01T00:00:00.000Z'),
              checkOut: new Date('2026-05-04T00:00:00.000Z'),
              totalAmount: 120000,
              currency: 'AED',
              cancellationReason: cancellationRecord?.reason ?? null,
              property: { vendorId: 'vendor_3' },
              payment: null,
              cancellation:
                cancellationRecord === null
                  ? null
                  : {
                      id: cancellationRecord.id,
                      refundId: null,
                    },
            })),
            update: jest.fn().mockImplementation(() => {
              bookingStatus = BookingStatus.CANCELLED;
              return { id: bookingId, status: bookingStatus };
            }),
          },
          cancellationPolicyConfig: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
          bookingCancellation: {
            create: cancellationCreate,
          },
          refund: { create: jest.fn() },
          opsTask: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        }),
    );

    const notificationsEmit = jest.fn().mockResolvedValue(undefined);

    const { service } = buildService({
      prisma: prismaMock,
      notifications: {
        emit: notificationsEmit,
      } as unknown as NotificationsService,
    });

    const first = await service.cancelBooking({
      bookingId,
      actorUser: { id: 'system-worker', role: 'SYSTEM' },
      dto: {
        reason: CancellationReason.AUTO_EXPIRED_UNPAID,
        mode: CancellationMode.SOFT,
        notes: 'auto-expire test',
      },
    });

    expect(first.ok).toBe(true);
    expect(first.alreadyCancelled).toBeUndefined();
    expect(cancellationCreate).toHaveBeenCalledTimes(1);
    const cancellationCalls = cancellationCreate.mock.calls as unknown as Array<
      [
        {
          data: {
            actor: CancellationActor;
            reason: CancellationReason;
          };
        },
      ]
    >;
    expect(cancellationCalls[0]?.[0]?.data.actor).toBe(
      CancellationActor.SYSTEM,
    );
    expect(cancellationCalls[0]?.[0]?.data.reason).toBe(
      CancellationReason.AUTO_EXPIRED_UNPAID,
    );

    const second = await service.cancelBooking({
      bookingId,
      actorUser: { id: 'system-worker', role: 'SYSTEM' },
      dto: {
        reason: CancellationReason.AUTO_EXPIRED_UNPAID,
        mode: CancellationMode.SOFT,
        notes: 'auto-expire test',
      },
    });

    expect(second.ok).toBe(true);
    expect(second.alreadyCancelled).toBe(true);
    expect(cancellationCreate).toHaveBeenCalledTimes(1);
    expect(notificationsEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.BOOKING_CANCELLED,
      }),
    );
  });
});
