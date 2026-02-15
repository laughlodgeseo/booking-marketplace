import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BookingStatus,
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
import {
  type TelrCreateSessionResult,
  TelrPaymentsProvider,
  type TelrVerifiedPayment,
} from './providers/telr.provider';
import { NotificationsService } from '../notifications/notifications.service';

type Actor = { id: string; role: 'CUSTOMER' | 'VENDOR' | 'ADMIN' };

type AuthorizeResult =
  | {
      ok: true;
      reused: boolean;
      payment: unknown;
      provider: PaymentProvider;
      telr: { redirectUrl: string };
    }
  | { ok: true; reused: boolean; payment: unknown; provider: PaymentProvider };

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manualProvider: ManualPaymentsProvider,
    private readonly telrProvider: TelrPaymentsProvider,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * TELR-only policy (customer-facing):
   * - CUSTOMER payments must use TELR.
   * - MANUAL is allowed only for internal/dev/admin flows.
   * - Booking becomes CONFIRMED only via verified Telr webhook + server-side check.
   */
  async authorize(args: {
    actor: Actor;
    bookingId: string;
    provider: PaymentProvider;
    idempotencyKey: string | null;
  }): Promise<AuthorizeResult> {
    const requested = args.provider ?? PaymentProvider.TELR;
    const idempotencyKey = (args.idempotencyKey ?? '').trim() || null;

    // ✅ Customer-facing: TELR only (ignore/deny other providers)
    const provider: PaymentProvider =
      args.actor.role === 'CUSTOMER' ? PaymentProvider.TELR : requested;

    if (
      provider !== PaymentProvider.TELR &&
      provider !== PaymentProvider.MANUAL
    ) {
      throw new BadRequestException(`Provider ${provider} is not supported.`);
    }

    if (args.actor.role === 'CUSTOMER' && provider !== PaymentProvider.TELR) {
      throw new BadRequestException(
        'TELR is the only supported payment method.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: args.bookingId },
        include: {
          payment: true,
          customer: { select: { email: true, fullName: true } },
        },
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
          // In TELR authorize, redirectUrl is not persisted; the client can retry authorize if needed.
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

      if (provider === PaymentProvider.MANUAL) {
        // Internal/dev flow only
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
      }

      // ✅ TELR (hosted redirect): booking CONFIRMED only via verified webhook-check
      const baseUrl = (process.env.PUBLIC_API_BASE_URL ?? '').trim();
      if (!baseUrl) {
        throw new BadRequestException(
          'PUBLIC_API_BASE_URL is not configured (required for Telr return URLs).',
        );
      }

      const session = await this.createTelrHostedSessionOrThrow({
        bookingId: booking.id,
        amountMinor: payment.amount,
        currency: payment.currency,
        description: `Booking ${booking.id}`,
        returnUrl: `${baseUrl}/api/payments/return/telr`,
        cancelUrl: `${baseUrl}/api/payments/cancel/telr`,
        customerEmail: booking.customer.email ?? null,
        customerName: booking.customer.fullName ?? null,
      });

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REQUIRES_ACTION,
          providerRef: session.providerRef,
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.AUTHORIZE,
          idempotencyKey,
          providerRef: session.providerRef,
          payloadJson: JSON.stringify({
            kind: 'TELR_CREATE_SESSION',
            bookingId: booking.id,
            providerRef: session.providerRef,
          }),
        },
      });

      return {
        ok: true,
        reused: false,
        payment: updated,
        provider: PaymentProvider.TELR,
        telr: { redirectUrl: session.redirectUrl },
      };
    });
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

        // ✅ Phase 0 rule: TELR is webhook-confirmed ONLY.
        if (payment.provider !== PaymentProvider.MANUAL) {
          throw new BadRequestException(
            `Provider ${payment.provider} is webhook-confirmed. Use TELR webhook to confirm booking.`,
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

      if (refund.provider === PaymentProvider.MANUAL) {
        const res = await this.manualProvider.refund({
          providerRef: payment.providerRef ?? null,
          refundId: refund.id,
          amount,
          currency: refund.currency,
        });
        providerRefundRef = res.providerRefundRef;
      } else {
        // TELR refunds will be enabled once your Telr account supports refund API access.
        throw new BadRequestException(
          `Provider ${refund.provider} refund execution not enabled yet.`,
        );
      }

      const updatedRefund = await tx.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.SUCCEEDED, providerRefundRef },
      });

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
      if (result?.ok && result?.bookingCustomerId) {
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
   * TELR webhook-driven confirmation (ONLY after verifying via Telr “check status”).
   */
  async handleTelrWebhookCaptured(args: {
    bookingId: string;
    providerRef: string;
    webhookEventId: string;
  }): Promise<{ ok: true; reused: boolean }> {
    const verified = await this.telrProvider.verifyCapturedPayment({
      providerRef: args.providerRef,
    });

    if (verified.bookingId !== args.bookingId) {
      throw new BadRequestException(
        'Telr verification cartid does not match bookingId.',
      );
    }

    const txResult = await this.applyVerifiedTelrWebhookCapture({
      bookingId: args.bookingId,
      providerRef: args.providerRef,
      webhookEventId: args.webhookEventId,
      verified,
    });

    await this.emitConfirmedNotifications(
      txResult.booking,
      txResult.vendorId ?? null,
      txResult.ops,
    );

    return { ok: true, reused: txResult.reused };
  }

  async handleTelrWebhookCapturedVerified(args: {
    bookingId: string;
    providerRef: string;
    webhookEventId: string;
    currency: string;
    amountMinor: number;
    statusCode?: string;
    statusText?: string;
  }): Promise<{ ok: true; reused: boolean }> {
    const verified: TelrVerifiedPayment = {
      ok: true,
      providerRef: args.providerRef,
      bookingId: args.bookingId,
      statusCode: (args.statusCode ?? 'DEV_SIM').trim() || 'DEV_SIM',
      statusText:
        (args.statusText ?? 'DEV_SIMULATED').trim() || 'DEV_SIMULATED',
      amountMinor: args.amountMinor,
      currency: args.currency,
    };

    const txResult = await this.applyVerifiedTelrWebhookCapture({
      bookingId: args.bookingId,
      providerRef: args.providerRef,
      webhookEventId: args.webhookEventId,
      verified,
    });

    await this.emitConfirmedNotifications(
      txResult.booking,
      txResult.vendorId ?? null,
      txResult.ops,
    );

    return { ok: true, reused: txResult.reused };
  }

  private async applyVerifiedTelrWebhookCapture(args: {
    bookingId: string;
    providerRef: string;
    webhookEventId: string;
    verified: TelrVerifiedPayment;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
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

        const payment = booking.payment;

        if (payment.provider !== PaymentProvider.TELR) {
          throw new BadRequestException(
            `Payment provider mismatch. Expected TELR, found ${payment.provider}.`,
          );
        }

        if (payment.providerRef && payment.providerRef !== args.providerRef) {
          throw new BadRequestException(
            'providerRef mismatch for this booking/payment.',
          );
        }

        if ((payment.currency ?? '').trim() !== args.verified.currency) {
          throw new BadRequestException(
            'Currency mismatch between payment and Telr verification.',
          );
        }

        // ✅ Compare minor units exactly (DB uses Int minor units)
        if (Number(payment.amount) !== Number(args.verified.amountMinor)) {
          throw new BadRequestException(
            'Amount mismatch between payment and Telr verification.',
          );
        }

        const existing = await tx.paymentEvent.findUnique({
          where: {
            uniq_payment_event_idempotency: {
              paymentId: payment.id,
              type: PaymentEventType.WEBHOOK,
              idempotencyKey: args.webhookEventId,
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
          };
        }

        const alreadyCaptured = payment.status === PaymentStatus.CAPTURED;
        const alreadyConfirmed = booking.status === BookingStatus.CONFIRMED;

        if (!alreadyCaptured) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.CAPTURED,
              providerRef: args.providerRef,
            },
          });
        }

        if (!alreadyConfirmed) {
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.CONFIRMED },
          });
        }

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.WEBHOOK,
            idempotencyKey: args.webhookEventId,
            providerRef: args.providerRef,
            payloadJson: JSON.stringify({
              kind: 'TELR_VERIFIED',
              bookingId: booking.id,
              telr: {
                statusCode: args.verified.statusCode,
                statusText: args.verified.statusText,
              },
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
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async handleWebhookPaymentFailed(args: {
    provider: 'TELR';
    bookingId: string;
    providerRef: string;
    webhookEventId: string;
  }): Promise<{ ok: true }> {
    await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: args.bookingId },
        include: { payment: true },
      });
      if (!booking) throw new NotFoundException('Booking not found.');
      if (!booking.payment)
        throw new BadRequestException('No payment exists for booking.');

      const payment = booking.payment;

      if (payment.provider !== PaymentProvider.TELR) return;

      const existing = await tx.paymentEvent.findUnique({
        where: {
          uniq_payment_event_idempotency: {
            paymentId: payment.id,
            type: PaymentEventType.WEBHOOK,
            idempotencyKey: args.webhookEventId,
          },
        },
      });
      if (existing) return;

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.WEBHOOK,
          idempotencyKey: args.webhookEventId,
          providerRef: args.providerRef,
          payloadJson: JSON.stringify({
            kind: 'TELR_FAILED',
            bookingId: booking.id,
          }),
        },
      });

      try {
        await this.notifications.emit({
          type: NotificationType.PAYMENT_FAILED,
          entityType: 'BOOKING',
          entityId: booking.id,
          recipientUserId: booking.customerId,
          payload: { bookingId: booking.id, provider: 'TELR' },
        });
      } catch {
        // non-blocking
      }
    });

    return { ok: true };
  }

  private async createTelrHostedSessionOrThrow(args: {
    bookingId: string;
    amountMinor: number;
    currency: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    customerEmail?: string | null;
    customerName?: string | null;
  }): Promise<TelrCreateSessionResult> {
    try {
      return await this.telrProvider.createHostedPaymentSession(args);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'TELR authorize failed.';
      const lowered = message.toLowerCase();

      const isConfigError =
        lowered.includes('telr_store_id is not configured') ||
        lowered.includes('telr_auth_key is not configured');

      if (isConfigError) {
        throw new ServiceUnavailableException({
          ok: false,
          code: 'TELR_NOT_CONFIGURED',
          message:
            'TELR is not configured. Please try another method or contact support.',
        });
      }

      throw new BadGatewayException({
        ok: false,
        code: 'TELR_PROVIDER_ERROR',
        message: 'TELR authorize request failed. Please try again shortly.',
      });
    }
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
