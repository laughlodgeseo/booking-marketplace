/**
 * P0 Hardening Tests — Payment Safety
 *
 * Tests:
 * 1. Refund amount greater than payment amount → 400
 * 2. Refund amount equal to payment amount → allowed
 * 3. Refund amount less than payment amount → allowed
 * 4. Non-admin refund attempt → 403
 * 5. Non-integer amountOverride → 400
 * 6. Negative amountOverride → 400
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus, RefundStatus } from '@prisma/client';
import type Stripe from 'stripe';

import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManualPaymentsProvider } from './providers/manual.provider';
import { StripePaymentsProvider } from './providers/stripe.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from '../../bookings/bookings.service';
import { ActivationPaymentService } from './activation-payment.service';
import { EventBusService } from '../../events/event-bus.service';

const MOCK_PAYMENT = {
  id: 'pay_1',
  amount: 5000,
  currency: 'AED',
  status: PaymentStatus.CAPTURED,
  provider: PaymentProvider.MANUAL,
  stripePaymentIntentId: null,
  providerRef: 'manual_ref_1',
};

const MOCK_REFUND = {
  id: 'refund_1',
  bookingId: 'booking_1',
  amount: 5000,
  currency: 'AED',
  status: RefundStatus.PENDING,
  provider: PaymentProvider.MANUAL,
  providerRefundRef: null,
  payment: MOCK_PAYMENT,
  booking: { customerId: 'customer_1', propertyId: 'property_1' },
};

function buildPaymentsService() {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ isEmailVerified: true }),
    },
    booking: { findUnique: jest.fn(), update: jest.fn() },
    payment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    paymentEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'evt_1' }),
    },
    refund: {
      findUnique: jest.fn().mockResolvedValue(MOCK_REFUND),
      update: jest
        .fn()
        .mockImplementation((args: { data: object }) =>
          Promise.resolve({ ...MOCK_REFUND, ...args.data }),
        ),
    },
    securityDepositPolicy: { findUnique: jest.fn().mockResolvedValue(null) },
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
  } as unknown as PrismaService;

  const stripe = {
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_test',
      client_secret: 'cs_test',
    } as unknown as Stripe.PaymentIntent),
    retrievePaymentIntent: jest.fn(),
    createRefund: jest.fn().mockResolvedValue({ id: 're_test' }),
  } as unknown as StripePaymentsProvider;

  const manual = {
    refund: jest.fn().mockResolvedValue({ providerRefundRef: 'manual_re_1' }),
  } as unknown as ManualPaymentsProvider;

  const notifications = {
    emit: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
  const bookings = {} as BookingsService;
  const eventBus = {
    publish: jest.fn(),
    subscribe: jest.fn(),
  } as unknown as EventBusService;

  const activationPayments = {
    isActivationPaymentIntent: jest.fn().mockReturnValue(false),
    handleStripePaymentIntentSucceeded: jest.fn(),
    handleStripePaymentIntentFailed: jest.fn(),
    handleStripePaymentIntentProcessing: jest.fn(),
    handleStripePaymentIntentCanceled: jest.fn(),
  } as unknown as ActivationPaymentService;

  const service = new PaymentsService(
    prisma,
    manual,
    stripe,
    activationPayments,
    notifications,
    bookings,
    eventBus,
  );

  return { service, prisma, manual };
}

describe('FIX-003 — Refund amount cap', () => {
  it('rejects amountOverride greater than payment amount → 400', async () => {
    const { service } = buildPaymentsService();

    await expect(
      service.processRefund({
        actor: { id: 'admin_1', role: 'ADMIN' },
        refundId: 'refund_1',
        idempotencyKey: null,
        amountOverride: 9999, // MOCK_PAYMENT.amount is 5000
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows amountOverride equal to payment amount', async () => {
    const { service } = buildPaymentsService();

    const result = await service.processRefund({
      actor: { id: 'admin_1', role: 'ADMIN' },
      refundId: 'refund_1',
      idempotencyKey: null,
      amountOverride: 5000, // exact match
    });

    expect(result.ok).toBe(true);
  });

  it('allows amountOverride less than payment amount', async () => {
    const { service } = buildPaymentsService();

    const result = await service.processRefund({
      actor: { id: 'admin_1', role: 'ADMIN' },
      refundId: 'refund_1',
      idempotencyKey: null,
      amountOverride: 2500, // partial refund
    });

    expect(result.ok).toBe(true);
  });

  it('rejects non-integer amountOverride → 400', async () => {
    const { service } = buildPaymentsService();

    await expect(
      service.processRefund({
        actor: { id: 'admin_1', role: 'ADMIN' },
        refundId: 'refund_1',
        idempotencyKey: null,
        amountOverride: 25.5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects negative amountOverride → 400', async () => {
    const { service } = buildPaymentsService();

    await expect(
      service.processRefund({
        actor: { id: 'admin_1', role: 'ADMIN' },
        refundId: 'refund_1',
        idempotencyKey: null,
        amountOverride: -100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('non-admin refund attempt → 403', async () => {
    const { service } = buildPaymentsService();

    await expect(
      service.processRefund({
        actor: { id: 'customer_1', role: 'CUSTOMER' },
        refundId: 'refund_1',
        idempotencyKey: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
