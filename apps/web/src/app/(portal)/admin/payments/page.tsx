"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PortalShell } from "@/components/portal/PortalShell";
import { Toolbar } from "@/components/portal/ui/Toolbar";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";

import { getAdminPayments } from "@/lib/api/portal/admin";

type AdminPaymentsResponse = Awaited<ReturnType<typeof getAdminPayments>>;

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminPaymentsResponse };

type FilterState = {
  q: string;
  status: string;
  provider: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function getString(value: unknown, key: string): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const field = record[key];
  return typeof field === "string" ? field : null;
}

function getNumber(value: unknown, key: string): number | null {
  const record = asRecord(value);
  if (!record) return null;
  const field = record[key];
  return typeof field === "number" && Number.isFinite(field) ? field : null;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null) return "-";
  return `${amount.toLocaleString()} ${currency ?? ""}`.trim();
}

function toneForStatus(status: string | null) {
  if (!status) return "neutral" as const;
  if (status.includes("CAPTURE") || status.includes("PAID")) return "success" as const;
  if (status.includes("FAIL")) return "danger" as const;
  if (status.includes("PENDING") || status.includes("AUTHOR")) return "warning" as const;
  return "neutral" as const;
}

export default function AdminPaymentsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [filters, setFilters] = useState<FilterState>({
    q: "",
    status: "ALL",
    provider: "ALL",
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminPayments({ page: 1, pageSize: 100 });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to load payments",
        });
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, []);

  const providers = useMemo(() => {
    if (state.kind !== "ready") return [];
    return Array.from(
      new Set(
        state.data.items
          .map((item) => getString(item, "provider"))
          .filter((value): value is string => Boolean(value))
      )
    );
  }, [state]);

  const statuses = useMemo(() => {
    if (state.kind !== "ready") return [];
    return Array.from(
      new Set(
        state.data.items
          .map((item) => getString(item, "status"))
          .filter((value): value is string => Boolean(value))
      )
    );
  }, [state]);

  const rows = useMemo(() => {
    if (state.kind !== "ready") return [];

    return state.data.items.filter((payment) => {
      if (filters.provider !== "ALL" && getString(payment, "provider") !== filters.provider) return false;
      if (filters.status !== "ALL" && getString(payment, "status") !== filters.status) return false;

      const query = filters.q.trim().toLowerCase();
      if (!query) return true;

      return JSON.stringify(payment).toLowerCase().includes(query);
    });
  }, [state, filters]);

  return (
    <PortalShell
      role="admin"
      title="Payments"
      subtitle="Open full payment detail pages with events and refund links"
    >
      <div className="space-y-5">
        <Toolbar
          title="Payment records"
          subtitle="Provider status, capture flow, and related booking references."
          searchPlaceholder="Search payment id, booking id, provider ref..."
          onSearch={(q) => setFilters((current) => ({ ...current, q }))}
          right={(
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.provider}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, provider: event.target.value }))
                }
                className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base font-semibold text-primary lg:h-10 lg:rounded-xl lg:border-line/80 lg:bg-surface lg:px-3 lg:text-sm"
              >
                <option value="ALL">All providers</option>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, status: event.target.value }))
                }
                className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base font-semibold text-primary lg:h-10 lg:rounded-xl lg:border-line/80 lg:bg-surface lg:px-3 lg:text-sm"
              >
                <option value="ALL">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          )}
        />

        {state.kind === "loading" ? (
          <div className="grid gap-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
            {state.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-line/40 bg-warm-base/95 p-6 text-sm text-secondary lg:border-line/60 lg:bg-surface">
            No payments match these filters.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const paymentId = getString(row, "id") ?? String(index);
              const status = getString(row, "status");
              const provider = getString(row, "provider");
              const bookingId = getString(row, "bookingId");
              const amount = getNumber(row, "amount");
              const currency = getString(row, "currency");
              const createdAt = getString(row, "createdAt");

              return (
                <Link
                  key={paymentId}
                  href={`/admin/payments/${encodeURIComponent(paymentId)}`}
                  className="block rounded-3xl border border-line/40 bg-warm-base/95 p-5 shadow-sm transition hover:bg-warm-alt/60 lg:border-line/60 lg:bg-surface"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-primary">Payment {paymentId}</div>
                      <div className="mt-1 text-xs text-secondary">
                        Booking: {bookingId ?? "-"} · Provider: {provider ?? "-"}
                      </div>
                      <div className="mt-1 text-xs text-muted">Created: {formatDate(createdAt)}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-primary">{formatMoney(amount, currency)}</div>
                      <StatusPill tone={toneForStatus(status)}>{status ?? "-"}</StatusPill>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
