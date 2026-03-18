import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripePaymentsProvider {
  private client: Stripe | null = null;

  private getClient(): Stripe {
    const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
    if (!this.client) {
      const apiVersionRaw = (process.env.STRIPE_API_VERSION ?? '').trim();
      const apiVersion = apiVersionRaw
        ? (apiVersionRaw as Stripe.LatestApiVersion)
        : undefined;
      this.client = new Stripe(key, apiVersion ? { apiVersion } : undefined);
    }
    return this.client;
  }

  private normalizeCurrency(currency: string): string {
    return (currency ?? '').trim().toLowerCase();
  }

  async createPaymentIntent(args: {
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    description: string;
    idempotencyKey?: string | null;
  }): Promise<Stripe.PaymentIntent> {
    const stripe = this.getClient();

    return await stripe.paymentIntents.create(
      {
        amount: Math.trunc(args.amount),
        currency: this.normalizeCurrency(args.currency),
        metadata: args.metadata,
        description: args.description,
        automatic_payment_methods: { enabled: true },
      },
      args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
    );
  }

  async retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    const stripe = this.getClient();
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async createRefund(args: {
    paymentIntentId: string;
    amount: number;
    idempotencyKey?: string | null;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    const stripe = this.getClient();

    return await stripe.refunds.create(
      {
        payment_intent: args.paymentIntentId,
        amount: Math.trunc(args.amount),
        metadata: args.metadata,
      },
      args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
    );
  }

  constructWebhookEvent(args: {
    rawBody: Buffer;
    signature: string;
    webhookSecret?: string | null;
  }): Stripe.Event {
    const stripe = this.getClient();
    const secret = (args.webhookSecret ?? '').trim();
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');

    return stripe.webhooks.constructEvent(
      args.rawBody,
      args.signature,
      secret,
    );
  }
}
