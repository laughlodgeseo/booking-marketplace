import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  SecurityDepositMode,
  SecurityDepositStatus,
} from '@prisma/client';
import type Stripe from 'stripe';

import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManualPaymentsProvider } from './providers/manual.provider';
import { StripePaymentsProvider } from './providers/stripe.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from '../../bookings/bookings.service';

function buildPaymentsService(overrides?: {
  prisma?: Partial<PrismaService>;
  stripe?: Partial<StripePaymentsProvider>;
}) {
  const prisma = {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'evt_1' }),
    },
    securityDepositPolicy: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    securityDeposit: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    customerDocument: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
        fn(prisma),
      ),
    ...overrides?.prisma,
  } as unknown as PrismaService;

  const stripe = {
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_test',
      client_secret: 'cs_test',
    } as unknown as Stripe.PaymentIntent),
    retrievePaymentIntent: jest.fn(),
    createRefund: jest.fn().mockResolvedValue({ id: 're_test' }),
    ...overrides?.stripe,
  } as unknown as StripePaymentsProvider;

  const manual = {} as ManualPaymentsProvider;
  const notifications = {
    emit: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
  const bookings = {} as BookingsService;

  const eventBus = {
    publish: jest.fn(),
    subscribe: jest.fn(),
  } as unknown as import('./../../events/event-bus.service').EventBusService;

  const service = new PaymentsService(
    prisma,
    manual,
    stripe,
    notifications,
    bookings,
    eventBus,
  );

  return { service, prisma, stripe, notifications };
}

describe('PaymentsService', () => {
  describe('createStripeIntent', () => {
    it('rejects non-PENDING_PAYMENT bookings', async () => {
      const { service, prisma } = buildPaymentsService();
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b1',
        customerId: 'c1',
        status: BookingStatus.CONFIRMED,
        totalAmount: 1000,
        currency: 'AED',
        propertyId: 'p1',
        payment: null,
      });

      await expect(
        service.createStripeIntent({
          actor: { id: 'c1', role: 'CUSTOMER' },
          bookingId: 'b1',
          idempotencyKey: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when customer does not own the booking', async () => {
      const { service, prisma } = buildPaymentsService();
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b1',
        customerId: 'other_customer',
        status: BookingStatus.PENDING_PAYMENT,
        totalAmount: 1000,
        currency: 'AED',
        propertyId: 'p1',
        payment: null,
      });

      await expect(
        service.createStripeIntent({
          actor: { id: 'c1', role: 'CUSTOMER' },
          bookingId: 'b1',
          idempotencyKey: null,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects booking with invalid amount', async () => {
      const { service, prisma } = buildPaymentsService();
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b1',
        customerId: 'c1',
        status: BookingStatus.PENDING_PAYMENT,
        totalAmount: 0,
        currency: 'AED',
        propertyId: 'p1',
        payment: null,
      });

      await expect(
        service.createStripeIntent({
          actor: { id: 'c1', role: 'CUSTOMER' },
          bookingId: 'b1',
          idempotencyKey: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('includes security deposit in PaymentIntent amount', async () => {
      const { service, prisma, stripe } = buildPaymentsService();
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b1',
        customerId: 'c1',
        status: BookingStatus.PENDING_PAYMENT,
        totalAmount: 1000,
        currency: 'AED',
        propertyId: 'p1',
        payment: null,
      });
      (prisma.securityDepositPolicy.findUnique as jest.Mock).mockResolvedValue({
        propertyId: 'p1',
        isActive: true,
        mode: SecurityDepositMode.AUTHORIZE,
        amount: 500,
        currency: 'AED',
      });
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'pay1',
      });
      (prisma.payment.update as jest.Mock).mockResolvedValue({
        id: 'pay1',
      });

      await service.createStripeIntent({
        actor: { id: 'c1', role: 'CUSTOMER' },
        bookingId: 'b1',
        idempotencyKey: null,
      });

      // Stripe should be called with booking(1000) + deposit(500) = 1500 * 100 = 150000 minor units
      expect(stripe.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 150000,
          metadata: expect.objectContaining({
            bookingAmount: '1000',
            depositAmount: '500',
          }),
        }),
      );
    });

    it('creates intent without deposit when no policy exists', async () => {
      const { service, prisma, stripe } = buildPaymentsService();
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b1',
        customerId: 'c1',
        status: BookingStatus.PENDING_PAYMENT,
        totalAmount: 1000,
        currency: 'AED',
        propertyId: 'p1',
        payment: null,
      });
      (prisma.securityDepositPolicy.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      (prisma.payment.create as jest.Mock).mockResolvedValue({ id: 'pay1' });
      (prisma.payment.update as jest.Mock).mockResolvedValue({ id: 'pay1' });

      await service.createStripeIntent({
        actor: { id: 'c1', role: 'CUSTOMER' },
        bookingId: 'b1',
        idempotencyKey: null,
      });

      expect(stripe.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100000,
          metadata: expect.objectContaining({
            depositAmount: '0',
          }),
        }),
      );
    });

    it('reuses existing PaymentIntent if stripePaymentIntentId set', async () => {
      const { service, prisma, stripe } = buildPaymentsService();
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'b1',
        customerId: 'c1',
        status: BookingStatus.PENDING_PAYMENT,
        totalAmount: 1000,
        currency: 'AED',
        propertyId: 'p1',
        payment: {
          id: 'pay1',
          stripePaymentIntentId: 'pi_existing',
        },
      });
      (stripe.retrievePaymentIntent as jest.Mock).mockResolvedValue({
        id: 'pi_existing',
        client_secret: 'cs_existing',
      });

      const result = await service.createStripeIntent({
        actor: { id: 'c1', role: 'CUSTOMER' },
        bookingId: 'b1',
        idempotencyKey: null,
      });

      expect(result.reused).toBe(true);
      expect(result.clientSecret).toBe('cs_existing');
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
    });
  });

  describe('releaseSecurityDeposit', () => {
    it('rejects non-admin actors', async () => {
      const { service } = buildPaymentsService();

      await expect(
        service.releaseSecurityDeposit({
          actor: { id: 'c1', role: 'CUSTOMER' },
          depositId: 'd1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException for missing deposit', async () => {
      const { service, prisma } = buildPaymentsService();
      (prisma.securityDeposit.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.releaseSecurityDeposit({
          actor: { id: 'a1', role: 'ADMIN' },
          depositId: 'missing',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns idempotently if already released', async () => {
      const { service, prisma } = buildPaymentsService();
      const deposit = { id: 'd1', status: SecurityDepositStatus.RELEASED };
      (prisma.securityDeposit.findUnique as jest.Mock).mockResolvedValue(
        deposit,
      );

      const result = await service.releaseSecurityDeposit({
        actor: { id: 'a1', role: 'ADMIN' },
        depositId: 'd1',
      });

      expect(result.ok).toBe(true);
      expect(prisma.securityDeposit.update).not.toHaveBeenCalled();
    });

    it('refunds via Stripe and updates status for REQUIRED deposits', async () => {
      const { service, prisma, stripe } = buildPaymentsService();
      const deposit = {
        id: 'd1',
        status: SecurityDepositStatus.REQUIRED,
        bookingId: 'b1',
        provider: PaymentProvider.STRIPE,
        amount: 500,
        currency: 'AED',
        note: null,
        booking: {
          payment: { stripePaymentIntentId: 'pi_123' },
        },
      };
      (prisma.securityDeposit.findUnique as jest.Mock).mockResolvedValue(
        deposit,
      );
      (prisma.securityDeposit.update as jest.Mock).mockResolvedValue({
        ...deposit,
        status: SecurityDepositStatus.RELEASED,
      });

      const result = await service.releaseSecurityDeposit({
        actor: { id: 'a1', role: 'ADMIN' },
        depositId: 'd1',
        note: 'All good',
      });

      expect(result.ok).toBe(true);
      expect(stripe.createRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentIntentId: 'pi_123',
          amount: 50000, // 500 AED * 100 = 50000 minor units
        }),
      );
      expect(prisma.securityDeposit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SecurityDepositStatus.RELEASED,
          }),
        }),
      );
    });
  });

  describe('claimSecurityDeposit', () => {
    it('rejects non-admin actors', async () => {
      const { service } = buildPaymentsService();

      await expect(
        service.claimSecurityDeposit({
          actor: { id: 'v1', role: 'VENDOR' },
          depositId: 'd1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects claim amount exceeding deposit', async () => {
      const { service, prisma } = buildPaymentsService();
      (prisma.securityDeposit.findUnique as jest.Mock).mockResolvedValue({
        id: 'd1',
        status: SecurityDepositStatus.REQUIRED,
        amount: 500,
      });

      await expect(
        service.claimSecurityDeposit({
          actor: { id: 'a1', role: 'ADMIN' },
          depositId: 'd1',
          claimAmount: 600,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('claims deposit successfully', async () => {
      const { service, prisma } = buildPaymentsService();
      (prisma.securityDeposit.findUnique as jest.Mock).mockResolvedValue({
        id: 'd1',
        status: SecurityDepositStatus.REQUIRED,
        amount: 500,
        bookingId: 'b1',
        note: null,
      });
      (prisma.securityDeposit.update as jest.Mock).mockResolvedValue({
        id: 'd1',
        status: SecurityDepositStatus.CLAIMED,
      });

      const result = await service.claimSecurityDeposit({
        actor: { id: 'a1', role: 'ADMIN' },
        depositId: 'd1',
        claimAmount: 300,
        note: 'Damage to furniture',
      });

      expect(result.ok).toBe(true);
      expect(prisma.securityDeposit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SecurityDepositStatus.CLAIMED,
          }),
        }),
      );
    });
  });

  describe('webhook idempotency', () => {
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
        {
          emit: jest.fn().mockResolvedValue(undefined),
        } as unknown as NotificationsService,
        {} as BookingsService,
        { publish: jest.fn(), subscribe: jest.fn() } as unknown as import('./../../events/event-bus.service').EventBusService,
      );

      jest
        .spyOn(service as never, 'ensureOpsTasksForConfirmedBooking')
        .mockResolvedValue({ createdTypes: [], scheduledFor: null } as never);
      jest
        .spyOn(service as never, 'ensureSecurityDepositForConfirmedBooking')
        .mockResolvedValue(undefined as never);
      jest
        .spyOn(service as never, 'ensureLedgerForCapturedBooking')
        .mockResolvedValue(undefined as never);
      jest
        .spyOn(service as never, 'emitConfirmedNotifications')
        .mockResolvedValue(undefined as never);

      const paymentIntent = {
        id: paymentIntentId,
        amount: 100000,
        currency: 'aed',
        metadata: { bookingId },
      } as unknown as Stripe.PaymentIntent;

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
});
