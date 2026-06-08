import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FeeStatus, Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { PropertyFeePaymentService } from './property-fee-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripePaymentsProvider } from '../payments/providers/stripe.provider';

function makePrisma() {
  return {
    propertyFee: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    stripeWebhookEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: MockTx) => Promise<unknown>) => fn(makePrismaTx())),
  } as unknown as PrismaService;
}

type MockTx = {
  propertyFee: {
    findMany: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  stripeWebhookEvent: {
    create: jest.Mock;
  };
};

function makePrismaTx(): MockTx {
  return {
    propertyFee: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    stripeWebhookEvent: {
      create: jest.fn(),
    },
  };
}

function makeStripe() {
  return {
    createPaymentIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
  } as unknown as StripePaymentsProvider;
}

const BASE_FEE = {
  id: 'fee-1',
  propertyId: 'prop-1',
  vendorId: 'vendor-1',
  type: 'ACTIVATION',
  status: FeeStatus.UNPAID,
  amountMinor: 210000,
  stripePaymentIntentId: null,
};

const MOCK_PAYMENT_INTENT = {
  id: 'pi_test_123',
  client_secret: 'pi_test_123_secret_abc',
  status: 'requires_payment_method',
} as unknown as Stripe.PaymentIntent;

describe('PropertyFeePaymentService', () => {
  let service: PropertyFeePaymentService;
  let prisma: ReturnType<typeof makePrisma>;
  let stripe: ReturnType<typeof makeStripe>;

  beforeEach(() => {
    prisma = makePrisma();
    stripe = makeStripe();
    service = new PropertyFeePaymentService(
      prisma as PrismaService,
      stripe as StripePaymentsProvider,
    );
  });

  // ── initiateFeePayment ──────────────────────────────────────────────────────

  describe('initiateFeePayment', () => {
    beforeEach(() => {
      (prisma.propertyFee.findMany as jest.Mock).mockResolvedValue([BASE_FEE]);
      (stripe.createPaymentIntent as jest.Mock).mockResolvedValue(MOCK_PAYMENT_INTENT);
      (prisma.propertyFee.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    });

    it('creates a PaymentIntent with payment_method_types: ["card"]', async () => {
      await service.initiateFeePayment({
        vendorId: 'vendor-1',
        propertyId: 'prop-1',
        feeIds: ['fee-1'],
      });

      const call = (stripe.createPaymentIntent as jest.Mock).mock.calls[0][0] as {
        paymentMethodTypes?: string[];
      };
      expect(call.paymentMethodTypes).toEqual(['card']);
    });

    it('does NOT pass automatic_payment_methods to createPaymentIntent', async () => {
      await service.initiateFeePayment({
        vendorId: 'vendor-1',
        propertyId: 'prop-1',
        feeIds: ['fee-1'],
      });

      const call = (stripe.createPaymentIntent as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(call).not.toHaveProperty('automaticPaymentMethods');
      expect(call).not.toHaveProperty('automatic_payment_methods');
    });

    it('includes propertyId, vendorId, feeIds, and type in metadata', async () => {
      await service.initiateFeePayment({
        vendorId: 'vendor-1',
        propertyId: 'prop-1',
        feeIds: ['fee-1'],
      });

      const call = (stripe.createPaymentIntent as jest.Mock).mock.calls[0][0] as {
        metadata: Record<string, string>;
      };
      expect(call.metadata.propertyId).toBe('prop-1');
      expect(call.metadata.vendorId).toBe('vendor-1');
      expect(call.metadata.feeIds).toBe('fee-1');
      expect(call.metadata.type).toBe('property_fee');
    });

    it('returns clientSecret, paymentIntentId, totalMinor, and feeIds', async () => {
      const result = await service.initiateFeePayment({
        vendorId: 'vendor-1',
        propertyId: 'prop-1',
        feeIds: ['fee-1'],
      });

      expect(result.clientSecret).toBe('pi_test_123_secret_abc');
      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(result.totalMinor).toBe(210000);
      expect(result.feeIds).toEqual(['fee-1']);
      expect(result.reused).toBe(false);
    });

    it('throws ForbiddenException when fee does not belong to vendor/property', async () => {
      (prisma.propertyFee.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.initiateFeePayment({
          vendorId: 'vendor-1',
          propertyId: 'prop-1',
          feeIds: ['fee-x'],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when fee is already PAID', async () => {
      (prisma.propertyFee.findMany as jest.Mock).mockResolvedValue([
        { ...BASE_FEE, status: FeeStatus.PAID },
      ]);

      await expect(
        service.initiateFeePayment({
          vendorId: 'vendor-1',
          propertyId: 'prop-1',
          feeIds: ['fee-1'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no feeIds provided', async () => {
      await expect(
        service.initiateFeePayment({
          vendorId: 'vendor-1',
          propertyId: 'prop-1',
          feeIds: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reuses existing requires_payment_method intent when same feeIds share it', async () => {
      const existingFee = { ...BASE_FEE, stripePaymentIntentId: 'pi_existing' };
      (prisma.propertyFee.findMany as jest.Mock).mockResolvedValue([existingFee]);
      (stripe.retrievePaymentIntent as jest.Mock).mockResolvedValue({
        id: 'pi_existing',
        client_secret: 'pi_existing_secret',
        status: 'requires_payment_method',
      });

      const result = await service.initiateFeePayment({
        vendorId: 'vendor-1',
        propertyId: 'prop-1',
        feeIds: ['fee-1'],
      });

      expect(result.reused).toBe(true);
      expect(result.clientSecret).toBe('pi_existing_secret');
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
    });
  });

  // ── isPropertyFeePaymentIntent ──────────────────────────────────────────────

  describe('isPropertyFeePaymentIntent', () => {
    it('returns true when metadata.type is property_fee', () => {
      const pi = {
        metadata: { type: 'property_fee' },
      } as unknown as Stripe.PaymentIntent;
      expect(service.isPropertyFeePaymentIntent(pi)).toBe(true);
    });

    it('returns false for booking payment intent', () => {
      const pi = {
        metadata: { type: 'booking_payment' },
      } as unknown as Stripe.PaymentIntent;
      expect(service.isPropertyFeePaymentIntent(pi)).toBe(false);
    });

    it('returns false for empty metadata', () => {
      const pi = { metadata: {} } as unknown as Stripe.PaymentIntent;
      expect(service.isPropertyFeePaymentIntent(pi)).toBe(false);
    });
  });

  // ── handleStripePaymentIntentSucceeded ──────────────────────────────────────

  describe('handleStripePaymentIntentSucceeded', () => {
    it('ignores non-property-fee payment intents', async () => {
      const pi = {
        id: 'pi_booking',
        metadata: { type: 'booking_payment', feeIds: '' },
      } as unknown as Stripe.PaymentIntent;

      const result = await service.handleStripePaymentIntentSucceeded({
        eventId: 'evt_1',
        paymentIntent: pi,
      });

      expect(result.ignored).toBe(true);
    });

    it('marks selected fee line items PAID in the transaction', async () => {
      const fee1 = { id: 'fee-1', status: FeeStatus.UNPAID };
      const fee2 = { id: 'fee-2', status: FeeStatus.UNPAID };

      const tx = makePrismaTx();
      (tx.stripeWebhookEvent.create as jest.Mock).mockResolvedValue({});
      (tx.propertyFee.findMany as jest.Mock).mockResolvedValue([fee1, fee2]);
      (tx.propertyFee.update as jest.Mock).mockResolvedValue({});

      (prisma.$transaction as jest.Mock).mockImplementation(
        (fn: (tx: MockTx) => Promise<unknown>) => fn(tx),
      );

      const pi = {
        id: 'pi_fee_123',
        metadata: { type: 'property_fee', feeIds: 'fee-1,fee-2' },
      } as unknown as Stripe.PaymentIntent;

      await service.handleStripePaymentIntentSucceeded({
        eventId: 'evt_1',
        paymentIntent: pi,
      });

      expect(tx.propertyFee.update).toHaveBeenCalledTimes(2);
      const calls = tx.propertyFee.update.mock.calls as Array<[{ where: { id: string }; data: { status: FeeStatus } }]>;
      const updatedIds = calls.map((c) => c[0].where.id).sort();
      expect(updatedIds).toEqual(['fee-1', 'fee-2']);
      const statuses = calls.map((c) => c[0].data.status);
      statuses.forEach((s) => expect(s).toBe(FeeStatus.PAID));
    });

    it('is idempotent — webhook event lock prevents double-processing', async () => {
      const tx = makePrismaTx();
      // Use the real PrismaClientKnownRequestError so instanceof check passes
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '0.0.0',
      });
      (tx.stripeWebhookEvent.create as jest.Mock).mockRejectedValue(p2002);

      (prisma.$transaction as jest.Mock).mockImplementation(
        (fn: (tx: MockTx) => Promise<unknown>) => fn(tx),
      );

      const pi = {
        id: 'pi_fee_123',
        metadata: { type: 'property_fee', feeIds: 'fee-1' },
      } as unknown as Stripe.PaymentIntent;

      const result = await service.handleStripePaymentIntentSucceeded({
        eventId: 'evt_1',
        paymentIntent: pi,
      });

      // Should be idempotent — no error thrown, fees not re-updated
      expect(result.ok).toBe(true);
      expect(tx.propertyFee.update).not.toHaveBeenCalled();
    });
  });
});
