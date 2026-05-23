/**
 * P1 Hardening Tests — Promo Code Race Condition Fix
 *
 * Tests:
 * 1. redeemPromo increments counter atomically (count=1 updated → ok)
 * 2. Concurrent redemptions beyond usageLimit → all extras rejected
 * 3. Unlimited promo (usageLimit=0) always succeeds
 * 4. Expired promo → 400
 * 5. Inactive promo → 400
 */
import { BadRequestException } from '@nestjs/common';
import { PromoService } from './promo.service';
import { PrismaService } from '../prisma/prisma.service';

function buildPromoService(prismaOverrides: Partial<PrismaService>) {
  const prisma = {
    promoCode: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    ...prismaOverrides,
  } as unknown as PrismaService;

  return new PromoService(prisma);
}

const BASE_PROMO = {
  id: 'promo_1',
  code: 'SAVE10',
  isActive: true,
  validFrom: new Date('2026-01-01'),
  validTo: new Date('2099-12-31'),
  usageLimit: 10,
  currentUsage: 9,
  discountPercent: 10,
  discountAmount: null,
  maxDiscount: null,
  propertyId: null,
  minBookingAmount: null,
};

describe('FIX-PROMO — Atomic promo redemption', () => {
  it('succeeds when updateMany returns count=1', async () => {
    const prisma = {
      promoCode: {
        findUnique: jest.fn().mockResolvedValue(BASE_PROMO),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;

    const service = buildPromoService(prisma);

    const result = await service.redeemPromo({
      promoCodeId: 'promo_1',
      bookingAmount: 5000,
    });

    expect(result.discountAmount).toBe(500); // 10% of 5000
    expect(
      (prisma.promoCode as unknown as { updateMany: jest.Mock }).updateMany,
    ).toHaveBeenCalledTimes(1);
  });

  it('throws BadRequestException when updateMany returns count=0 (limit reached)', async () => {
    const exhaustedPromo = { ...BASE_PROMO, currentUsage: 10 };
    const prisma = {
      promoCode: {
        findUnique: jest.fn().mockResolvedValue(exhaustedPromo),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as PrismaService;

    const service = buildPromoService(prisma);

    await expect(
      service.redeemPromo({ promoCodeId: 'promo_1', bookingAmount: 5000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows unlimited promo (usageLimit=0) — OR clause passes', async () => {
    const unlimitedPromo = { ...BASE_PROMO, usageLimit: 0, currentUsage: 999 };
    const prisma = {
      promoCode: {
        findUnique: jest.fn().mockResolvedValue(unlimitedPromo),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as PrismaService;

    const service = buildPromoService(prisma);

    const result = await service.redeemPromo({
      promoCodeId: 'promo_1',
      bookingAmount: 10000,
    });

    expect(result.discountAmount).toBe(1000);
  });

  it('throws if promo is inactive at redemption time', async () => {
    const inactivePromo = { ...BASE_PROMO, isActive: false };
    const prisma = {
      promoCode: {
        findUnique: jest.fn().mockResolvedValue(inactivePromo),
        updateMany: jest.fn(),
      },
    } as unknown as PrismaService;

    const service = buildPromoService(prisma);

    await expect(
      service.redeemPromo({ promoCodeId: 'promo_1', bookingAmount: 5000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      (prisma.promoCode as unknown as { updateMany: jest.Mock }).updateMany,
    ).not.toHaveBeenCalled();
  });

  it('throws if promo has expired at redemption time', async () => {
    const expiredPromo = {
      ...BASE_PROMO,
      validTo: new Date('2020-01-01'),
    };
    const prisma = {
      promoCode: {
        findUnique: jest.fn().mockResolvedValue(expiredPromo),
        updateMany: jest.fn(),
      },
    } as unknown as PrismaService;

    const service = buildPromoService(prisma);

    await expect(
      service.redeemPromo({ promoCodeId: 'promo_1', bookingAmount: 5000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('concurrent redemptions — only one updateMany call wins per slot', async () => {
    // Simulates the DB enforcing the WHERE clause: only 1 can win per slot
    let callCount = 0;
    const prisma = {
      promoCode: {
        findUnique: jest.fn().mockResolvedValue({ ...BASE_PROMO }),
        updateMany: jest.fn().mockImplementation(() => {
          callCount++;
          // First call wins, rest return count=0 (slot already taken)
          return Promise.resolve({ count: callCount <= 1 ? 1 : 0 });
        }),
      },
    } as unknown as PrismaService;

    const service = buildPromoService(prisma);

    const attempts = Array.from({ length: 5 }, () =>
      service
        .redeemPromo({ promoCodeId: 'promo_1', bookingAmount: 5000 })
        .catch((e: Error) => e),
    );

    const results = await Promise.all(attempts);
    const successes = results.filter((r) => !(r instanceof Error));
    const failures = results.filter((r) => r instanceof BadRequestException);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(4);
  });
});
