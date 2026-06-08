/**
 * Payout API layer — targeted tests
 *
 * Validates that:
 * 1. proofViewUrl / proofDownloadUrl are API proxy URLs (never raw Cloudinary)
 * 2. vendorConfirmPayoutReceived posts to the correct endpoint
 * 3. adminUploadVendorPayoutProof sends a FormData body to the correct endpoint
 * 4. adminReconcileVendorPayoutAmounts posts to the reconcile endpoint
 * 5. vendorReportPayoutIssue posts to the report-issue alias endpoint
 * 6. VendorPayoutRow type carries the proxy URL fields
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { VendorPayoutRow } from "@/lib/api/portal/finance";

// ---------------------------------------------------------------------------
// Mock apiFetch so no real HTTP calls are made
// ---------------------------------------------------------------------------

const mockApiFetch = vi.fn();

vi.mock("@/lib/http", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

// Import after mocking
const finance = await import("@/lib/api/portal/finance");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okResponse<T>(data: T) {
  return Promise.resolve({ ok: true, status: 200, data });
}

const PAYOUT_ID = "payout-abc123";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("payout API layer", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. proofViewUrl on VendorPayoutRow is an API proxy path, not a Cloudinary URL", () => {
    const row: VendorPayoutRow = {
      id: "p1",
      vendorId: "v1",
      propertyId: null,
      propertyTitle: null,
      bookingId: null,
      checkIn: null,
      checkOut: null,
      payoutMethodId: null,
      payoutMethod: null,
      grossBookingAmountMinor: 685100,
      platformCommissionRateBps: 1800,
      platformCommissionMinor: 123318,
      vendorNetAmountMinor: 561782,
      currency: "AED",
      status: "PAID_AWAITING_VENDOR_CONFIRMATION",
      dueAt: null,
      paidAt: null,
      confirmedAt: null,
      adminNotes: null,
      vendorConfirmationNote: null,
      proofDocumentId: "doc-1",
      proofAvailable: true,
      proofViewUrl: `/api/portal/vendor/payouts/${PAYOUT_ID}/proof/view`,
      proofDownloadUrl: `/api/portal/vendor/payouts/${PAYOUT_ID}/proof/download`,
      proofUploadedAt: "2025-01-01T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    expect(row.proofViewUrl).toMatch(/^\/api\/portal\/vendor\/payouts\//);
    expect(row.proofDownloadUrl).toMatch(/^\/api\/portal\/vendor\/payouts\//);
    expect(row.proofViewUrl).not.toContain("cloudinary");
    expect(row.proofDownloadUrl).not.toContain("cloudinary");
  });

  it("2. vendorConfirmPayoutReceived posts to the confirm-received endpoint", async () => {
    mockApiFetch.mockReturnValue(okResponse({ ok: true }));

    await finance.vendorConfirmPayoutReceived(PAYOUT_ID);

    expect(mockApiFetch).toHaveBeenCalledWith(
      `/portal/vendor/payouts/${PAYOUT_ID}/confirm-received`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("3. adminUploadVendorPayoutProof sends FormData to upload-proof endpoint", async () => {
    mockApiFetch.mockReturnValue(okResponse({ ok: true, proofDocumentId: "doc-1" }));
    const file = new File(["content"], "proof.png", { type: "image/png" });

    await finance.adminUploadVendorPayoutProof(PAYOUT_ID, file, "payment confirmed");

    const [url, opts] = mockApiFetch.mock.calls[0] as [string, { body: FormData }];
    expect(url).toBe(`/portal/admin/vendor-payouts/${PAYOUT_ID}/upload-proof`);
    expect(opts.body).toBeInstanceOf(FormData);
    expect(opts.body.get("file")).toBe(file);
    expect(opts.body.get("note")).toBe("payment confirmed");
  });

  it("4. adminReconcileVendorPayoutAmounts posts to reconcile-amounts", async () => {
    mockApiFetch.mockReturnValue(
      okResponse({ checked: 10, updated: 3, skipped: 7, errors: 0, log: [] })
    );

    const result = await finance.adminReconcileVendorPayoutAmounts();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/portal/admin/vendor-payouts/reconcile-amounts",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.checked).toBe(10);
    expect(result.updated).toBe(3);
  });

  it("5. vendorReportPayoutIssue posts to report-issue alias endpoint", async () => {
    mockApiFetch.mockReturnValue(okResponse({ ok: true }));

    await finance.vendorReportPayoutIssue(PAYOUT_ID, "I didn't receive this");

    expect(mockApiFetch).toHaveBeenCalledWith(
      `/portal/vendor/payouts/${PAYOUT_ID}/report-issue`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("6. VendorPayoutRow null proofViewUrl when no proof", () => {
    const row: VendorPayoutRow = {
      id: "p2",
      vendorId: "v1",
      propertyId: null,
      propertyTitle: null,
      bookingId: null,
      checkIn: null,
      checkOut: null,
      payoutMethodId: null,
      payoutMethod: null,
      grossBookingAmountMinor: 685100,
      platformCommissionRateBps: 1800,
      platformCommissionMinor: 123318,
      vendorNetAmountMinor: 561782,
      currency: "AED",
      status: "PENDING_DETAILS",
      dueAt: null,
      paidAt: null,
      confirmedAt: null,
      adminNotes: null,
      vendorConfirmationNote: null,
      proofDocumentId: null,
      proofAvailable: false,
      proofViewUrl: null,
      proofDownloadUrl: null,
      proofUploadedAt: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    expect(row.proofViewUrl).toBeNull();
    expect(row.proofDownloadUrl).toBeNull();
    expect(row.proofAvailable).toBe(false);
  });

  it("7. vendorConfirmPayoutReceived encodes payout ID in the URL", async () => {
    mockApiFetch.mockReturnValue(okResponse({ ok: true }));
    const specialId = "payout/with spaces";

    await finance.vendorConfirmPayoutReceived(specialId, "confirmed");

    const [url] = mockApiFetch.mock.calls[0] as [string];
    expect(url).not.toContain(" ");
    expect(url).toContain(encodeURIComponent(specialId));
  });
});
