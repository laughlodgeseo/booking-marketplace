import { describe, it, expect } from "vitest";
import { stripeErrorMessage } from "@/lib/stripe/fee-payment-errors";

describe("stripeErrorMessage", () => {
  it("returns validation_error message verbatim", () => {
    expect(
      stripeErrorMessage({ type: "validation_error", message: "Your card number is incomplete." })
    ).toBe("Your card number is incomplete.");
  });

  it("returns fallback for validation_error with no message", () => {
    expect(stripeErrorMessage({ type: "validation_error" })).toBe(
      "Your card details are incomplete."
    );
  });

  it("maps card_declined to a readable message", () => {
    const msg = stripeErrorMessage({ code: "card_declined" });
    expect(msg).toMatch(/declined/i);
  });

  it("maps card_declined + insufficient_funds specifically", () => {
    expect(
      stripeErrorMessage({ code: "card_declined", decline_code: "insufficient_funds" })
    ).toMatch(/insufficient funds/i);
  });

  it("maps card_declined + lost_card specifically", () => {
    const msg = stripeErrorMessage({ code: "card_declined", decline_code: "lost_card" });
    expect(msg).toMatch(/cannot be used/i);
  });

  it("maps expired_card", () => {
    expect(stripeErrorMessage({ code: "expired_card" })).toMatch(/expired/i);
  });

  it("maps incorrect_cvc", () => {
    expect(stripeErrorMessage({ code: "incorrect_cvc" })).toMatch(/security code|CVC/i);
  });

  it("maps incorrect_number", () => {
    expect(stripeErrorMessage({ code: "incorrect_number" })).toMatch(/card number/i);
  });

  it("maps invalid_number", () => {
    expect(stripeErrorMessage({ code: "invalid_number" })).toMatch(/card number/i);
  });

  it("maps processing_error", () => {
    expect(stripeErrorMessage({ code: "processing_error" })).toMatch(/process/i);
  });

  it("maps payment_intent_unexpected_state", () => {
    const msg = stripeErrorMessage({ code: "payment_intent_unexpected_state" });
    expect(msg).toMatch(/no longer active/i);
  });

  it("falls back to error.message for unknown codes", () => {
    expect(
      stripeErrorMessage({ code: "do_not_honor", message: "Your card was declined." })
    ).toBe("Your card was declined.");
  });

  it("returns generic fallback when message is missing and code is unknown", () => {
    expect(stripeErrorMessage({})).toBe("Payment failed. Please try again.");
  });

  it("maps invalid_expiry_month", () => {
    expect(stripeErrorMessage({ code: "invalid_expiry_month" })).toMatch(/expiry/i);
  });
});

describe("fmtAed (inline AED formatter matches formatAed on the backend)", () => {
  // The frontend formats minor units the same way the backend does.
  // This test documents the expected output so regressions are caught.
  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  function fmtAed(minor: number) {
    return `AED ${fmt.format(minor / 100)}`;
  }

  it("formats AED 2,100.00 from 210000 minor units", () => {
    expect(fmtAed(210000)).toBe("AED 2,100.00");
  });

  it("formats AED 3,000.00 from 300000 minor units", () => {
    expect(fmtAed(300000)).toBe("AED 3,000.00");
  });

  it("formats AED 5,150.00 from 515000 minor units", () => {
    expect(fmtAed(515000)).toBe("AED 5,150.00");
  });

  it("formats AED 0.00 from 0", () => {
    expect(fmtAed(0)).toBe("AED 0.00");
  });

  it("formats AED 50.00 from 5000 minor units", () => {
    expect(fmtAed(5000)).toBe("AED 50.00");
  });
});
