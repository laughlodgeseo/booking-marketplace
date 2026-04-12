import { BadRequestException } from '@nestjs/common';
import {
  ActivationInvoiceStatus,
  PaymentProvider,
  PropertyActivationPaymentStatus,
  PropertyStatus,
} from '@prisma/client';
import type Stripe from 'stripe';

import { ActivationPaymentService } from './activation-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripePaymentsProvider } from './providers/stripe.provider';

describe('ActivationPaymentService', () => {
  it('prevents double payment when a paid activation invoice already exists', async () => {
    const prisma = {
      property: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'property_1',
          vendorId: 'vendor_1',
          title: 'Villa',
          status: PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT,
          activationFee: 5000,
          activationFeeCurrency: 'AED',
          activationPaymentStatus: PropertyActivationPaymentStatus.UNPAID,
        }),
        update: jest.fn().mockResolvedValue({ id: 'property_1' }),
      },
      propertyActivationInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'invoice_paid',
          propertyId: 'property_1',
          vendorId: 'vendor_1',
          amount: 5000,
          currency: 'AED',
          status: ActivationInvoiceStatus.PAID,
          provider: PaymentProvider.STRIPE,
          providerRef: 'pi_paid',
          stripePaymentIntentId: 'pi_paid',
          lastError: null,
          createdAt: new Date(),
          paidAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    } as unknown as PrismaService;

    const stripe = {
      retrievePaymentIntent: jest.fn(),
      createPaymentIntent: jest.fn(),
    } as unknown as StripePaymentsProvider;

    const service = new ActivationPaymentService(prisma, stripe);

    await expect(
      service.createOrReuseStripePaymentIntent({
        propertyId: 'property_1',
        vendorId: 'vendor_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.property.update).toHaveBeenCalledWith({
      where: { id: 'property_1' },
      data: { activationPaymentStatus: PropertyActivationPaymentStatus.PAID },
    });
  });

  it('reuses an existing in-progress Stripe PaymentIntent', async () => {
    const invoiceCreatedAt = new Date('2026-01-01T00:00:00.000Z');
    const invoiceUpdatedAt = new Date('2026-01-01T00:01:00.000Z');

    const invoiceRecord = {
      id: 'invoice_1',
      propertyId: 'property_1',
      vendorId: 'vendor_1',
      amount: 5000,
      currency: 'AED',
      status: ActivationInvoiceStatus.PROCESSING,
      provider: PaymentProvider.STRIPE,
      providerRef: 'pi_existing',
      stripePaymentIntentId: 'pi_existing',
      lastError: null,
      createdAt: invoiceCreatedAt,
      paidAt: null,
      updatedAt: invoiceUpdatedAt,
    };

    const propertyActivationInvoiceFindFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(invoiceRecord);

    const prisma = {
      property: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'property_1',
          vendorId: 'vendor_1',
          title: 'Villa',
          status: PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT,
          activationFee: 5000,
          activationFeeCurrency: 'AED',
          activationPaymentStatus: PropertyActivationPaymentStatus.UNPAID,
        }),
        update: jest.fn().mockResolvedValue({ id: 'property_1' }),
      },
      propertyActivationInvoice: {
        findFirst: propertyActivationInvoiceFindFirst,
        update: jest.fn().mockResolvedValue(invoiceRecord),
      },
    } as unknown as PrismaService;

    const stripe = {
      retrievePaymentIntent: jest.fn().mockResolvedValue({
        id: 'pi_existing',
        status: 'requires_action',
        client_secret: 'cs_existing',
      } as Stripe.PaymentIntent),
      createPaymentIntent: jest.fn(),
    } as unknown as StripePaymentsProvider;

    const service = new ActivationPaymentService(prisma, stripe);

    const result = await service.createOrReuseStripePaymentIntent({
      propertyId: 'property_1',
      vendorId: 'vendor_1',
    });

    expect(result.reused).toBe(true);
    expect(result.clientSecret).toBe('cs_existing');
    expect(result.paymentIntentId).toBe('pi_existing');
    expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
    expect(prisma.property.update).toHaveBeenCalledWith({
      where: { id: 'property_1' },
      data: {
        activationPaymentStatus: PropertyActivationPaymentStatus.IN_PROGRESS,
      },
    });
  });
});
