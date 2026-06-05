import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { UserRole, VendorStatus } from '@prisma/client';

export type OnboardingStatus =
  | 'CUSTOMER'
  | 'FIRST_TIME'
  | 'HAS_DRAFT'
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'HAS_PROPERTIES';

export type OnboardingStateResult = {
  status: OnboardingStatus;
  propertyId: string | null;
  propertyStatus: string | null;
  vendorProfileExists: boolean;
  propertyCount: number;
};

export type OnboardingStartResult = {
  success: true;
  isNewVendor: boolean;
  vendorProfileId: string;
  vendorProfileStatus: VendorStatus;
};

@Injectable()
export class VendorOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(
    userId: string,
    userRole: UserRole,
  ): Promise<OnboardingStateResult> {
    if (userRole === UserRole.CUSTOMER) {
      return {
        status: 'CUSTOMER',
        propertyId: null,
        propertyStatus: null,
        vendorProfileExists: false,
        propertyCount: 0,
      };
    }

    const profile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });

    const properties = await this.prisma.property.findMany({
      where: { vendorId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });

    if (!properties.length) {
      return {
        status: 'FIRST_TIME',
        propertyId: null,
        propertyStatus: null,
        vendorProfileExists: !!profile,
        propertyCount: 0,
      };
    }

    const draft = properties.find((p) => p.status === 'DRAFT');
    const changesRequested = properties.find(
      (p) => p.status === 'CHANGES_REQUESTED',
    );
    const underReview = properties.find((p) => p.status === 'UNDER_REVIEW');
    const rejected = properties.find((p) => p.status === 'REJECTED');
    const hasActive = properties.some((p) =>
      ['APPROVED', 'APPROVED_PENDING_ACTIVATION_PAYMENT', 'PUBLISHED'].includes(
        p.status,
      ),
    );

    if (hasActive) {
      return {
        status: 'HAS_PROPERTIES',
        propertyId: null,
        propertyStatus: null,
        vendorProfileExists: true,
        propertyCount: properties.length,
      };
    }

    if (underReview) {
      return {
        status: 'SUBMITTED',
        propertyId: underReview.id,
        propertyStatus: 'UNDER_REVIEW',
        vendorProfileExists: true,
        propertyCount: properties.length,
      };
    }

    if (changesRequested) {
      return {
        status: 'CHANGES_REQUESTED',
        propertyId: changesRequested.id,
        propertyStatus: 'CHANGES_REQUESTED',
        vendorProfileExists: true,
        propertyCount: properties.length,
      };
    }

    if (draft) {
      return {
        status: 'HAS_DRAFT',
        propertyId: draft.id,
        propertyStatus: 'DRAFT',
        vendorProfileExists: true,
        propertyCount: properties.length,
      };
    }

    if (rejected) {
      return {
        status: 'REJECTED',
        propertyId: rejected.id,
        propertyStatus: 'REJECTED',
        vendorProfileExists: true,
        propertyCount: properties.length,
      };
    }

    return {
      status: 'FIRST_TIME',
      propertyId: null,
      propertyStatus: null,
      vendorProfileExists: !!profile,
      propertyCount: properties.length,
    };
  }

  async startOnboarding(
    userId: string,
    userRole: UserRole,
    displayName?: string,
  ): Promise<OnboardingStartResult> {
    return this.prisma.$transaction(async (tx) => {
      let isNewVendor = false;

      if (userRole === UserRole.CUSTOMER) {
        await tx.user.update({
          where: { id: userId },
          data: { role: UserRole.VENDOR },
        });
        isNewVendor = true;
      }

      let profile = await tx.vendorProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { fullName: true, email: true },
        });
        const derivedName =
          user?.fullName?.trim() ||
          user?.email?.split('@')[0] ||
          'Host';

        profile = await tx.vendorProfile.create({
          data: {
            userId,
            displayName: displayName?.trim() || derivedName,
            status: VendorStatus.PENDING,
          },
        });
      }

      return {
        success: true as const,
        isNewVendor,
        vendorProfileId: profile.id,
        vendorProfileStatus: profile.status,
      };
    });
  }
}
