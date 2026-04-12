import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  ActivationInvoiceStatus,
  PaymentProvider,
  Prisma,
  PropertyActivationPaymentStatus,
  PropertyStatus,
} from '@prisma/client';
import type Stripe from 'stripe';

import { PrismaService } from '../prisma/prisma.service';
import { StripePaymentsProvider } from './providers/stripe.provider';

const ACTIVATION_PAYMENT_METADATA_TYPE = 'activation_fee';

type ActivationWebhookResult = {
  ok: true;
  reused: boolean;
  ignored?: boolean;
};

@Injectable()
export class ActivationPaymentService {
  private readonly logger = new Logger(ActivationPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripePaymentsProvider,
  ) {}

  isActivationPaymentIntent(paymentIntent: Stripe.PaymentIntent): boolean {
    return (
      this.readMetadata(paymentIntent, 'type') ===
      ACTIVATION_PAYMENT_METADATA_TYPE
    );
  }

  async ensurePendingInvoice(args: {
    propertyId: string;
    vendorId: string;
    amount: number;
    currency: string;
  }) {
    const amount = this.normalizeAmountMinor(args.amount);
    const currency = this.normalizeCurrency(args.currency);

    const existing = await this.prisma.propertyActivationInvoice.findFirst({
      where: {
        propertyId: args.propertyId,
        vendorId: args.vendorId,
        status: {
          in: [
            ActivationInvoiceStatus.PENDING,
            ActivationInvoiceStatus.PROCESSING,
            ActivationInvoiceStatus.FAILED,
            ActivationInvoiceStatus.CANCELLED,
          ],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (!existing) {
      return this.prisma.propertyActivationInvoice.create({
        data: {
          propertyId: args.propertyId,
          vendorId: args.vendorId,
          amount,
          currency,
          status: ActivationInvoiceStatus.PENDING,
          provider: PaymentProvider.STRIPE,
          providerRef: null,
          stripePaymentIntentId: null,
          paidAt: null,
          lastError: null,
        },
      });
    }

    return this.prisma.propertyActivationInvoice.update({
      where: { id: existing.id },
      data: {
        amount,
        currency,
        status: ActivationInvoiceStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        providerRef: null,
        stripePaymentIntentId: null,
        paidAt: null,
        lastError: null,
      },
    });
  }

  async createOrReuseStripePaymentIntent(args: {
    propertyId: string;
    vendorId: string;
    idempotencyKey?: string | null;
  }): Promise<{
    propertyId: string;
    propertyStatus: PropertyStatus;
    activationPaymentStatus: PropertyActivationPaymentStatus;
    invoice: {
      id: string;
      amount: number;
      currency: string;
      status: ActivationInvoiceStatus;
      provider: PaymentProvider;
      providerRef: string | null;
      stripePaymentIntentId: string | null;
      createdAt: string;
      paidAt: string | null;
      updatedAt: string;
    };
    clientSecret: string;
    paymentIntentId: string;
    publishableKey: string | null;
    reused: boolean;
  }> {
    const property = await this.prisma.property.findFirst({
      where: { id: args.propertyId, vendorId: args.vendorId },
      select: {
        id: true,
        vendorId: true,
        title: true,
        status: true,
        activationFee: true,
        activationFeeCurrency: true,
        activationPaymentStatus: true,
      },
    });

    if (!property) {
      throw new ForbiddenException('Not your property.');
    }

    if (
      property.activationPaymentStatus === PropertyActivationPaymentStatus.PAID
    ) {
      throw new BadRequestException('Activation payment already completed.');
    }

    const alreadyPaidInvoice =
      await this.prisma.propertyActivationInvoice.findFirst({
        where: {
          propertyId: property.id,
          vendorId: property.vendorId,
          status: ActivationInvoiceStatus.PAID,
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      });

    if (alreadyPaidInvoice) {
      await this.prisma.property.update({
        where: { id: property.id },
        data: {
          activationPaymentStatus: PropertyActivationPaymentStatus.PAID,
        },
      });
      throw new BadRequestException('Activation payment already completed.');
    }

    if (
      property.status !== PropertyStatus.APPROVED_PENDING_ACTIVATION_PAYMENT
    ) {
      throw new BadRequestException(
        `Activation payment is not required in status ${property.status}.`,
      );
    }

    const propertyCurrencyRaw =
      typeof property.activationFeeCurrency === 'string'
        ? property.activationFeeCurrency.trim().toUpperCase()
        : '';
    if (propertyCurrencyRaw !== 'AED') {
      await this.prisma.property.update({
        where: { id: property.id },
        data: { activationFeeCurrency: 'AED' },
      });
      property.activationFeeCurrency = 'AED';
    }

    const amount = this.normalizeAmountMinor(property.activationFee);
    const currency = this.normalizeCurrency(property.activationFeeCurrency);
    const stripeCurrency = currency.toLowerCase();

    if (stripeCurrency !== 'aed') {
      throw new BadRequestException('Invalid currency: only AED allowed');
    }

    let invoice = await this.prisma.propertyActivationInvoice.findFirst({
      where: {
        propertyId: property.id,
        vendorId: property.vendorId,
        status: {
          in: [
            ActivationInvoiceStatus.PENDING,
            ActivationInvoiceStatus.PROCESSING,
            ActivationInvoiceStatus.FAILED,
            ActivationInvoiceStatus.CANCELLED,
          ],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    if (
      !invoice ||
      invoice.amount !== amount ||
      (invoice.currency ?? '').trim().toUpperCase() !== currency
    ) {
      invoice = await this.ensurePendingInvoice({
        propertyId: property.id,
        vendorId: property.vendorId,
        amount,
        currency,
      });
    }

    if (invoice.status === ActivationInvoiceStatus.PAID) {
      throw new BadRequestException('Activation payment already completed.');
    }

    if (invoice.stripePaymentIntentId) {
      try {
        const existingIntent = await this.stripeProvider.retrievePaymentIntent(
          invoice.stripePaymentIntentId,
        );

        const existingClientSecret =
          typeof existingIntent.client_secret === 'string'
            ? existingIntent.client_secret.trim()
            : '';

        if (existingIntent.status === 'succeeded') {
          throw new BadRequestException(
            'Activation payment already succeeded. Waiting for webhook confirmation.',
          );
        }

        if (
          this.canReuseStripeIntent(existingIntent.status) &&
          existingClientSecret
        ) {
          const updatedInvoice =
            await this.prisma.propertyActivationInvoice.update({
              where: { id: invoice.id },
              data: {
                provider: PaymentProvider.STRIPE,
                providerRef: existingIntent.id,
                stripePaymentIntentId: existingIntent.id,
                status: ActivationInvoiceStatus.PROCESSING,
                lastError: null,
              },
            });

          await this.prisma.property.update({
            where: { id: property.id },
            data: {
              activationPaymentStatus:
                PropertyActivationPaymentStatus.IN_PROGRESS,
            },
          });

          return {
            propertyId: property.id,
            propertyStatus: property.status,
            activationPaymentStatus:
              PropertyActivationPaymentStatus.IN_PROGRESS,
            invoice: this.serializeInvoice(updatedInvoice),
            clientSecret: existingClientSecret,
            paymentIntentId: existingIntent.id,
            publishableKey: this.publishableKey(),
            reused: true,
          };
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.warn(
          `activation_payment intent_retrieve_failed invoiceId=${invoice.id} message=${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const stripeIdempotencyKey =
      this.normalizeIdempotencyKey(args.idempotencyKey) ??
      `activation:${invoice.id}:create-intent`;

    const paymentIntent = await this.stripeProvider.createPaymentIntent({
      amount,
      currency: stripeCurrency,
      description: `Property activation fee (${property.id})`,
      metadata: {
        propertyId: property.id,
        vendorId: property.vendorId,
        type: ACTIVATION_PAYMENT_METADATA_TYPE,
        activationInvoiceId: invoice.id,
      },
      idempotencyKey: stripeIdempotencyKey,
    });

    const clientSecret =
      typeof paymentIntent.client_secret === 'string'
        ? paymentIntent.client_secret.trim()
        : '';

    if (!clientSecret) {
      throw new BadGatewayException(
        'Stripe did not return a client secret for activation payment.',
      );
    }

    const updatedInvoice = await this.prisma.propertyActivationInvoice.update({
      where: { id: invoice.id },
      data: {
        provider: PaymentProvider.STRIPE,
        providerRef: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        status: ActivationInvoiceStatus.PROCESSING,
        lastError: null,
      },
    });

    await this.prisma.property.update({
      where: { id: property.id },
      data: {
        activationPaymentStatus: PropertyActivationPaymentStatus.IN_PROGRESS,
      },
    });

    return {
      propertyId: property.id,
      propertyStatus: property.status,
      activationPaymentStatus: PropertyActivationPaymentStatus.IN_PROGRESS,
      invoice: this.serializeInvoice(updatedInvoice),
      clientSecret,
      paymentIntentId: paymentIntent.id,
      publishableKey: this.publishableKey(),
      reused: false,
    };
  }

  async handleStripePaymentIntentSucceeded(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<ActivationWebhookResult> {
    if (!this.isActivationPaymentIntent(args.paymentIntent)) {
      return { ok: true, reused: false, ignored: true };
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const acquired = await this.acquireWebhookEventLock(tx, {
          eventId: args.eventId,
          type: 'payment_intent.succeeded',
        });

        if (!acquired) {
          return { reused: true, ignored: false } as const;
        }

        const invoice = await this.findInvoiceByPaymentIntent(
          tx,
          args.paymentIntent,
        );
        if (!invoice) {
          return { reused: false, ignored: true } as const;
        }

        const property = await tx.property.findUnique({
          where: { id: invoice.propertyId },
          select: {
            id: true,
            status: true,
            activationPaymentStatus: true,
          },
        });

        if (!property) {
          return { reused: false, ignored: true } as const;
        }

        if (invoice.status !== ActivationInvoiceStatus.PAID) {
          await tx.propertyActivationInvoice.update({
            where: { id: invoice.id },
            data: {
              status: ActivationInvoiceStatus.PAID,
              provider: PaymentProvider.STRIPE,
              providerRef: args.paymentIntent.id,
              stripePaymentIntentId: args.paymentIntent.id,
              paidAt: new Date(),
              lastError: null,
            },
          });
        }

        await tx.property.update({
          where: { id: property.id },
          data: {
            status: PropertyStatus.PUBLISHED,
            activationPaymentStatus: PropertyActivationPaymentStatus.PAID,
          },
        });

        return { reused: false, ignored: false } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { ok: true, reused: result.reused, ignored: result.ignored };
  }

  async handleStripePaymentIntentFailed(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<ActivationWebhookResult> {
    return this.handleFailureLikeEvent({
      eventId: args.eventId,
      paymentIntent: args.paymentIntent,
      eventType: 'payment_intent.payment_failed',
      nextInvoiceStatus: ActivationInvoiceStatus.FAILED,
    });
  }

  async handleStripePaymentIntentProcessing(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<ActivationWebhookResult> {
    if (!this.isActivationPaymentIntent(args.paymentIntent)) {
      return { ok: true, reused: false, ignored: true };
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const acquired = await this.acquireWebhookEventLock(tx, {
          eventId: args.eventId,
          type: 'payment_intent.processing',
        });

        if (!acquired) {
          return { reused: true, ignored: false } as const;
        }

        const invoice = await this.findInvoiceByPaymentIntent(
          tx,
          args.paymentIntent,
        );
        if (!invoice) {
          return { reused: false, ignored: true } as const;
        }

        if (invoice.status !== ActivationInvoiceStatus.PAID) {
          await tx.propertyActivationInvoice.update({
            where: { id: invoice.id },
            data: {
              status: ActivationInvoiceStatus.PROCESSING,
              provider: PaymentProvider.STRIPE,
              providerRef: args.paymentIntent.id,
              stripePaymentIntentId: args.paymentIntent.id,
            },
          });

          await tx.property.update({
            where: { id: invoice.propertyId },
            data: {
              activationPaymentStatus:
                PropertyActivationPaymentStatus.IN_PROGRESS,
            },
          });
        }

        return { reused: false, ignored: false } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { ok: true, reused: result.reused, ignored: result.ignored };
  }

  async handleStripePaymentIntentCanceled(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<ActivationWebhookResult> {
    return this.handleFailureLikeEvent({
      eventId: args.eventId,
      paymentIntent: args.paymentIntent,
      eventType: 'payment_intent.canceled',
      nextInvoiceStatus: ActivationInvoiceStatus.CANCELLED,
    });
  }

  private async handleFailureLikeEvent(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
    eventType: 'payment_intent.payment_failed' | 'payment_intent.canceled';
    nextInvoiceStatus: ActivationInvoiceStatus;
  }): Promise<ActivationWebhookResult> {
    if (!this.isActivationPaymentIntent(args.paymentIntent)) {
      return { ok: true, reused: false, ignored: true };
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const acquired = await this.acquireWebhookEventLock(tx, {
          eventId: args.eventId,
          type: args.eventType,
        });

        if (!acquired) {
          return { reused: true, ignored: false } as const;
        }

        const invoice = await this.findInvoiceByPaymentIntent(
          tx,
          args.paymentIntent,
        );
        if (!invoice) {
          return { reused: false, ignored: true } as const;
        }

        if (invoice.status !== ActivationInvoiceStatus.PAID) {
          await tx.propertyActivationInvoice.update({
            where: { id: invoice.id },
            data: {
              status: args.nextInvoiceStatus,
              provider: PaymentProvider.STRIPE,
              providerRef: args.paymentIntent.id,
              stripePaymentIntentId: args.paymentIntent.id,
              lastError: this.extractLastError(args.paymentIntent),
            },
          });

          await tx.property.update({
            where: { id: invoice.propertyId },
            data: {
              activationPaymentStatus: PropertyActivationPaymentStatus.UNPAID,
            },
          });
        }

        return { reused: false, ignored: false } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { ok: true, reused: result.reused, ignored: result.ignored };
  }

  private canReuseStripeIntent(status: Stripe.PaymentIntent.Status): boolean {
    return (
      status === 'requires_payment_method' ||
      status === 'requires_confirmation' ||
      status === 'requires_action' ||
      status === 'processing'
    );
  }

  private async acquireWebhookEventLock(
    tx: Prisma.TransactionClient,
    args: { eventId: string; type: string },
  ): Promise<boolean> {
    try {
      await tx.stripeWebhookEvent.create({
        data: {
          eventId: args.eventId,
          type: args.type,
          bookingId: null,
        },
      });
      return true;
    } catch (error) {
      if (this.isDuplicateStripeWebhookEvent(error)) {
        return false;
      }
      throw error;
    }
  }

  private isDuplicateStripeWebhookEvent(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (error.code !== 'P2002') return false;

    const target = (error.meta as { target?: unknown } | undefined)?.target;
    if (Array.isArray(target)) {
      return target.includes('eventId');
    }
    return false;
  }

  private async findInvoiceByPaymentIntent(
    tx: Prisma.TransactionClient,
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const metadataInvoiceId = this.readMetadata(
      paymentIntent,
      'activationInvoiceId',
    );
    const metadataPropertyId = this.readMetadata(paymentIntent, 'propertyId');
    const metadataVendorId = this.readMetadata(paymentIntent, 'vendorId');

    if (metadataInvoiceId) {
      const byInvoiceId = await tx.propertyActivationInvoice.findFirst({
        where: {
          id: metadataInvoiceId,
          ...(metadataPropertyId ? { propertyId: metadataPropertyId } : {}),
          ...(metadataVendorId ? { vendorId: metadataVendorId } : {}),
        },
      });
      if (byInvoiceId) return byInvoiceId;
    }

    const byIntentId = await tx.propertyActivationInvoice.findFirst({
      where: {
        OR: [
          { stripePaymentIntentId: paymentIntent.id },
          { providerRef: paymentIntent.id },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    if (byIntentId) return byIntentId;

    if (!metadataPropertyId || !metadataVendorId) return null;

    return tx.propertyActivationInvoice.findFirst({
      where: {
        propertyId: metadataPropertyId,
        vendorId: metadataVendorId,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  private readMetadata(
    paymentIntent: Stripe.PaymentIntent,
    key: string,
  ): string {
    const value = paymentIntent.metadata?.[key];
    if (typeof value !== 'string') return '';
    return value.trim();
  }

  private normalizeAmountMinor(amount: unknown): number {
    const parsed = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        'Activation fee is required and must be a positive integer amount in minor units.',
      );
    }
    return parsed;
  }

  private normalizeCurrency(currency: unknown): string {
    const normalized =
      typeof currency === 'string' && currency.trim().length > 0
        ? currency.trim().toUpperCase()
        : 'AED';

    if (!/^[A-Z]{3}$/.test(normalized)) {
      throw new BadRequestException(
        'Activation fee currency must be a valid 3-letter code.',
      );
    }

    if (normalized !== 'AED') {
      throw new BadRequestException(
        'Activation fee currency must be AED for Stripe activation payments.',
      );
    }

    return normalized;
  }

  private normalizeIdempotencyKey(input?: string | null): string | null {
    if (typeof input !== 'string') return null;
    const cleaned = input.trim();
    if (!cleaned) return null;
    return cleaned.slice(0, 255);
  }

  private publishableKey(): string | null {
    const key = (process.env.STRIPE_PUBLISHABLE_KEY ?? '').trim();
    return key.length > 0 ? key : null;
  }

  private extractLastError(paymentIntent: Stripe.PaymentIntent): string | null {
    const maybeError = paymentIntent.last_payment_error?.message;
    if (typeof maybeError !== 'string') return null;
    const cleaned = maybeError.trim();
    return cleaned.length > 0 ? cleaned : null;
  }

  private serializeInvoice(invoice: {
    id: string;
    amount: number;
    currency: string;
    status: ActivationInvoiceStatus;
    provider: PaymentProvider;
    providerRef: string | null;
    stripePaymentIntentId: string | null;
    createdAt: Date;
    paidAt: Date | null;
    updatedAt: Date;
  }) {
    return {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      provider: invoice.provider,
      providerRef: invoice.providerRef,
      stripePaymentIntentId: invoice.stripePaymentIntentId,
      createdAt: invoice.createdAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString() ?? null,
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }
}
