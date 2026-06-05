import { apiFetch } from "@/lib/http";
import type { HttpResult } from "@/lib/http";

function unwrap<T>(res: HttpResult<T>): T {
  if (!res.ok) {
    throw new Error(res.message ?? "Request failed");
  }
  return res.data;
}

export type OnboardingStatus =
  | "CUSTOMER"
  | "FIRST_TIME"
  | "HAS_DRAFT"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "REJECTED"
  | "HAS_PROPERTIES";

export type OnboardingStateResponse = {
  status: OnboardingStatus;
  propertyId: string | null;
  propertyStatus: string | null;
  vendorProfileExists: boolean;
  propertyCount: number;
};

export type OnboardingStartResponse = {
  success: true;
  isNewVendor: boolean;
  vendorProfileId: string;
  vendorProfileStatus: "PENDING" | "APPROVED" | "REJECTED";
};

export async function getHostOnboardingState(): Promise<OnboardingStateResponse> {
  const res = await apiFetch<OnboardingStateResponse>("/portal/onboarding/state", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function startHostOnboarding(displayName?: string): Promise<OnboardingStartResponse> {
  const res = await apiFetch<OnboardingStartResponse>("/portal/onboarding/start", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: displayName ? { displayName } : {},
  });
  return unwrap(res);
}
