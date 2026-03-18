import {
  BookingStatus,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import type Stripe from 'stripe';

import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManualPaymentsProvider } from './providers/manual.provider';
import { StripePaymentsProvider } from './providers/stripe.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from '../../bookings/bookings.service';

describe('PaymentsService webhook idempotency', () => {
  it('reuses duplicate STRIPE payment_intent.succeeded event without double-apply', async () => {
    const bookingId = 'booking_webhook_1';
    const paymentId = 'payment_webhook_1';
    const paymentIntentId = 'pi_123';
    const webhookEventId = 'evt_123';

    let bookingStatus: BookingStatus = BookingStatus.PENDING_PAYMENT;
    let paymentStatus: PaymentStatus = PaymentStatus.REQUIRES_ACTION;
    let eventExists = false;

    const paymentUpdate = jest.fn().mockImplementation(() => {
      paymentStatus = PaymentStatus.CAPTURED;
      return { id: paymentId, status: paymentStatus };
    });

    const bookingUpdate = jest.fn().mockImplementation(() => {
      bookingStatus = BookingStatus.CONFIRMED;
      return { id: bookingId, status: bookingStatus };
    });

    const paymentEventCreate = jest.fn().mockImplementation(() => {
      eventExists = true;
      return { id: 'evt_local_1' };
    });

    const bookingRecord = {
      id: bookingId,
      customerId: 'customer_1',
      status: bookingStatus,
      checkIn: new Date('2026-06-01T00:00:00.000Z'),
      checkOut: new Date('2026-06-05T00:00:00.000Z'),
      totalAmount: 1000,
      currency: 'AED',
      propertyId: 'property_1',
      property: { vendorId: 'vendor_1' },
      payment: {
        id: paymentId,
        provider: PaymentProvider.STRIPE,
        providerRef: paymentIntentId,
        stripePaymentIntentId: paymentIntentId,
        status: paymentStatus,
        amount: 1000,
        currency: 'AED',
      },
    };

    const tx = {
      booking: {
        findUnique: jest.fn().mockImplementation(() => bookingRecord),
        update: bookingUpdate,
      },
      payment: {
        findUnique: jest.fn().mockImplementation(() => ({
          ...bookingRecord.payment,
          booking: bookingRecord,
        })),
        update: paymentUpdate,
      },
      paymentEvent: {
        findUnique: jest.fn().mockImplementation(() => {
          if (!eventExists) return null;
          return {
            id: 'evt_local_1',
            paymentId,
            type: PaymentEventType.WEBHOOK,
            idempotencyKey: webhookEventId,
          };
        }),
        create: paymentEventCreate,
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation(
        (
          fn: (trx: typeof tx) => Promise<{
            booking: { status: BookingStatus };
            reused: boolean;
          }>,
        ) => fn(tx),
      ),
      customerDocument: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    const service = new PaymentsService(
      prisma,
      {} as ManualPaymentsProvider,
      {} as StripePaymentsProvider,
      { emit: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService,
      {} as BookingsService,
    );

    jest
      .spyOn(
        service as unknown as {
          ensureOpsTasksForConfirmedBooking: (
            trx: unknown,
            id: string,
          ) => Promise<{ createdTypes: []; scheduledFor: null }>;
        },
        'ensureOpsTasksForConfirmedBooking',
      )
      .mockResolvedValue({ createdTypes: [], scheduledFor: null });

    jest
      .spyOn(
        service as unknown as {
          ensureSecurityDepositForConfirmedBooking: (
            trx: unknown,
            id: string,
          ) => Promise<void>;
        },
        'ensureSecurityDepositForConfirmedBooking',
      )
      .mockResolvedValue(undefined);

    jest
      .spyOn(
        service as unknown as {
          ensureLedgerForCapturedBooking: (
            trx: unknown,
            id: string,
          ) => Promise<void>;
        },
        'ensureLedgerForCapturedBooking',
      )
      .mockResolvedValue(undefined);

    jest
      .spyOn(
        service as unknown as {
          emitConfirmedNotifications: (
            booking: unknown,
            vendorId: string | null,
            ops: unknown,
          ) => Promise<void>;
        },
        'emitConfirmedNotifications',
      )
      .mockResolvedValue(undefined);

    const paymentIntent = {
      id: paymentIntentId,
      amount: 1000,
      currency: 'aed',
      metadata: { bookingId },
    } as Stripe.PaymentIntent;

    const first = await service.handleStripePaymentIntentSucceeded({
      eventId: webhookEventId,
      paymentIntent,
    });

    const second = await service.handleStripePaymentIntentSucceeded({
      eventId: webhookEventId,
      paymentIntent,
    });

    expect(first.ok).toBe(true);
    expect(first.reused).toBe(false);
    expect(second.ok).toBe(true);
    expect(second.reused).toBe(true);

    expect(paymentEventCreate).toHaveBeenCalledTimes(1);
    expect(paymentUpdate).toHaveBeenCalledTimes(1);
    expect(bookingUpdate).toHaveBeenCalledTimes(1);
  });
});
