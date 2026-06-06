export type UserRole = "CUSTOMER" | "VENDOR" | "ADMIN";

/** Returns true for roles that can access the customer/guest portal. */
export function isCustomerCapableRole(role: UserRole | string | null | undefined): boolean {
  return role === "CUSTOMER" || role === "VENDOR";
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string; // ✅ per your OAS
}

export interface RequestPasswordResetPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}
