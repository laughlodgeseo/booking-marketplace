"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { DataTable, type Column } from "@/components/portal/ui/DataTable";
import { DateText } from "@/components/portal/ui/DateText";
import { MoneyText } from "@/components/portal/ui/MoneyText";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonTable } from "@/components/portal/ui/Skeleton";
import { adminGenerateStatements, adminListStatements, type VendorStatementListItem } from "@/lib/api/portal/finance";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: VendorStatementListItem[]; page: number; pageSize: number; total: number };

function safeInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function monthLabel(periodStartISO: string): string {
  const date = new Date(periodStartISO);
  if (Number.isNaN(date.getTime())) return periodStartISO;
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminStatementsPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const now = new Date();
  const [genYear, setGenYear] = useState(now.getFullYear());
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [genVendorId, setGenVendorId] = useState("");
  const [genCurrency, setGenCurrency] = useState("AED");

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const response = await adminListStatements({ page, pageSize, status: status !== "ALL" ? status : undefined });
      setState({
        kind: "ready",
        items: Array.isArray(response.items) ? response.items : [],
        page: safeInt(response.page, page),
        pageSize: safeInt(response.pageSize, pageSize),
        total: safeInt(response.total, 0),
      });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load statements" });
    }
  }, [page, status]);

  useEffect(() => { void load(); }, [load]);

  const filteredRows = useMemo(() => {
    if (state.kind !== "ready") return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return state.items;
    return state.items.filter((item) =>
      [item.id, item.vendorId, item.status, item.currency, item.periodStart, item.periodEnd]
        .join(" | ").toLowerCase().includes(needle)
    );
  }, [q, state]);

  const statusOptions = useMemo(() => {
    if (state.kind !== "ready") return [];
    return Array.from(new Set(state.items.map((item) => item.status))).sort((a, b) => a.localeCompare(b));
  }, [state]);

  const columns = useMemo<Array<Column<VendorStatementListItem>>>(() => [
    {
      key: "statement",
      header: "Statement",
      className: "col-span-4",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-primary">{monthLabel(row.periodStart)}</div>
          <div className="mt-1 truncate font-mono text-xs text-muted">{row.id}</div>
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      className: "col-span-3",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-sm text-primary">{row.vendorId}</div>
          <div className="mt-1 text-xs text-secondary">{row.currency}</div>
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
      key: "net",
      header: "Net Payable",
      className: "col-span-2",
      render: (row) => <MoneyText amount={row.netPayable} currency={row.currency} />,
    },
    {
      key: "generated",
      header: "Generated",
      className: "col-span-1",
      render: (row) => <DateText value={row.generatedAt} />,
    },
  ], []);

  const canPrev = state.kind === "ready" ? state.page > 1 : false;
  const canNext = state.kind === "ready" ? state.page * state.pageSize < state.total : false;

  async function generate() {
    if (!Number.isFinite(genYear) || genYear < 2000 || genYear > 2100) { setBusy("Year must be between 2000 and 2100."); return; }
    if (!Number.isFinite(genMonth) || genMonth < 1 || genMonth > 12) { setBusy("Month must be between 1 and 12."); return; }
    setBusy("Generating statements...");
    try {
      await adminGenerateStatements({ year: genYear, month: genMonth, vendorId: genVendorId.trim() || null, currency: genCurrency.trim() || null });
      setPage(1);
      setBusy("Statements generated.");
      await load();
    } catch (error) {
      setBusy(error instanceof Error ? error.message : "Failed to generate statements.");
    }
  }

  return (
    <PortalShell role="admin" title="Statements" subtitle="Vendor monthly statements — net payable, gross bookings, adjustments">
      <div className="space-y-5">
        <section className="rounded-2xl border border-line/70 bg-surface p-5 shadow-sm">
          <div className="text-sm font-semibold text-primary">Generate statements</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-secondary">Year</div>
              <input type="number" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))} className="h-10 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary" />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-secondary">Month</div>
              <input type="number" min={1} max={12} value={genMonth} onChange={(e) => setGenMonth(Number(e.target.value))} className="h-10 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary" />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-secondary">Vendor ID (optional)</div>
              <input value={genVendorId} onChange={(e) => setGenVendorId(e.target.value)} className="h-10 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary" placeholder="All vendors" />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-semibold text-secondary">Currency</div>
              <input value={genCurrency} onChange={(e) => setGenCurrency(e.target.value)} className="h-10 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary" placeholder="AED" />
            </label>
            <div className="flex items-end">
              <button type="button" disabled={busy !== null} onClick={() => void generate()} className="h-10 w-full rounded-xl bg-brand px-4 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60">
                Generate
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
              placeholder="Search by statement id, vendor id, status, period..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="portal-select">
            <option value="ALL">All statuses</option>
            {statusOptions.map((option) => <option key={option} value={option}>{prettyStatus(option)}</option>)}
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto hidden text-[11px] text-muted sm:block">{filteredRows.length} of {state.total} statements</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <SkeletonTable rows={8} />
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5 text-sm text-danger">{state.message}</div>
        ) : (
          <>
            <DataTable<VendorStatementListItem>
              title="Statements"
              subtitle={<>Showing <span className="font-semibold text-primary">{filteredRows.length}</span> of <span className="font-semibold text-primary">{state.total}</span></>}
              rows={filteredRows}
              columns={columns}
              onRowClick={(row) => router.push(`/admin/statements/${encodeURIComponent(row.id)}`)}
              rowActions={(row) => (
                <Link href={`/admin/statements/${encodeURIComponent(row.id)}`} className="inline-flex h-8 items-center rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt transition">
                  Open
                </Link>
              )}
            />
            <div className="flex items-center justify-between rounded-xl border border-line/40 bg-surface/80 px-4 py-3">
              <div className="text-xs text-muted">Page {state.page} · {state.total} records</div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={!canPrev} className="h-8 rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-40 transition">Previous</button>
                <button type="button" onClick={() => setPage((v) => v + 1)} disabled={!canNext} className="h-8 rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-40 transition">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
