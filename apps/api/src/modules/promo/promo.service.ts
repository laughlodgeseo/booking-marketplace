import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PromoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate a promo code and calculate the discount WITHOUT incrementing usage.
   * Call this to preview the discount before payment. Use redeemPromo to atomically
   * claim the code at booking-confirmed time.
   */
  async applyPromo(params: {
    code: string;
    bookingAmount: number;
    propertyId?: string;
  }): Promise<{
    valid: boolean;
    discountAmount: number;
    promoCodeId: string;
    message?: string;
  }> {
    const now = new Date();

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: params.code.toUpperCase().trim() },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Invalid or inactive promo code.');
    }

    if (now < promo.validFrom || now > promo.validTo) {
      throw new BadRequestException('Promo code has expired.');
    }

    if (promo.usageLimit > 0 && promo.currentUsage >= promo.usageLimit) {
      throw new BadRequestException('Promo code usage limit reached.');
    }

    if (promo.propertyId && promo.propertyId !== params.propertyId) {
      throw new BadRequestException(
        'Promo code is not valid for this property.',
      );
    }

    if (
      promo.minBookingAmount &&
      params.bookingAmount < promo.minBookingAmount
    ) {
      throw new BadRequestException(
        `Minimum booking amount of ${promo.minBookingAmount} required.`,
      );
    }

    const discountAmount = this.calculateDiscount(promo, params.bookingAmount);

    return {
      valid: true,
      discountAmount,
      promoCodeId: promo.id,
    };
  }

  /**
   * Atomically claim a promo code at booking-confirmed time.
   * Uses a conditional updateMany so the check and increment happen in one DB
   * operation — safe under concurrent requests. Returns false if the code was
   * already exhausted by a concurrent redemption.
   */
  async redeemPromo(params: {
    promoCodeId: string;
    bookingAmount: number;
  }): Promise<{ discountAmount: number }> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id: params.promoCodeId },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Promo code is no longer active.');
    }

    const now = new Date();
    if (now < promo.validFrom || now > promo.validTo) {
      throw new BadRequestException('Promo code has expired.');
    }

    // Atomic conditional increment: only succeeds if limit not yet reached.
    const updated = await this.prisma.promoCode.updateMany({
      where: {
        id: params.promoCodeId,
        isActive: true,
        OR: [
          { usageLimit: { lte: 0 } },
          { currentUsage: { lt: promo.usageLimit } },
        ],
      },
      data: { currentUsage: { increment: 1 } },
    });

    if (updated.count !== 1) {
      throw new BadRequestException('Promo code usage limit reached.');
    }

    return {
      discountAmount: this.calculateDiscount(promo, params.bookingAmount),
    };
  }

  /**
   * @deprecated Use redeemPromo for atomic redemption. Kept for backward
   * compatibility with callers that already validated the promo separately.
   */
  async incrementUsage(promoCodeId: string) {
    await this.prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { currentUsage: { increment: 1 } },
    });
  }

  private calculateDiscount(
    promo: {
      discountPercent: number | null;
      discountAmount: number | null;
      maxDiscount: number | null;
    },
    bookingAmount: number,
  ): number {
    let discountAmount = 0;
    if (promo.discountPercent) {
      discountAmount = Math.round(
        (bookingAmount * promo.discountPercent) / 100,
      );
      if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
        discountAmount = promo.maxDiscount;
      }
    } else if (promo.discountAmount) {
      discountAmount = promo.discountAmount;
    }
    return Math.min(discountAmount, bookingAmount);
  }

  // ─── Admin CRUD ────────────────────────────────────────────────────

  async create(dto: {
    code: string;
    discountPercent?: number;
    discountAmount?: number;
    validFrom: string;
    validTo: string;
    usageLimit?: number;
    minBookingAmount?: number;
    maxDiscount?: number;
    propertyId?: string;
  }) {
    if (!dto.discountPercent && !dto.discountAmount) {
      throw new BadRequestException(
        'Either discountPercent or discountAmount is required.',
      );
    }

    return this.prisma.promoCode.create({
      data: {
        code: dto.code.toUpperCase().trim(),
        discountPercent: dto.discountPercent,
        discountAmount: dto.discountAmount,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        usageLimit: dto.usageLimit ?? 0,
        minBookingAmount: dto.minBookingAmount,
        maxDiscount: dto.maxDiscount,
        propertyId: dto.propertyId,
      },
    });
  }

  async list(params: { page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.promoCode.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async update(
    id: string,
    dto: Partial<{
      code: string;
      discountPercent: number | null;
      discountAmount: number | null;
      validFrom: string;
      validTo: string;
      usageLimit: number;
      minBookingAmount: number | null;
      maxDiscount: number | null;
      propertyId: string | null;
      isActive: boolean;
    }>,
  ) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promo code not found.');

    const data: Record<string, unknown> = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase().trim();
    if (dto.discountPercent !== undefined)
      data.discountPercent = dto.discountPercent;
    if (dto.discountAmount !== undefined)
      data.discountAmount = dto.discountAmount;
    if (dto.validFrom) data.validFrom = new Date(dto.validFrom);
    if (dto.validTo) data.validTo = new Date(dto.validTo);
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
    if (dto.minBookingAmount !== undefined)
      data.minBookingAmount = dto.minBookingAmount;
    if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
    if (dto.propertyId !== undefined) data.propertyId = dto.propertyId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.promoCode.update({ where: { id }, data });
  }

  async delete(id: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Promo code not found.');
    await this.prisma.promoCode.delete({ where: { id } });
    return { deleted: true };
  }
}
