import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  CalendarDayStatus,
  CancellationActor,
  CancellationMode,
  CancellationReason,
  HoldStatus,
  OpsTaskStatus,
  PaymentStatus,
  Prisma,
  RefundReason,
  RefundStatus,
  UserRole,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../modules/prisma/prisma.service';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CancellationPolicyService } from './policies/cancellation.policy';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { buildOverlapFilter } from '../common/date-range';

const PAYMENT_WINDOW_MINUTES = 15;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cancellationPolicy: CancellationPolicyService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------
  // Quote helpers
  // ---------------------------
  private async computeQuote(params: {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
  }) {
    const property = await this.prisma.property.findUnique({
      where: { id: params.propertyId },
      select: {
        basePrice: true,
        cleaningFee: true,
      },
    });

    if (!property) throw new NotFoundException('Property not found.');

    const nights =
      (params.checkOut.getTime() - params.checkIn.getTime()) /
      (1000 * 60 * 60 * 24);

    if (nights <= 0) throw new BadRequestException('Invalid date range.');

    const subtotal = nights * property.basePrice;
    const fees = property.cleaningFee ?? 0;

    return {
      totalAed: subtotal + fees,
    };
  }

  // ---------------------------
  // CREATE BOOKING (HARDENED + EXPIRY)
  // ---------------------------
  async createFromHold(args: {
    userId: string;
    userRole: UserRole;
    holdId: string;
    idempotencyKey?: string | null;
  }) {
    if (args.userRole !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only CUSTOMER users can create bookings.');
    }

    const idempotencyKey = args.idempotencyKey?.trim() || null;
    const now = new Date();

    // 🔁 Fast-path idempotency
    if (idempotencyKey) {
      const existing = await this.prisma.booking.findFirst({
        where: {
          customerId: args.userId,
          idempotencyKey,
        },
      });

      if (existing) {
        return { ok: true, reused: true, booking: existing };
      }
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const hold = await tx.propertyHold.findUnique({
            where: { id: args.holdId },
          });

          if (!hold) throw new NotFoundException('Hold not found.');
          if (hold.createdById !== args.userId)
            throw new ForbiddenException('You do not own this hold.');

          if (hold.status !== HoldStatus.ACTIVE)
            throw new BadRequestException('Hold is not active.');

          if (hold.expiresAt <= now) {
            await tx.propertyHold.update({
              where: { id: hold.id },
              data: { status: HoldStatus.EXPIRED },
            });
            throw new BadRequestException('Hold has expired.');
          }

          // 1️⃣ Booking overlap check
          const bookingOverlap = await tx.booking.findFirst({
            where: {
              propertyId: hold.propertyId,
              status: {
                in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED],
              },
              AND: buildOverlapFilter(
                'checkIn',
                'checkOut',
                hold.checkIn,
                hold.checkOut,
              ),
            },
          });

          if (bookingOverlap)
            throw new BadRequestException('Dates no longer available.');

          // 2️⃣ Hold overlap check
          const holdOverlap = await tx.propertyHold.findFirst({
            where: {
              propertyId: hold.propertyId,
              status: HoldStatus.ACTIVE,
              expiresAt: { gt: now },
              id: { not: hold.id },
              AND: buildOverlapFilter(
                'checkIn',
                'checkOut',
                hold.checkIn,
                hold.checkOut,
              ),
            },
          });

          if (holdOverlap)
            throw new BadRequestException('Dates no longer available.');

          // 3️⃣ Calendar block check
          const blocked = await tx.propertyCalendarDay.findFirst({
            where: {
              propertyId: hold.propertyId,
              status: CalendarDayStatus.BLOCKED,
              date: { gte: hold.checkIn, lt: hold.checkOut },
            },
          });

          if (blocked)
            throw new BadRequestException('Dates include blocked nights.');

          const fallbackQuote = await this.computeQuote({
            propertyId: hold.propertyId,
            checkIn: hold.checkIn,
            checkOut: hold.checkOut,
          });

          const holdFxRate = Number(hold.fxRate?.toString() ?? '1');
          const fxRate =
            Number.isFinite(holdFxRate) && holdFxRate > 0 ? holdFxRate : 1;
          const totalAmountAed =
            typeof hold.quotedTotalAed === 'number'
              ? hold.quotedTotalAed
              : fallbackQuote.totalAed;
          const displayCurrency = hold.displayCurrency || 'AED';
          const displayTotalAmount =
            typeof hold.quotedTotalDisplay === 'number'
              ? hold.quotedTotalDisplay
              : Math.round(totalAmountAed * fxRate);

          const booking = await tx.booking.create({
            data: {
              customerId: args.userId,
              propertyId: hold.propertyId,
              holdId: hold.id,
              checkIn: hold.checkIn,
              checkOut: hold.checkOut,
              adults: 2,
              children: 0,
              status: BookingStatus.PENDING_PAYMENT,
              totalAmount: displayTotalAmount,
              currency: displayCurrency,
              totalAmountAed,
              displayTotalAmount,
              displayCurrency,
              fxRate,
              fxAsOfDate: hold.fxAsOfDate ?? null,
              fxProvider: hold.fxProvider ?? null,
              idempotencyKey,
              expiresAt: new Date(
                Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000,
              ),
            },
          });

          await tx.propertyHold.update({
            where: { id: hold.id },
            data: {
              status: HoldStatus.CONVERTED,
              bookingId: booking.id,
              convertedAt: now,
            },
          });

          return { ok: true, reused: false, booking };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err) {
      // 🛡️ Race-condition hardening
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        idempotencyKey
      ) {
        const existing = await this.prisma.booking.findFirst({
          where: {
            customerId: args.userId,
            idempotencyKey,
          },
        });

        if (existing) {
          return { ok: true, reused: true, booking: existing };
        }
      }

      throw err;
    }
  }

  // ---------------------------
  // CANCEL BOOKING (FP POLICY ENGINE + REFUND STAGING)
  // ---------------------------
  async cancelBooking(args: {
    bookingId: string;
    actorUser: { id: string; role: 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'SYSTEM' };
    dto: CancelBookingDto;
  }) {
    const { bookingId, actorUser, dto } = args;

    const actor = this.resolveCancellationActor(actorUser.role);

    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          property: true,
          payment: true,
          cancellation: true,
        },
      });

      if (!booking) throw new NotFoundException('Booking not found.');

      // ✅ Idempotent: already cancelled — still ensure ops tasks are cancelled (retry-safe)
      if (booking.status === BookingStatus.CANCELLED && booking.cancellation) {
        await this.cancelOpsTasksForBooking(tx, booking.id);
        return {
          ok: true,
          alreadyCancelled: true,
          bookingId: booking.id,
          booking,
          cancellationId: booking.cancellation.id,
          refundId: booking.cancellation.refundId ?? null,
          actor,
        };
      }

      if (booking.status === BookingStatus.COMPLETED) {
        throw new BadRequestException(
          'Completed bookings cannot be cancelled.',
        );
      }

      // ✅ Permission enforcement
      if (actor === CancellationActor.CUSTOMER) {
        if (booking.customerId !== actorUser.id) {
          throw new ForbiddenException('You can only cancel your own booking.');
        }
      }

      if (actor === CancellationActor.VENDOR) {
        if (booking.property.vendorId !== actorUser.id) {
          throw new ForbiddenException(
            'You can only cancel bookings for your own property.',
          );
        }

        const allowed = new Set<CancellationReason>([
          CancellationReason.OWNER_REQUEST,
          CancellationReason.FORCE_MAJEURE,
        ]);

        if (!allowed.has(dto.reason)) {
          throw new ForbiddenException(
            'Vendor cancellation reason not allowed.',
          );
        }
      }

      // ✅ Allowed statuses to cancel
      if (
        booking.status !== BookingStatus.PENDING_PAYMENT &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new BadRequestException(
          `Booking cannot be cancelled from status ${booking.status}.`,
        );
      }

      const bookingTotalAed = booking.totalAmountAed ?? booking.totalAmount;
      const bookingDisplayCurrency =
        (booking.displayCurrency ?? '').trim() || booking.currency || 'AED';
      const bookingDisplayTotal =
        booking.displayTotalAmount ?? booking.totalAmount;
      const bookingFxRateRaw = Number(booking.fxRate?.toString() ?? '1');
      const bookingFxRate =
        Number.isFinite(bookingFxRateRaw) && bookingFxRateRaw > 0
          ? bookingFxRateRaw
          : 1;
      const toDisplayFromAed = (amountAed: number) =>
        Math.round(amountAed * bookingFxRate);

      const isSystemAutoExpiredCancellation =
        actor === CancellationActor.SYSTEM &&
        dto.reason === CancellationReason.AUTO_EXPIRED_UNPAID;

      // ✅ Load policy: property override -> global active
      const policy =
        (await tx.cancellationPolicyConfig.findFirst({
          where: { propertyId: booking.propertyId, isActive: true },
          orderBy: { updatedAt: 'desc' },
        })) ??
        (await tx.cancellationPolicyConfig.findFirst({
          where: { propertyId: null, isActive: true },
          orderBy: { updatedAt: 'desc' },
        }));

      let decision:
        | {
            tier: 'FREE' | 'PARTIAL' | 'NO_REFUND';
            mode: CancellationMode;
            policyVersion: string;
            releasesInventory: boolean;
            penaltyAmount: number;
            refundableAmount: number;
            hoursToCheckIn: number;
          }
        | undefined;

      if (isSystemAutoExpiredCancellation) {
        const hoursToCheckIn = Math.floor(
          (booking.checkIn.getTime() - Date.now()) / (1000 * 60 * 60),
        );

        decision = {
          tier: 'NO_REFUND',
          mode: dto.mode ?? CancellationMode.SOFT,
          policyVersion: policy?.version ?? 'SYSTEM_AUTO_EXPIRED_UNPAID',
          releasesInventory: true,
          penaltyAmount: 0,
          refundableAmount: 0,
          hoursToCheckIn,
        };
      } else {
        if (!policy) {
          throw new BadRequestException(
            'Cancellation policy is not configured. Create a global CancellationPolicyConfig first.',
          );
        }

        // ✅ Force HARD cancellation for certain reasons
        const forcedHardReasons = new Set<CancellationReason>([
          CancellationReason.FRAUD,
          CancellationReason.ADMIN_OVERRIDE,
        ]);

        const requestedMode = forcedHardReasons.has(dto.reason)
          ? CancellationMode.HARD
          : dto.mode;

        // ✅ Policy decision
        decision = this.cancellationPolicy.decide({
          now: new Date(),
          actor,
          booking: {
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            totalAmount: bookingTotalAed,
            currency: 'AED',
          },
          policy,
          requestedMode,
        });
      }

      const penaltyAmountDisplay =
        bookingDisplayCurrency === 'AED'
          ? decision.penaltyAmount
          : toDisplayFromAed(decision.penaltyAmount);
      const refundableAmountDisplay =
        bookingDisplayCurrency === 'AED'
          ? decision.refundableAmount
          : toDisplayFromAed(decision.refundableAmount);

      // ✅ Refund staging (only if payment exists and is refundable)
      let refundId: string | null = null;

      const canStageRefund =
        decision.refundableAmount > 0 &&
        !!booking.payment &&
        (booking.payment.status === PaymentStatus.AUTHORIZED ||
          booking.payment.status === PaymentStatus.CAPTURED);

      if (canStageRefund) {
        const refund = await tx.refund.create({
          data: {
            bookingId: booking.id,
            paymentId: booking.payment!.id,
            status: RefundStatus.PENDING,
            reason: RefundReason.CANCELLATION,
            amount: refundableAmountDisplay,
            currency: booking.currency,
            provider: booking.payment!.provider,
          },
        });

        refundId = refund.id;
      }

      // ✅ Create cancellation snapshot (1:1)
      const cancellation =
        booking.cancellation ??
        (await tx.bookingCancellation.create({
          data: {
            bookingId: booking.id,
            actor,
            reason: dto.reason,
            notes: dto.notes?.trim() || null,
            mode: decision.mode,
            policyVersion: decision.policyVersion,

            totalAmount: bookingTotalAed,
            managementFee: 0,
            penaltyAmount: decision.penaltyAmount,
            refundableAmount: decision.refundableAmount,
            currency: 'AED',
            displayCurrency: bookingDisplayCurrency,
            displayFxRate: bookingFxRate,
            displayFxAsOfDate: booking.fxAsOfDate ?? null,
            totalAmountDisplay: bookingDisplayTotal,
            penaltyAmountDisplay,
            refundableAmountDisplay,

            releasesInventory: decision.releasesInventory,
            refundId,
          },
        }));

      // ✅ Update booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: actor,
          cancellationReason: dto.reason,
        },
      });

      // ✅ Frank Porter Ops Hook: cancel ops tasks linked to this booking
      await this.cancelOpsTasksForBooking(tx, booking.id);

      return {
        ok: true,
        bookingId: booking.id,
        booking,
        cancellationId: cancellation.id,
        refundId,
        actor,
        decision: {
          tier: decision.tier,
          mode: decision.mode,
          hoursToCheckIn: decision.hoursToCheckIn,
          penaltyAmount: penaltyAmountDisplay,
          refundableAmount: refundableAmountDisplay,
          policyVersion: decision.policyVersion,
          reason: dto.reason,
          notes: dto.notes?.trim() || null,
        },
      };
    });

    // 🔔 Emit notifications AFTER COMMIT (non-blocking)
    try {
      const booking = result.booking;
      const vendorId = booking?.property?.vendorId ?? null;
      const customerId = booking?.customerId ?? null;

      if (booking?.id && customerId) {
        // Customer always receives BOOKING_CANCELLED
        await this.notifications.emit({
          type: NotificationType.BOOKING_CANCELLED,
          entityType: 'BOOKING',
          entityId: booking.id,
          recipientUserId: customerId,
          payload: {
            booking: {
              id: booking.id,
              propertyId: booking.propertyId,
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              totalAmount: booking.totalAmount,
              currency: booking.currency,
              status: BookingStatus.CANCELLED,
            },
            cancellation: {
              actor: result.actor,
              reason:
                result.decision?.reason ?? booking.cancellationReason ?? null,
              mode: result.decision?.mode ?? null,
              penaltyAmount: result.decision?.penaltyAmount ?? null,
              refundableAmount: result.decision?.refundableAmount ?? null,
              refundId: result.refundId ?? null,
            },
          },
        });
      }

      if (booking?.id && vendorId) {
        // Vendor receives "cancelled by guest" if actor is CUSTOMER; otherwise generic cancellation
        const vendorType =
          result.actor === CancellationActor.CUSTOMER
            ? NotificationType.BOOKING_CANCELLED_BY_GUEST
            : NotificationType.BOOKING_CANCELLED;

        await this.notifications.emit({
          type: vendorType,
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
              status: BookingStatus.CANCELLED,
            },
            cancellation: {
              actor: result.actor,
              reason:
                result.decision?.reason ?? booking.cancellationReason ?? null,
              mode: result.decision?.mode ?? null,
              penaltyAmount: result.decision?.penaltyAmount ?? null,
              refundableAmount: result.decision?.refundableAmount ?? null,
              refundId: result.refundId ?? null,
            },
          },
        });
      }
    } catch {
      // non-blocking: notifications are async side-effects
    }

    // Preserve original response contract
    if (result.alreadyCancelled) {
      return {
        ok: true,
        alreadyCancelled: true,
        bookingId: result.bookingId,
        cancellationId: result.cancellationId,
        refundId: result.refundId ?? null,
      };
    }

    return {
      ok: true,
      bookingId: result.bookingId,
      cancellationId: result.cancellationId,
      refundId: result.refundId ?? null,
      decision: result.decision,
    };
  }

  private resolveCancellationActor(
    role: 'CUSTOMER' | 'VENDOR' | 'ADMIN' | 'SYSTEM',
  ): CancellationActor {
    switch (role) {
      case 'SYSTEM':
        return CancellationActor.SYSTEM;
      case 'ADMIN':
        return CancellationActor.ADMIN;
      case 'VENDOR':
        return CancellationActor.VENDOR;
      case 'CUSTOMER':
      default:
        return CancellationActor.CUSTOMER;
    }
  }

  /**
   * ✅ Operator Layer V1: Booking cancellation cancels any not-completed tasks.
   * Keeps audit trail (no delete).
   */
  private async cancelOpsTasksForBooking(
    tx: Prisma.TransactionClient,
    bookingId: string,
  ): Promise<void> {
    await tx.opsTask.updateMany({
      where: {
        bookingId,
        status: {
          in: [
            OpsTaskStatus.PENDING,
            OpsTaskStatus.ASSIGNED,
            OpsTaskStatus.IN_PROGRESS,
          ],
        },
      },
      data: {
        status: OpsTaskStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }
}
