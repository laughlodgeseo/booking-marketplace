"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { DataTable, type Column } from "@/components/portal/ui/DataTable";
import { MoneyText } from "@/components/portal/ui/MoneyText";
import { DateText } from "@/components/portal/ui/DateText";
import { SkeletonTable } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { portalActionPrimary, portalRowPrimary, portalRowSecondary } from "@/components/portal/ui/portal-actions";
import { adminCreatePayoutFromStatement, adminListPayouts, type PayoutRow } from "@/lib/api/portal/finance";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: PayoutRow[]; page: number; pageSize: number; total: number };

function safeInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [statementId, setStatementId] = useState("");
  const [provider, setProvider] = useState("MANUAL");
  const [providerRef, setProviderRef] = useState("");

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await adminListPayouts({ page, pageSize, status: status !== "ALL" ? status : undefined });
      setState({
        kind: "ready",
        items: Array.isArray(response.items) ? response.items : [],
        page: safeInt(response.page, page),
        pageSize: safeInt(response.pageSize, pageSize),
        total: safeInt(response.total, 0),
      });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load payouts" });
    }
  }, [page, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredRows = useMemo(() => {
    if (state.kind !== "ready") return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return state.items;
    return state.items.filter((item) =>
      [item.id, item.statementId, item.vendorId, item.status, item.provider, item.providerRef ?? "", item.currency]
        .join(" | ").toLowerCase().includes(needle)
    );
  }, [q, state]);

  const statusOptions = useMemo(() => {
    if (state.kind !== "ready") return [];
    return Array.from(new Set(state.items.map((item) => item.status))).sort((a, b) => a.localeCompare(b));
  }, [state]);

  const columns = useMemo<Array<Column<PayoutRow>>>(() => [
    {
      key: "payout",
      header: "Payout",
      className: "col-span-4",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-primary">{row.id}</div>
          <div className="mt-1 truncate font-mono text-xs text-muted">stmt: {row.statementId}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "col-span-2",
      render: (row) => <StatusPill status={row.status}>{prettyStatus(row.status)}</StatusPill>,
    },
    {
      key: "amount",
      header: "Amount",
      className: "col-span-2",
      render: (row) => <MoneyText amount={row.amount} currency={row.currency} />,
    },
    {
      key: "provider",
      header: "Provider",
      className: "col-span-2",
      render: (row) => (
        <div className="text-xs text-secondary">
          <div className="font-semibold text-primary">{row.provider}</div>
          <div className="mt-1 truncate font-mono text-muted">{row.providerRef || "—"}</div>
        </div>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      className: "col-span-2",
      render: (row) => <DateText value={row.updatedAt} />,
    },
  ], []);

  const canPrev = state.kind === "ready" ? state.page > 1 : false;
  const canNext = state.kind === "ready" ? state.page * state.pageSize < state.total : false;

  async function createPayout() {
    const statement = statementId.trim();
    if (!statement) { setBusy("Statement id is required."); return; }
    setBusy("Creating payout...");
    try {
      const payout = await adminCreatePayoutFromStatement(statement, {
        provider: provider.trim() || "MANUAL",
        providerRef: providerRef.trim() || null,
      });
      setStatementId("");
      setProviderRef("");
      setPage(1);
      setBusy(`Payout created (${payout.id}).`);
      await load();
    } catch (error) {
      setBusy(error instanceof Error ? error.message : "Failed to create payout.");
    }
  }

  return (
    <PortalShell role="admin" title="Payouts" subtitle="Payout lifecycle — status transitions and statement links">
      <div className="space-y-5">
        <section className="rounded-2xl border border-line/70 bg-surface p-5 shadow-sm">
          <div className="text-sm font-semibold text-primary">Create payout from statement</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-secondary">Statement ID</div>
              <input value={statementId} onChange={(e) => setStatementId(e.target.value)} className="h-10 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary" placeholder="UUID" />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-secondary">Provider</div>
              <input value={provider} onChange={(e) => setProvider(e.target.value)} className="h-10 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary" placeholder="MANUAL" />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-secondary">Provider reference</div>
              <input value={providerRef} onChange={(e) => setProviderRef(e.target.value)} className="h-10 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary" placeholder="Optional" />
            </label>
            <div className="flex items-end">
              <button type="button" disabled={busy !== null} onClick={() => void createPayout()} className={`w-full ${portalActionPrimary}`}>
                Create payout
              </button>
            </div>
          </div>
          {busy ? <div className="mt-3 rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{busy}</div> : null}
        </section>

        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search payout id, statement id, provider ref..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="portal-select">
            <option value="ALL">All statuses</option>
            {statusOptions.map((option) => <option key={option} value={option}>{prettyStatus(option)}</option>)}
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto hidden text-[11px] text-muted sm:block">{filteredRows.length} of {state.total} payouts</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <SkeletonTable rows={8} />
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5 text-sm text-danger">{state.message}</div>
        ) : (
          <>
            <DataTable<PayoutRow>
              title="Payouts"
              subtitle={<>Showing <span className="font-semibold text-primary">{filteredRows.length}</span> of <span className="font-semibold text-primary">{state.total}</span></>}
              rows={filteredRows}
              columns={columns}
              onRowClick={(row) => router.push(`/admin/payouts/${encodeURIComponent(row.id)}`)}
              rowActions={(row) => (
                <Link href={`/admin/payouts/${encodeURIComponent(row.id)}`} className={portalRowPrimary}>
                  Open
                </Link>
              )}
            />
            <div className="flex items-center justify-between rounded-xl border border-line/40 bg-surface/80 px-4 py-3">
              <div className="text-xs text-muted">Page {state.page} · {state.total} records</div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={!canPrev} className={portalRowSecondary}>Previous</button>
                <button type="button" onClick={() => setPage((v) => v + 1)} disabled={!canNext} className={portalRowSecondary}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
