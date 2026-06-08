import { Test } from '@nestjs/testing';
import { FeeStatus, PropertyFurnishingStatus } from '@prisma/client';
import { PropertyFeeService, formatAed } from './property-fee.service';
import { PrismaService } from '../prisma/prisma.service';

function makePrisma() {
  return {
    property: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    propertyFee: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;
}

describe('formatAed', () => {
  it('formats minor units to AED string with thousand separators', () => {
    expect(formatAed(5000)).toBe('AED 50.00');
    expect(formatAed(210000)).toBe('AED 2,100.00');
    expect(formatAed(300000)).toBe('AED 3,000.00');
    expect(formatAed(515000)).toBe('AED 5,150.00');
    expect(formatAed(0)).toBe('AED 0.00');
  });
});

describe('PropertyFeeService', () => {
  let service: PropertyFeeService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [
        PropertyFeeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(PropertyFeeService);
  });

  // ── feesForFurnishingStatus ─────────────────────────────────────────────────
  describe('feesForFurnishingStatus', () => {
    it('returns ACTIVATION=5000 INSURANCE=210000 FURNISHING=0 for FURNISHED', () => {
      const fees = service.feesForFurnishingStatus(PropertyFurnishingStatus.FURNISHED);
      expect(fees.activation).toBe(5000);
      expect(fees.insurance).toBe(210000);
      expect(fees.furnishing).toBe(0);
    });

    it('returns FURNISHING=300000 for UNFURNISHED', () => {
      const fees = service.feesForFurnishingStatus(PropertyFurnishingStatus.UNFURNISHED);
      expect(fees.activation).toBe(5000);
      expect(fees.insurance).toBe(210000);
      expect(fees.furnishing).toBe(300000);
    });

    it('returns FURNISHING=0 for null status', () => {
      const fees = service.feesForFurnishingStatus(null);
      expect(fees.furnishing).toBe(0);
    });
  });

  // ── ensureFeesForProperty ───────────────────────────────────────────────────
  describe('ensureFeesForProperty', () => {
    it('creates ACTIVATION and INSURANCE fees for FURNISHED property', async () => {
      (prisma.property.findUnique as jest.Mock).mockResolvedValue({
        furnishingStatus: PropertyFurnishingStatus.FURNISHED,
      });
      (prisma.propertyFee.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.propertyFee.create as jest.Mock).mockResolvedValue({});

      await service.ensureFeesForProperty('prop-1', 'vendor-1');

      expect(prisma.propertyFee.create).toHaveBeenCalledTimes(2);
      const calls = (prisma.propertyFee.create as jest.Mock).mock.calls;
      const types = calls.map((c: [{ data: { type: string } }]) => c[0].data.type);
      expect(types).toContain('ACTIVATION');
      expect(types).toContain('INSURANCE');
      expect(types).not.toContain('FURNISHING');
    });

    it('creates ACTIVATION, INSURANCE, and FURNISHING fees for UNFURNISHED property', async () => {
      (prisma.property.findUnique as jest.Mock).mockResolvedValue({
        furnishingStatus: PropertyFurnishingStatus.UNFURNISHED,
      });
      (prisma.propertyFee.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.propertyFee.create as jest.Mock).mockResolvedValue({});

      await service.ensureFeesForProperty('prop-1', 'vendor-1');

      expect(prisma.propertyFee.create).toHaveBeenCalledTimes(3);
      const calls = (prisma.propertyFee.create as jest.Mock).mock.calls;
      const types = calls.map((c: [{ data: { type: string } }]) => c[0].data.type);
      expect(types).toContain('FURNISHING');
    });

    it('is idempotent — does not create fees that already exist', async () => {
      (prisma.property.findUnique as jest.Mock).mockResolvedValue({
        furnishingStatus: PropertyFurnishingStatus.FURNISHED,
      });
      (prisma.propertyFee.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

      await service.ensureFeesForProperty('prop-1', 'vendor-1');

      expect(prisma.propertyFee.create).not.toHaveBeenCalled();
    });

    it('does nothing when property not found', async () => {
      (prisma.property.findUnique as jest.Mock).mockResolvedValue(null);

      await service.ensureFeesForProperty('prop-x', 'vendor-1');

      expect(prisma.propertyFee.findFirst).not.toHaveBeenCalled();
      expect(prisma.propertyFee.create).not.toHaveBeenCalled();
    });

    it('sets correct minor amounts in created fees', async () => {
      (prisma.property.findUnique as jest.Mock).mockResolvedValue({
        furnishingStatus: PropertyFurnishingStatus.UNFURNISHED,
      });
      (prisma.propertyFee.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.propertyFee.create as jest.Mock).mockResolvedValue({});

      await service.ensureFeesForProperty('prop-1', 'vendor-1');

      const calls = (prisma.propertyFee.create as jest.Mock).mock.calls as Array<[{ data: { type: string; amountMinor: number } }]>;
      const byType = Object.fromEntries(calls.map((c) => [c[0].data.type, c[0].data.amountMinor]));
      expect(byType['ACTIVATION']).toBe(5000);
      expect(byType['INSURANCE']).toBe(210000);
      expect(byType['FURNISHING']).toBe(300000);
    });
  });

  // ── getVendorPropertyFees ───────────────────────────────────────────────────
  describe('getVendorPropertyFees', () => {
    it('returns summary with correct totals', async () => {
      const now = new Date();
      (prisma.property.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'prop-1',
          title: 'The Beach House',
          city: 'Dubai',
          status: 'APPROVED',
          furnishingStatus: 'FURNISHED',
          propertyFees: [
            { id: 'f1', type: 'ACTIVATION', amountMinor: 5000, currency: 'AED', status: FeeStatus.PAID, paidAt: now, createdAt: now, updatedAt: now },
            { id: 'f2', type: 'INSURANCE', amountMinor: 210000, currency: 'AED', status: FeeStatus.UNPAID, paidAt: null, createdAt: now, updatedAt: now },
          ],
        },
      ]);

      const result = await service.getVendorPropertyFees('vendor-1');

      expect(result.summary.totalDueMinor).toBe(210000);  // UNPAID insurance
      expect(result.summary.totalPaidMinor).toBe(5000);   // PAID activation
      expect(result.summary.outstandingMinor).toBe(210000);
      expect(result.summary.propertiesWithFees).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].feeStatus).toBe('partially_paid');
      expect(result.items[0].fees).toHaveLength(2);
      expect(result.items[0].fees[0].amountFormatted).toBe('AED 50.00');
      expect(result.items[0].fees[1].amountFormatted).toBe('AED 2,100.00');
    });

    it('reports feeStatus=paid when all fees are PAID', async () => {
      const now = new Date();
      (prisma.property.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'prop-1',
          title: 'Test', city: 'Dubai', status: 'APPROVED', furnishingStatus: null,
          propertyFees: [
            { id: 'f1', type: 'ACTIVATION', amountMinor: 5000, currency: 'AED', status: FeeStatus.PAID, paidAt: now, createdAt: now, updatedAt: now },
          ],
        },
      ]);

      const result = await service.getVendorPropertyFees('vendor-1');
      expect(result.items[0].feeStatus).toBe('paid');
    });

    it('reports feeStatus=unpaid when no fees are PAID', async () => {
      const now = new Date();
      (prisma.property.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'prop-1',
          title: 'Test', city: 'Dubai', status: 'APPROVED', furnishingStatus: null,
          propertyFees: [
            { id: 'f1', type: 'ACTIVATION', amountMinor: 5000, currency: 'AED', status: FeeStatus.UNPAID, paidAt: null, createdAt: now, updatedAt: now },
          ],
        },
      ]);

      const result = await service.getVendorPropertyFees('vendor-1');
      expect(result.items[0].feeStatus).toBe('unpaid');
    });
  });
});
