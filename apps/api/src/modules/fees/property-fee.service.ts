import { Injectable } from '@nestjs/common';
import {
  FeeStatus,
  PropertyFeeType,
  PropertyFurnishingStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVATION_FEE_MINOR = 5000;      // 50.00 AED
const INSURANCE_FEE_MINOR = 210000;     // 2,100.00 AED
const FURNISHING_FEE_MINOR = 300000;    // 3,000.00 AED
const CURRENCY = 'AED';

const _aedFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAed(minorUnits: number): string {
  return `AED ${_aedFormatter.format(minorUnits / 100)}`;
}

@Injectable()
export class PropertyFeeService {
  constructor(private readonly prisma: PrismaService) {}

  feesForFurnishingStatus(status: PropertyFurnishingStatus | null) {
    const activation = ACTIVATION_FEE_MINOR;
    const insurance = INSURANCE_FEE_MINOR;
    const furnishing =
      status === PropertyFurnishingStatus.UNFURNISHED ? FURNISHING_FEE_MINOR : 0;
    return { activation, insurance, furnishing };
  }

  async ensureFeesForProperty(propertyId: string, vendorId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { furnishingStatus: true },
    });

    if (!property) return;

    const { activation, insurance, furnishing } = this.feesForFurnishingStatus(
      property.furnishingStatus,
    );

    const feeTypes: Array<{ type: PropertyFeeType; amount: number }> = [
      { type: PropertyFeeType.ACTIVATION, amount: activation },
      { type: PropertyFeeType.INSURANCE, amount: insurance },
      ...(furnishing > 0
        ? [{ type: PropertyFeeType.FURNISHING, amount: furnishing }]
        : []),
    ];

    for (const fee of feeTypes) {
      const existing = await this.prisma.propertyFee.findFirst({
        where: { propertyId, vendorId, type: fee.type },
      });

      if (!existing) {
        await this.prisma.propertyFee.create({
          data: {
            propertyId,
            vendorId,
            type: fee.type,
            amountMinor: fee.amount,
            currency: CURRENCY,
            status: FeeStatus.UNPAID,
          },
        });
      }
    }
  }

  async getVendorPropertyFees(vendorId: string) {
    const properties = await this.prisma.property.findMany({
      where: { vendorId },
      select: {
        id: true,
        title: true,
        city: true,
        status: true,
        furnishingStatus: true,
        propertyFees: {
          select: {
            id: true,
            type: true,
            amountMinor: true,
            currency: true,
            status: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalDueMinor = 0;
    let totalPaidMinor = 0;
    let propertiesWithFees = 0;

    const items = properties
      .filter((p) => p.propertyFees.length > 0)
      .map((p) => {
        propertiesWithFees++;
        const propertyDue = p.propertyFees
          .filter((f) => f.status === FeeStatus.UNPAID)
          .reduce((s, f) => s + f.amountMinor, 0);
        const propertyPaid = p.propertyFees
          .filter((f) => f.status === FeeStatus.PAID)
          .reduce((s, f) => s + f.amountMinor, 0);

        totalDueMinor += propertyDue;
        totalPaidMinor += propertyPaid;

        const allPaid = p.propertyFees.every((f) => f.status === FeeStatus.PAID);
        const somePaid = p.propertyFees.some((f) => f.status === FeeStatus.PAID);
        const feeStatus = allPaid ? 'paid' : somePaid ? 'partially_paid' : 'unpaid';

        return {
          propertyId: p.id,
          propertyTitle: p.title,
          propertyCity: p.city,
          propertyStatus: p.status,
          furnishingStatus: p.furnishingStatus,
          feeStatus,
          totalDueMinor: propertyDue + propertyPaid,
          paidMinor: propertyPaid,
          outstandingMinor: propertyDue,
          fees: p.propertyFees.map((f) => ({
            ...f,
            amountFormatted: formatAed(f.amountMinor),
            paidAt: f.paidAt?.toISOString() ?? null,
            createdAt: f.createdAt.toISOString(),
            updatedAt: f.updatedAt.toISOString(),
          })),
        };
      });

    return {
      summary: {
        totalDueMinor,
        totalPaidMinor,
        outstandingMinor: totalDueMinor,
        propertiesWithFees,
        totalDueFormatted: formatAed(totalDueMinor),
        totalPaidFormatted: formatAed(totalPaidMinor),
        outstandingFormatted: formatAed(totalDueMinor),
      },
      items,
    };
  }

  async getAdminPropertyFees(params: {
    vendorId?: string;
    status?: FeeStatus;
    furnishingStatus?: PropertyFurnishingStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize =
      params.pageSize && params.pageSize > 0
        ? Math.min(100, params.pageSize)
        : 20;

    const propertyWhere = {
      ...(params.vendorId ? { vendorId: params.vendorId } : {}),
      ...(params.furnishingStatus
        ? { furnishingStatus: params.furnishingStatus }
        : {}),
    };

    const properties = await this.prisma.property.findMany({
      where: {
        ...propertyWhere,
        propertyFees: { some: {} },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        city: true,
        status: true,
        furnishingStatus: true,
        vendor: { select: { id: true, email: true, fullName: true } },
        propertyFees: {
          where: params.status ? { status: params.status } : undefined,
          select: {
            id: true,
            type: true,
            amountMinor: true,
            currency: true,
            status: true,
            paidAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const total = await this.prisma.property.count({
      where: {
        ...propertyWhere,
        propertyFees: { some: {} },
      },
    });

    const items = properties.map((p) => {
      const propertyDue = p.propertyFees
        .filter((f) => f.status === FeeStatus.UNPAID)
        .reduce((s, f) => s + f.amountMinor, 0);
      const propertyPaid = p.propertyFees
        .filter((f) => f.status === FeeStatus.PAID)
        .reduce((s, f) => s + f.amountMinor, 0);

      return {
        propertyId: p.id,
        propertyTitle: p.title,
        propertyCity: p.city,
        propertyStatus: p.status,
        furnishingStatus: p.furnishingStatus,
        vendor: p.vendor,
        fees: p.propertyFees.map((f) => ({
          ...f,
          amountFormatted: formatAed(f.amountMinor),
          paidAt: f.paidAt?.toISOString() ?? null,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        })),
        totalDueMinor: propertyDue,
        paidMinor: propertyPaid,
        outstandingMinor: propertyDue,
        totalDueFormatted: formatAed(propertyDue),
        paidFormatted: formatAed(propertyPaid),
        outstandingFormatted: formatAed(propertyDue),
      };
    });

    return { page, pageSize, total, items };
  }
}
