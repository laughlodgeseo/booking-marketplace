import { apiFetch, apiFetchRaw } from "@/lib/http";
import type { HttpResult } from "@/lib/http";

export type ProofBlobResult = {
  blob: Blob;
  filename: string | null;
  contentType: string | null;
};

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
  if (!match) return null;
  return decodeURIComponent(match[1].replace(/['"]/g, "").trim()) || null;
}

function proofFriendlyError(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have access to this payout proof.";
  if (status === 404) return "This payout proof is not available yet.";
  return "Could not load payout proof. Please try again.";
}

function unwrap<T>(res: HttpResult<T>): T {
  if (!res.ok) {
    if (process.env.NODE_ENV !== "production" && res.details !== undefined) {
      console.error("[finance api]", res.status, res.message, res.details);
    }
    throw new Error(res.message);
  }
  return res.data;
}

export type VendorStatementStatus = "DRAFT" | "FINALIZED" | "PAID" | "VOID";
export type PayoutStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type VendorPayoutStatus =
  | "PENDING_DETAILS"
  | "READY_FOR_PAYOUT"
  | "PROCESSING"
  | "PAID_AWAITING_VENDOR_CONFIRMATION"
  | "CONFIRMED_RECEIVED"
  | "DISPUTED"
  | "CANCELLED";
export type VendorPayoutMethodType =
  | "UAE_BANK_TRANSFER"
  | "INTERNATIONAL_BANK_TRANSFER"
  | "OTHER_MANUAL"
  | "STRIPE_CONNECT";
export type PayoutMethodStatus = "PENDING_REVIEW" | "VERIFIED" | "REJECTED" | "DISABLED";

export type VendorPayoutMethodRow = {
  id: string;
  vendorId: string;
  vendor?: { email: string; fullName: string | null };
  type: VendorPayoutMethodType;
  status: PayoutMethodStatus;
  accountHolderName: string | null;
  bankName: string | null;
  ibanMasked: string | null;
  iban?: string | null;
  accountNumberLast4: string | null;
  accountNumber?: string | null;
  swiftCode: string | null;
  bankCountry: string | null;
  bankCity: string | null;
  currency: string;
  transferInstructions?: string | null;
  manualMethodLabel: string | null;
  manualIdentifier: string | null;
  manualInstructions?: string | null;
  contactDetail?: string | null;
  isDefault: boolean;
  verifiedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorPayoutRow = {
  id: string;
  vendorId: string;
  propertyId: string | null;
  propertyTitle: string | null;
  bookingId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  payoutMethodId: string | null;
  payoutMethod: VendorPayoutMethodRow | null;
  grossBookingAmountMinor: number;
  platformCommissionRateBps: number;
  platformCommissionMinor: number;
  vendorNetAmountMinor: number;
  currency: string;
  formatted?: { gross: string; commission: string; vendorNet: string };
  status: VendorPayoutStatus;
  dueAt: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  adminNotes: string | null;
  vendorConfirmationNote: string | null;
  proofDocumentId: string | null;
  proofAvailable: boolean;
  /** API proxy URL — always server-routed, never a direct Cloudinary URL */
  proofViewUrl: string | null;
  proofDownloadUrl: string | null;
  proofUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorPayoutListResponse = {
  summary: Record<string, number>;
  items: VendorPayoutRow[];
};

export type VendorPayoutMethodInput = {
  type: VendorPayoutMethodType;
  accountHolderName?: string;
  bankName?: string;
  iban?: string;
  accountNumber?: string;
  swiftCode?: string;
  bankCountry?: string;
  bankCity?: string;
  currency?: string;
  transferInstructions?: string;
  manualMethodLabel?: string;
  manualIdentifier?: string;
  manualInstructions?: string;
  contactDetail?: string;
  isDefault?: boolean;
};

export type VendorStatementListItem = {
  id: string;
  vendorId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  status: VendorStatementStatus;

  grossBookings: number;
  managementFees: number;
  refunds: number;
  adjustments: number;
  netPayable: number;

  generatedAt: string;
  finalizedAt: string | null;
  paidAt: string | null;
};

export type LedgerEntryRow = {
  id: string;
  vendorId: string;

  propertyId: string | null;
  bookingId: string | null;
  paymentId: string | null;
  refundId: string | null;

  statementId: string | null;

  type: string;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  currency: string;

  occurredAt: string;

  idempotencyKey: string | null;
  metaJson: string | null;
  createdAt: string;
};

export type VendorStatementDetail = VendorStatementListItem & {
  metaJson: string | null;
  ledgerEntries: LedgerEntryRow[];
  payout: PayoutRow | null;
};

export type PayoutRow = {
  id: string;
  vendorId: string;
  statementId: string;

  status: PayoutStatus;

  amount: number;
  currency: string;

  provider: string;
  providerRef: string | null;

  scheduledAt: string | null;
  processedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;

  createdAt: string;
  updatedAt: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
};

type QueryValue = string | number | boolean | null | undefined;
type QueryRecord = Record<string, QueryValue>;

/* ----------------------------- Vendor endpoints ----------------------------- */

export async function vendorListStatements(params?: {
  page?: number;
  pageSize?: number;
}): Promise<Paginated<VendorStatementListItem>> {
  const res = await apiFetch<Paginated<VendorStatementListItem>>("/portal/vendor/statements", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10 },
  });
  return unwrap(res);
}

export async function vendorGetStatementDetail(statementId: string): Promise<VendorStatementDetail> {
  const res = await apiFetch<VendorStatementDetail>(
    `/portal/vendor/statements/${encodeURIComponent(statementId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function vendorListPayoutMethods(): Promise<{ items: VendorPayoutMethodRow[] }> {
  const res = await apiFetch<{ items: VendorPayoutMethodRow[] }>("/portal/vendor/payout-methods", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function vendorCreatePayoutMethod(input: VendorPayoutMethodInput): Promise<VendorPayoutMethodRow> {
  const res = await apiFetch<VendorPayoutMethodRow>("/portal/vendor/payout-methods", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: input,
  });
  return unwrap(res);
}

export async function vendorUpdatePayoutMethod(id: string, input: VendorPayoutMethodInput): Promise<VendorPayoutMethodRow> {
  const res = await apiFetch<VendorPayoutMethodRow>(`/portal/vendor/payout-methods/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    body: input,
  });
  return unwrap(res);
}

export async function vendorDisablePayoutMethod(id: string): Promise<VendorPayoutMethodRow> {
  const res = await apiFetch<VendorPayoutMethodRow>(`/portal/vendor/payout-methods/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function vendorSetDefaultPayoutMethod(id: string): Promise<VendorPayoutMethodRow> {
  const res = await apiFetch<VendorPayoutMethodRow>(`/portal/vendor/payout-methods/${encodeURIComponent(id)}/set-default`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function vendorListPayouts(): Promise<VendorPayoutListResponse> {
  const res = await apiFetch<VendorPayoutListResponse>("/portal/vendor/payouts", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function vendorGetPayout(id: string): Promise<VendorPayoutRow> {
  const res = await apiFetch<VendorPayoutRow>(`/portal/vendor/payouts/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function vendorConfirmPayoutReceived(id: string, note?: string): Promise<{ ok: true }> {
  const res = await apiFetch<{ ok: true }>(`/portal/vendor/payouts/${encodeURIComponent(id)}/confirm-received`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { note: note ?? undefined },
  });
  return unwrap(res);
}

export async function vendorDisputePayout(id: string, note: string): Promise<{ ok: true }> {
  const res = await apiFetch<{ ok: true }>(`/portal/vendor/payouts/${encodeURIComponent(id)}/dispute`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { note },
  });
  return unwrap(res);
}

export async function vendorReportPayoutIssue(id: string, note: string): Promise<{ ok: true }> {
  const res = await apiFetch<{ ok: true }>(`/portal/vendor/payouts/${encodeURIComponent(id)}/report-issue`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { note },
  });
  return unwrap(res);
}

export async function vendorFetchPayoutProofBlob(
  payoutId: string,
  mode: "view" | "download",
): Promise<ProofBlobResult> {
  const response = await apiFetchRaw(
    `/portal/vendor/payouts/${encodeURIComponent(payoutId)}/proof/${mode}`,
    { method: "GET" },
  );
  if (!response.ok) throw new Error(proofFriendlyError(response.status));
  return {
    blob: await response.blob(),
    filename: extractFilename(response.headers.get("content-disposition")),
    contentType: response.headers.get("content-type"),
  };
}

/* ------------------------------ Admin endpoints ------------------------------ */

export async function adminListStatements(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  vendorId?: string;
}): Promise<Paginated<VendorStatementListItem>> {
  const query: QueryRecord = {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 10,
  };
  if (params?.status) query.status = params.status;
  if (params?.vendorId) query.vendorId = params.vendorId;

  const res = await apiFetch<Paginated<VendorStatementListItem>>("/portal/admin/statements", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query,
  });
  return unwrap(res);
}

export async function adminGenerateStatements(input: {
  year: number;
  month: number;
  vendorId?: string | null;
  currency?: string | null;
}): Promise<{ ok: true; message?: string } | Record<string, unknown>> {
  const res = await apiFetch<{ ok: true; message?: string } | Record<string, unknown>>(
    "/portal/admin/statements/generate",
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: {
        year: input.year,
        month: input.month,
        vendorId: input.vendorId ?? undefined,
        currency: input.currency ?? undefined,
      },
    }
  );
  return unwrap(res);
}

export async function adminFinalizeStatement(statementId: string, note?: string | null) {
  const res = await apiFetch<VendorStatementDetail>(
    `/portal/admin/statements/${encodeURIComponent(statementId)}/finalize`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { note: note ?? undefined },
    }
  );
  return unwrap(res);
}

export async function adminVoidStatement(statementId: string, note?: string | null) {
  const res = await apiFetch<VendorStatementDetail>(
    `/portal/admin/statements/${encodeURIComponent(statementId)}/void`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { note: note ?? undefined },
    }
  );
  return unwrap(res);
}

export async function adminGetStatementDetail(
  statementId: string
): Promise<VendorStatementDetail> {
  const res = await apiFetch<VendorStatementDetail>(
    `/portal/admin/statements/${encodeURIComponent(statementId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function adminListPayouts(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  vendorId?: string;
}): Promise<Paginated<PayoutRow>> {
  const query: QueryRecord = {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 10,
  };
  if (params?.status) query.status = params.status;
  if (params?.vendorId) query.vendorId = params.vendorId;

  const res = await apiFetch<Paginated<PayoutRow>>("/portal/admin/payouts", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query,
  });
  return unwrap(res);
}

export async function adminGetPayoutDetail(payoutId: string): Promise<PayoutRow & { statement?: VendorStatementListItem | null }> {
  const res = await apiFetch<PayoutRow & { statement?: VendorStatementListItem | null }>(
    `/portal/admin/payouts/${encodeURIComponent(payoutId)}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );
  return unwrap(res);
}

export async function adminCreatePayoutFromStatement(statementId: string, input?: { provider?: string; providerRef?: string | null }) {
  const res = await apiFetch<PayoutRow>(
    `/portal/admin/payouts/from-statement/${encodeURIComponent(statementId)}`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: {
        provider: input?.provider ?? "MANUAL",
        providerRef: input?.providerRef ?? undefined,
      },
    }
  );
  return unwrap(res);
}

export async function adminMarkPayoutProcessing(payoutId: string, input?: { providerRef?: string | null }) {
  const res = await apiFetch<PayoutRow>(
    `/portal/admin/payouts/${encodeURIComponent(payoutId)}/mark-processing`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: { providerRef: input?.providerRef ?? undefined },
    }
  );
  return unwrap(res);
}

export async function adminMarkPayoutSucceeded(payoutId: string, input?: { providerRef?: string | null; idempotencyKey?: string }) {
  const res = await apiFetch<PayoutRow>(
    `/portal/admin/payouts/${encodeURIComponent(payoutId)}/mark-succeeded`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: {
        providerRef: input?.providerRef ?? undefined,
        idempotencyKey: input?.idempotencyKey ?? undefined,
      },
    }
  );
  return unwrap(res);
}

export async function adminMarkPayoutFailed(payoutId: string, input: { failureReason: string; providerRef?: string | null }) {
  const res = await apiFetch<PayoutRow>(
    `/portal/admin/payouts/${encodeURIComponent(payoutId)}/mark-failed`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: {
        failureReason: input.failureReason,
        providerRef: input.providerRef ?? undefined,
      },
    }
  );
  return unwrap(res);
}

export async function adminCancelPayout(payoutId: string, reason?: string | null) {
  const res = await apiFetch<PayoutRow>(`/portal/admin/payouts/${encodeURIComponent(payoutId)}/cancel`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { reason: reason ?? undefined },
  });
  return unwrap(res);
}

export async function adminListVendorPayouts(params?: {
  status?: string;
  vendorId?: string;
}): Promise<VendorPayoutListResponse> {
  const query: QueryRecord = {};
  if (params?.status) query.status = params.status;
  if (params?.vendorId) query.vendorId = params.vendorId;
  const res = await apiFetch<VendorPayoutListResponse>("/portal/admin/vendor-payouts", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query,
  });
  return unwrap(res);
}

export async function adminGetVendorPayout(id: string): Promise<VendorPayoutRow> {
  const res = await apiFetch<VendorPayoutRow>(`/portal/admin/vendor-payouts/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function adminMarkVendorPayoutProcessing(id: string, note?: string): Promise<{ ok: true }> {
  const res = await apiFetch<{ ok: true }>(`/portal/admin/vendor-payouts/${encodeURIComponent(id)}/mark-processing`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { note: note ?? undefined },
  });
  return unwrap(res);
}

export async function adminUploadVendorPayoutProof(id: string, file: File, note?: string): Promise<{ ok: true; proofDocumentId: string }> {
  const form = new FormData();
  form.append("file", file);
  if (note) form.append("note", note);
  const res = await apiFetch<{ ok: true; proofDocumentId: string }>(
    `/portal/admin/vendor-payouts/${encodeURIComponent(id)}/upload-proof`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      body: form,
    }
  );
  return unwrap(res);
}

export async function adminMarkVendorPayoutPaid(id: string, note?: string): Promise<{ ok: true }> {
  const res = await apiFetch<{ ok: true }>(`/portal/admin/vendor-payouts/${encodeURIComponent(id)}/mark-paid`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { note: note ?? undefined },
  });
  return unwrap(res);
}

export async function adminFetchVendorPayoutProofBlob(
  payoutId: string,
  mode: "view" | "download",
): Promise<ProofBlobResult> {
  const response = await apiFetchRaw(
    `/portal/admin/vendor-payouts/${encodeURIComponent(payoutId)}/proof/${mode}`,
    { method: "GET" },
  );
  if (!response.ok) throw new Error(proofFriendlyError(response.status));
  return {
    blob: await response.blob(),
    filename: extractFilename(response.headers.get("content-disposition")),
    contentType: response.headers.get("content-type"),
  };
}

export async function adminCancelVendorPayout(id: string, note?: string): Promise<{ ok: true }> {
  const res = await apiFetch<{ ok: true }>(`/portal/admin/vendor-payouts/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { note: note ?? undefined },
  });
  return unwrap(res);
}

export async function adminReconcileVendorPayoutAmounts(): Promise<{
  checked: number;
  updated: number;
  skipped: number;
  errors: number;
  log: string[];
}> {
  const res = await apiFetch<{
    checked: number;
    updated: number;
    skipped: number;
    errors: number;
    log: string[];
  }>("/portal/admin/vendor-payouts/reconcile-amounts", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function adminListPayoutMethods(params?: {
  status?: string;
  vendorId?: string;
}): Promise<{ items: VendorPayoutMethodRow[] }> {
  const query: QueryRecord = {};
  if (params?.status) query.status = params.status;
  if (params?.vendorId) query.vendorId = params.vendorId;
  const res = await apiFetch<{ items: VendorPayoutMethodRow[] }>("/portal/admin/vendor-payout-methods", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    query,
  });
  return unwrap(res);
}

export async function adminGetPayoutMethod(id: string): Promise<VendorPayoutMethodRow> {
  const res = await apiFetch<VendorPayoutMethodRow>(`/portal/admin/vendor-payout-methods/${encodeURIComponent(id)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function adminVerifyPayoutMethod(id: string): Promise<VendorPayoutMethodRow> {
  const res = await apiFetch<VendorPayoutMethodRow>(`/portal/admin/vendor-payout-methods/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  return unwrap(res);
}

export async function adminRejectPayoutMethod(id: string, reason: string): Promise<VendorPayoutMethodRow> {
  const res = await apiFetch<VendorPayoutMethodRow>(`/portal/admin/vendor-payout-methods/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    body: { reason },
  });
  return unwrap(res);
}
