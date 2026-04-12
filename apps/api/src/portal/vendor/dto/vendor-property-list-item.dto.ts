import {
  PropertyActivationPaymentStatus,
  PropertyStatus,
} from '@prisma/client';

export type VendorPropertyListItemDto = {
  id: string;
  title: string;
  slug: string;
  city: string | null;
  area: string | null;
  status: PropertyStatus;
  activationFee: number | null;
  activationFeeCurrency: string;
  activationPaymentStatus: PropertyActivationPaymentStatus;

  // Portal "price from" (schema-aligned)
  priceFrom: number;

  bookingsCount: number;
  createdAt: string;
  updatedAt: string;
};
