import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FeeStatus, Prisma } from '@prisma/client';
import type Stripe from 'stripe';

import { PrismaService } from '../prisma/prisma.service';
import { StripePaymentsProvider } from '../payments/providers/stripe.provider';
import { formatAed } from './property-fee.service';

const PROPERTY_FEE_METADATA_TYPE = 'property_fee';

type FeePaymentResult = {
  ok: true;
  reused: boolean;
  ignored?: boolean;
};

@Injectable()
export class PropertyFeePaymentService {
  private readonly logger = new Logger(PropertyFeePaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripePaymentsProvider,
  ) {}

  isPropertyFeePaymentIntent(paymentIntent: Stripe.PaymentIntent): boolean {
    return (
      (paymentIntent.metadata?.['type'] ?? '').trim() ===
      PROPERTY_FEE_METADATA_TYPE
    );
  }

  async initiateFeePayment(args: {
    vendorId: string;
    propertyId: string;
    feeIds: string[];
  }): Promise<{
    clientSecret: string;
    publishableKey: string | null;
    paymentIntentId: string;
    feeIds: string[];
    totalMinor: number;
    totalFormatted: string;
    reused: boolean;
  }> {
    if (!args.feeIds || args.feeIds.length === 0) {
      throw new BadRequestException('At least one fee ID is required.');
    }

    const sortedFeeIds = [...new Set(args.feeIds)].sort();

    // Load fees, verify ownership and payability
    const fees = await this.prisma.propertyFee.findMany({
      where: {
        id: { in: sortedFeeIds },
        propertyId: args.propertyId,
        vendorId: args.vendorId,
      },
    });

    if (fees.length !== sortedFeeIds.length) {
      throw new ForbiddenException(
        'One or more fee IDs are invalid or do not belong to your property.',
      );
    }

    const alreadyPaid = fees.filter((f) => f.status !== FeeStatus.UNPAID);
    if (alreadyPaid.length > 0) {
      const types = alreadyPaid.map((f) => f.type).join(', ');
      throw new BadRequestException(
        `The following fees are not payable (already paid or waived): ${types}.`,
      );
    }

    const totalMinor = fees.reduce((sum, f) => sum + f.amountMinor, 0);
    if (totalMinor <= 0) {
      throw new BadRequestException('Total fee amount must be greater than 0.');
    }

    // Idempotency: if all selected fees already share the same paymentIntentId, reuse it
    const existingIntentId =
      fees[0]?.stripePaymentIntentId ?? null;
    const allSameIntent =
      existingIntentId !== null &&
      fees.every((f) => f.stripePaymentIntentId === existingIntentId);

    if (allSameIntent && existingIntentId) {
      try {
        const existing =
          await this.stripeProvider.retrievePaymentIntent(existingIntentId);
        if (existing.status === 'succeeded') {
          throw new BadRequestException(
            'Payment already succeeded. Waiting for webhook confirmation.',
          );
        }
        if (this.canReuseIntent(existing.status)) {
          const clientSecret =
            typeof existing.client_secret === 'string'
              ? existing.client_secret.trim()
              : '';
          if (clientSecret) {
            return {
              clientSecret,
              publishableKey: this.publishableKey(),
              paymentIntentId: existing.id,
              feeIds: sortedFeeIds,
              totalMinor,
              totalFormatted: formatAed(totalMinor),
              reused: true,
            };
          }
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        this.logger.warn(
          `initiateFeePayment retrieve_failed paymentIntentId=${existingIntentId} err=${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const idempotencyKey = `property_fee:${args.propertyId}:${sortedFeeIds.join(',')}`;

    const feeTypes = fees.map((f) => f.type).join(',');
    const paymentIntent = await this.stripeProvider.createPaymentIntent({
      amount: totalMinor,
      currency: 'aed',
      description: `Property onboarding fees (${feeTypes}) for property ${args.propertyId}`,
      metadata: {
        type: PROPERTY_FEE_METADATA_TYPE,
        propertyId: args.propertyId,
        vendorId: args.vendorId,
        feeIds: sortedFeeIds.join(','),
      },
      idempotencyKey,
      paymentMethodTypes: ['card'],
    });

    const clientSecret =
      typeof paymentIntent.client_secret === 'string'
        ? paymentIntent.client_secret.trim()
        : '';

    if (!clientSecret) {
      throw new BadGatewayException(
        'Stripe did not return a client secret for fee payment.',
      );
    }

    // Record the intent ID on all fees atomically
    await this.prisma.propertyFee.updateMany({
      where: { id: { in: sortedFeeIds } },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    this.logger.log(
      `initiateFeePayment created paymentIntentId=${paymentIntent.id} propertyId=${args.propertyId} vendorId=${args.vendorId} feeIds=${sortedFeeIds.join(',')} totalMinor=${totalMinor}`,
    );

    return {
      clientSecret,
      publishableKey: this.publishableKey(),
      paymentIntentId: paymentIntent.id,
      feeIds: sortedFeeIds,
      totalMinor,
      totalFormatted: formatAed(totalMinor),
      reused: false,
    };
  }

  async handleStripePaymentIntentSucceeded(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<FeePaymentResult> {
    if (!this.isPropertyFeePaymentIntent(args.paymentIntent)) {
      return { ok: true, reused: false, ignored: true };
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const acquired = await this.acquireWebhookEventLock(tx, {
          eventId: args.eventId,
          type: 'payment_intent.succeeded',
        });
        if (!acquired) return { reused: true } as const;

        const feeIds = this.parseFeeIds(args.paymentIntent);
        if (feeIds.length === 0) {
          this.logger.warn(
            `handleFeePaymentSucceeded no_fee_ids paymentIntentId=${args.paymentIntent.id}`,
          );
          return { reused: false, ignored: true } as const;
        }

        const fees = await tx.propertyFee.findMany({
          where: { id: { in: feeIds } },
        });

        const now = new Date();
        for (const fee of fees) {
          if (fee.status !== FeeStatus.PAID) {
            await tx.propertyFee.update({
              where: { id: fee.id },
              data: {
                status: FeeStatus.PAID,
                paidAt: now,
                stripePaymentIntentId: args.paymentIntent.id,
              },
            });
          }
        }

        this.logger.log(
          `handleFeePaymentSucceeded marked_paid feeIds=${feeIds.join(',')} paymentIntentId=${args.paymentIntent.id}`,
        );
        return { reused: false } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if ('ignored' in result && result.ignored) {
      return { ok: true, reused: false, ignored: true };
    }
    return { ok: true, reused: result.reused };
  }

  async handleStripePaymentIntentFailed(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<FeePaymentResult> {
    if (!this.isPropertyFeePaymentIntent(args.paymentIntent)) {
      return { ok: true, reused: false, ignored: true };
    }

    await this.prisma.$transaction(async (tx) => {
      const acquired = await this.acquireWebhookEventLock(tx, {
        eventId: args.eventId,
        type: 'payment_intent.payment_failed',
      });
      if (!acquired) return;

      // Clear the intent ID so the vendor can retry
      const feeIds = this.parseFeeIds(args.paymentIntent);
      if (feeIds.length > 0) {
        await tx.propertyFee.updateMany({
          where: { id: { in: feeIds }, status: FeeStatus.UNPAID },
          data: { stripePaymentIntentId: null },
        });
      }
    });

    return { ok: true, reused: false };
  }

  async handleStripePaymentIntentCanceled(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<FeePaymentResult> {
    return this.handleStripePaymentIntentFailed(args);
  }

  private parseFeeIds(paymentIntent: Stripe.PaymentIntent): string[] {
    const raw = (paymentIntent.metadata?.['feeIds'] ?? '').trim();
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private canReuseIntent(status: Stripe.PaymentIntent.Status): boolean {
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
        data: { eventId: args.eventId, type: args.type, bookingId: null },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }

  private publishableKey(): string | null {
    const key = (process.env.STRIPE_PUBLISHABLE_KEY ?? '').trim();
    return key.length > 0 ? key : null;
  }
}
