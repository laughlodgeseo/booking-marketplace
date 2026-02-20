export type AuthUiRole = "customer" | "vendor";

export type AuthFlowPanel = "login" | "signup" | "forgot";

export function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
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
