import { BadRequestException } from '@nestjs/common';
import {
  CancellationActor,
  CancellationMode,
  PenaltyType,
} from '@prisma/client';
import { CancellationPolicyService } from './cancellation.policy';

function makePolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'policy_1',
    propertyId: 'p1',
    version: 'v1',
    isActive: true,
    freeCancelBeforeHours: 72,
    partialRefundBeforeHours: 24,
    noRefundWithinHours: 0,
    penaltyType: PenaltyType.PERCENT_OF_TOTAL,
    penaltyValue: 50,
    chargeFirstNightOnLateCancel: false,
    defaultMode: CancellationMode.SOFT,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    checkIn: new Date('2026-06-10T14:00:00.000Z'),
    checkOut: new Date('2026-06-14T11:00:00.000Z'),
    totalAmount: 10000,
    currency: 'AED',
    ...overrides,
  };
}

describe('CancellationPolicyService', () => {
  const service = new CancellationPolicyService();

  it('returns FREE tier when cancelling well before check-in', () => {
    const now = new Date('2026-06-05T00:00:00.000Z'); // ~130h before check-in
    const result = service.decide({
      now,
      actor: CancellationActor.CUSTOMER,
      booking: makeBooking(),
      policy: makePolicy(),
    });

    expect(result.tier).toBe('FREE');
    expect(result.penaltyAmount).toBe(0);
    expect(result.refundableAmount).toBe(10000);
  });

  it('returns PARTIAL tier with penalty when between partial and free window', () => {
    const now = new Date('2026-06-09T00:00:00.000Z'); // ~38h before check-in (between 72h and 24h)
    const result = service.decide({
      now,
      actor: CancellationActor.CUSTOMER,
      booking: makeBooking(),
      policy: makePolicy(),
    });

    expect(result.tier).toBe('PARTIAL');
    expect(result.penaltyAmount).toBe(5000); // 50% of 10000
    expect(result.refundableAmount).toBe(5000);
  });

  it('returns NO_REFUND tier close to check-in', () => {
    const now = new Date('2026-06-10T13:00:00.000Z'); // 1h before check-in
    const result = service.decide({
      now,
      actor: CancellationActor.CUSTOMER,
      booking: makeBooking(),
      policy: makePolicy({ partialRefundBeforeHours: 12 }),
    });

    expect(result.tier).toBe('NO_REFUND');
    expect(result.penaltyAmount).toBe(10000);
    expect(result.refundableAmount).toBe(0);
  });

  it('throws if cancellation is after check-in', () => {
    const now = new Date('2026-06-11T00:00:00.000Z'); // after check-in

    expect(() =>
      service.decide({
        now,
        actor: CancellationActor.CUSTOMER,
        booking: makeBooking(),
        policy: makePolicy(),
      }),
    ).toThrow(BadRequestException);
  });

  it('handles FIXED_FEE penalty type', () => {
    const now = new Date('2026-06-09T00:00:00.000Z'); // PARTIAL tier (~38h before)
    const result = service.decide({
      now,
      actor: CancellationActor.CUSTOMER,
      booking: makeBooking(),
      policy: makePolicy({
        penaltyType: PenaltyType.FIXED_FEE,
        penaltyValue: 2000,
      }),
    });

    expect(result.tier).toBe('PARTIAL');
    expect(result.penaltyAmount).toBe(2000);
    expect(result.refundableAmount).toBe(8000);
  });

  it('handles NONE penalty type', () => {
    const now = new Date('2026-06-09T00:00:00.000Z');
    const result = service.decide({
      now,
      actor: CancellationActor.CUSTOMER,
      booking: makeBooking(),
      policy: makePolicy({ penaltyType: PenaltyType.NONE }),
    });

    expect(result.tier).toBe('PARTIAL');
    expect(result.penaltyAmount).toBe(0);
    expect(result.refundableAmount).toBe(10000);
  });

  it('charges first night on late cancel when configured', () => {
    const now = new Date('2026-06-10T13:30:00.000Z'); // <1h before check-in
    const result = service.decide({
      now,
      actor: CancellationActor.CUSTOMER,
      booking: makeBooking(),
      policy: makePolicy({
        partialRefundBeforeHours: 12,
        chargeFirstNightOnLateCancel: true,
      }),
    });

    expect(result.tier).toBe('NO_REFUND');
    // 4 nights, 10000 total, first night = floor(10000/4) = 2500
    expect(result.penaltyAmount).toBe(2500);
    expect(result.refundableAmount).toBe(7500);
  });

  it('handles PERCENT_OF_NIGHTS penalty type', () => {
    const now = new Date('2026-06-09T00:00:00.000Z');
    const result = service.decide({
      now,
      actor: CancellationActor.CUSTOMER,
      booking: makeBooking(),
      policy: makePolicy({
        penaltyType: PenaltyType.PERCENT_OF_NIGHTS,
        penaltyValue: 25,
      }),
    });

    expect(result.tier).toBe('PARTIAL');
    // 4 nights, 10000 total, 25% of total = 2500
    expect(result.penaltyAmount).toBe(2500);
    expect(result.refundableAmount).toBe(7500);
  });

  it('clamps penalty to total amount', () => {
    const now = new Date('2026-06-09T00:00:00.000Z');
    const result = service.decide({
      now,
      actor: CancellationActor.CUSTOMER,
      booking: makeBooking(),
      policy: makePolicy({
        penaltyType: PenaltyType.FIXED_FEE,
        penaltyValue: 999999, // Way more than total
      }),
    });

    expect(result.penaltyAmount).toBe(10000);
    expect(result.refundableAmount).toBe(0);
  });

  it('uses requested mode when provided', () => {
    const now = new Date('2026-06-05T00:00:00.000Z');
    const result = service.decide({
      now,
      actor: CancellationActor.ADMIN,
      booking: makeBooking(),
      policy: makePolicy(),
      requestedMode: CancellationMode.HARD,
    });

    expect(result.mode).toBe(CancellationMode.HARD);
  });
});
