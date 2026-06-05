import { describe, it, expect } from "vitest";
import { safeNextPath } from "../components/auth/authFlow";

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
