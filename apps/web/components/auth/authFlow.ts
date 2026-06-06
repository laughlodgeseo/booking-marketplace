import type { UserRole } from "@/lib/auth/auth.types";

export type AuthUiRole = "customer" | "vendor";
export type PortalIntent = AuthUiRole;

export type AuthFlowPanel = "login" | "signup" | "forgot";

// ---------------------------------------------------------------------------
// Admin portal — separate from customer/vendor flow, does not extend AuthUiRole
// ---------------------------------------------------------------------------

export function safeAdminNextPath(raw: string | null): string {
  const safe = safeNextPath(raw, "/admin");
  // Admin login may only redirect into /admin/* to prevent cross-portal leaks.
  if (!safe.startsWith("/admin")) return "/admin";
  return safe;
}

export function canUserAccessAdminPortal(userRole: UserRole): boolean {
  return userRole === "ADMIN";
}

// Paths that must never be used as a post-login redirect target.
// Prevents login loops (/login?next=/login), open-redirect via auth pages,
// and self-referential vendor-login traps (/vendor/login?next=/vendor/login).
const REJECT_AS_NEXT = new Set([
  "/login",
  "/vendor/login",
  "/admin/login",
  "/logout",
  "/forgot",
  "/forgot-password",
  "/signup",
  "/reset-password",
  "/verify-email",
  "/auth",
]);

export function safeNextPath(raw: string | null, fallback = "/"): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  // Reject external URLs and protocol-relative URLs (open redirect protection)
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  // Reject auth/login pages as next targets (login-loop protection)
  const pathOnly = trimmed.split("?")[0];
  if (REJECT_AS_NEXT.has(pathOnly)) return fallback;
  return trimmed;
}

export function readRole(raw: string | null): AuthUiRole {
  return raw === "vendor" ? "vendor" : "customer";
}

export function defaultPathForPortalIntent(intent: PortalIntent): string {
  return intent === "vendor" ? "/vendor" : "/account";
}

// A VENDOR retains customer-portal capability; a CUSTOMER cannot access vendor portal.
export function canUserUsePortal(userRole: UserRole, intent: PortalIntent): boolean {
  if (intent === "customer") return userRole === "CUSTOMER" || userRole === "VENDOR";
  if (intent === "vendor") return userRole === "VENDOR";
  return false;
}

// Prevents cross-portal confusion when validating ?next= after login.
function isNextCompatibleWithPortal(next: string, intent: PortalIntent): boolean {
  if (intent === "customer") return !next.startsWith("/vendor") && !next.startsWith("/admin");
  if (intent === "vendor") return !next.startsWith("/account") && !next.startsWith("/admin");
  return true;
}

// Given the portal intent and the raw next path (already sanitised by safeNextPath),
// return the correct post-login destination.  Does NOT perform capability checks —
// call canUserUsePortal first and redirect to onboarding if the check fails.
export function resolvePostLoginPath(intent: PortalIntent, requestedNext: string): string {
  const defaultPath = defaultPathForPortalIntent(intent);
  if (!requestedNext || requestedNext === "/") return defaultPath;
  if (!isNextCompatibleWithPortal(requestedNext, intent)) return defaultPath;
  return requestedNext;
}

export function panelFromPath(pathname: string | null): AuthFlowPanel | null {
  if (pathname === "/login") return "login";
  if (pathname === "/signup") return "signup";
  if (pathname === "/forgot") return "forgot";
  if (pathname === "/forgot-password") return "forgot";
  return null;
}
