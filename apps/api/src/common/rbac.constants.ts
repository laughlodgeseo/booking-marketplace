import { UserRole } from '@prisma/client';

/**
 * Roles that can perform customer/guest actions.
 * Vendors are hosts who may also book as guests, so they retain
 * all customer-portal capabilities after role upgrade.
 */
export const CUSTOMER_CAPABLE_ROLES: readonly UserRole[] = [
  UserRole.CUSTOMER,
  UserRole.VENDOR,
];

/**
 * Roles that can perform vendor/host actions.
 */
export const VENDOR_CAPABLE_ROLES: readonly UserRole[] = [UserRole.VENDOR];

/**
 * Roles that may access the host-onboarding flow.
 * Customers start here; Vendors may re-enter to resume a draft.
 */
export const HOST_ONBOARDING_ROLES: readonly UserRole[] = [
  UserRole.CUSTOMER,
  UserRole.VENDOR,
];
