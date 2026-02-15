import {
  BookingStatus,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
} from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManualPaymentsProvider } from './providers/manual.provider';
import { TelrPaymentsProvider } from './providers/telr.provider';
import { NotificationsService } from '../notifications/notifications.service';

describe('PaymentsService webhook idempotency', () => {
  it('reuses duplicate TELR webhook capture event without double-apply', async () => {
    const bookingId = 'booking_webhook_1';
    const paymentId = 'payment_webhook_1';
    const providerRef = 'TELR_REF_1';
    const webhookEventId =
      'telr:txn_webhook_1:paid:telr_ref_1:booking_webhook_1';

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
      return { id: 'evt_1' };
    });

    const tx = {
      booking: {
        findUnique: jest.fn().mockImplementation(() => ({
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
            provider: PaymentProvider.TELR,
            providerRef,
            status: paymentStatus,
            amount: 1000,
            currency: 'AED',
          },
        })),
        update: bookingUpdate,
      },
      payment: {
        update: paymentUpdate,
      },
      paymentEvent: {
        findUnique: jest.fn().mockImplementation(() => {
          if (!eventExists) return null;
          return {
            id: 'evt_1',
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
      {} as TelrPaymentsProvider,
      {
        emit: jest.fn().mockResolvedValue(undefined),
      } as unknown as NotificationsService,
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

    const first = await service.handleTelrWebhookCapturedVerified({
      bookingId,
      providerRef,
      webhookEventId,
      currency: 'AED',
      amountMinor: 1000,
      statusCode: '3',
      statusText: 'paid',
    });

    const second = await service.handleTelrWebhookCapturedVerified({
      bookingId,
      providerRef,
      webhookEventId,
      currency: 'AED',
      amountMinor: 1000,
      statusCode: '3',
      statusText: 'paid',
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
