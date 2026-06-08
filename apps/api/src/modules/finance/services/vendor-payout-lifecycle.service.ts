import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  LedgerDirection,
  LedgerEntryType,
  NotificationType,
  PaymentStatus,
  PayoutMethodStatus,
  Prisma,
  UserRole,
  VendorPayoutMethodType,
  VendorPayoutStatus,
} from '@prisma/client';
import type { Express } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../../infra/storage/storage.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  calculateVendorPayout,
  formatMoneyMinor,
  groupIban,
  last4,
  maskIban,
  normalizeIban,
} from '../../../common/finance/vendor-payout-money';
import type { UpsertVendorPayoutMethodDto } from '../dto/vendor-payout-method.dto';

type Tx = Prisma.TransactionClient;

function clean(value: string | null | undefined, max = 500): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  if (/<[^>]*>|javascript:/i.test(trimmed)) {
    throw new BadRequestException('HTML/script content is not allowed.');
  }
  return trimmed.slice(0, max);
}

function cleanCurrency(value: string | null | undefined): string {
  const currency = (value ?? 'AED').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new BadRequestException('currency must be an ISO 4217 code.');
  }
  return currency;
}

function twoBusinessDaysFrom(date: Date): Date {
  const due = new Date(date);
  let added = 0;
  while (added < 2) {
    due.setUTCDate(due.getUTCDate() + 1);
    const day = due.getUTCDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return due;
}

@Injectable()
export class VendorPayoutLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  calculateVendorPayout(grossAmountMinor: number) {
    return calculateVendorPayout(grossAmountMinor);
  }

  private validateMethodInput(dto: UpsertVendorPayoutMethodDto) {
    const type = dto.type;
    const accountHolderName = clean(dto.accountHolderName, 120);
    const bankName = clean(dto.bankName, 120);
    const iban = normalizeIban(dto.iban);
    const accountNumber = clean(dto.accountNumber, 64);
    const swiftCode = clean(dto.swiftCode, 16)?.toUpperCase() ?? null;
    const bankCountry = clean(dto.bankCountry, 80);
    const bankCity = clean(dto.bankCity, 80);
    const currency = cleanCurrency(dto.currency);
    const transferInstructions = clean(dto.transferInstructions, 500);
    const manualMethodLabel = clean(dto.manualMethodLabel, 80);
    const manualIdentifier = clean(dto.manualIdentifier, 180);
    const manualInstructions = clean(dto.manualInstructions, 500);
    const contactDetail = clean(dto.contactDetail, 120);

    if (
      type === VendorPayoutMethodType.UAE_BANK_TRANSFER ||
      type === VendorPayoutMethodType.INTERNATIONAL_BANK_TRANSFER
    ) {
      if (!accountHolderName)
        throw new BadRequestException('accountHolderName is required.');
      if (!bankName) throw new BadRequestException('bankName is required.');
    }

    if (type === VendorPayoutMethodType.UAE_BANK_TRANSFER) {
      if (!iban) throw new BadRequestException('UAE IBAN is required.');
      if (!iban.startsWith('AE') || iban.length !== 23) {
        throw new BadRequestException(
          'UAE IBAN must start with AE and be 23 characters without spaces.',
        );
      }
    }

    if (type === VendorPayoutMethodType.INTERNATIONAL_BANK_TRANSFER) {
      const country = (bankCountry ?? '').toUpperCase();
      if (!country) throw new BadRequestException('bankCountry is required.');
      if (!iban && !accountNumber) {
        throw new BadRequestException('IBAN or account number is required.');
      }
      if (country !== 'UAE' && country !== 'AE' && !swiftCode) {
        throw new BadRequestException(
          'SWIFT/BIC is required for non-UAE international payouts.',
        );
      }
    }

    if (type === VendorPayoutMethodType.OTHER_MANUAL) {
      if (!manualMethodLabel) {
        throw new BadRequestException('manualMethodLabel is required.');
      }
      if (!manualIdentifier && !manualInstructions) {
        throw new BadRequestException(
          'manualIdentifier or manualInstructions is required.',
        );
      }
    }

    if (type === VendorPayoutMethodType.STRIPE_CONNECT) {
      throw new BadRequestException(
        'Stripe Connect is future-compatible but not active for this workspace.',
      );
    }

    return {
      type,
      accountHolderName,
      bankName,
      iban,
      accountNumberLast4: last4(accountNumber),
      accountNumberEnc: accountNumber,
      swiftCode,
      bankCountry,
      bankCity,
      currency,
      transferInstructions,
      manualMethodLabel,
      manualIdentifier,
      manualInstructions,
      contactDetail,
    };
  }

  private methodPayload(method: {
    id: string;
    vendorId: string;
    type: VendorPayoutMethodType;
    status: PayoutMethodStatus;
    accountHolderName: string | null;
    bankName: string | null;
    iban: string | null;
    accountNumberLast4: string | null;
    accountNumberEnc: string | null;
    swiftCode: string | null;
    bankCountry: string | null;
    bankCity: string | null;
    currency: string;
    transferInstructions?: string | null;
    manualMethodLabel: string | null;
    manualIdentifier: string | null;
    manualInstructions: string | null;
    contactDetail?: string | null;
    isDefault: boolean;
    verifiedAt: Date | null;
    rejectedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    vendor?: { email: string; fullName: string | null } | null;
  }, full = false) {
    return {
      id: method.id,
      vendorId: method.vendorId,
      vendor: method.vendor ?? undefined,
      type: method.type,
      status: method.status,
      accountHolderName: method.accountHolderName,
      bankName: method.bankName,
      ibanMasked: maskIban(method.iban),
      iban: full ? groupIban(method.iban) : undefined,
      accountNumberLast4: method.accountNumberLast4,
      accountNumber: full ? method.accountNumberEnc : undefined,
      swiftCode: full ? method.swiftCode : method.swiftCode ? '••••' : null,
      bankCountry: method.bankCountry,
      bankCity: method.bankCity,
      currency: method.currency,
      transferInstructions: full ? method.transferInstructions ?? null : undefined,
      manualMethodLabel: method.manualMethodLabel,
      manualIdentifier: full ? method.manualIdentifier : method.manualIdentifier ? '••••' : null,
      manualInstructions: full ? method.manualInstructions : undefined,
      contactDetail: full ? method.contactDetail ?? null : undefined,
      isDefault: method.isDefault,
      verifiedAt: method.verifiedAt?.toISOString() ?? null,
      rejectedAt: method.rejectedAt?.toISOString() ?? null,
      rejectionReason: method.rejectionReason,
      createdAt: method.createdAt.toISOString(),
      updatedAt: method.updatedAt.toISOString(),
    };
  }

  async vendorListMethods(vendorId: string) {
    const rows = await this.prisma.vendorPayoutMethod.findMany({
      where: { vendorId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return { items: rows.map((row) => this.methodPayload(row, false)) };
  }

  async vendorCreateMethod(vendorId: string, dto: UpsertVendorPayoutMethodDto) {
    const data = this.validateMethodInput(dto);
    return this.prisma.$transaction(async (tx) => {
      const shouldDefault =
        dto.isDefault === true ||
        (await tx.vendorPayoutMethod.count({ where: { vendorId } })) === 0;

      if (shouldDefault) {
        await tx.vendorPayoutMethod.updateMany({
          where: { vendorId },
          data: { isDefault: false },
        });
      }

      const created = await tx.vendorPayoutMethod.create({
        data: {
          vendorId,
          ...data,
          status: PayoutMethodStatus.PENDING_REVIEW,
          isDefault: shouldDefault,
        },
      });

      return this.methodPayload(created, false);
    });
  }

  async vendorUpdateMethod(
    vendorId: string,
    methodId: string,
    dto: UpsertVendorPayoutMethodDto,
  ) {
    const current = await this.prisma.vendorPayoutMethod.findUnique({
      where: { id: methodId },
    });
    if (!current) throw new NotFoundException('Payout method not found.');
    if (current.vendorId !== vendorId) {
      throw new ForbiddenException('You can only edit your own payout method.');
    }

    const data = this.validateMethodInput(dto);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.vendorPayoutMethod.updateMany({
          where: { vendorId },
          data: { isDefault: false },
        });
      }

      const updated = await tx.vendorPayoutMethod.update({
        where: { id: methodId },
        data: {
          ...data,
          status: PayoutMethodStatus.PENDING_REVIEW,
          isDefault: dto.isDefault === true ? true : current.isDefault,
          verifiedAt: null,
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      return this.methodPayload(updated, false);
    });
  }

  async vendorDisableMethod(vendorId: string, methodId: string) {
    const method = await this.prisma.vendorPayoutMethod.findUnique({
      where: { id: methodId },
    });
    if (!method) throw new NotFoundException('Payout method not found.');
    if (method.vendorId !== vendorId) {
      throw new ForbiddenException('You can only disable your own method.');
    }
    const updated = await this.prisma.vendorPayoutMethod.update({
      where: { id: methodId },
      data: { status: PayoutMethodStatus.DISABLED, isDefault: false },
    });
    return this.methodPayload(updated, false);
  }

  async vendorSetDefaultMethod(vendorId: string, methodId: string) {
    const method = await this.prisma.vendorPayoutMethod.findUnique({
      where: { id: methodId },
    });
    if (!method) throw new NotFoundException('Payout method not found.');
    if (method.vendorId !== vendorId) {
      throw new ForbiddenException('You can only set your own default method.');
    }
    if (method.status === PayoutMethodStatus.DISABLED) {
      throw new BadRequestException('Disabled methods cannot be default.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.vendorPayoutMethod.updateMany({
        where: { vendorId },
        data: { isDefault: false },
      });
      const updated = await tx.vendorPayoutMethod.update({
        where: { id: methodId },
        data: { isDefault: true },
      });

      if (updated.status === PayoutMethodStatus.VERIFIED) {
        await tx.vendorPayout.updateMany({
          where: {
            vendorId,
            status: VendorPayoutStatus.PENDING_DETAILS,
          },
          data: {
            payoutMethodId: updated.id,
            status: VendorPayoutStatus.READY_FOR_PAYOUT,
          },
        });
      }

      return this.methodPayload(updated, false);
    });
  }

  async adminListMethods(args: {
    status?: PayoutMethodStatus | null;
    vendorId?: string | null;
  }) {
    const where: Prisma.VendorPayoutMethodWhereInput = {};
    if (args.status) where.status = args.status;
    if (args.vendorId) where.vendorId = args.vendorId;

    const rows = await this.prisma.vendorPayoutMethod.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: { vendor: { select: { email: true, fullName: true } } },
    });
    return { items: rows.map((row) => this.methodPayload(row, false)) };
  }

  async adminGetMethod(methodId: string) {
    const method = await this.prisma.vendorPayoutMethod.findUnique({
      where: { id: methodId },
      include: { vendor: { select: { email: true, fullName: true } } },
    });
    if (!method) throw new NotFoundException('Payout method not found.');
    return this.methodPayload(method, true);
  }

  async adminVerifyMethod(methodId: string) {
    return this.prisma.$transaction(async (tx) => {
      const method = await tx.vendorPayoutMethod.findUnique({
        where: { id: methodId },
      });
      if (!method) throw new NotFoundException('Payout method not found.');

      await tx.vendorPayoutMethod.updateMany({
        where: { vendorId: method.vendorId },
        data: { isDefault: false },
      });

      const updated = await tx.vendorPayoutMethod.update({
        where: { id: method.id },
        data: {
          status: PayoutMethodStatus.VERIFIED,
          verifiedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
          isDefault: true,
        },
      });

      await tx.vendorPayout.updateMany({
        where: {
          vendorId: method.vendorId,
          status: VendorPayoutStatus.PENDING_DETAILS,
        },
        data: {
          payoutMethodId: updated.id,
          status: VendorPayoutStatus.READY_FOR_PAYOUT,
        },
      });

      return this.methodPayload(updated, false);
    });
  }

  async adminRejectMethod(methodId: string, reason: string) {
    const cleanReason = clean(reason, 500);
    if (!cleanReason) throw new BadRequestException('reason is required.');
    const updated = await this.prisma.vendorPayoutMethod.update({
      where: { id: methodId },
      data: {
        status: PayoutMethodStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: cleanReason,
        verifiedAt: null,
        isDefault: false,
      },
    });
    return this.methodPayload(updated, false);
  }

  async ensurePayoutForCapturedBooking(
    tx: Tx,
    bookingId: string,
  ): Promise<{ payoutId: string | null; status: VendorPayoutStatus | null }> {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        propertyId: true,
        totalAmount: true,
        currency: true,
        confirmedAt: true,
        property: { select: { vendorId: true } },
        payment: { select: { id: true, status: true, amount: true, currency: true } },
      },
    });

    if (!booking) return { payoutId: null, status: null };
    if (booking.status !== BookingStatus.CONFIRMED) {
      return { payoutId: null, status: null };
    }
    if (!booking.payment || booking.payment.status !== PaymentStatus.CAPTURED) {
      return { payoutId: null, status: null };
    }

    const vendorId = booking.property.vendorId;
    //
    // MONEY CONTRACT (do not change without updating all callers):
    //   booking.payment.amount          → integer major-AED (e.g. 6851 = AED 6,851.00)
    //   VendorPayout.grossBookingAmountMinor  → minor fils (e.g. 685100 = AED 6,851.00)
    //   VendorPayout.platformCommissionMinor  → minor fils
    //   VendorPayout.vendorNetAmountMinor     → minor fils
    //   Frontend formatMoneyMinor(n)          → divides by 100 exactly once
    //
    const grossMinor = Math.round(Number(booking.payment.amount) * 100);
    const currency = booking.payment.currency || booking.currency || 'AED';
    const breakdown = calculateVendorPayout(grossMinor);

    const method = await tx.vendorPayoutMethod.findFirst({
      where: {
        vendorId,
        isDefault: true,
        status: PayoutMethodStatus.VERIFIED,
      },
      orderBy: { verifiedAt: 'desc' },
      select: { id: true },
    });

    const status = method
      ? VendorPayoutStatus.READY_FOR_PAYOUT
      : VendorPayoutStatus.PENDING_DETAILS;
    const dueAt = twoBusinessDaysFrom(booking.confirmedAt ?? new Date());

    const payout = await tx.vendorPayout.upsert({
      where: { bookingId: booking.id },
      create: {
        vendorId,
        propertyId: booking.propertyId,
        bookingId: booking.id,
        payoutMethodId: method?.id ?? null,
        grossBookingAmountMinor: breakdown.grossAmountMinor,
        platformCommissionRateBps: breakdown.platformCommissionRateBps,
        platformCommissionMinor: breakdown.platformCommissionMinor,
        vendorNetAmountMinor: breakdown.vendorNetAmountMinor,
        currency,
        status,
        dueAt,
      },
      update: {
        payoutMethodId: method?.id ?? undefined,
        grossBookingAmountMinor: breakdown.grossAmountMinor,
        platformCommissionRateBps: breakdown.platformCommissionRateBps,
        platformCommissionMinor: breakdown.platformCommissionMinor,
        vendorNetAmountMinor: breakdown.vendorNetAmountMinor,
        currency,
        status,
        dueAt,
      },
    });

    return { payoutId: payout.id, status: payout.status };
  }

  async cancelPayoutForBooking(tx: Tx, bookingId: string, reason: string) {
    await tx.vendorPayout.updateMany({
      where: {
        bookingId,
        status: {
          in: [
            VendorPayoutStatus.PENDING_DETAILS,
            VendorPayoutStatus.READY_FOR_PAYOUT,
            VendorPayoutStatus.PROCESSING,
          ],
        },
      },
      data: {
        status: VendorPayoutStatus.CANCELLED,
        adminNotes: reason,
      },
    });
  }

  private async payoutSelect(where: Prisma.VendorPayoutWhereUniqueInput) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where,
      include: {
        property: { select: { title: true } },
        booking: { select: { id: true, checkIn: true, checkOut: true } },
        payoutMethod: true,
        proofDocument: true,
      },
    });
    if (!payout) throw new NotFoundException('Vendor payout not found.');
    return payout;
  }

  /**
   * Fetch a payout proof from storage and return it as a buffer for streaming.
   * Always goes through the server — never redirects to Cloudinary directly.
   */
  private async fetchProofBuffer(proof: {
    cloudinaryPublicId: string;
    cloudinaryResourceType: string | null;
    cloudinaryDeliveryType: string | null;
    originalName: string | null;
    mimeType: string | null;
  }): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const signedUrl = await this.storage.getSignedUrl(
      proof.cloudinaryPublicId,
      {
        expiresInSeconds: 120,
        resourceType: proof.cloudinaryResourceType ?? undefined,
        deliveryType: proof.cloudinaryDeliveryType ?? undefined,
      },
    );

    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      throw new Error(
        `Proof file fetch failed: ${upstream.status} ${upstream.statusText}`,
      );
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const mimeType =
      proof.mimeType ??
      upstream.headers.get('content-type') ??
      'application/octet-stream';
    const fileName = proof.originalName ?? `payout-proof`;
    return { buffer, mimeType, fileName };
  }

  /**
   * Build the payout payload returned to callers.
   * proofViewUrl/proofDownloadUrl are API proxy routes — never direct Cloudinary URLs.
   * role determines which proxy prefix to use.
   */
  private payoutPayload(
    payout: Awaited<ReturnType<VendorPayoutLifecycleService['payoutSelect']>>,
    role: 'vendor' | 'admin' = 'vendor',
  ) {
    const hasProof = Boolean(payout.proofDocument);
    const proofBase =
      role === 'admin'
        ? `/api/portal/admin/vendor-payouts/${payout.id}/proof`
        : `/api/portal/vendor/payouts/${payout.id}/proof`;

    return {
      id: payout.id,
      vendorId: payout.vendorId,
      propertyId: payout.propertyId,
      propertyTitle: payout.property?.title ?? null,
      bookingId: payout.bookingId,
      checkIn: payout.booking?.checkIn?.toISOString() ?? null,
      checkOut: payout.booking?.checkOut?.toISOString() ?? null,
      payoutMethodId: payout.payoutMethodId,
      payoutMethod: payout.payoutMethod
        ? this.methodPayload(payout.payoutMethod, false)
        : null,
      grossBookingAmountMinor: payout.grossBookingAmountMinor,
      platformCommissionRateBps: payout.platformCommissionRateBps,
      platformCommissionMinor: payout.platformCommissionMinor,
      vendorNetAmountMinor: payout.vendorNetAmountMinor,
      currency: payout.currency,
      formatted: {
        gross: formatMoneyMinor(payout.grossBookingAmountMinor, payout.currency),
        commission: formatMoneyMinor(
          payout.platformCommissionMinor,
          payout.currency,
        ),
        vendorNet: formatMoneyMinor(
          payout.vendorNetAmountMinor,
          payout.currency,
        ),
      },
      status: payout.status,
      dueAt: payout.dueAt?.toISOString() ?? null,
      paidAt: payout.paidAt?.toISOString() ?? null,
      confirmedAt: payout.confirmedAt?.toISOString() ?? null,
      adminNotes: payout.adminNotes,
      vendorConfirmationNote: payout.vendorConfirmationNote,
      proofDocumentId: payout.proofDocumentId,
      proofAvailable: hasProof,
      proofUploadedAt:
        (payout.proofDocument as { createdAt?: Date } | null)?.createdAt?.toISOString() ??
        null,
      proofViewUrl: hasProof ? `${proofBase}/view` : null,
      proofDownloadUrl: hasProof ? `${proofBase}/download` : null,
      createdAt: payout.createdAt.toISOString(),
      updatedAt: payout.updatedAt.toISOString(),
    };
  }

  async vendorGetPayoutProof(
    vendorId: string,
    payoutId: string,
    mode: 'view' | 'download',
  ) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: { proofDocument: true },
    });
    if (!payout) throw new NotFoundException('Vendor payout not found.');
    if (payout.vendorId !== vendorId) {
      throw new ForbiddenException('You can only access your own payout proof.');
    }
    if (!payout.proofDocument) {
      throw new NotFoundException('No proof document uploaded for this payout.');
    }
    return this.fetchProofBuffer(payout.proofDocument);
  }

  async adminGetPayoutProof(payoutId: string, mode: 'view' | 'download') {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      include: { proofDocument: true },
    });
    if (!payout) throw new NotFoundException('Vendor payout not found.');
    if (!payout.proofDocument) {
      throw new NotFoundException('No proof document uploaded for this payout.');
    }
    return this.fetchProofBuffer(payout.proofDocument);
  }

  async vendorListPayouts(vendorId: string) {
    const rows = await this.prisma.vendorPayout.findMany({
      where: { vendorId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        property: { select: { title: true } },
        booking: { select: { id: true, checkIn: true, checkOut: true } },
        payoutMethod: true,
        proofDocument: true,
      },
    });

    const summary = {
      pendingAmountMinor: 0,
      readyAmountMinor: 0,
      paidAwaitingConfirmationMinor: 0,
      confirmedReceivedMinor: 0,
      thisMonthPaidMinor: 0,
    };
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    for (const p of rows) {
      if (p.status === VendorPayoutStatus.PENDING_DETAILS) {
        summary.pendingAmountMinor += p.vendorNetAmountMinor;
      }
      if (p.status === VendorPayoutStatus.READY_FOR_PAYOUT) {
        summary.readyAmountMinor += p.vendorNetAmountMinor;
      }
      if (p.status === VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION) {
        summary.paidAwaitingConfirmationMinor += p.vendorNetAmountMinor;
      }
      if (p.status === VendorPayoutStatus.CONFIRMED_RECEIVED) {
        summary.confirmedReceivedMinor += p.vendorNetAmountMinor;
        if (p.confirmedAt && p.confirmedAt >= monthStart) {
          summary.thisMonthPaidMinor += p.vendorNetAmountMinor;
        }
      }
    }

    return {
      summary,
      items: rows.map((row) => this.payoutPayload(row, 'vendor')),
    };
  }

  async vendorGetPayout(vendorId: string, payoutId: string) {
    const payout = await this.payoutSelect({ id: payoutId });
    if (payout.vendorId !== vendorId) {
      throw new ForbiddenException('You can only view your own payout.');
    }
    return this.payoutPayload(payout, 'vendor');
  }

  async vendorConfirmReceived(vendorId: string, payoutId: string, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.vendorPayout.findUnique({ where: { id: payoutId } });
      if (!payout) throw new NotFoundException('Vendor payout not found.');
      if (payout.vendorId !== vendorId) {
        throw new ForbiddenException('You can only confirm your own payout.');
      }
      if (payout.status === VendorPayoutStatus.CONFIRMED_RECEIVED) {
        return { ok: true as const, reused: true as const };
      }
      if (payout.status !== VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION) {
        throw new BadRequestException(
          `Cannot confirm receipt from status ${payout.status}.`,
        );
      }
      await tx.vendorPayout.update({
        where: { id: payout.id },
        data: {
          status: VendorPayoutStatus.CONFIRMED_RECEIVED,
          confirmedAt: new Date(),
          vendorConfirmationNote: clean(note, 500),
        },
      });
      return { ok: true as const, reused: false as const };
    });
  }

  async vendorDispute(vendorId: string, payoutId: string, note: string) {
    const cleanNote = clean(note, 500);
    if (!cleanNote) throw new BadRequestException('note is required.');
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Vendor payout not found.');
    if (payout.vendorId !== vendorId) {
      throw new ForbiddenException('You can only dispute your own payout.');
    }
    await this.prisma.vendorPayout.update({
      where: { id: payout.id },
      data: {
        status: VendorPayoutStatus.DISPUTED,
        vendorConfirmationNote: cleanNote,
      },
    });
    return { ok: true as const };
  }

  async adminListVendorPayouts(args: {
    status?: VendorPayoutStatus | null;
    vendorId?: string | null;
  }) {
    const where: Prisma.VendorPayoutWhereInput = {};
    if (args.status) where.status = args.status;
    if (args.vendorId) where.vendorId = args.vendorId;

    const rows = await this.prisma.vendorPayout.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        property: { select: { title: true } },
        booking: { select: { id: true, checkIn: true, checkOut: true } },
        payoutMethod: true,
        proofDocument: true,
      },
    });

    const summary = {
      totalPendingPayoutsMinor: 0,
      readyForPayoutMinor: 0,
      paidThisMonthMinor: 0,
      disputedPayouts: 0,
      vendorsMissingPayoutDetails: 0,
    };
    const missingVendorIds = new Set<string>();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    for (const p of rows) {
      if (p.status === VendorPayoutStatus.PENDING_DETAILS) {
        summary.totalPendingPayoutsMinor += p.vendorNetAmountMinor;
        missingVendorIds.add(p.vendorId);
      }
      if (p.status === VendorPayoutStatus.READY_FOR_PAYOUT) {
        summary.readyForPayoutMinor += p.vendorNetAmountMinor;
      }
      if (p.status === VendorPayoutStatus.DISPUTED) {
        summary.disputedPayouts += 1;
      }
      if (p.paidAt && p.paidAt >= monthStart) {
        summary.paidThisMonthMinor += p.vendorNetAmountMinor;
      }
    }
    summary.vendorsMissingPayoutDetails = missingVendorIds.size;

    return {
      summary,
      items: rows.map((row) => this.payoutPayload(row, 'admin')),
    };
  }

  async adminGetVendorPayout(payoutId: string) {
    const payout = await this.payoutSelect({ id: payoutId });
    return this.payoutPayload(payout, 'admin');
  }

  async adminMarkProcessing(payoutId: string, note?: string) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Vendor payout not found.');
    if (payout.status === VendorPayoutStatus.PROCESSING) {
      return { ok: true as const, reused: true as const };
    }
    if (payout.status !== VendorPayoutStatus.READY_FOR_PAYOUT) {
      throw new BadRequestException(
        `Cannot mark processing from status ${payout.status}.`,
      );
    }
    await this.prisma.vendorPayout.update({
      where: { id: payout.id },
      data: {
        status: VendorPayoutStatus.PROCESSING,
        adminNotes: clean(note, 500),
      },
    });
    return { ok: true as const, reused: false as const };
  }

  async adminUploadProof(args: {
    adminUserId: string;
    payoutId: string;
    file: Express.Multer.File | undefined;
    note?: string;
  }) {
    if (!args.file?.buffer) throw new BadRequestException('file is required.');
    const provider = await this.storage.activeProvider();
    if (provider !== 'cloudinary') {
      throw new BadRequestException(
        'Payout proof uploads require Cloudinary private storage.',
      );
    }

    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: args.payoutId },
      include: {
        property: { select: { title: true } },
        booking: { select: { id: true } },
      },
    });
    if (!payout) throw new NotFoundException('Vendor payout not found.');
    if (
      payout.status !== VendorPayoutStatus.PROCESSING &&
      payout.status !== VendorPayoutStatus.READY_FOR_PAYOUT &&
      payout.status !== VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION
    ) {
      throw new BadRequestException(
        `Cannot upload proof from status ${payout.status}.`,
      );
    }

    const uploaded = await this.storage.upload(args.file.buffer, {
      folder: 'payout-proofs',
      isPrivate: true,
      originalName: args.file.originalname,
      mimeType: args.file.mimetype,
    });

    const paidAt = new Date();
    const proof = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.payoutProofDocument.upsert({
        where: { payoutId: payout.id },
        create: {
          payoutId: payout.id,
          uploadedByAdminId: args.adminUserId,
          originalName: args.file?.originalname ?? null,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.size,
          cloudinaryPublicId: uploaded.key,
          cloudinaryResourceType: uploaded.resourceType ?? null,
          cloudinaryDeliveryType: uploaded.deliveryType ?? 'authenticated',
          storageProvider: uploaded.provider,
        },
        update: {
          uploadedByAdminId: args.adminUserId,
          originalName: args.file?.originalname ?? null,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.size,
          cloudinaryPublicId: uploaded.key,
          cloudinaryResourceType: uploaded.resourceType ?? null,
          cloudinaryDeliveryType: uploaded.deliveryType ?? 'authenticated',
          storageProvider: uploaded.provider,
        },
      });

      await tx.vendorPayout.update({
        where: { id: payout.id },
        data: {
          proofDocumentId: doc.id,
          status: VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION,
          paidAt,
          adminNotes: clean(args.note, 500),
        },
      });

      const ledgerKey = `vendor_payout_${payout.id}`;
      await tx.ledgerEntry.upsert({
        where: {
          vendorId_type_idempotencyKey: {
            vendorId: payout.vendorId,
            type: LedgerEntryType.PAYOUT,
            idempotencyKey: ledgerKey,
          },
        },
        create: {
          vendorId: payout.vendorId,
          propertyId: payout.propertyId,
          bookingId: payout.bookingId,
          type: LedgerEntryType.PAYOUT,
          direction: LedgerDirection.DEBIT,
          amount: payout.vendorNetAmountMinor,
          currency: payout.currency,
          occurredAt: paidAt,
          idempotencyKey: ledgerKey,
          metaJson: JSON.stringify({ vendorPayoutId: payout.id, proofId: doc.id }),
        },
        update: {},
      });

      return doc;
    });

    await this.notifications.emit({
      type: NotificationType.VENDOR_PAYOUT_PAID,
      entityType: 'VENDOR_PAYOUT',
      entityId: payout.id,
      recipientUserId: payout.vendorId,
      payload: {
        payout: {
          id: payout.id,
          amount: payout.vendorNetAmountMinor,
          amountFormatted: formatMoneyMinor(
            payout.vendorNetAmountMinor,
            payout.currency,
          ),
          currency: payout.currency,
          paidAt,
        },
        property: { title: payout.property?.title ?? null },
        booking: { id: payout.booking?.id ?? payout.bookingId },
        url: '/vendor/payouts',
      },
    });

    return { ok: true as const, proofDocumentId: proof.id };
  }

  async adminMarkPaid(payoutId: string, note?: string) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Vendor payout not found.');
    if (!payout.proofDocumentId) {
      throw new BadRequestException('Payout proof is required before mark paid.');
    }
    if (payout.status === VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION) {
      return { ok: true as const, reused: true as const };
    }
    if (payout.status !== VendorPayoutStatus.PROCESSING) {
      throw new BadRequestException(`Cannot mark paid from ${payout.status}.`);
    }
    await this.prisma.vendorPayout.update({
      where: { id: payout.id },
      data: {
        status: VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION,
        paidAt: payout.paidAt ?? new Date(),
        adminNotes: clean(note, 500),
      },
    });
    return { ok: true as const, reused: false as const };
  }

  async adminCancelPayout(payoutId: string, note?: string) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Vendor payout not found.');
    if (
      payout.status === VendorPayoutStatus.CONFIRMED_RECEIVED ||
      payout.status === VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION
    ) {
      throw new BadRequestException('Cannot cancel a paid payout.');
    }
    await this.prisma.vendorPayout.update({
      where: { id: payout.id },
      data: {
        status: VendorPayoutStatus.CANCELLED,
        adminNotes: clean(note, 500),
      },
    });
    return { ok: true as const };
  }

  /**
   * Reconcile vendor payout amounts for all mutable (non-completed) payouts.
   *
   * Historically, payment.amount (integer major AED) was passed directly to
   * calculateVendorPayout() which expects minor units, causing all stored
   * amounts to be 100x too small. This method recomputes from the source
   * booking payment and updates any rows where values are wrong.
   *
   * Safe to run multiple times; completed/cancelled payouts are never mutated.
   */
  async reconcilePayoutAmounts(): Promise<{
    checked: number;
    updated: number;
    skipped: number;
    errors: number;
    log: string[];
  }> {
    const mutableStatuses = [
      VendorPayoutStatus.PENDING_DETAILS,
      VendorPayoutStatus.READY_FOR_PAYOUT,
      VendorPayoutStatus.PROCESSING,
      VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION,
      VendorPayoutStatus.DISPUTED,
    ];

    const payouts = await this.prisma.vendorPayout.findMany({
      where: { status: { in: mutableStatuses } },
      include: {
        booking: {
          select: {
            id: true,
            totalAmount: true,
            payment: { select: { amount: true, currency: true } },
          },
        },
      },
    });

    let checked = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const log: string[] = [];

    for (const payout of payouts) {
      checked++;
      try {
        const rawAmount =
          payout.booking?.payment?.amount ?? payout.booking?.totalAmount;
        if (rawAmount == null) {
          log.push(`SKIP ${payout.id}: no payment/booking amount available`);
          skipped++;
          continue;
        }

        // rawAmount is integer major-AED (the historical storage unit).
        const grossMinor = Math.round(Number(rawAmount) * 100);
        const breakdown = calculateVendorPayout(grossMinor);

        const storedGross = payout.grossBookingAmountMinor;
        const expectedGross = breakdown.grossAmountMinor;

        if (storedGross === expectedGross) {
          skipped++;
          continue;
        }

        log.push(
          `UPDATE ${payout.id}: gross ${storedGross} → ${expectedGross}, ` +
            `commission ${payout.platformCommissionMinor} → ${breakdown.platformCommissionMinor}, ` +
            `vendorNet ${payout.vendorNetAmountMinor} → ${breakdown.vendorNetAmountMinor}`,
        );

        await this.prisma.vendorPayout.update({
          where: { id: payout.id },
          data: {
            grossBookingAmountMinor: breakdown.grossAmountMinor,
            platformCommissionRateBps: breakdown.platformCommissionRateBps,
            platformCommissionMinor: breakdown.platformCommissionMinor,
            vendorNetAmountMinor: breakdown.vendorNetAmountMinor,
          },
        });
        updated++;
      } catch (err) {
        errors++;
        log.push(
          `ERROR ${payout.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { checked, updated, skipped, errors, log };
  }
}
