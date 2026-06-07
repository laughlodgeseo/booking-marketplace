/**
 * A8 — Email Verification Before Hold Creation
 *
 * Tests:
 * 1. Unverified user cannot create a hold → ForbiddenException
 * 2. Verified user can proceed to create a hold
 */
import { ForbiddenException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { FxRatesService } from '../fx/fx-rates.service';
import { PricingService } from '../pricing/pricing.service';
import { DubaiTaxService } from '../../common/pricing/dubai-tax.service';

function buildAvailabilityService(isEmailVerified: boolean) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ isEmailVerified }),
    },
    $transaction: jest.fn().mockRejectedValue(new Error('should not reach tx')),
  } as unknown as PrismaService;

  const fxRates = {} as unknown as FxRatesService;
  const pricing = {} as unknown as PricingService;
  const dubaiTax = {} as unknown as DubaiTaxService;

  return {
    service: new AvailabilityService(prisma, fxRates, pricing, dubaiTax),
    prisma,
  };
}

describe('A8 — Email verification before hold creation', () => {
  const CREATE_HOLD_DTO = {
    checkIn: '2026-08-01',
    checkOut: '2026-08-05',
    guests: 2,
  };

  it('rejects hold creation for unverified user', async () => {
    const { service } = buildAvailabilityService(false);
    await expect(
      service.createHold('user_unverified', 'property_1', CREATE_HOLD_DTO),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('proceeds past email check for verified user (may fail later without full DB mock)', async () => {
    const { service } = buildAvailabilityService(true);
    // Verified user passes the email gate — the transaction then runs and will
    // throw the mock error, confirming the email check was passed.
    await expect(
      service.createHold('user_verified', 'property_1', CREATE_HOLD_DTO),
    ).rejects.toThrow('should not reach tx');
  });
});
