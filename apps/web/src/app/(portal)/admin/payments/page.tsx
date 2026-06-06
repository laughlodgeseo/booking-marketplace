"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, RefreshCw, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { getAdminPayments } from "@/lib/api/portal/admin";

type AdminPaymentsResponse = Awaited<ReturnType<typeof getAdminPayments>>;
type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminPaymentsResponse };

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}
function getString(v: unknown, key: string): string | null {
  const r = asRecord(v);
  if (!r) return null;
  return typeof r[key] === "string" ? (r[key] as string) : null;
}
function getNumber(v: unknown, key: string): number | null {
  const r = asRecord(v);
  if (!r) return null;
  return typeof r[key] === "number" && Number.isFinite(r[key]) ? (r[key] as number) : null;
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";
  const cur = (currency ?? "AED").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

export default function AdminPaymentsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");

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
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load payments" });
      }
    }
    void run();
    return () => { alive = false; };
  }, []);

  const { statuses, providers } = useMemo(() => {
    if (state.kind !== "ready") return { statuses: [], providers: [] };
    return {
      statuses: Array.from(new Set(state.data.items.map((i) => getString(i, "status")).filter(Boolean) as string[])).sort(),
      providers: Array.from(new Set(state.data.items.map((i) => getString(i, "provider")).filter(Boolean) as string[])).sort(),
    };
  }, [state]);

  const rows = useMemo(() => {
    if (state.kind !== "ready") return [];
    const needle = q.trim().toLowerCase();
    return state.data.items.filter((p) => {
      if (providerFilter !== "ALL" && getString(p, "provider") !== providerFilter) return false;
      if (statusFilter !== "ALL" && getString(p, "status") !== statusFilter) return false;
      if (!needle) return true;
      return JSON.stringify(p).toLowerCase().includes(needle);
    });
  }, [state, q, statusFilter, providerFilter]);

  return (
    <PortalShell role="admin" title="Payments" subtitle="Provider status, capture flow, and related booking references">
      <div className="space-y-4">
        {/* Command bar */}
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search payment, booking, provider ref..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="portal-select">
            <option value="ALL">All providers</option>
            {providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="portal-select">
            <option value="ALL">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto hidden text-[11px] text-muted sm:block">{rows.length} of {state.data.total} payments</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5">
            <div className="text-sm font-semibold text-primary">Could not load payments</div>
            <div className="mt-1 text-sm text-secondary">{state.message}</div>
            <button type="button" onClick={() => setState({ kind: "loading" })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No payments match</div>
            <div className="mt-1 text-xs text-muted">Try adjusting your filters.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((row, index) => {
              const paymentId = getString(row, "id") ?? String(index);
              const status = getString(row, "status") ?? "";
              const provider = getString(row, "provider") ?? "—";
              const bookingId = getString(row, "bookingId");
              const amount = getNumber(row, "amount");
              const currency = getString(row, "currency");
              const createdAt = getString(row, "createdAt");

              return (
                <Link
                  key={paymentId}
                  href={`/admin/payments/${encodeURIComponent(paymentId)}`}
                  className="portal-record-card block"
                >
                  <div className="px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate font-mono text-sm font-semibold text-primary">#{paymentId.slice(0, 16)}</div>
                            <div className="mt-0.5 text-[11px] text-muted">
                              Provider: {provider} · {formatDate(createdAt)}
                            </div>
                            {bookingId ? (
                              <div className="mt-0.5 font-mono text-[10px] text-muted">Booking #{bookingId.slice(0, 8)}</div>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{formatMoney(amount, currency)}</span>
                            <StatusPill status={status}>{prettyStatus(status)}</StatusPill>
                          </div>
                        </div>
                      </div>
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
