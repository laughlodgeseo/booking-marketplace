import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingPaymentStatus,
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
import { EventBusService } from '../../events/event-bus.service';
import { DomainEventType } from '../../events/domain-events';
import { ActivationPaymentService } from './activation-payment.service';
import type Stripe from 'stripe';

type Actor = { id: string; role: 'CUSTOMER' | 'VENDOR' | 'ADMIN' };

type AuthorizeResult =
  | {
      ok: true;
      reused: boolean;
      payment: unknown;
      provider: PaymentProvider;
      stripe: { clientSecret: string; publishableKey?: string };
    }
  | { ok: true; reused: boolean; payment: unknown; provider: PaymentProvider };

type StripeWebhookBookingUpdateResult = {
  ok: true;
  reused: boolean;
  ignored: boolean;
  bookingId: string | null;
  previousBookingStatus: BookingStatus | null;
  nextBookingStatus: BookingStatus | null;
  previousPaymentStatus: BookingPaymentStatus | null;
  nextPaymentStatus: BookingPaymentStatus | null;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly manualProvider: ManualPaymentsProvider,
    private readonly stripeProvider: StripePaymentsProvider,
    private readonly activationPayments: ActivationPaymentService,
    private readonly notifications: NotificationsService,
    private readonly bookings: BookingsService,
    private readonly eventBus: EventBusService,
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
    publishableKey?: string;
  }> {
    const cleanIdempotencyKey = (args.idempotencyKey ?? '').trim() || null;
    this.logger.log(
      `createStripeIntent request bookingId=${args.bookingId} actorId=${args.actor.id} actorRole=${args.actor.role} hasIdempotencyKey=${Boolean(cleanIdempotencyKey)}`,
    );

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: args.bookingId },
        include: { payment: true },
      });

      if (!booking) {
        this.logger.warn(
          `createStripeIntent validation_failed booking_not_found bookingId=${args.bookingId}`,
        );
        throw new NotFoundException('Booking not found.');
      }

      if (
        args.actor.role === 'CUSTOMER' &&
        booking.customerId !== args.actor.id
      ) {
        this.logger.warn(
          `createStripeIntent validation_failed ownership_mismatch bookingId=${booking.id} bookingCustomerId=${booking.customerId} actorId=${args.actor.id}`,
        );
        throw new ForbiddenException('You can only pay for your own booking.');
      }

      if (booking.status !== BookingStatus.PENDING_PAYMENT) {
        this.logger.warn(
          `createStripeIntent validation_failed non_payable bookingId=${booking.id} status=${booking.status}`,
        );
        throw new BadRequestException(
          `Booking is not payable from status ${booking.status}.`,
        );
      }

      const bookingAmount = Number(booking.totalAmount ?? 0);
      if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
        this.logger.warn(
          `createStripeIntent validation_failed invalid_amount bookingId=${booking.id} amount=${booking.totalAmount}`,
        );
        throw new BadRequestException('Invalid booking amount.');
      }

      const currency = (booking.currency ?? '').trim() || 'AED';

      // Include security deposit if the property has an active deposit policy.
      // IMPORTANT: depositPolicy.amount is stored in AED (canonical currency).
      // booking.fxRate is the AED → display-currency multiplier stored at reservation time.
      // We must convert the deposit to the booking's display currency before adding it
      // to bookingAmount to avoid mixing currencies in the Stripe charge.
      const depositPolicy = await this.prisma.securityDepositPolicy.findUnique({
        where: { propertyId: booking.propertyId },
      });
      const depositAmountAed =
        depositPolicy &&
        depositPolicy.isActive &&
        depositPolicy.mode !== SecurityDepositMode.NONE &&
        depositPolicy.amount > 0
          ? depositPolicy.amount
          : 0;

      // Resolve the FX rate stored on the booking (AED → display currency).
      // Falls back to 1 (AED bookings) if not set.
      const bookingFxRateRaw = Number(booking.fxRate?.toString() ?? '1');
      const bookingFxRate =
        Number.isFinite(bookingFxRateRaw) && bookingFxRateRaw > 0
          ? bookingFxRateRaw
          : 1;

      // Convert deposit from AED to the booking display currency.
      // When currency = AED, fxRate = 1, so the result is unchanged.
      const depositAmount =
        depositAmountAed > 0 ? Math.round(depositAmountAed * bookingFxRate) : 0;

      const amount = bookingAmount + depositAmount;

      this.logger.log(
        `createStripeIntent amounts bookingId=${booking.id} bookingAmount=${bookingAmount} depositAmountAed=${depositAmountAed} depositAmount=${depositAmount} fxRate=${bookingFxRate} currency=${currency} totalCharge=${amount}`,
      );

      const publishableKey = (
        process.env.STRIPE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
        ''
      ).trim();

      if (booking.payment?.stripePaymentIntentId) {
        this.logger.log(
          `createStripeIntent reuse_existing bookingId=${booking.id} paymentIntentId=${booking.payment.stripePaymentIntentId}`,
        );

        let existingIntent: Stripe.PaymentIntent;
        try {
          existingIntent = await this.stripeProvider.retrievePaymentIntent(
            booking.payment.stripePaymentIntentId,
          );
        } catch (error: unknown) {
          const message = this.getStripeErrorMessage(
            error,
            'Failed to load Stripe payment session.',
          );
          this.logger.error(
            `createStripeIntent stripe_retrieve_failed bookingId=${booking.id} paymentIntentId=${booking.payment.stripePaymentIntentId} message=${message}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw new BadGatewayException(message);
        }
        const clientSecret = existingIntent.client_secret;
        if (!clientSecret) {
          this.logger.error(
            `createStripeIntent invalid_existing_intent bookingId=${booking.id} paymentIntentId=${existingIntent.id} missing=client_secret`,
          );
          throw new BadGatewayException(
            'Stripe PaymentIntent is missing client_secret.',
          );
        }

        this.logger.log(
          `createStripeIntent response_ready bookingId=${booking.id} paymentIntentId=${existingIntent.id} reused=true`,
        );
        return {
          ok: true,
          reused: true,
          payment: booking.payment,
          provider: PaymentProvider.STRIPE,
          clientSecret,
          ...(publishableKey ? { publishableKey } : {}),
        };
      }

      const stripeIdempotencyKey = cleanIdempotencyKey
        ? `booking:${booking.id}:${cleanIdempotencyKey}`
        : `booking:${booking.id}`;

      // Attach Dubai tax breakdown to Stripe metadata for auditing / reconciliation
      const breakdownMeta: Record<string, string> = {};
      if ((booking as { priceBreakdown?: unknown }).priceBreakdown != null) {
        const bd = (booking as { priceBreakdown: Record<string, unknown> })
          .priceBreakdown;
        breakdownMeta['breakdown'] = JSON.stringify(bd);
        for (const key of [
          'baseTotal',
          'cleaningFee',
          'serviceCharge',
          'municipalityFee',
          'tourismFee',
          'vat',
          'tourismDirham',
        ]) {
          if (typeof bd[key] === 'number') breakdownMeta[key] = String(bd[key]);
        }
      }

      const stripePayload = {
        amount: this.toStripeMinorUnits(amount, currency),
        currency,
        description: `Booking ${booking.id}`,
        metadata: {
          bookingId: booking.id,
          userId: booking.customerId,
          bookingAmount: String(bookingAmount),
          depositAmountAed: String(depositAmountAed),
          depositAmount: String(depositAmount),
          currency,
          ...breakdownMeta,
        },
      };

      this.logger.log(
        `createStripeIntent stripe_create_call bookingId=${booking.id} amountMinor=${stripePayload.amount} currency=${stripePayload.currency} idempotencyKey=${stripeIdempotencyKey}`,
      );

      let stripeIntent: Stripe.PaymentIntent;
      try {
        stripeIntent = await this.stripeProvider.createPaymentIntent({
          ...stripePayload,
          idempotencyKey: stripeIdempotencyKey,
        });
      } catch (error: unknown) {
        const message = this.getStripeErrorMessage(
          error,
          'Failed to create Stripe payment session.',
        );
        const normalized = message.toLowerCase();
        const looksLikeIdempotencyConflict =
          normalized.includes('idempot') &&
          (normalized.includes('same parameters') ||
            normalized.includes('different') ||
            normalized.includes('mismatch'));

        this.logger.error(
          `createStripeIntent stripe_create_failed bookingId=${booking.id} message=${message}`,
          error instanceof Error ? error.stack : undefined,
        );

        if (looksLikeIdempotencyConflict) {
          const retryIdempotencyKey = `${stripeIdempotencyKey}:retry:${Date.now()}`;
          this.logger.warn(
            `createStripeIntent stripe_idempotency_conflict bookingId=${booking.id} retryIdempotencyKey=${retryIdempotencyKey}`,
          );
          try {
            stripeIntent = await this.stripeProvider.createPaymentIntent({
              ...stripePayload,
              idempotencyKey: retryIdempotencyKey,
            });
          } catch (retryError: unknown) {
            const retryMessage = this.getStripeErrorMessage(
              retryError,
              'Failed to create Stripe payment session.',
            );
            this.logger.error(
              `createStripeIntent stripe_retry_failed bookingId=${booking.id} message=${retryMessage}`,
              retryError instanceof Error ? retryError.stack : undefined,
            );
            throw new BadGatewayException(retryMessage);
          }
        } else {
          throw new BadGatewayException(message);
        }
      }

      const clientSecret = stripeIntent.client_secret;
      if (!clientSecret) {
        this.logger.error(
          `createStripeIntent stripe_invalid_response bookingId=${booking.id} paymentIntentId=${stripeIntent.id} missing=client_secret`,
        );
        throw new BadGatewayException(
          'Stripe PaymentIntent did not return client_secret.',
        );
      }

      let updated: unknown;
      try {
        updated = await this.prisma.$transaction(
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

            const payment =
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
      } catch (error: unknown) {
        if (error instanceof HttpException) {
          this.logger.warn(
            `createStripeIntent persist_validation_failed bookingId=${booking.id} status=${error.getStatus()} message=${error.message}`,
          );
          throw error;
        }
        this.logger.error(
          `createStripeIntent persist_failed bookingId=${booking.id} paymentIntentId=${stripeIntent.id} message=${this.getStripeErrorMessage(error, 'Failed to persist Stripe payment session.')}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw new InternalServerErrorException(
          'Failed to persist Stripe payment session.',
        );
      }

      this.logger.log(
        `createStripeIntent response_ready bookingId=${booking.id} paymentIntentId=${stripeIntent.id} reused=false`,
      );
      return {
        ok: true,
        reused: false,
        payment: updated,
        provider: PaymentProvider.STRIPE,
        clientSecret,
        ...(publishableKey ? { publishableKey } : {}),
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        this.logger.warn(
          `createStripeIntent rejected bookingId=${args.bookingId} status=${error.getStatus()} message=${error.message}`,
        );
        throw error;
      }
      const message = this.getStripeErrorMessage(
        error,
        'Failed to initialize payment session.',
      );
      this.logger.error(
        `createStripeIntent unexpected_failure bookingId=${args.bookingId} message=${message}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to initialize payment session.',
      );
    }
  }

  async capture(args: {
    actor: Actor;
    bookingId: string;
    idempotencyKey: string | null;
  }) {
    if (args.actor.role === 'CUSTOMER') {
      throw new BadRequestException(
        'Booking confirmation is webhook-only. Frontend capture is disabled.',
      );
    }

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

    if (!txResult.reused && txResult.booking) {
      this.emitPaymentSucceededDomainEvent(txResult.booking.id);
    }

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

        // REFUND + MANAGEMENT_FEE reversal ledger entries for manual refunds.
        await this.ensureLedgerForSucceededRefund(tx, refund.id);
      } else if (refund.provider === PaymentProvider.STRIPE) {
        const paymentIntentId = payment.stripePaymentIntentId;
        if (!paymentIntentId) {
          throw new BadRequestException(
            'Stripe refund requires stripePaymentIntentId.',
          );
        }

        const stripeRefund = await this.stripeProvider.createRefund({
          paymentIntentId,
          amount: this.toStripeMinorUnits(amount, refund.currency),
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

    if (result?.ok && !result.reused && result.refund?.id) {
      this.emitRefundSucceededDomainEvent(result.refund.id);
    }

    return result;
  }

  /**
   * STRIPE webhook-driven confirmation (checkout.session.completed).
   * Booking confirmation is webhook-only; frontend never confirms bookings.
   */
  async handleStripeCheckoutSessionCompleted(args: {
    eventId: string;
    session: Stripe.Checkout.Session;
  }): Promise<StripeWebhookBookingUpdateResult> {
    const bookingId = (args.session.metadata?.bookingId ?? '').trim() || null;
    const paymentIntentId = this.readCheckoutSessionPaymentIntentId(
      args.session,
    );
    const now = new Date();

    try {
      const txResult = await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.stripeWebhookEvent.findUnique({
            where: { eventId: args.eventId },
          });
          if (existing) {
            return {
              ok: true,
              reused: true,
              ignored: true,
              bookingId: existing.bookingId ?? bookingId,
              previousBookingStatus: null,
              nextBookingStatus: null,
              previousPaymentStatus: null,
              nextPaymentStatus: null,
              booking: null,
              vendorId: null,
              ops: null,
            } as const;
          }

          if (!bookingId) {
            await tx.stripeWebhookEvent.create({
              data: {
                eventId: args.eventId,
                type: 'checkout.session.completed',
                bookingId: null,
              },
            });

            return {
              ok: true,
              reused: false,
              ignored: true,
              bookingId: null,
              previousBookingStatus: null,
              nextBookingStatus: null,
              previousPaymentStatus: null,
              nextPaymentStatus: null,
              booking: null,
              vendorId: null,
              ops: null,
            } as const;
          }

          const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: {
              payment: true,
              property: { select: { vendorId: true } },
            },
          });

          if (!booking) {
            await tx.stripeWebhookEvent.create({
              data: {
                eventId: args.eventId,
                type: 'checkout.session.completed',
                bookingId,
              },
            });

            return {
              ok: true,
              reused: false,
              ignored: true,
              bookingId,
              previousBookingStatus: null,
              nextBookingStatus: null,
              previousPaymentStatus: null,
              nextPaymentStatus: null,
              booking: null,
              vendorId: null,
              ops: null,
            } as const;
          }

          const previousBookingStatus = booking.status;
          const previousPaymentStatus = booking.paymentStatus;

          if (args.session.payment_status !== 'paid') {
            await tx.stripeWebhookEvent.create({
              data: {
                eventId: args.eventId,
                type: 'checkout.session.completed',
                bookingId: booking.id,
              },
            });

            return {
              ok: true,
              reused: false,
              ignored: true,
              bookingId: booking.id,
              previousBookingStatus,
              nextBookingStatus: booking.status,
              previousPaymentStatus,
              nextPaymentStatus: booking.paymentStatus,
              booking: null,
              vendorId: null,
              ops: null,
            } as const;
          }

          const updatedBooking = await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.CONFIRMED,
              paymentStatus: BookingPaymentStatus.SUCCESS,
              stripeSessionId: args.session.id,
              confirmedAt: now,
            },
          });

          const resolvedPaymentIntentId =
            paymentIntentId ?? booking.payment?.stripePaymentIntentId ?? null;

          const paymentData = {
            provider: PaymentProvider.STRIPE,
            status: PaymentStatus.CAPTURED,
            amount: booking.totalAmount,
            currency: booking.currency,
            providerRef: args.session.id,
            stripePaymentIntentId: resolvedPaymentIntentId,
            rawPayloadJson: JSON.stringify(args.session),
          };

          const payment = booking.payment
            ? await tx.payment.update({
                where: { id: booking.payment.id },
                data: paymentData,
              })
            : await tx.payment.create({
                data: {
                  bookingId: booking.id,
                  ...paymentData,
                },
              });

          await tx.paymentEvent.create({
            data: {
              paymentId: payment.id,
              type: PaymentEventType.WEBHOOK,
              idempotencyKey: args.eventId,
              providerRef: args.session.id,
              payloadJson: JSON.stringify({
                kind: 'STRIPE_CHECKOUT_SESSION_COMPLETED',
                bookingId: booking.id,
                sessionId: args.session.id,
                paymentIntentId,
              }),
            },
          });

          const ops = await this.ensureOpsTasksForConfirmedBooking(
            tx,
            booking.id,
          );
          await this.ensureSecurityDepositForConfirmedBooking(tx, booking.id);
          await this.ensureLedgerForCapturedBooking(tx, booking.id);

          await tx.stripeWebhookEvent.create({
            data: {
              eventId: args.eventId,
              type: 'checkout.session.completed',
              bookingId: booking.id,
            },
          });

          return {
            ok: true,
            reused: false,
            ignored: false,
            bookingId: booking.id,
            previousBookingStatus,
            nextBookingStatus: updatedBooking.status,
            previousPaymentStatus,
            nextPaymentStatus: updatedBooking.paymentStatus,
            booking: updatedBooking,
            vendorId: booking.property.vendorId,
            ops,
          } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (!txResult.reused && !txResult.ignored && txResult.booking) {
        await this.emitConfirmedNotifications(
          txResult.booking,
          txResult.vendorId,
          txResult.ops,
        );
      }

      return {
        ok: true,
        reused: txResult.reused,
        ignored: txResult.ignored,
        bookingId: txResult.bookingId,
        previousBookingStatus: txResult.previousBookingStatus,
        nextBookingStatus: txResult.nextBookingStatus,
        previousPaymentStatus: txResult.previousPaymentStatus,
        nextPaymentStatus: txResult.nextPaymentStatus,
      };
    } catch (error) {
      if (this.isDuplicateStripeWebhookEvent(error)) {
        return {
          ok: true,
          reused: true,
          ignored: true,
          bookingId,
          previousBookingStatus: null,
          nextBookingStatus: null,
          previousPaymentStatus: null,
          nextPaymentStatus: null,
        };
      }

      throw error;
    }
  }

  /**
   * STRIPE webhook-driven failure (payment_intent.payment_failed).
   */
  async handleStripePaymentIntentFailedByMetadata(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<StripeWebhookBookingUpdateResult> {
    const bookingId =
      (args.paymentIntent.metadata?.bookingId ?? '').trim() || null;

    try {
      const txResult = await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.stripeWebhookEvent.findUnique({
            where: { eventId: args.eventId },
          });
          if (existing) {
            return {
              ok: true,
              reused: true,
              ignored: true,
              bookingId: existing.bookingId ?? bookingId,
              previousBookingStatus: null,
              nextBookingStatus: null,
              previousPaymentStatus: null,
              nextPaymentStatus: null,
              customerId: null,
            } as const;
          }

          if (!bookingId) {
            await tx.stripeWebhookEvent.create({
              data: {
                eventId: args.eventId,
                type: 'payment_intent.payment_failed',
                bookingId: null,
              },
            });

            return {
              ok: true,
              reused: false,
              ignored: true,
              bookingId: null,
              previousBookingStatus: null,
              nextBookingStatus: null,
              previousPaymentStatus: null,
              nextPaymentStatus: null,
              customerId: null,
            } as const;
          }

          const booking = await tx.booking.findUnique({
            where: { id: bookingId },
            include: { payment: true },
          });

          if (!booking) {
            await tx.stripeWebhookEvent.create({
              data: {
                eventId: args.eventId,
                type: 'payment_intent.payment_failed',
                bookingId,
              },
            });

            return {
              ok: true,
              reused: false,
              ignored: true,
              bookingId,
              previousBookingStatus: null,
              nextBookingStatus: null,
              previousPaymentStatus: null,
              nextPaymentStatus: null,
              customerId: null,
            } as const;
          }

          const previousBookingStatus = booking.status;
          const previousPaymentStatus = booking.paymentStatus;

          const updatedBooking = await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: BookingStatus.FAILED,
              paymentStatus: BookingPaymentStatus.FAILED,
            },
          });

          await tx.bookingBlockedDate.deleteMany({
            where: { bookingId: booking.id },
          });

          const paymentData = {
            provider: PaymentProvider.STRIPE,
            status: PaymentStatus.FAILED,
            amount: booking.totalAmount,
            currency: booking.currency,
            providerRef: args.paymentIntent.id,
            stripePaymentIntentId: args.paymentIntent.id,
            rawPayloadJson: JSON.stringify(
              this.redactStripePaymentIntent(args.paymentIntent),
            ),
          };

          const payment = booking.payment
            ? await tx.payment.update({
                where: { id: booking.payment.id },
                data: paymentData,
              })
            : await tx.payment.create({
                data: {
                  bookingId: booking.id,
                  ...paymentData,
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

          await tx.stripeWebhookEvent.create({
            data: {
              eventId: args.eventId,
              type: 'payment_intent.payment_failed',
              bookingId: booking.id,
            },
          });

          return {
            ok: true,
            reused: false,
            ignored: false,
            bookingId: booking.id,
            previousBookingStatus,
            nextBookingStatus: updatedBooking.status,
            previousPaymentStatus,
            nextPaymentStatus: updatedBooking.paymentStatus,
            customerId: booking.customerId,
          } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (!txResult.reused && !txResult.ignored && txResult.customerId) {
        try {
          await this.notifications.emit({
            type: NotificationType.PAYMENT_FAILED,
            entityType: 'BOOKING',
            entityId: txResult.bookingId ?? 'unknown',
            recipientUserId: txResult.customerId,
            payload: {
              bookingId: txResult.bookingId,
              provider: 'STRIPE',
            },
          });
        } catch {
          // non-blocking
        }
      }

      return {
        ok: true,
        reused: txResult.reused,
        ignored: txResult.ignored,
        bookingId: txResult.bookingId,
        previousBookingStatus: txResult.previousBookingStatus,
        nextBookingStatus: txResult.nextBookingStatus,
        previousPaymentStatus: txResult.previousPaymentStatus,
        nextPaymentStatus: txResult.nextPaymentStatus,
      };
    } catch (error) {
      if (this.isDuplicateStripeWebhookEvent(error)) {
        return {
          ok: true,
          reused: true,
          ignored: true,
          bookingId,
          previousBookingStatus: null,
          nextBookingStatus: null,
          previousPaymentStatus: null,
          nextPaymentStatus: null,
        };
      }

      throw error;
    }
  }

  /**
   * STRIPE webhook-driven confirmation (payment_intent.succeeded).
   */
  async handleStripePaymentIntentSucceeded(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<{ ok: true; reused: boolean; ignored?: boolean }> {
    if (this.activationPayments.isActivationPaymentIntent(args.paymentIntent)) {
      return this.activationPayments.handleStripePaymentIntentSucceeded(args);
    }

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

        const expectedStripeAmount = this.toStripeMinorUnits(
          Number(payment.amount),
          payment.currency ?? booking.currency,
        );

        if (
          Number(expectedStripeAmount) !== Number(args.paymentIntent.amount)
        ) {
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

    if (!txResult.reused && txResult.booking) {
      this.emitPaymentSucceededDomainEvent(txResult.booking.id);
    }

    return { ok: true, reused: txResult.reused };
  }

  /**
   * STRIPE webhook-driven failure (payment_intent.payment_failed).
   */
  async handleStripePaymentIntentFailed(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<{ ok: true; reused: boolean; ignored?: boolean }> {
    if (this.activationPayments.isActivationPaymentIntent(args.paymentIntent)) {
      return this.activationPayments.handleStripePaymentIntentFailed(args);
    }

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
   * STRIPE webhook-driven processing (payment_intent.processing).
   * Keeps booking in PENDING_PAYMENT and records the webhook for idempotency.
   */
  async handleStripePaymentIntentProcessing(args: {
    eventId: string;
    paymentIntent: Stripe.PaymentIntent;
  }): Promise<{ ok: true; reused: boolean; ignored?: boolean }> {
    if (this.activationPayments.isActivationPaymentIntent(args.paymentIntent)) {
      return this.activationPayments.handleStripePaymentIntentProcessing(args);
    }

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
        return { reused: true } as const;
      }

      const immutableStatuses = new Set<PaymentStatus>([
        PaymentStatus.CAPTURED,
        PaymentStatus.REFUNDED,
        PaymentStatus.FAILED,
      ]);

      const nextStatus = immutableStatuses.has(payment.status)
        ? payment.status
        : PaymentStatus.REQUIRES_ACTION;

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
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
            kind: 'STRIPE_PAYMENT_INTENT_PROCESSING',
            bookingId: booking.id,
            paymentIntentId: args.paymentIntent.id,
          }),
        },
      });

      return { reused: false } as const;
    });

    if ('ignored' in txResult && txResult.ignored) {
      return { ok: true, reused: false, ignored: true };
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
    if (this.activationPayments.isActivationPaymentIntent(args.paymentIntent)) {
      return this.activationPayments.handleStripePaymentIntentCanceled(args);
    }

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
          booking: {
            select: {
              customerId: true,
              property: { select: { vendorId: true } },
            },
          },
        },
      });

      for (const refund of refundsToNotify) {
        if (refund.booking?.customerId) {
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

        // REFUND + MANAGEMENT_FEE reversal ledger entries for Stripe refunds.
        try {
          await this.prisma.$transaction(async (tx) => {
            await this.ensureLedgerForSucceededRefund(tx, refund.id);
          });
        } catch {
          // non-critical — idempotent, will succeed on next webhook retry
        }

        this.emitRefundSucceededDomainEvent(refund.id);
      }
    }

    return { ok: true, reused: txResult.reused };
  }

  private readCheckoutSessionPaymentIntentId(
    session: Stripe.Checkout.Session,
  ): string | null {
    const raw = session.payment_intent;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (raw && typeof raw === 'object' && 'id' in raw) {
      const id = raw.id;
      if (typeof id === 'string' && id.trim()) return id.trim();
    }
    return null;
  }

  private isDuplicateStripeWebhookEvent(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }
    if (error.code !== 'P2002') return false;

    const target = (error.meta as { target?: unknown } | undefined)?.target;
    if (Array.isArray(target)) {
      return target.some(
        (entry) =>
          typeof entry === 'string' &&
          (entry === 'eventId' || entry.includes('StripeWebhookEvent_eventId')),
      );
    }
    if (typeof target === 'string') {
      return target.includes('eventId');
    }

    return true;
  }

  private normalizeCurrency(value?: string | null): string {
    return (value ?? '').trim().toUpperCase();
  }

  private getStripeErrorMessage(error: unknown, fallback: string): string {
    if (!error) return fallback;
    if (error instanceof Error && error.message.trim()) return error.message;

    if (typeof error === 'object') {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
        return maybeMessage;
      }
    }

    return fallback;
  }

  private toStripeMinorUnits(amount: number, currency: string): number {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    const normalized = this.normalizeCurrency(currency);
    if (!normalized) return Math.trunc(Math.round(safeAmount * 100));
    // NOTE: Assumes 2-decimal currencies (e.g. AED, USD).
    // Extend if you support zero-decimal currencies.
    return Math.trunc(Math.round(safeAmount * 100));
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
            vendorId: true,
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

    // DEPOSIT_AUTH ledger entry: records the deposit hold against the vendor.
    const vendorId = booking.property.vendorId;
    const depositAuthIdemKey = `deposit_auth_${booking.id}`;
    await tx.ledgerEntry.upsert({
      where: {
        vendorId_type_idempotencyKey: {
          vendorId,
          type: LedgerEntryType.DEPOSIT_AUTH,
          idempotencyKey: depositAuthIdemKey,
        },
      },
      create: {
        vendorId,
        propertyId: booking.propertyId,
        bookingId: booking.id,
        type: LedgerEntryType.DEPOSIT_AUTH,
        direction: LedgerDirection.CREDIT,
        amount: policy.amount,
        currency,
        idempotencyKey: depositAuthIdemKey,
        metaJson: JSON.stringify({
          mode: policy.mode,
          bookingId: booking.id,
        }),
      },
      update: {},
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

  /**
   * Creates REFUND (DEBIT) + MANAGEMENT_FEE reversal (CREDIT) ledger entries
   * when a refund is confirmed as SUCCEEDED.
   *
   * Idempotent: safe to call multiple times for the same refundId.
   * The MANAGEMENT_FEE CREDIT reverses the original commission proportionally
   * to the refunded amount, keeping net vendor earnings correct.
   */
  private async ensureLedgerForSucceededRefund(
    tx: Prisma.TransactionClient,
    refundId: string,
  ): Promise<void> {
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      select: {
        id: true,
        amount: true,
        currency: true,
        bookingId: true,
        paymentId: true,
        status: true,
        booking: {
          select: {
            propertyId: true,
            property: {
              select: {
                vendorId: true,
                serviceConfig: {
                  select: {
                    vendorAgreement: {
                      select: { agreedManagementFeeBps: true },
                    },
                    servicePlan: { select: { managementFeeBps: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!refund) return;
    if (refund.status !== RefundStatus.SUCCEEDED) return;
    if (!refund.booking?.property) return;

    const vendorId = refund.booking.property.vendorId;
    const paymentId = refund.paymentId ?? undefined;
    const currency = refund.currency;
    const amount = refund.amount;
    const refundIdemKey = `refund_debit_${refundId}`;
    const feeReversalIdemKey = `mgmt_fee_reversal_${refundId}`;

    // REFUND (DEBIT): reduces vendor gross earnings by the refunded amount.
    await tx.ledgerEntry.upsert({
      where: {
        vendorId_type_idempotencyKey: {
          vendorId,
          type: LedgerEntryType.REFUND,
          idempotencyKey: refundIdemKey,
        },
      },
      create: {
        vendorId,
        propertyId: refund.booking.propertyId,
        bookingId: refund.bookingId,
        paymentId,
        type: LedgerEntryType.REFUND,
        direction: LedgerDirection.DEBIT,
        amount,
        currency,
        idempotencyKey: refundIdemKey,
        metaJson: JSON.stringify({
          refundId,
          bookingId: refund.bookingId,
          amount,
        }),
      },
      update: {},
    });

    // MANAGEMENT_FEE CREDIT (reversal): proportional to the refunded amount.
    const bps =
      refund.booking.property.serviceConfig?.vendorAgreement
        ?.agreedManagementFeeBps ??
      refund.booking.property.serviceConfig?.servicePlan?.managementFeeBps ??
      0;
    const feeReversal = this.computeFeeFromBps(amount, bps);

    if (feeReversal > 0) {
      await tx.ledgerEntry.upsert({
        where: {
          vendorId_type_idempotencyKey: {
            vendorId,
            type: LedgerEntryType.MANAGEMENT_FEE,
            idempotencyKey: feeReversalIdemKey,
          },
        },
        create: {
          vendorId,
          propertyId: refund.booking.propertyId,
          bookingId: refund.bookingId,
          paymentId,
          type: LedgerEntryType.MANAGEMENT_FEE,
          direction: LedgerDirection.CREDIT,
          amount: feeReversal,
          currency,
          idempotencyKey: feeReversalIdemKey,
          metaJson: JSON.stringify({
            refundId,
            bps,
            feeReversal,
            note: 'management_fee_reversal',
          }),
        },
        update: {},
      });
    }
  }

  /**
   * Fire-and-forget: emits PaymentSucceeded domain event after a booking is confirmed.
   * Runs outside any DB transaction — failures are non-critical.
   */
  private emitPaymentSucceededDomainEvent(bookingId: string): void {
    this.prisma.booking
      .findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          payment: {
            select: { id: true, amount: true, currency: true, provider: true },
          },
          property: { select: { vendorId: true } },
        },
      })
      .then((b) => {
        if (!b?.payment) return;
        this.eventBus.publish({
          type: DomainEventType.PAYMENT_SUCCEEDED,
          bookingId: b.id,
          paymentId: b.payment.id,
          vendorId: b.property.vendorId,
          amount: b.payment.amount,
          currency: b.payment.currency,
          provider: b.payment.provider,
          occurredAt: new Date(),
        });
      })
      .catch(() => {
        /* non-critical */
      });
  }

  /**
   * Fire-and-forget: emits RefundSucceeded domain event after a refund succeeds.
   * Runs outside any DB transaction — failures are non-critical.
   */
  private emitRefundSucceededDomainEvent(refundId: string): void {
    this.prisma.refund
      .findUnique({
        where: { id: refundId },
        select: {
          id: true,
          amount: true,
          currency: true,
          bookingId: true,
          paymentId: true,
          booking: { select: { property: { select: { vendorId: true } } } },
        },
      })
      .then((r) => {
        if (!r?.booking?.property) return;
        this.eventBus.publish({
          type: DomainEventType.REFUND_SUCCEEDED,
          refundId: r.id,
          bookingId: r.bookingId,
          paymentId: r.paymentId ?? '',
          vendorId: r.booking.property.vendorId,
          amount: r.amount,
          currency: r.currency,
          occurredAt: new Date(),
        });
      })
      .catch(() => {
        /* non-critical */
      });
  }

  // ── Security Deposit Admin Operations ──────────────────────────────

  async releaseSecurityDeposit(args: {
    actor: Actor;
    depositId: string;
    note?: string;
  }): Promise<{ ok: true; deposit: unknown }> {
    if (args.actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can release deposits.');
    }

    const deposit = await this.prisma.securityDeposit.findUnique({
      where: { id: args.depositId },
      include: {
        booking: {
          include: {
            payment: true,
            property: { select: { vendorId: true } },
          },
        },
      },
    });
    if (!deposit) throw new NotFoundException('Security deposit not found.');

    if (deposit.status === SecurityDepositStatus.RELEASED) {
      return { ok: true, deposit };
    }
    if (
      deposit.status !== SecurityDepositStatus.REQUIRED &&
      deposit.status !== SecurityDepositStatus.AUTHORIZED &&
      deposit.status !== SecurityDepositStatus.CAPTURED
    ) {
      throw new BadRequestException(
        `Cannot release deposit in status ${deposit.status}.`,
      );
    }

    // Refund the deposit amount via Stripe if possible
    const payment = deposit.booking?.payment;
    if (
      deposit.provider === PaymentProvider.STRIPE &&
      payment?.stripePaymentIntentId &&
      deposit.amount > 0
    ) {
      try {
        await this.stripeProvider.createRefund({
          paymentIntentId: payment.stripePaymentIntentId,
          amount: this.toStripeMinorUnits(
            deposit.amount,
            deposit.currency || 'AED',
          ),
          metadata: {
            type: 'security_deposit_release',
            depositId: deposit.id,
            bookingId: deposit.bookingId,
          },
        });
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : 'Stripe refund failed';
        this.logger.error(
          `releaseSecurityDeposit stripe_refund_failed depositId=${deposit.id}: ${msg}`,
        );
        throw new BadGatewayException(
          'Failed to refund security deposit via Stripe.',
        );
      }
    }

    const updated = await this.prisma.securityDeposit.update({
      where: { id: deposit.id },
      data: {
        status: SecurityDepositStatus.RELEASED,
        releasedAt: new Date(),
        note: args.note ?? deposit.note,
      },
    });

    // DEPOSIT_RELEASE ledger entry: reverses the DEPOSIT_AUTH (deposit returned to customer).
    const vendorId = deposit.booking?.property?.vendorId;
    if (vendorId && deposit.amount > 0) {
      const releaseIdemKey = `deposit_release_${deposit.id}`;
      try {
        await this.prisma.ledgerEntry.upsert({
          where: {
            vendorId_type_idempotencyKey: {
              vendorId,
              type: LedgerEntryType.DEPOSIT_RELEASE,
              idempotencyKey: releaseIdemKey,
            },
          },
          create: {
            vendorId,
            propertyId: deposit.propertyId,
            bookingId: deposit.bookingId,
            type: LedgerEntryType.DEPOSIT_RELEASE,
            direction: LedgerDirection.DEBIT,
            amount: deposit.amount,
            currency: deposit.currency,
            idempotencyKey: releaseIdemKey,
            metaJson: JSON.stringify({ depositId: deposit.id }),
          },
          update: {},
        });
      } catch {
        // non-critical — next retry will succeed due to idempotency key
      }

      this.eventBus.publish({
        type: DomainEventType.DEPOSIT_RELEASED,
        depositId: deposit.id,
        bookingId: deposit.bookingId,
        vendorId,
        amount: deposit.amount,
        currency: deposit.currency,
        occurredAt: new Date(),
      });
    }

    this.logger.log(
      `releaseSecurityDeposit completed depositId=${deposit.id} bookingId=${deposit.bookingId}`,
    );
    return { ok: true, deposit: updated };
  }

  async claimSecurityDeposit(args: {
    actor: Actor;
    depositId: string;
    claimAmount?: number;
    note?: string;
  }): Promise<{ ok: true; deposit: unknown }> {
    if (args.actor.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can claim deposits.');
    }

    const deposit = await this.prisma.securityDeposit.findUnique({
      where: { id: args.depositId },
      include: {
        booking: { select: { property: { select: { vendorId: true } } } },
      },
    });
    if (!deposit) throw new NotFoundException('Security deposit not found.');

    if (deposit.status === SecurityDepositStatus.CLAIMED) {
      return { ok: true, deposit };
    }
    if (
      deposit.status !== SecurityDepositStatus.REQUIRED &&
      deposit.status !== SecurityDepositStatus.AUTHORIZED &&
      deposit.status !== SecurityDepositStatus.CAPTURED
    ) {
      throw new BadRequestException(
        `Cannot claim deposit in status ${deposit.status}.`,
      );
    }

    const claimAmount = args.claimAmount ?? deposit.amount;
    if (claimAmount <= 0 || claimAmount > deposit.amount) {
      throw new BadRequestException(
        `Claim amount must be between 1 and ${deposit.amount}.`,
      );
    }

    const updated = await this.prisma.securityDeposit.update({
      where: { id: deposit.id },
      data: {
        status: SecurityDepositStatus.CLAIMED,
        claimedAt: new Date(),
        note: args.note ?? deposit.note,
      },
    });

    // DEPOSIT_CLAIM ledger entry: vendor keeps the forfeited deposit.
    const vendorId = deposit.booking?.property?.vendorId;
    if (vendorId && claimAmount > 0) {
      const claimIdemKey = `deposit_claim_${deposit.id}`;
      try {
        await this.prisma.ledgerEntry.upsert({
          where: {
            vendorId_type_idempotencyKey: {
              vendorId,
              type: LedgerEntryType.DEPOSIT_CLAIM,
              idempotencyKey: claimIdemKey,
            },
          },
          create: {
            vendorId,
            propertyId: deposit.propertyId,
            bookingId: deposit.bookingId,
            type: LedgerEntryType.DEPOSIT_CLAIM,
            direction: LedgerDirection.CREDIT,
            amount: claimAmount,
            currency: deposit.currency,
            idempotencyKey: claimIdemKey,
            metaJson: JSON.stringify({ depositId: deposit.id, claimAmount }),
          },
          update: {},
        });
      } catch {
        // non-critical — next retry will succeed due to idempotency key
      }

      this.eventBus.publish({
        type: DomainEventType.DEPOSIT_CLAIMED,
        depositId: deposit.id,
        bookingId: deposit.bookingId,
        vendorId,
        amount: claimAmount,
        currency: deposit.currency,
        occurredAt: new Date(),
      });
    }

    this.logger.log(
      `claimSecurityDeposit completed depositId=${deposit.id} bookingId=${deposit.bookingId} claimAmount=${claimAmount}`,
    );
    return { ok: true, deposit: updated };
  }
}
