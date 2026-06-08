import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  DATE_QUERY_KEYS,
  removeDateParams,
  buildPropertiesUrl,
  hasActiveDates,
  hasCompleteDateRange,
  buildPropertiesSearchParams,
  buildPropertyDetailHref,
  PROPERTY_DETAIL_LINK_REL,
  PROPERTY_DETAIL_LINK_TARGET,
  isStrictIsoDay,
  isValidFutureIsoRange,
  parsePropertiesQuery,
  parsePropertyDetailSearchContext,
} from "../lib/search/params";
import {
  DESKTOP_BOOKING_CARD_CLASS,
  DESKTOP_BOOKING_CTA_CLASS,
  DESKTOP_BOOKING_SCROLL_BODY_CLASS,
  DESKTOP_BOOKING_STICKY_CLASS,
} from "../lib/booking/stickyBookingCard";

// ---------------------------------------------------------------------------
// removeDateParams
// ---------------------------------------------------------------------------

describe("removeDateParams", () => {
  it("removes checkIn and checkOut", () => {
    const sp = new URLSearchParams("guests=8&checkIn=2026-06-06&checkOut=2026-06-13");
    const result = removeDateParams(sp);
    expect(result.get("checkIn")).toBeNull();
    expect(result.get("checkOut")).toBeNull();
    expect(result.get("guests")).toBe("8");
  });

  it("removes all legacy date aliases", () => {
    const sp = new URLSearchParams(
      "guests=4&startDate=2026-06-06&endDate=2026-06-13&dateFrom=2026-06-06&dateTo=2026-06-13"
    );
    const result = removeDateParams(sp);
    for (const key of DATE_QUERY_KEYS) {
      expect(result.get(key)).toBeNull();
    }
    expect(result.get("guests")).toBe("4");
  });

  it("preserves all non-date params", () => {
    const sp = new URLSearchParams(
      "location=Dubai&guests=6&area=Dubai+Marina&bedrooms=2&bathrooms=2&minPrice=500&maxPrice=2000&amenities=WIFI,POOL&sort=price_asc&page=2&checkIn=2026-06-06&checkOut=2026-06-13"
    );
    const result = removeDateParams(sp);
    expect(result.get("location")).toBe("Dubai");
    expect(result.get("guests")).toBe("6");
    expect(result.get("area")).toBe("Dubai Marina");
    expect(result.get("bedrooms")).toBe("2");
    expect(result.get("bathrooms")).toBe("2");
    expect(result.get("minPrice")).toBe("500");
    expect(result.get("maxPrice")).toBe("2000");
    expect(result.get("amenities")).toBe("WIFI,POOL");
    expect(result.get("sort")).toBe("price_asc");
    expect(result.get("page")).toBe("2");
  });

  it("does not mutate the input URLSearchParams", () => {
    const sp = new URLSearchParams("checkIn=2026-06-06&checkOut=2026-06-13");
    removeDateParams(sp);
    expect(sp.get("checkIn")).toBe("2026-06-06");
  });

  it("is a no-op when no date params exist", () => {
    const sp = new URLSearchParams("guests=2");
    const result = removeDateParams(sp);
    expect(result.toString()).toBe("guests=2");
  });
});

// ---------------------------------------------------------------------------
// buildPropertiesUrl
// ---------------------------------------------------------------------------

describe("buildPropertiesUrl", () => {
  it("returns /properties when params are empty", () => {
    expect(buildPropertiesUrl(new URLSearchParams())).toBe("/properties");
  });

  it("returns /properties?guests=8 when only guests present", () => {
    const sp = new URLSearchParams("guests=8");
    expect(buildPropertiesUrl(sp)).toBe("/properties?guests=8");
  });

  it("preserves full non-date query string", () => {
    const sp = new URLSearchParams("guests=8&area=Dubai+Marina&sort=price_asc");
    const url = buildPropertiesUrl(sp);
    expect(url).toMatch(/^\/properties\?/);
    const parsed = new URL(url, "https://example.com");
    expect(parsed.searchParams.get("guests")).toBe("8");
    expect(parsed.searchParams.get("area")).toBe("Dubai Marina");
    expect(parsed.searchParams.get("sort")).toBe("price_asc");
  });
});

// ---------------------------------------------------------------------------
// hasActiveDates
// ---------------------------------------------------------------------------

describe("hasActiveDates", () => {
  it("returns true when checkIn is present", () => {
    expect(hasActiveDates(new URLSearchParams("checkIn=2026-06-06"))).toBe(true);
  });

  it("returns true when checkOut is present", () => {
    expect(hasActiveDates(new URLSearchParams("checkOut=2026-06-13"))).toBe(true);
  });

  it("returns true for legacy aliases", () => {
    expect(hasActiveDates(new URLSearchParams("startDate=2026-06-06"))).toBe(true);
    expect(hasActiveDates(new URLSearchParams("endDate=2026-06-13"))).toBe(true);
    expect(hasActiveDates(new URLSearchParams("dateFrom=2026-06-06"))).toBe(true);
    expect(hasActiveDates(new URLSearchParams("dateTo=2026-06-13"))).toBe(true);
  });

  it("returns false when no date params", () => {
    expect(hasActiveDates(new URLSearchParams("guests=8"))).toBe(false);
    expect(hasActiveDates(new URLSearchParams())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasCompleteDateRange
// ---------------------------------------------------------------------------

describe("hasCompleteDateRange", () => {
  it("returns true when both checkIn and checkOut are valid and ordered", () => {
    const sp = new URLSearchParams("checkIn=2026-06-06&checkOut=2026-06-13");
    expect(hasCompleteDateRange(sp)).toBe(true);
  });

  it("returns false when only checkIn is present", () => {
    expect(hasCompleteDateRange(new URLSearchParams("checkIn=2026-06-06"))).toBe(false);
  });

  it("returns false when only checkOut is present", () => {
    expect(hasCompleteDateRange(new URLSearchParams("checkOut=2026-06-13"))).toBe(false);
  });

  it("returns false when checkOut <= checkIn", () => {
    expect(hasCompleteDateRange(new URLSearchParams("checkIn=2026-06-13&checkOut=2026-06-06"))).toBe(false);
    expect(hasCompleteDateRange(new URLSearchParams("checkIn=2026-06-06&checkOut=2026-06-06"))).toBe(false);
  });

  it("returns false when dates are invalid ISO strings", () => {
    expect(hasCompleteDateRange(new URLSearchParams("checkIn=not-a-date&checkOut=2026-06-13"))).toBe(false);
    expect(hasCompleteDateRange(new URLSearchParams("checkIn=2026-06-06&checkOut=bad"))).toBe(false);
    expect(hasCompleteDateRange(new URLSearchParams("checkIn=06/06/2026&checkOut=13/06/2026"))).toBe(false);
  });

  it("returns false when no params present", () => {
    expect(hasCompleteDateRange(new URLSearchParams())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clear-dates round-trip: removeDateParams + buildPropertiesUrl
// ---------------------------------------------------------------------------

describe("clear-dates round-trip (Acceptance Scenario A+B)", () => {
  it("Scenario A: removes only dates from guests=8&checkIn&checkOut URL", () => {
    const sp = new URLSearchParams("guests=8&checkIn=2026-06-06&checkOut=2026-06-13");
    const cleaned = removeDateParams(sp);
    cleaned.delete("page");
    const url = buildPropertiesUrl(cleaned);
    expect(url).toBe("/properties?guests=8");
  });

  it("Scenario B: preserves location and guests after clearing dates", () => {
    const sp = new URLSearchParams("location=Dubai&guests=8&checkIn=2026-06-06&checkOut=2026-06-13");
    const cleaned = removeDateParams(sp);
    cleaned.delete("page");
    const url = buildPropertiesUrl(cleaned);
    const parsed = new URL(url, "https://example.com");
    expect(parsed.searchParams.get("location")).toBe("Dubai");
    expect(parsed.searchParams.get("guests")).toBe("8");
    expect(parsed.searchParams.get("checkIn")).toBeNull();
    expect(parsed.searchParams.get("checkOut")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parsePropertiesQuery — partial/invalid date safety
// ---------------------------------------------------------------------------

describe("parsePropertiesQuery partial/invalid date handling", () => {
  it("Scenario F: no dates — query has no checkIn/checkOut", () => {
    const q = parsePropertiesQuery({ guests: "8" });
    expect(q.checkIn).toBeUndefined();
    expect(q.checkOut).toBeUndefined();
    expect(q.guests).toBe(8);
  });

  it("Scenario G: partial date — only checkIn present, checkOut absent", () => {
    const q = parsePropertiesQuery({ guests: "8", checkIn: "2026-06-06" });
    expect(q.checkIn).toBe("2026-06-06");
    expect(q.checkOut).toBeUndefined();
  });

  it("does not crash on garbage date strings", () => {
    const q = parsePropertiesQuery({ checkIn: "not-a-date", checkOut: "bad" });
    expect(q.checkIn).toBe("not-a-date");
    expect(q.checkOut).toBe("bad");
  });
});

// ---------------------------------------------------------------------------
// buildPropertiesSearchParams — round-trip stability
// ---------------------------------------------------------------------------

describe("buildPropertiesSearchParams", () => {
  it("does not include checkIn/checkOut when they are undefined", () => {
    const q = parsePropertiesQuery({ guests: "4" });
    const sp = buildPropertiesSearchParams(q);
    expect(sp.get("checkIn")).toBeNull();
    expect(sp.get("checkOut")).toBeNull();
    expect(sp.get("guests")).toBe("4");
  });

  it("includes both dates when both are present", () => {
    const q = parsePropertiesQuery({ guests: "4", checkIn: "2026-06-06", checkOut: "2026-06-13" });
    const sp = buildPropertiesSearchParams(q);
    expect(sp.get("checkIn")).toBe("2026-06-06");
    expect(sp.get("checkOut")).toBe("2026-06-13");
  });
});

// ---------------------------------------------------------------------------
// property detail date context preservation
// ---------------------------------------------------------------------------

describe("property detail search context", () => {
  const today = "2026-06-08";

  it("strictly validates real YYYY-MM-DD calendar dates", () => {
    expect(isStrictIsoDay("2026-07-10")).toBe(true);
    expect(isStrictIsoDay("2026-02-30")).toBe(false);
    expect(isStrictIsoDay("2026-7-10")).toBe(false);
    expect(isStrictIsoDay("abc")).toBe(false);
  });

  it("accepts future ordered check-in/check-out ranges", () => {
    expect(isValidFutureIsoRange("2026-07-10", "2026-07-15", { today })).toBe(true);
  });

  it("rejects reversed, malformed, and past date ranges", () => {
    expect(isValidFutureIsoRange("2026-08-10", "2026-08-01", { today })).toBe(false);
    expect(isValidFutureIsoRange("abc", "xyz", { today })).toBe(false);
    expect(isValidFutureIsoRange("2026-06-07", "2026-06-10", { today })).toBe(false);
  });

  it("parses valid detail search params for booking card initialization", () => {
    const context = parsePropertyDetailSearchContext(
      new URLSearchParams("q=marina&city=Dubai&area=Dubai+Marina&checkIn=2026-07-10&checkOut=2026-07-15&guests=4&bedrooms=2&bathrooms=1"),
      { today },
    );
    expect(context).toEqual({
      q: "marina",
      city: "Dubai",
      area: "Dubai Marina",
      checkIn: "2026-07-10",
      checkOut: "2026-07-15",
      guests: 4,
      bedrooms: 2,
      bathrooms: 1,
    });
  });

  it("ignores invalid date params without dropping valid guests", () => {
    const context = parsePropertyDetailSearchContext(
      new URLSearchParams("checkIn=abc&checkOut=xyz&guests=3"),
      { today },
    );
    expect(context).toEqual({ guests: 3 });
  });

  it("builds clean property detail hrefs with selected dates and guests", () => {
    expect(
      buildPropertyDetailHref({
        slug: "some-property-slug",
        q: "marina",
        city: "Dubai",
        area: "Dubai Marina",
        checkIn: "2026-07-10",
        checkOut: "2026-07-15",
        guests: 2,
        bedrooms: 2,
        bathrooms: 1,
        today,
      }),
    ).toBe("/properties/some-property-slug?q=marina&city=Dubai&area=Dubai+Marina&checkIn=2026-07-10&checkOut=2026-07-15&guests=2&bedrooms=2&bathrooms=1");
  });

  it("places hash fragments after preserved query params", () => {
    expect(
      buildPropertyDetailHref({
        slug: "some-property-slug",
        checkIn: "2026-07-10",
        checkOut: "2026-07-15",
        guests: 2,
        hash: "book",
        today,
      }),
    ).toBe("/properties/some-property-slug?checkIn=2026-07-10&checkOut=2026-07-15&guests=2#book");
  });

  it("does not append malformed date params to property links", () => {
    expect(
      buildPropertyDetailHref({
        slug: "test",
        checkIn: "2026-08-10",
        checkOut: "2026-08-01",
        today,
      }),
    ).toBe("/properties/test");
  });
});

// ---------------------------------------------------------------------------
// public property result link behavior
// ---------------------------------------------------------------------------

describe("property result link behavior", () => {
  it("opens property detail links in a new tab with safe rel attributes", () => {
    expect(PROPERTY_DETAIL_LINK_TARGET).toBe("_blank");
    expect(PROPERTY_DETAIL_LINK_REL).toBe("noopener noreferrer");
  });

  it("wires property result card anchors to the shared new-tab attributes", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/tourm/property/TourmPropertyCard.tsx"),
      "utf8",
    );

    expect(source).toContain("target={PROPERTY_DETAIL_LINK_TARGET}");
    expect(source).toContain("rel={PROPERTY_DETAIL_LINK_REL}");
    expect(source).not.toContain("router.push(propertyHref)");
  });

  it("preserves booking params in new-tab property hrefs", () => {
    const href = buildPropertyDetailHref({
      slug: "al-barsha-property-slug",
      checkIn: "2026-06-17",
      checkOut: "2026-06-24",
      guests: 4,
      today: "2026-06-08",
    });

    expect(href).toBe("/properties/al-barsha-property-slug?checkIn=2026-06-17&checkOut=2026-06-24&guests=4");
  });
});

// ---------------------------------------------------------------------------
// desktop booking card sticky positioning
// ---------------------------------------------------------------------------

describe("desktop booking card sticky layout", () => {
  it("uses a higher sticky offset on desktop", () => {
    expect(DESKTOP_BOOKING_STICKY_CLASS).toContain("lg:sticky");
    expect(DESKTOP_BOOKING_STICKY_CLASS).toContain("lg:top-20");
  });

  it("prevents CTA clipping with a constrained shell and scrollable body", () => {
    expect(DESKTOP_BOOKING_CARD_CLASS).toContain("max-h-[calc(100vh-6rem)]");
    expect(DESKTOP_BOOKING_CARD_CLASS).toContain("overflow-hidden");
    expect(DESKTOP_BOOKING_SCROLL_BODY_CLASS).toContain("overflow-y-auto");
    expect(DESKTOP_BOOKING_CTA_CLASS).toContain("shrink-0");
  });
});
