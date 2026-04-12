"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PortalShell } from "@/components/portal/PortalShell";
import { Toolbar } from "@/components/portal/ui/Toolbar";
import { DataTable, type Column } from "@/components/portal/ui/DataTable";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { DateText } from "@/components/portal/ui/DateText";
import { MoneyText } from "@/components/portal/ui/MoneyText";
import { SkeletonTable } from "@/components/portal/ui/Skeleton";

import { vendorListStatements, type VendorStatementListItem } from "@/lib/api/portal/finance";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      items: VendorStatementListItem[];
      page: number;
      pageSize: number;
      total: number;
    };

function safeInt(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function monthLabel(periodStartISO: string): string {
  const d = new Date(periodStartISO);
  if (Number.isNaN(d.getTime())) return periodStartISO;
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export default function VendorStatementsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const nav = useMemo(
    () => [
      { href: "/vendor", label: "Overview" },
      { href: "/vendor/analytics", label: "Analytics" },
      { href: "/vendor/properties", label: "Properties" },
      { href: "/vendor/bookings", label: "Bookings" },
      { href: "/vendor/calendar", label: "Calendar" },
      { href: "/vendor/ops-tasks", label: "Ops Tasks" },
      { href: "/vendor/statements", label: "Statements" },
    ],
    []
  );

  useEffect(() => {
    let alive = true;

    async function run() {
      setState({ kind: "loading" });
      try {
        const res = await vendorListStatements({ page, pageSize });
        const items = Array.isArray(res.items) ? res.items : [];
        const resolvedPage = safeInt(res.page, page);
        const resolvedPageSize = safeInt(res.pageSize, pageSize);
        const resolvedTotal = safeInt(res.total, items.length);

        if (!alive) return;
        setState({
          kind: "ready",
          items,
          page: resolvedPage,
          pageSize: resolvedPageSize,
          total: resolvedTotal,
        });
      } catch (e) {
        if (!alive) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Failed to load statements",
        });
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [page]);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const qq = q.trim().toLowerCase();
    if (!qq) return state.items;

    return state.items.filter((s) => {
      const blob = [
        s.id,
        s.vendorId,
        s.status,
        s.currency,
        s.periodStart,
        s.periodEnd,
      ]
        .join(" | ")
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [state, q]);

  const canPrev = state.kind === "ready" ? state.page > 1 : false;
  const canNext =
    state.kind === "ready" ? state.page * state.pageSize < state.total : false;

  const columns = useMemo<Array<Column<VendorStatementListItem>>>(() => {
    return [
      {
        key: "period",
        header: "Period",
        className: "col-span-4",
        render: (row) => (
          <div>
            <div className="font-semibold text-primary">
              {monthLabel(row.periodStart)}
            </div>
            <div className="mt-1 text-xs text-secondary">
              <span className="font-mono">{row.id}</span>
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "col-span-2",
        render: (row) => <StatusPill status={row.status} />,
      },
      {
        key: "net",
        header: "Net Payable",
        className: "col-span-3",
        render: (row) => (
          <div className="text-primary">
            <MoneyText amount={row.netPayable} currency={row.currency} />
            <div className="mt-1 text-xs text-secondary">
              Gross: <MoneyText amount={row.grossBookings} currency={row.currency} />
            </div>
          </div>
        ),
      },
      {
        key: "generatedAt",
        header: "Generated",
        className: "col-span-3",
        render: (row) => <DateText value={row.generatedAt} />,
      },
    ];
  }, []);

  return (
    <PortalShell role="vendor" title="Statements" nav={nav}>
      {state.kind === "loading" ? (
        <div className="space-y-4">
          <Toolbar
            title="Monthly statements"
            subtitle="Your payout-ready monthly summaries (gross, fees, refunds, adjustments)."
            onSearch={setQ}
            searchPlaceholder="Search by id, status, month…"
          />
          <SkeletonTable rows={8} />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-6">
          <div className="text-sm font-semibold text-primary">
            Could not load statements
          </div>
          <div className="mt-2 text-sm text-secondary whitespace-pre-wrap">
            {state.message}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Toolbar
            title="Monthly statements"
            subtitle="Open a statement to view its ledger breakdown."
            onSearch={setQ}
            searchPlaceholder="Search by id, status, month…"
          />

          <DataTable
            title="Statements"
            subtitle="Click View to open statement detail."
            rows={filtered}
            columns={columns}
            empty="No statements yet."
            rowActions={(row) => (
              <Link
                href={`/vendor/statements/${encodeURIComponent(row.id)}`}
                className="rounded-lg border border-line/70 bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-warm-alt"
              >
                View
              </Link>
            )}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-line/70 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
            >
              Prev
            </button>
            <div className="text-sm text-secondary">
              Page {state.page} {state.total ? `· ${state.total} total` : ""}
            </div>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-line/70 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
