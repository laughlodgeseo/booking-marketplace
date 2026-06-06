import { apiFetch } from "@/lib/http";
import type { HttpResult } from "@/lib/http";

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
