import { describe, it, expect } from "vitest";
import {
  safeNextPath,
  canUserUsePortal,
  resolvePostLoginPath,
  defaultPathForPortalIntent,
  safeAdminNextPath,
  canUserAccessAdminPortal,
} from "../components/auth/authFlow";
import { isCustomerCapableRole } from "../lib/auth/auth.types";

// ---------------------------------------------------------------------------
// safeNextPath — redirect sanitizer unit tests
// ---------------------------------------------------------------------------

describe("safeNextPath", () => {
  // Logout redirect targets ------------------------------------------------

  it("vendor logout target uses safe /vendor fallback when next is null", () => {
    // loginHrefForRole('vendor') sends to /vendor/login with no next param.
    // safeNextPath(null, '/vendor') should return the fallback '/vendor'.
    expect(safeNextPath(null, "/vendor")).toBe("/vendor");
  });

  it("customer logout target returns /account when next is /account", () => {
    expect(safeNextPath("/account", "/account")).toBe("/account");
  });

  it("admin logout target returns /admin when next is /admin", () => {
    expect(safeNextPath("/admin", "/admin")).toBe("/admin");
  });

  // Login-loop protection ---------------------------------------------------

  it("rejects next=/vendor/login and returns fallback", () => {
    expect(safeNextPath("/vendor/login")).toBe("/");
    expect(safeNextPath("/vendor/login", "/vendor")).toBe("/vendor");
  });

  it("rejects next=/login and returns fallback", () => {
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/login", "/account")).toBe("/account");
  });

  it("rejects next=/admin/login and returns fallback", () => {
    expect(safeNextPath("/admin/login")).toBe("/");
    expect(safeNextPath("/admin/login", "/admin")).toBe("/admin");
  });

  it("rejects next=/forgot and returns fallback", () => {
    expect(safeNextPath("/forgot")).toBe("/");
  });

  it("rejects next=/forgot-password and returns fallback", () => {
    expect(safeNextPath("/forgot-password")).toBe("/");
  });

  it("rejects next=/signup and returns fallback", () => {
    expect(safeNextPath("/signup")).toBe("/");
  });

  it("rejects next=/logout and returns fallback", () => {
    expect(safeNextPath("/logout")).toBe("/");
  });

  it("rejects next=/reset-password and returns fallback", () => {
    expect(safeNextPath("/reset-password")).toBe("/");
  });

  it("rejects next=/verify-email and returns fallback", () => {
    expect(safeNextPath("/verify-email")).toBe("/");
  });

  it("rejects next=/auth and returns fallback", () => {
    expect(safeNextPath("/auth")).toBe("/");
  });

  // Open-redirect protection -----------------------------------------------

  it("rejects external https URL", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com", "/vendor")).toBe("/vendor");
  });

  it("rejects protocol-relative URL //evil.com", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("//evil.com", "/vendor")).toBe("/vendor");
  });

  it("rejects javascript: URI", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects data: URI", () => {
    expect(safeNextPath("data:text/html,<h1>hi</h1>")).toBe("/");
  });

  // Accepting safe paths ----------------------------------------------------

  it("accepts /vendor/bookings", () => {
    expect(safeNextPath("/vendor/bookings")).toBe("/vendor/bookings");
  });

  it("accepts /vendor/bookings with query string", () => {
    expect(safeNextPath("/vendor/bookings?tab=upcoming")).toBe("/vendor/bookings?tab=upcoming");
  });

  it("accepts /account/bookings", () => {
    expect(safeNextPath("/account/bookings")).toBe("/account/bookings");
  });

  it("accepts /account/bookings with deep path", () => {
    expect(safeNextPath("/account/bookings/abc123")).toBe("/account/bookings/abc123");
  });

  it("accepts /vendor", () => {
    expect(safeNextPath("/vendor")).toBe("/vendor");
  });

  it("accepts /admin", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
  });

  it("returns fallback for empty string", () => {
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("", "/vendor")).toBe("/vendor");
  });

  // Edge: login path with query string prefix match should NOT be allowed ----

  it("rejects /login?next=... as next target", () => {
    expect(safeNextPath("/login?next=%2Faccount")).toBe("/");
  });

  it("rejects /vendor/login?next=... as next target (with vendor fallback)", () => {
    // When called with the vendor fallback (as the vendor login page does),
    // a rejected login-path next value resolves to "/vendor", not "/".
    expect(safeNextPath("/vendor/login?next=%2Fvendor", "/vendor")).toBe("/vendor");
  });
});

// ---------------------------------------------------------------------------
// defaultPathForPortalIntent
// ---------------------------------------------------------------------------

describe("defaultPathForPortalIntent", () => {
  it("customer intent defaults to /account", () => {
    expect(defaultPathForPortalIntent("customer")).toBe("/account");
  });

  it("vendor intent defaults to /vendor", () => {
    expect(defaultPathForPortalIntent("vendor")).toBe("/vendor");
  });
});

// ---------------------------------------------------------------------------
// canUserUsePortal — capability rules
// ---------------------------------------------------------------------------

describe("canUserUsePortal", () => {
  // Customer portal: CUSTOMER and VENDOR are both capable
  it("CUSTOMER can use customer portal", () => {
    expect(canUserUsePortal("CUSTOMER", "customer")).toBe(true);
  });

  it("VENDOR can use customer portal (dual-portal capability)", () => {
    expect(canUserUsePortal("VENDOR", "customer")).toBe(true);
  });

  // Vendor portal: only VENDOR
  it("VENDOR can use vendor portal", () => {
    expect(canUserUsePortal("VENDOR", "vendor")).toBe(true);
  });

  it("CUSTOMER cannot use vendor portal", () => {
    expect(canUserUsePortal("CUSTOMER", "vendor")).toBe(false);
  });

  // ADMIN is not in either capability set
  it("ADMIN cannot use customer portal via this helper", () => {
    expect(canUserUsePortal("ADMIN", "customer")).toBe(false);
  });

  it("ADMIN cannot use vendor portal via this helper", () => {
    expect(canUserUsePortal("ADMIN", "vendor")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolvePostLoginPath — post-login destination selection
// ---------------------------------------------------------------------------

describe("resolvePostLoginPath", () => {
  // No ?next (or root fallback) → use portal default
  it("customer intent with no next returns /account", () => {
    expect(resolvePostLoginPath("customer", "/")).toBe("/account");
  });

  it("customer intent with empty string returns /account", () => {
    expect(resolvePostLoginPath("customer", "")).toBe("/account");
  });

  it("vendor intent with no next returns /vendor", () => {
    expect(resolvePostLoginPath("vendor", "/")).toBe("/vendor");
  });

  // Compatible next paths pass through
  it("customer intent preserves compatible /account next", () => {
    expect(resolvePostLoginPath("customer", "/account/bookings")).toBe("/account/bookings");
  });

  it("vendor intent preserves compatible /vendor next", () => {
    expect(resolvePostLoginPath("vendor", "/vendor/properties")).toBe("/vendor/properties");
  });

  // Cross-portal next paths are rejected (fall back to portal default)
  it("customer intent rejects vendor next and returns /account", () => {
    expect(resolvePostLoginPath("customer", "/vendor/properties")).toBe("/account");
  });

  it("vendor intent rejects account next and returns /vendor", () => {
    expect(resolvePostLoginPath("vendor", "/account/bookings")).toBe("/vendor");
  });

  it("customer intent rejects admin next and returns /account", () => {
    expect(resolvePostLoginPath("customer", "/admin")).toBe("/account");
  });

  it("vendor intent rejects admin next and returns /vendor", () => {
    expect(resolvePostLoginPath("vendor", "/admin")).toBe("/vendor");
  });
});

// ---------------------------------------------------------------------------
// isCustomerCapableRole — frontend capability helper
// ---------------------------------------------------------------------------

describe("isCustomerCapableRole", () => {
  it("CUSTOMER is customer-capable", () => {
    expect(isCustomerCapableRole("CUSTOMER")).toBe(true);
  });

  it("VENDOR is customer-capable (dual-portal)", () => {
    expect(isCustomerCapableRole("VENDOR")).toBe(true);
  });

  it("ADMIN is not customer-capable", () => {
    expect(isCustomerCapableRole("ADMIN")).toBe(false);
  });

  it("null is not customer-capable", () => {
    expect(isCustomerCapableRole(null)).toBe(false);
  });

  it("undefined is not customer-capable", () => {
    expect(isCustomerCapableRole(undefined)).toBe(false);
  });

  it("empty string is not customer-capable", () => {
    expect(isCustomerCapableRole("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// safeAdminNextPath — admin-only next-path validation
// ---------------------------------------------------------------------------

describe("safeAdminNextPath", () => {
  it("returns /admin for null", () => {
    expect(safeAdminNextPath(null)).toBe("/admin");
  });

  it("returns /admin for empty string", () => {
    expect(safeAdminNextPath("")).toBe("/admin");
  });

  it("accepts /admin", () => {
    expect(safeAdminNextPath("/admin")).toBe("/admin");
  });

  it("accepts /admin/review-queue", () => {
    expect(safeAdminNextPath("/admin/review-queue")).toBe("/admin/review-queue");
  });

  it("accepts /admin/properties/deletion-requests", () => {
    expect(safeAdminNextPath("/admin/properties/deletion-requests")).toBe(
      "/admin/properties/deletion-requests"
    );
  });

  it("rejects /account next → falls back to /admin", () => {
    expect(safeAdminNextPath("/account")).toBe("/admin");
  });

  it("rejects /vendor next → falls back to /admin", () => {
    expect(safeAdminNextPath("/vendor")).toBe("/admin");
  });

  it("rejects /login → falls back to /admin (also in REJECT_AS_NEXT)", () => {
    expect(safeAdminNextPath("/login")).toBe("/admin");
  });

  it("rejects /admin/login → falls back to /admin (login-loop protection)", () => {
    expect(safeAdminNextPath("/admin/login")).toBe("/admin");
  });

  it("rejects external URL → falls back to /admin", () => {
    expect(safeAdminNextPath("https://evil.com")).toBe("/admin");
  });

  it("rejects protocol-relative URL → falls back to /admin", () => {
    expect(safeAdminNextPath("//evil.com")).toBe("/admin");
  });
});

// ---------------------------------------------------------------------------
// canUserAccessAdminPortal — admin portal access check
// ---------------------------------------------------------------------------

describe("canUserAccessAdminPortal", () => {
  it("ADMIN can access admin portal", () => {
    expect(canUserAccessAdminPortal("ADMIN")).toBe(true);
  });

  it("CUSTOMER cannot access admin portal", () => {
    expect(canUserAccessAdminPortal("CUSTOMER")).toBe(false);
  });

  it("VENDOR cannot access admin portal", () => {
    expect(canUserAccessAdminPortal("VENDOR")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cross-portal next safety — customer/vendor login must not reach /admin
// (already tested in resolvePostLoginPath but made explicit here)
// ---------------------------------------------------------------------------

describe("cross-portal next safety", () => {
  it("customer login with /admin next falls back to /account", () => {
    expect(resolvePostLoginPath("customer", "/admin")).toBe("/account");
  });

  it("vendor login with /admin next falls back to /vendor", () => {
    expect(resolvePostLoginPath("vendor", "/admin")).toBe("/vendor");
  });

  it("customer login with /admin/review-queue next falls back to /account", () => {
    expect(resolvePostLoginPath("customer", "/admin/review-queue")).toBe("/account");
  });

  it("vendor login with /admin/bookings next falls back to /vendor", () => {
    expect(resolvePostLoginPath("vendor", "/admin/bookings")).toBe("/vendor");
  });
});
