export type AuthUiRole = "customer" | "vendor";

export type AuthFlowPanel = "login" | "signup" | "forgot";

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

export function panelFromPath(pathname: string | null): AuthFlowPanel | null {
  if (pathname === "/login") return "login";
  if (pathname === "/signup") return "signup";
  if (pathname === "/forgot") return "forgot";
  if (pathname === "/forgot-password") return "forgot";
  return null;
}
