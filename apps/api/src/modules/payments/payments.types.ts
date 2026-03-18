import { PaymentProvider } from '@prisma/client';

export type ActorUser = {
  id: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
};

export type ManualRefs = {
  // Stored in Payment.providerRef / Refund.providerRefundRef for MANUAL provider
  // Example: "manual:authorize:<key>"
  // Example: "manual:capture:<key>"
  // Example: "manual:refund:<key>"
  key?: string | null;
};

export const DEFAULT_PROVIDER: PaymentProvider = PaymentProvider.STRIPE;
