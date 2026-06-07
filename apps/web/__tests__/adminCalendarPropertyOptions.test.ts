import { describe, it, expect } from "vitest";
import { mergePropertyOptions } from "../lib/calendar/propertyOptions";
import type { PortalCalendarProperty } from "../lib/api/portal/calendar";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const propA: PortalCalendarProperty = {
  id: "prop-a",
  title: "Property A",
  city: "Dubai",
  status: "ACTIVE",
};

const propB: PortalCalendarProperty = {
  id: "prop-b",
  title: "Property B",
  city: "Abu Dhabi",
  status: "ACTIVE",
};

// ---------------------------------------------------------------------------
// mergePropertyOptions — the invariant: options are never cleared once set
// ---------------------------------------------------------------------------

describe("mergePropertyOptions", () => {
  it("populates options from the first non-empty incoming list", () => {
    const result = mergePropertyOptions([], [propA, propB]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("prop-a");
    expect(result[1].id).toBe("prop-b");
  });

  it("replaces options when a new non-empty list arrives", () => {
    const propC: PortalCalendarProperty = { id: "prop-c", title: "C", city: null, status: "ACTIVE" };
    const result = mergePropertyOptions([propA], [propA, propB, propC]);
    expect(result).toHaveLength(3);
    expect(result[2].id).toBe("prop-c");
  });

  // Core bug invariant — empty incoming must never destroy existing options.
  it("preserves existing options when incoming is empty (calendar reload / loading state)", () => {
    const result = mergePropertyOptions([propA, propB], []);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("prop-a");
    expect(result[1].id).toBe("prop-b");
  });

  it("returns empty array only on the very first call when both current and incoming are empty", () => {
    const result = mergePropertyOptions([], []);
    expect(result).toHaveLength(0);
  });

  it("never returns an empty array if previous options were set", () => {
    const result = mergePropertyOptions([propA, propB], []);
    expect(result.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Simulated scenario: open page → select property A → calendar reloads
  // ---------------------------------------------------------------------------

  it("simulates: initial load sets both properties, selecting property A keeps both visible", () => {
    // Step 1 — initial page load returns all properties
    let options = mergePropertyOptions([], [propA, propB]);
    expect(options).toHaveLength(2);

    // Step 2 — user selects property A; backend (fixed) returns all properties again
    options = mergePropertyOptions(options, [propA, propB]);
    expect(options).toHaveLength(2);
    expect(options.some((p) => p.id === "prop-a")).toBe(true);
    expect(options.some((p) => p.id === "prop-b")).toBe(true);

    // Step 3 — calendar reloads mid-flight (incoming would be [] during loading)
    options = mergePropertyOptions(options, []);
    expect(options).toHaveLength(2); // still both properties

    // Step 4 — load completes; backend returns all properties again
    options = mergePropertyOptions(options, [propA, propB]);
    expect(options).toHaveLength(2);

    // Step 5 — user selects property B; same story
    options = mergePropertyOptions(options, [propA, propB]);
    expect(options.some((p) => p.id === "prop-a")).toBe(true);
    expect(options.some((p) => p.id === "prop-b")).toBe(true);
  });
});
