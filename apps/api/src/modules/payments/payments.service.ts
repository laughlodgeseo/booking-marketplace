import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  CancellationMode,
  CancellationReason,
  CustomerDocumentStatus,
  CustomerDocumentType,
  LedgerDirection,
  LedgerEntryType,
  OpsTaskStatus,
  OpsTaskType,
  PaymentEventType,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RefundStatus,
  NotificationType,
  SecurityDepositMode,
  SecurityDepositStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ManualPaymentsProvider } from './providers/manual.provider';
import { StripePaymentsProvider } from './providers/stripe.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingsService } from '../../bookings/bookings.service';
import type Stripe from 'stripe';

type Actor = { id: string; role: 'CUSTOMER' | 'VENDOR' | 'ADMIN' };

type AuthorizeResult =
  | {
      ok: true;
      reused: boolean;
      payment: unknown;
      provider: PaymentProvider;
      stripe: { clientSecret: string; publishableKey: string };
    }
  | { ok: true; reused: boolean; payment: unknown; provider: PaymentProvider };

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manualProvider: ManualPaymentsProvider,
    private readonly stripeProvider: StripePaymentsProvider,
    private readonly notifications: NotificationsService,
    private readonly bookings: BookingsService,
  ) {}

  /**
   * STRIPE-only policy (customer-facing):
   * - CUSTOMER payments must use STRIPE.
   * - MANUAL is allowed only for internal/dev/admin flows.
   * - Booking becomes CONFIRMED only via Stripe webhooks.
   */
  async authorize(args: {
    actor: Actor;
    bookingId: string;
    provider: PaymentProvider;
    idempotencyKey: string | null;
  }): Promise<AuthorizeResult> {
    const requested = args.provider ?? PaymentProvider.STRIPE;
    const idempotencyKey = (args.idempotencyKey ?? '').trim() || null;

    // ✅ Customer-facing: STRIPE only (ignore/deny other providers)
    const provider: PaymentProvider =
      args.actor.role === 'CUSTOMER' ? PaymentProvider.STRIPE : requested;

    if (
      provider !== PaymentProvider.STRIPE &&
      provider !== PaymentProvider.MANUAL
    ) {
      throw new BadRequestException(`Provider ${provider} is not supported.`);
    }

    if (args.actor.role === 'CUSTOMER' && provider !== PaymentProvider.STRIPE) {
      throw new BadRequestException(
        'STRIPE is the only supported payment method.',
      );
    }

    if (provider === PaymentProvider.STRIPE) {
      const stripeIntent = await this.createStripeIntent({
        actor: args.actor,
        bookingId: args.bookingId,
        idempotencyKey,
      });

      return {
        ok: true,
        reused: stripeIntent.reused,
        payment: stripeIntent.payment,
        provider: PaymentProvider.STRIPE,
        stripe: {
          clientSecret: stripeIntent.clientSecret,
          publishableKey: stripeIntent.publishableKey,
        },
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: args.bookingId },
        include: { payment: true },
      });
      if (!booking) throw new NotFoundException('Booking not found.');

      if (
        args.actor.role === 'CUSTOMER' &&
        booking.customerId !== args.actor.id
      ) {
        throw new ForbiddenException('You can only pay for your own booking.');
      }

      if (booking.status !== BookingStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          `Booking is not payable from status ${booking.status}.`,
        );
      }

      const payment =
        booking.payment ??
        (await tx.payment.create({
          data: {
            bookingId: booking.id,
            provider,
            status: PaymentStatus.REQUIRES_ACTION,
            amount: booking.totalAmount,
            currency: booking.currency,
          },
        }));

      // If provider changed between retries, update payment.provider (safe)
      if (payment.provider !== provider) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { provider },
        });
      }

      // ✅ Idempotency: AUTHORIZE
      if (idempotencyKey) {
        const existingEvent = await tx.paymentEvent.findUnique({
          where: {
            uniq_payment_event_idempotency: {
              paymentId: payment.id,
              type: PaymentEventType.AUTHORIZE,
              idempotencyKey,
            },
          },
        });

        if (existingEvent) {
          const refreshed = await tx.payment.findUnique({
            where: { id: payment.id },
          });
          return {
            ok: true,
            reused: true,
            payment: refreshed,
            provider: payment.provider,
          };
        }
      }

      // If already authorized/captured: idempotent no-op
      if (
        payment.status === PaymentStatus.AUTHORIZED ||
        payment.status === PaymentStatus.CAPTURED
      ) {
        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.AUTHORIZE,
            idempotencyKey,
            providerRef: payment.providerRef ?? null,
          },
        });
        return { ok: true, reused: true, payment, provider: payment.provider };
      }

      // ✅ MANUAL (internal/dev flow only)
      const res = await this.manualProvider.authorize({
        bookingId: booking.id,
        amount: payment.amount,
        currency: payment.currency,
      });

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.AUTHORIZED,
          providerRef: res.providerRef,
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.AUTHORIZE,
          idempotencyKey,
          providerRef: res.providerRef,
        },
      });

      return { ok: true, reused: false, payment: updated, provider };
    });
  }

  async createStripeIntent(args: {
    actor: Actor;
    bookingId: string;
    idempotencyKey: string | null;
  }): Promise<{
    ok: true;
    reused: boolean;
    payment: unknown;
    provider: PaymentProvider;
    clientSecret: string;
    publishableKey: string;
  }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: args.bookingId },
      include: { payment: true },
    });

    if (!booking) throw new NotFoundException('Booking not found.');

    if (
      args.actor.role === 'CUSTOMER' &&
      booking.customerId !== args.actor.id
    ) {
      throw new ForbiddenException('You can only pay for your own booking.');
    }

    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Booking is not payable from status ${booking.status}.`,
      );
    }

    const amount = Number(booking.totalAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid booking amount.');
    }

    const currency = (booking.currency ?? '').trim() || 'AED';
    const publishableKey = (process.env.STRIPE_PUBLISHABLE_KEY ?? '').trim();
    if (!publishableKey) {
      throw new BadRequestException(
        'STRIPE_PUBLISHABLE_KEY is not configured.',
      );
    }

    if (booking.payment?.stripePaymentIntentId) {
      const existingIntent = await this.stripeProvider.retrievePaymentIntent(
        booking.payment.stripePaymentIntentId,
      );
      const clientSecret = existingIntent.client_secret;
      if (!clientSecret) {
        throw new BadRequestException(
          'Stripe PaymentIntent is missing client_secret.',
        );
      }

      return {
        ok: true,
        reused: true,
        payment: booking.payment,
        provider: PaymentProvider.STRIPE,
        clientSecret,
        publishableKey,
      };
    }

    const stripeIdempotencyKey = args.idempotencyKey
      ? `booking:${booking.id}:${args.idempotencyKey}`
      : `booking:${booking.id}`;

    const stripeIntent = await this.stripeProvider.createPaymentIntent({
      amount,
      currency,
      description: `Booking ${booking.id}`,
      metadata: {
        bookingId: booking.id,
        userId: booking.customerId,
      },
      idempotencyKey: stripeIdempotencyKey,
    });

    const clientSecret = stripeIntent.client_secret;
    if (!clientSecret) {
      throw new BadGatewayException(
        'Stripe PaymentIntent did not return client_secret.',
      );
    }

    const updated = await this.prisma.$transaction(
      async (tx) => {
        const latest = await tx.booking.findUnique({
          where: { id: booking.id },
          include: { payment: true },
        });
        if (!latest) throw new NotFoundException('Booking not found.');
        if (latest.status !== BookingStatus.PENDING_PAYMENT) {
          throw new BadRequestException(
            `Booking is not payable from status ${latest.status}.`,
          );
        }

        let payment =
          latest.payment ??
          (await tx.payment.create({
            data: {
              bookingId: latest.id,
              provider: PaymentProvider.STRIPE,
              status: PaymentStatus.REQUIRES_ACTION,
              amount,
              currency,
            },
          }));

        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            provider: PaymentProvider.STRIPE,
            status: PaymentStatus.REQUIRES_ACTION,
            amount,
            currency,
            providerRef: stripeIntent.id,
            stripePaymentIntentId: stripeIntent.id,
            rawPayloadJson: JSON.stringify(
              this.redactStripePaymentIntent(stripeIntent),
            ),
          },
        });

        const eventKey = `stripe_pi:${stripeIntent.id}`;
        const existingEvent = await tx.paymentEvent.findUnique({
          where: {
            uniq_payment_event_idempotency: {
              paymentId: updatedPayment.id,
              type: PaymentEventType.AUTHORIZE,
              idempotencyKey: eventKey,
            },
          },
        });

        if (!existingEvent) {
          await tx.paymentEvent.create({
            data: {
              paymentId: updatedPayment.id,
              type: PaymentEventType.AUTHORIZE,
              idempotencyKey: eventKey,
              providerRef: stripeIntent.id,
              payloadJson: JSON.stringify({
                kind: 'STRIPE_CREATE_INTENT',
                bookingId: latest.id,
                paymentIntentId: stripeIntent.id,
              }),
            },
          });
        }

        return updatedPayment;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return {
      ok: true,
      reused: false,
      payment: updated,
      provider: PaymentProvider.STRIPE,
      clientSecret,
      publishableKey,
    };
  }

  async capture(args: {
    actor: Actor;
    bookingId: string;
    idempotencyKey: string | null;
  }) {
    const idempotencyKey = (args.idempotencyKey ?? '').trim() || null;

    const ensureOpsTasks = async (
      tx: Prisma.TransactionClient,
      bookingId: string,
    ): Promise<{ createdTypes: OpsTaskType[]; scheduledFor: Date | null }> => {
      return this.ensureOpsTasksForConfirmedBooking(tx, bookingId);
    };

    const txResult = await this.prisma.$transaction(
      async (tx) => {
        // ✅ HARD GATE: email must be verified before capture
        if (args.actor.role === 'CUSTOMER') {
          const actor = await tx.user.findUnique({
            where: { id: args.actor.id },
            select: { isEmailVerified: true },
          });

          if (!actor) throw new NotFoundException('User not found.');
          if (!actor.isEmailVerified) {
            throw new ForbiddenException(
              'Email not verified. Please verify your email to proceed.',
            );
          }
        }

        const booking = await tx.booking.findUnique({
          where: { id: args.bookingId },
          include: {
            payment: true,
            property: { select: { vendorId: true } },
          },
        });
        if (!booking) throw new NotFoundException('Booking not found.');
        if (!booking.payment)
          throw new BadRequestException('No payment exists for booking.');

        if (
          args.actor.role === 'CUSTOMER' &&
          booking.customerId !== args.actor.id
        ) {
          throw new ForbiddenException(
            'You can only capture payment for your own booking.',
          );
        }

        if (booking.status !== BookingStatus.PENDING_PAYMENT) {
          throw new BadRequestException(
            `Cannot capture from booking status ${booking.status}.`,
          );
        }

        const payment = booking.payment;

        // ✅ Stripe is webhook-confirmed ONLY.
        if (payment.provider !== PaymentProvider.MANUAL) {
          throw new BadRequestException(
            `Provider ${payment.provider} is webhook-confirmed. Use Stripe webhook to confirm booking.`,
          );
        }

        // ✅ Idempotency
        if (idempotencyKey) {
          const existingEvent = await tx.paymentEvent.findUnique({
            where: {
              uniq_payment_event_idempotency: {
                paymentId: payment.id,
                type: PaymentEventType.CAPTURE,
                idempotencyKey,
              },
            },
          });

          if (existingEvent) {
            const refreshedPayment = await tx.payment.findUnique({
              where: { id: payment.id },
            });
            const refreshedBooking = await tx.booking.findUnique({
              where: { id: booking.id },
            });

            let ops = {
              createdTypes: [] as OpsTaskType[],
              scheduledFor: null as Date | null,
            };
            if (refreshedBooking?.status === BookingStatus.CONFIRMED) {
              ops = await ensureOpsTasks(tx, booking.id);
              await this.ensureSecurityDepositForConfirmedBooking(
                tx,
                booking.id,
              );
              await this.ensureLedgerForCapturedBooking(tx, booking.id);
            }

            return {
              ok: true,
              reused: true,
              payment: refreshedPayment,
              booking: refreshedBooking,
              vendorId: booking.property.vendorId,
              ops,
            };
          }
        }

        if (payment.status === PaymentStatus.CAPTURED) {
          await tx.paymentEvent.create({
            data: {
              paymentId: payment.id,
              type: PaymentEventType.CAPTURE,
              idempotencyKey,
              providerRef: payment.providerRef ?? null,
            },
          });

          const refreshedBooking = await tx.booking.findUnique({
            where: { id: booking.id },
          });

          let ops = {
            createdTypes: [] as OpsTaskType[],
            scheduledFor: null as Date | null,
          };
          if (refreshedBooking?.status === BookingStatus.CONFIRMED) {
            ops = await ensureOpsTasks(tx, booking.id);
            await this.ensureSecurityDepositForConfirmedBooking(tx, booking.id);
            await this.ensureLedgerForCapturedBooking(tx, booking.id);
          }

          return {
            ok: true,
            reused: true,
            payment,
            booking: refreshedBooking,
            vendorId: booking.property.vendorId,
            ops,
          };
        }

        if (payment.status !== PaymentStatus.AUTHORIZED) {
          throw new BadRequestException(
            `Payment is not capturable from status ${payment.status}.`,
          );
        }

        const res = await this.manualProvider.capture({
          providerRef: payment.providerRef ?? `manual_missing_${payment.id}`,
        });

        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            providerRef: res.providerRef,
          },
        });

        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CONFIRMED },
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.CAPTURE,
            idempotencyKey,
            providerRef: res.providerRef,
          },
        });

        const ops = await ensureOpsTasks(tx, updatedBooking.id);

        await this.ensureSecurityDepositForConfirmedBooking(
          tx,
          updatedBooking.id,
        );
        await this.ensureLedgerForCapturedBooking(tx, updatedBooking.id);

        return {
          ok: true,
          reused: false,
          payment: updatedPayment,
          booking: updatedBooking,
          vendorId: booking.property.vendorId,
          ops,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.emitConfirmedNotifications(
      txResult.booking,
      txResult.vendorId ?? null,
      txResult.ops,
    );

    return txResult;
  }

  async processRefund(args: {
    actor: Actor;
    refundId: string;
    idempotencyKey: string | null;
    amountOverride?: number;
  }) {
    const idempotencyKey = (args.idempotencyKey ?? '').trim() || null;

    const result = await this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: { id: args.refundId },
        include: {
          payment: true,
          booking: { select: { customerId: true, propertyId: true } },
        },
      });
      if (!refund) throw new NotFoundException('Refund not found.');
      if (!refund.payment)
        throw new BadRequestException('Refund has no payment attached.');

      if (args.actor.role !== 'ADMIN') {
        throw new ForbiddenException('Only ADMIN can process refunds in V1.');
      }

      if (refund.status === RefundStatus.SUCCEEDED) {
        return { ok: true, reused: true, refund };
      }

      if (
        refund.status !== RefundStatus.PENDING &&
        refund.status !== RefundStatus.PROCESSING
      ) {
        throw new BadRequestException(
          `Refund cannot be processed from status ${refund.status}.`,
        );
      }

      const payment = refund.payment;

      if (idempotencyKey) {
        const existingEvent = await tx.paymentEvent.findUnique({
          where: {
            uniq_payment_event_idempotency: {
              paymentId: payment.id,
              type: PaymentEventType.REFUND,
              idempotencyKey,
            },
          },
        });

        if (existingEvent) {
          const refreshedRefund = await tx.refund.findUnique({
            where: { id: refund.id },
          });
          return { ok: true, reused: true, refund: refreshedRefund };
        }
      }

      const amount =
        typeof args.amountOverride === 'number' && args.amountOverride > 0
          ? args.amountOverride
          : refund.amount;

      await tx.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.PROCESSING },
      });

      let providerRefundRef: string | null = null;
      let updatedRefund = refund;

      if (refund.provider === PaymentProvider.MANUAL) {
        const res = await this.manualProvider.refund({
          providerRef: payment.providerRef ?? null,
          refundId: refund.id,
          amount,
          currency: refund.currency,
        });
        providerRefundRef = res.providerRefundRef;

        updatedRefund = await tx.refund.update({
          where: { id: refund.id },
          data: { status: RefundStatus.SUCCEEDED, providerRefundRef },
          include: {
            payment: true,
            booking: { select: { customerId: true, propertyId: true } },
          },
        });
      } else if (refund.provider === PaymentProvider.STRIPE) {
        const paymentIntentId = payment.stripePaymentIntentId;
        if (!paymentIntentId) {
          throw new BadRequestException(
            'Stripe refund requires stripePaymentIntentId.',
          );
        }

        const stripeRefund = await this.stripeProvider.createRefund({
          paymentIntentId,
          amount,
          idempotencyKey: idempotencyKey ?? refund.id,
          metadata: {
            refundId: refund.id,
            bookingId: refund.bookingId,
            paymentId: payment.id,
          },
        });

        providerRefundRef = stripeRefund.id;
        updatedRefund = await tx.refund.update({
          where: { id: refund.id },
          data: { status: RefundStatus.PROCESSING, providerRefundRef },
          include: {
            payment: true,
            booking: { select: { customerId: true, propertyId: true } },
          },
        });
      } else {
        throw new BadRequestException(
          `Provider ${refund.provider} refund execution not enabled yet.`,
        );
      }

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.REFUND,
          idempotencyKey,
          providerRef: providerRefundRef,
        },
      });

      return {
        ok: true,
        reused: false,
        refund: updatedRefund,
        bookingCustomerId: refund.booking?.customerId ?? null,
        bookingId: refund.bookingId,
        propertyId: refund.booking?.propertyId ?? null,
        amount,
        currency: refund.currency,
      };
    });

    try {
      if (
        result?.ok &&
        result?.bookingCustomerId &&
        result?.refund?.status === RefundStatus.SUCCEEDED
      ) {
        await this.notifications.emit({
          type: NotificationType.REFUND_PROCESSED,
          entityType: 'REFUND',
          entityId: result.refund.id,
          recipientUserId: result.bookingCustomerId,
          payload: {
            refund: {
              id: result.refund.id,
              bookingId: result.bookingId,
              amount: result.amount,
              currency: result.currency,
              status: result.refund.status,
            },
          },
        });
      }
    } catch {
      // non-blocking
    }

    return result;
  }

  /**
   * STRIPE webhook-driven confirmation (payment_intent.succeeded).
   */
  async handleStripePaymentIntentSucceeded(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<{ ok: true; reused: boolean; ignored?: boolean }> {
    const txResult = await this.prisma.$transaction(
      async (tx) => {
        const ctx = await this.resolveStripeContext(tx, args.paymentIntent);
        if (!ctx) return { ignored: true } as const;

        const { booking, payment } = ctx;

        const existing = await tx.paymentEvent.findUnique({
          where: {
            uniq_payment_event_idempotency: {
              paymentId: payment.id,
              type: PaymentEventType.WEBHOOK,
              idempotencyKey: args.eventId,
            },
          },
        });

        if (existing) {
          const ops = await this.ensureOpsTasksForConfirmedBooking(
            tx,
            booking.id,
          );
          await this.ensureSecurityDepositForConfirmedBooking(tx, booking.id);
          await this.ensureLedgerForCapturedBooking(tx, booking.id);

          const refreshedBooking = await tx.booking.findUnique({
            where: { id: booking.id },
          });

          return {
            booking: refreshedBooking ?? booking,
            vendorId: booking.property.vendorId,
            ops,
            reused: true,
          } as const;
        }

        const currency = this.normalizeCurrency(args.paymentIntent.currency);
        const expectedCurrency = this.normalizeCurrency(
          payment.currency ?? booking.currency,
        );

        if (expectedCurrency && currency && expectedCurrency !== currency) {
          throw new BadRequestException(
            'Currency mismatch between payment and Stripe PaymentIntent.',
          );
        }

        if (Number(payment.amount) !== Number(args.paymentIntent.amount)) {
          throw new BadRequestException(
            'Amount mismatch between payment and Stripe PaymentIntent.',
          );
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            provider: PaymentProvider.STRIPE,
            providerRef: args.paymentIntent.id,
            stripePaymentIntentId: args.paymentIntent.id,
            rawPayloadJson: JSON.stringify(
              this.redactStripePaymentIntent(args.paymentIntent),
            ),
          },
        });

        if (booking.status === BookingStatus.PENDING_PAYMENT) {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.CONFIRMED },
          });
        }

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.WEBHOOK,
            idempotencyKey: args.eventId,
            providerRef: args.paymentIntent.id,
            payloadJson: JSON.stringify({
              kind: 'STRIPE_PAYMENT_INTENT_SUCCEEDED',
              bookingId: booking.id,
              paymentIntentId: args.paymentIntent.id,
            }),
          },
        });

        const ops = await this.ensureOpsTasksForConfirmedBooking(
          tx,
          booking.id,
        );

        await this.ensureSecurityDepositForConfirmedBooking(tx, booking.id);
        await this.ensureLedgerForCapturedBooking(tx, booking.id);

        const refreshedBooking = await tx.booking.findUnique({
          where: { id: booking.id },
        });

        return {
          booking: refreshedBooking ?? booking,
          vendorId: booking.property.vendorId,
          ops,
          reused: false,
        } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if ('ignored' in txResult && txResult.ignored) {
      return { ok: true, reused: false, ignored: true };
    }

    await this.emitConfirmedNotifications(
      txResult.booking,
      txResult.vendorId ?? null,
      txResult.ops,
    );

    return { ok: true, reused: txResult.reused };
  }

  /**
   * STRIPE webhook-driven failure (payment_intent.payment_failed).
   */
  async handleStripePaymentIntentFailed(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<{ ok: true; reused: boolean; ignored?: boolean }> {
    const txResult = await this.prisma.$transaction(async (tx) => {
      const ctx = await this.resolveStripeContext(tx, args.paymentIntent);
      if (!ctx) return { ignored: true } as const;

      const { booking, payment } = ctx;

      const existing = await tx.paymentEvent.findUnique({
        where: {
          uniq_payment_event_idempotency: {
            paymentId: payment.id,
            type: PaymentEventType.WEBHOOK,
            idempotencyKey: args.eventId,
          },
        },
      });

      if (existing) {
        return {
          reused: true,
          bookingId: booking.id,
          customerId: booking.customerId,
          bookingStatus: booking.status,
        } as const;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.STRIPE,
          providerRef: args.paymentIntent.id,
          stripePaymentIntentId: args.paymentIntent.id,
          rawPayloadJson: JSON.stringify(
            this.redactStripePaymentIntent(args.paymentIntent),
          ),
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.WEBHOOK,
          idempotencyKey: args.eventId,
          providerRef: args.paymentIntent.id,
          payloadJson: JSON.stringify({
            kind: 'STRIPE_PAYMENT_INTENT_FAILED',
            bookingId: booking.id,
            paymentIntentId: args.paymentIntent.id,
          }),
        },
      });

      return {
        reused: false,
        bookingId: booking.id,
        customerId: booking.customerId,
        bookingStatus: booking.status,
      } as const;
    });

    if ('ignored' in txResult && txResult.ignored) {
      return { ok: true, reused: false, ignored: true };
    }

    if (!txResult.reused) {
      if (txResult.bookingStatus === BookingStatus.PENDING_PAYMENT) {
        try {
          await this.bookings.cancelBooking({
            bookingId: txResult.bookingId,
            actorUser: { id: 'stripe-webhook', role: 'SYSTEM' },
            dto: {
              reason: CancellationReason.NO_PAYMENT,
              mode: CancellationMode.SOFT,
              notes: 'Stripe payment failed webhook.',
            },
          });
        } catch {
          // non-blocking
        }
      }

      try {
        await this.notifications.emit({
          type: NotificationType.PAYMENT_FAILED,
          entityType: 'BOOKING',
          entityId: txResult.bookingId,
          recipientUserId: txResult.customerId,
          payload: { bookingId: txResult.bookingId, provider: 'STRIPE' },
        });
      } catch {
        // non-blocking
      }
    }

    return { ok: true, reused: txResult.reused };
  }

  /**
   * STRIPE webhook-driven cancellation (payment_intent.canceled).
   */
  async handleStripePaymentIntentCanceled(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<{ ok: true; reused: boolean; ignored?: boolean }> {
    const txResult = await this.prisma.$transaction(async (tx) => {
      const ctx = await this.resolveStripeContext(tx, args.paymentIntent);
      if (!ctx) return { ignored: true } as const;

      const { booking, payment } = ctx;

      const existing = await tx.paymentEvent.findUnique({
        where: {
          uniq_payment_event_idempotency: {
            paymentId: payment.id,
            type: PaymentEventType.WEBHOOK,
            idempotencyKey: args.eventId,
          },
        },
      });

      if (existing) {
        return {
          reused: true,
          bookingId: booking.id,
          customerId: booking.customerId,
          bookingStatus: booking.status,
        } as const;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          provider: PaymentProvider.STRIPE,
          providerRef: args.paymentIntent.id,
          stripePaymentIntentId: args.paymentIntent.id,
          rawPayloadJson: JSON.stringify(
            this.redactStripePaymentIntent(args.paymentIntent),
          ),
        },
      });

      await tx.refund.updateMany({
        where: {
          paymentId: payment.id,
          status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] },
        },
        data: { status: RefundStatus.CANCELLED },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.WEBHOOK,
          idempotencyKey: args.eventId,
          providerRef: args.paymentIntent.id,
          payloadJson: JSON.stringify({
            kind: 'STRIPE_PAYMENT_INTENT_CANCELED',
            bookingId: booking.id,
            paymentIntentId: args.paymentIntent.id,
          }),
        },
      });

      return {
        reused: false,
        bookingId: booking.id,
        customerId: booking.customerId,
        bookingStatus: booking.status,
      } as const;
    });

    if ('ignored' in txResult && txResult.ignored) {
      return { ok: true, reused: false, ignored: true };
    }

    if (!txResult.reused) {
      if (txResult.bookingStatus === BookingStatus.PENDING_PAYMENT) {
        try {
          await this.bookings.cancelBooking({
            bookingId: txResult.bookingId,
            actorUser: { id: 'stripe-webhook', role: 'SYSTEM' },
            dto: {
              reason: CancellationReason.AUTO_EXPIRED_UNPAID,
              mode: CancellationMode.SOFT,
              notes: 'Stripe payment canceled webhook.',
            },
          });
        } catch {
          // non-blocking
        }
      }

      try {
        await this.notifications.emit({
          type: NotificationType.PAYMENT_FAILED,
          entityType: 'BOOKING',
          entityId: txResult.bookingId,
          recipientUserId: txResult.customerId,
          payload: { bookingId: txResult.bookingId, provider: 'STRIPE' },
        });
      } catch {
        // non-blocking
      }
    }

    return { ok: true, reused: txResult.reused };
  }

  /**
   * STRIPE webhook-driven refund sync (charge.refunded).
   */
  async handleStripeChargeRefunded(args: {
    eventId: string;
    charge: Stripe.Charge;
  }): Promise<{ ok: true; reused: boolean; ignored?: boolean }> {
    const paymentIntentId =
      typeof args.charge.payment_intent === 'string'
        ? args.charge.payment_intent
        : args.charge.payment_intent?.id;

    if (!paymentIntentId) {
      return { ok: true, reused: false, ignored: true };
    }

    const txResult = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!payment) return { ignored: true } as const;

      const existing = await tx.paymentEvent.findUnique({
        where: {
          uniq_payment_event_idempotency: {
            paymentId: payment.id,
            type: PaymentEventType.WEBHOOK,
            idempotencyKey: args.eventId,
          },
        },
      });

      if (existing) {
        return { reused: true, refundIds: [] } as const;
      }

      const refundIds =
        args.charge.refunds?.data?.map((refund) => refund.id) ?? [];

      if (args.charge.refunded) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            rawPayloadJson: JSON.stringify(args.charge),
          },
        });
      }

      let matchedCount = 0;
      if (refundIds.length > 0) {
        const matched = await tx.refund.updateMany({
          where: {
            providerRefundRef: { in: refundIds },
            status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] },
          },
          data: { status: RefundStatus.SUCCEEDED },
        });
        matchedCount = matched.count;
      }

      let fallbackUpdatedId: string | null = null;
      if (refundIds.length === 0 || matchedCount === 0) {
        const fallback = await tx.refund.findFirst({
          where: {
            paymentId: payment.id,
            status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (fallback) {
          const fallbackRef =
            refundIds[0] ?? fallback.providerRefundRef ?? args.charge.id;
          await tx.refund.update({
            where: { id: fallback.id },
            data: {
              status: RefundStatus.SUCCEEDED,
              providerRefundRef: fallbackRef,
            },
          });
          fallbackUpdatedId = fallback.id;
        }
      }

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.WEBHOOK,
          idempotencyKey: args.eventId,
          providerRef: paymentIntentId,
          payloadJson: JSON.stringify({
            kind: 'STRIPE_CHARGE_REFUNDED',
            paymentIntentId,
            chargeId: args.charge.id,
          }),
        },
      });

      return { reused: false, refundIds, fallbackUpdatedId } as const;
    });

    if ('ignored' in txResult && txResult.ignored) {
      return { ok: true, reused: false, ignored: true };
    }

    if (!txResult.reused) {
      const refundsToNotify = await this.prisma.refund.findMany({
        where: {
          status: RefundStatus.SUCCEEDED,
          OR: [
            { providerRefundRef: { in: txResult.refundIds } },
            ...(txResult.fallbackUpdatedId
              ? [{ id: txResult.fallbackUpdatedId }]
              : []),
          ],
        },
        include: {
          booking: { select: { customerId: true } },
        },
      });

      for (const refund of refundsToNotify) {
        if (!refund.booking?.customerId) continue;
        try {
          await this.notifications.emit({
            type: NotificationType.REFUND_PROCESSED,
            entityType: 'REFUND',
            entityId: refund.id,
            recipientUserId: refund.booking.customerId,
            payload: {
              refund: {
                id: refund.id,
                bookingId: refund.bookingId,
                amount: refund.amount,
                currency: refund.currency,
                status: refund.status,
              },
            },
          });
        } catch {
          // non-blocking
        }
      }
    }

    return { ok: true, reused: txResult.reused };
  }

  private normalizeCurrency(value?: string | null): string {
    return (value ?? '').trim().toUpperCase();
  }

  private redactStripePaymentIntent(
    paymentIntent: Stripe.PaymentIntent,
  ): Stripe.PaymentIntent {
    return { ...paymentIntent, client_secret: null };
  }

  private async resolveStripeContext(
    tx: Prisma.TransactionClient,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<{
    booking: {
      id: string;
      customerId: string;
      propertyId: string;
      checkIn: Date;
      checkOut: Date;
      totalAmount: number;
      currency: string;
      status: BookingStatus;
      property: { vendorId: string };
      payment: {
        id: string;
        status: PaymentStatus;
        amount: number;
        currency: string;
        provider: PaymentProvider;
        providerRef: string | null;
        stripePaymentIntentId: string | null;
      } | null;
    };
    payment: {
      id: string;
      status: PaymentStatus;
      amount: number;
      currency: string;
      provider: PaymentProvider;
      providerRef: string | null;
      stripePaymentIntentId: string | null;
    };
  } | null> {
    const paymentByIntent = await tx.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: {
        booking: {
          include: {
            payment: true,
            property: { select: { vendorId: true } },
          },
        },
      },
    });

    if (paymentByIntent?.booking) {
      return { booking: paymentByIntent.booking, payment: paymentByIntent };
    }

    const bookingId = (paymentIntent.metadata?.bookingId ?? '').trim();
    if (!bookingId) return null;

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        property: { select: { vendorId: true } },
      },
    });
    if (!booking) return null;

    let payment = booking.payment;

    if (payment?.stripePaymentIntentId) {
      if (payment.stripePaymentIntentId !== paymentIntent.id) {
        throw new BadRequestException(
          'Stripe PaymentIntent does not match booking payment.',
        );
      }
      return { booking, payment };
    }

    if (!payment) {
      payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          provider: PaymentProvider.STRIPE,
          status: PaymentStatus.REQUIRES_ACTION,
          amount: booking.totalAmount,
          currency: booking.currency,
          providerRef: paymentIntent.id,
          stripePaymentIntentId: paymentIntent.id,
          rawPayloadJson: JSON.stringify(
            this.redactStripePaymentIntent(paymentIntent),
          ),
        },
      });
    }

    return { booking, payment };
  }

  private async emitConfirmedNotifications(
    booking:
      | {
          id: string;
          customerId: string;
          propertyId: string;
          checkIn: Date;
          checkOut: Date;
          totalAmount: number;
          currency: string;
          status: BookingStatus;
        }
      | null
      | undefined,
    vendorId: string | null,
    ops:
      | { createdTypes: OpsTaskType[]; scheduledFor: Date | null }
      | null
      | undefined,
  ) {
    if (!booking) return;
    if (booking.status !== BookingStatus.CONFIRMED) return;

    try {
      await this.notifications.emit({
        type: NotificationType.BOOKING_CONFIRMED,
        entityType: 'BOOKING',
        entityId: booking.id,
        recipientUserId: booking.customerId,
        payload: {
          booking: {
            id: booking.id,
            propertyId: booking.propertyId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            totalAmount: booking.totalAmount,
            currency: booking.currency,
            status: booking.status,
          },
        },
      });

      const requiredDocumentTypes: CustomerDocumentType[] = [
        CustomerDocumentType.PASSPORT,
        CustomerDocumentType.EMIRATES_ID,
      ];
      const verifiedDocs = await this.prisma.customerDocument.findMany({
        where: {
          userId: booking.customerId,
          type: { in: requiredDocumentTypes },
          status: CustomerDocumentStatus.VERIFIED,
        },
        select: { type: true },
      });
      const verifiedTypes = new Set(verifiedDocs.map((doc) => doc.type));
      const missingTypes = requiredDocumentTypes.filter(
        (type) => !verifiedTypes.has(type),
      );

      if (missingTypes.length > 0) {
        const hoursToCheckIn = Math.max(
          0,
          (booking.checkIn.getTime() - Date.now()) / (60 * 60 * 1000),
        );

        await this.notifications.emit({
          type: NotificationType.DOCUMENT_UPLOAD_REQUEST,
          entityType: 'BOOKING',
          entityId: booking.id,
          recipientUserId: booking.customerId,
          payload: {
            booking: {
              id: booking.id,
              propertyId: booking.propertyId,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
            },
            documents: {
              requiredTypes: requiredDocumentTypes,
              missingTypes,
              deadline: booking.checkIn,
            },
            urgent: hoursToCheckIn <= 48,
            hoursToCheckIn: Math.round(hoursToCheckIn),
            portalDocumentsUrl: '/portal/account/documents',
          },
        });
      }

      if (vendorId) {
        await this.notifications.emit({
          type: NotificationType.NEW_BOOKING_RECEIVED,
          entityType: 'BOOKING',
          entityId: booking.id,
          recipientUserId: vendorId,
          payload: {
            booking: {
              id: booking.id,
              propertyId: booking.propertyId,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              totalAmount: booking.totalAmount,
              currency: booking.currency,
              status: booking.status,
            },
          },
        });

        if (ops?.createdTypes?.length) {
          await this.notifications.emit({
            type: NotificationType.OPS_TASKS_CREATED,
            entityType: 'BOOKING',
            entityId: booking.id,
            recipientUserId: vendorId,
            payload: {
              bookingId: booking.id,
              propertyId: booking.propertyId,
              types: ops.createdTypes.join(', '),
              scheduledFor: ops.scheduledFor,
            },
          });
        }
      }
    } catch {
      // non-blocking
    }
  }

  private async ensureOpsTasksForConfirmedBooking(
    tx: Prisma.TransactionClient,
    bookingId: string,
  ): Promise<{ createdTypes: OpsTaskType[]; scheduledFor: Date | null }> {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: {
          include: {
            serviceConfig: { include: { servicePlan: true } },
          },
        },
      },
    });

    if (!booking) return { createdTypes: [], scheduledFor: null };
    if (booking.status !== BookingStatus.CONFIRMED)
      return { createdTypes: [], scheduledFor: null };

    const serviceConfig = booking.property.serviceConfig ?? null;
    const servicePlan = booking.property.serviceConfig?.servicePlan ?? null;

    const includeCleaning =
      serviceConfig?.cleaningRequired ?? servicePlan?.includesCleaning ?? false;
    const includeInspection =
      serviceConfig?.inspectionRequired ??
      servicePlan?.includesInspection ??
      false;
    const includeLinen =
      serviceConfig?.linenChangeRequired ?? servicePlan?.includesLinen ?? false;
    const includeRestock =
      serviceConfig?.restockRequired ?? servicePlan?.includesRestock ?? false;

    const scheduledFor = booking.checkOut;

    const types: OpsTaskType[] = [];
    if (includeCleaning) types.push(OpsTaskType.CLEANING);
    if (includeInspection) types.push(OpsTaskType.INSPECTION);
    if (includeLinen) types.push(OpsTaskType.LINEN);
    if (includeRestock) types.push(OpsTaskType.RESTOCK);

    if (types.length === 0) return { createdTypes: [], scheduledFor };

    const existing = await tx.opsTask.findMany({
      where: { bookingId: booking.id, type: { in: types } },
      select: { type: true },
    });
    const existingSet = new Set(existing.map((e) => e.type));

    const createdTypes: OpsTaskType[] = [];

    for (const type of types) {
      const wasExisting = existingSet.has(type);

      await tx.opsTask.upsert({
        where: { bookingId_type: { bookingId: booking.id, type } },
        create: {
          bookingId: booking.id,
          propertyId: booking.propertyId,
          type,
          status: OpsTaskStatus.PENDING,
          scheduledFor,
        },
        update: {
          scheduledFor,
          propertyId: booking.propertyId,
        },
      });

      if (!wasExisting) createdTypes.push(type);
    }

    return { createdTypes, scheduledFor };
  }

  private async ensureSecurityDepositForConfirmedBooking(
    tx: Prisma.TransactionClient,
    bookingId: string,
  ): Promise<void> {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        customerId: true,
        currency: true,
        propertyId: true,
        payment: { select: { provider: true, providerRef: true } },
        property: {
          select: {
            securityDepositPolicy: {
              select: {
                isActive: true,
                mode: true,
                amount: true,
                currency: true,
              },
            },
          },
        },
      },
    });

    if (!booking) return;
    if (booking.status !== BookingStatus.CONFIRMED) return;

    const policy = booking.property.securityDepositPolicy;
    if (!policy) return;
    if (!policy.isActive) return;
    if (policy.mode === SecurityDepositMode.NONE) return;
    if (policy.amount <= 0) return;

    const currency = (policy.currency ?? '').trim() || booking.currency;

    await tx.securityDeposit.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        customerId: booking.customerId,
        mode: policy.mode,
        status: SecurityDepositStatus.REQUIRED,
        amount: policy.amount,
        currency,
        provider: booking.payment?.provider ?? PaymentProvider.MANUAL,
        providerRef: booking.payment?.providerRef ?? null,
        metaJson: JSON.stringify({
          policy: { mode: policy.mode, amount: policy.amount, currency },
        }),
      },
      update: {
        mode: policy.mode,
        amount: policy.amount,
        currency,
        provider: booking.payment?.provider ?? PaymentProvider.MANUAL,
        providerRef: booking.payment?.providerRef ?? null,
      },
    });
  }

  private async ensureLedgerForCapturedBooking(
    tx: Prisma.TransactionClient,
    bookingId: string,
  ): Promise<void> {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        currency: true,
        propertyId: true,
        payment: {
          select: { id: true, status: true, amount: true, currency: true },
        },
        property: {
          select: {
            vendorId: true,
            serviceConfig: {
              select: {
                vendorAgreement: { select: { agreedManagementFeeBps: true } },
                servicePlan: { select: { managementFeeBps: true } },
              },
            },
          },
        },
      },
    });

    if (!booking) return;
    if (booking.status !== BookingStatus.CONFIRMED) return;

    const payment = booking.payment;
    if (!payment) return;
    if (payment.status !== PaymentStatus.CAPTURED) return;

    const vendorId = booking.property.vendorId;
    const currency = (payment.currency ?? '').trim() || booking.currency;

    const gross = payment.amount;

    const bps =
      booking.property.serviceConfig?.vendorAgreement?.agreedManagementFeeBps ??
      booking.property.serviceConfig?.servicePlan?.managementFeeBps ??
      0;

    const managementFee = this.computeFeeFromBps(gross, bps);

    const grossIdemKey = `booking_captured_${payment.id}`;
    const feeIdemKey = `management_fee_${payment.id}`;

    await tx.ledgerEntry.upsert({
      where: {
        vendorId_type_idempotencyKey: {
          vendorId,
          type: LedgerEntryType.BOOKING_CAPTURED,
          idempotencyKey: grossIdemKey,
        },
      },
      create: {
        vendorId,
        propertyId: booking.propertyId,
        bookingId: booking.id,
        paymentId: payment.id,
        type: LedgerEntryType.BOOKING_CAPTURED,
        direction: LedgerDirection.CREDIT,
        amount: gross,
        currency,
        idempotencyKey: grossIdemKey,
        metaJson: JSON.stringify({
          bookingId: booking.id,
          paymentId: payment.id,
          gross,
          bps,
        }),
      },
      update: {},
    });

    if (managementFee > 0) {
      await tx.ledgerEntry.upsert({
        where: {
          vendorId_type_idempotencyKey: {
            vendorId,
            type: LedgerEntryType.MANAGEMENT_FEE,
            idempotencyKey: feeIdemKey,
          },
        },
        create: {
          vendorId,
          propertyId: booking.propertyId,
          bookingId: booking.id,
          paymentId: payment.id,
          type: LedgerEntryType.MANAGEMENT_FEE,
          direction: LedgerDirection.DEBIT,
          amount: managementFee,
          currency,
          idempotencyKey: feeIdemKey,
          metaJson: JSON.stringify({
            bookingId: booking.id,
            paymentId: payment.id,
            gross,
            bps,
            managementFee,
          }),
        },
        update: {},
      });
    }
  }

  private computeFeeFromBps(amount: number, bps: number): number {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const safeBps = Number.isFinite(bps) ? bps : 0;
    if (safeAmount <= 0 || safeBps <= 0) return 0;
    return Math.round((safeAmount * safeBps) / 10000);
  }
}
