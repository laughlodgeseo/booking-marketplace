import type { PortalIntent } from "@/components/auth/authFlow";

const KEY = "ll_portal_intent";

export function setLastPortalIntent(intent: PortalIntent): void {
  try {
    sessionStorage.setItem(KEY, intent);
  } catch {
    // sessionStorage unavailable (SSR, privacy mode) — safe to ignore
  }
}

export function getLastPortalIntent(): PortalIntent | null {
  try {
    const val = sessionStorage.getItem(KEY);
    return val === "customer" || val === "vendor" ? val : null;
  } catch {
    return null;
  }
}

export function clearPortalIntent(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
