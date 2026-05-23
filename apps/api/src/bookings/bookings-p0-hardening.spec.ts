/**
 * P0 Hardening Tests — Booking Safety
 *
 * Tests:
 * 1. Booking suspended property → 400
 * 2. Booking archived property → 400
 * 3. Booking draft property → 400
 * 4. Booking under_review property → 400
 * 5. Booking PUBLISHED property → allowed (happy path)
 * 6. Customer A cannot access Customer B booking (IDOR)
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  BookingStatus,
  HoldStatus,
  PropertyStatus,
  UserRole,
  Prisma,
} from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { CancellationPolicyService } from './policies/cancellation.policy';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { PricingService } from '../modules/pricing/pricing.service';
import { DubaiTaxService } from '../common/pricing/dubai-tax.service';

function buildBookingsService(overrides?: { prisma?: Partial<PrismaService> }) {
  const prisma = {
    booking: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
    ...overrides?.prisma,
  } as unknown as PrismaService;

  const cancellationPolicy = {
    decide: jest.fn(),
  } as unknown as CancellationPolicyService;

  const notifications = {
    emit: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  const pricing = {
    calculateTotal: jest
      .fn()
      .mockResolvedValue({ nightlyBreakdown: [], subtotal: 0 }),
  } as unknown as PricingService;

  const dubaiTax = {
    calculate: jest.fn().mockReturnValue({
      baseTotal: 0,
      cleaningFee: 0,
      serviceCharge: 0,
      municipalityFee: 0,
      tourismFee: 0,
      subtotalBeforeVat: 0,
      vat: 0,
      tourismDirham: 0,
      total: 1000,
    }),
  } as unknown as DubaiTaxService;

  return new BookingsService(
    prisma,
    cancellationPolicy,
    notifications,
    pricing,
    dubaiTax,
  );
}

const ACTIVE_HOLD = {
  id: 'hold_1',
  createdById: 'customer_1',
  propertyId: 'property_1',
  checkIn: new Date('2026-07-01T00:00:00.000Z'),
  checkOut: new Date('2026-07-05T00:00:00.000Z'),
  status: HoldStatus.ACTIVE,
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  adults: 2,
  children: 0,
  quotedTotalAed: 5000,
  quotedTotalDisplay: 5000,
  displayCurrency: 'AED',
  fxRate: new Prisma.Decimal('1'),
  fxAsOfDate: null,
  fxProvider: null,
  quotedBreakdown: null,
  bookingId: null,
  convertedAt: null,
};

function buildTransactionMockWithPropertyStatus(status: PropertyStatus) {
  return jest
    .fn()
    .mockImplementation(
      async (
        fn: (tx: {
          propertyHold: { findUnique: jest.Mock };
          property: { findUnique: jest.Mock };
          booking: { findFirst: jest.Mock };
        }) => Promise<unknown>,
      ) =>
        fn({
          propertyHold: {
            findUnique: jest.fn().mockResolvedValue(ACTIVE_HOLD),
          },
          property: {
            findUnique: jest
              .fn()
              .mockResolvedValue({ id: 'property_1', status }),
          },
          booking: { findFirst: jest.fn().mockResolvedValue(null) },
        }),
    );
}

describe('FIX-002 — Property status guard at booking creation', () => {
  const nonPublishedStatuses: PropertyStatus[] = [
    PropertyStatus.DRAFT,
    PropertyStatus.UNDER_REVIEW,
    PropertyStatus.SUSPENDED,
    PropertyStatus.ARCHIVED,
    PropertyStatus.APPROVED,
    PropertyStatus.CHANGES_REQUESTED,
    PropertyStatus.REJECTED,
  ];

  it.each(nonPublishedStatuses)(
    'blocks booking when property status is %s',
    async (propertyStatus) => {
      const prisma = {
        booking: { findFirst: jest.fn().mockResolvedValue(null) },
        $transaction: buildTransactionMockWithPropertyStatus(propertyStatus),
      } as unknown as PrismaService;

      const service = buildBookingsService({ prisma });

      await expect(
        service.createFromHold({
          userId: 'customer_1',
          userRole: UserRole.CUSTOMER,
          holdId: 'hold_1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('allows booking when property status is PUBLISHED', async () => {
    const bookingCreate = jest.fn().mockResolvedValue({
      id: 'booking_pub_1',
      totalAmount: 5000,
      currency: 'AED',
      totalAmountAed: 5000,
      displayTotalAmount: 5000,
      displayCurrency: 'AED',
    });

    const prisma = {
      booking: { findFirst: jest.fn().mockResolvedValue(null) },
      // computeQuote calls this.prisma.property.findUnique (not the tx version)
      property: {
        findUnique: jest.fn().mockResolvedValue({
          basePrice: 1000,
          cleaningFee: 0,
          starRating: null,
        }),
      },
      $transaction: jest.fn().mockImplementation(
        async (
          fn: (tx: {
            propertyHold: {
              findUnique: jest.Mock;
              findFirst: jest.Mock;
              update: jest.Mock;
            };
            property: { findUnique: jest.Mock };
            booking: { findFirst: jest.Mock; create: jest.Mock };
            propertyCalendarDay: { findFirst: jest.Mock };
            bookingBlockedDate: {
              findFirst: jest.Mock;
              createMany: jest.Mock;
            };
          }) => Promise<unknown>,
        ) =>
          fn({
            propertyHold: {
              findUnique: jest.fn().mockResolvedValue(ACTIVE_HOLD),
              findFirst: jest.fn().mockResolvedValue(null),
              update: jest.fn().mockResolvedValue({
                id: ACTIVE_HOLD.id,
                status: HoldStatus.CONVERTED,
              }),
            },
            property: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'property_1',
                status: PropertyStatus.PUBLISHED,
              }),
            },
            booking: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: bookingCreate,
            },
            propertyCalendarDay: {
              findFirst: jest.fn().mockResolvedValue(null),
            },
            bookingBlockedDate: {
              findFirst: jest.fn().mockResolvedValue(null),
              createMany: jest.fn().mockResolvedValue({ count: 4 }),
            },
          }),
      ),
    } as unknown as PrismaService;

    const service = buildBookingsService({ prisma });

    const result = await service.createFromHold({
      userId: 'customer_1',
      userRole: UserRole.CUSTOMER,
      holdId: 'hold_1',
    });

    expect(result.ok).toBe(true);
    expect(result.reused).toBe(false);
  });
});

describe('FIX-009 — Customer IDOR: cannot access another customer booking', () => {
  it('throws ForbiddenException when customer cancels another customers booking', async () => {
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation(
          async (
            fn: (tx: {
              booking: { findUnique: jest.Mock };
            }) => Promise<unknown>,
          ) =>
            fn({
              booking: {
                findUnique: jest.fn().mockResolvedValue({
                  id: 'booking_other',
                  status: BookingStatus.PENDING_PAYMENT,
                  customerId: 'customer_B',
                  propertyId: 'property_1',
                  checkIn: new Date('2026-08-01'),
                  checkOut: new Date('2026-08-05'),
                  totalAmount: 1000,
                  totalAmountAed: 1000,
                  displayTotalAmount: 1000,
                  displayCurrency: 'AED',
                  fxRate: new Prisma.Decimal('1'),
                  fxAsOfDate: null,
                  currency: 'AED',
                  cancellationReason: null,
                  property: { vendorId: 'vendor_1' },
                  payment: null,
                  cancellation: null,
                }),
              },
            }),
        ),
    } as unknown as PrismaService;

    const service = buildBookingsService({ prisma });

    await expect(
      service.cancelBooking({
        bookingId: 'booking_other',
        actorUser: { id: 'customer_A', role: 'CUSTOMER' },
        dto: {},
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
