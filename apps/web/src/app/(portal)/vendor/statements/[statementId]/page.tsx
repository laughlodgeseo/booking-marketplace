"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { DateText } from "@/components/portal/ui/DateText";
import { MoneyText } from "@/components/portal/ui/MoneyText";
import { DataTable, type Column } from "@/components/portal/ui/DataTable";
import { SkeletonTable } from "@/components/portal/ui/Skeleton";

import {
  vendorGetStatementDetail,
  type VendorStatementDetail,
  type LedgerEntryRow,
} from "@/lib/api/portal/finance";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: VendorStatementDetail };

function monthLabel(periodStartISO: string): string {
  const d = new Date(periodStartISO);
  if (Number.isNaN(d.getTime())) return periodStartISO;
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function decodeRouteParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function VendorStatementDetailPage() {
  const params = useParams<{ statementId: string }>();
  const statementId = useMemo(
    () => decodeRouteParam(params?.statementId),
    [params?.statementId]
  );

  const [state, setState] = useState<ViewState>({ kind: "loading" });

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
      if (!statementId) {
        setState({ kind: "error", message: "Missing statement id." });
        return;
      }
      setState({ kind: "loading" });
      try {
        const data = await vendorGetStatementDetail(statementId);
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (e) {
        if (!alive) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Failed to load statement",
        });
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [statementId]);

  const columns = useMemo<Array<Column<LedgerEntryRow>>>(() => {
    return [
      {
        key: "occurredAt",
        header: "Date",
        className: "col-span-3",
        render: (row) => <DateText value={row.occurredAt ?? row.createdAt} />,
      },
      {
        key: "type",
        header: "Type",
        className: "col-span-3",
        render: (row) => (
          <div>
            <div className="font-semibold text-primary">{row.type}</div>
            <div className="mt-1 text-xs text-secondary">
              {row.direction} {row.bookingId ? `· booking ${row.bookingId}` : ""}
            </div>
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        className: "col-span-3",
        render: (row) => (
          <div className="text-primary">
            <MoneyText amount={row.amount} currency={row.currency} />
          </div>
        ),
      },
      {
        key: "ref",
        header: "Refs",
        className: "col-span-3",
        render: (row) => (
          <div className="text-xs text-secondary space-y-1">
            {row.propertyId ? (
              <div className="font-mono">property: {row.propertyId}</div>
            ) : null}
            {row.paymentId ? (
              <div className="font-mono">payment: {row.paymentId}</div>
            ) : null}
            {row.refundId ? (
              <div className="font-mono">refund: {row.refundId}</div>
            ) : null}
          </div>
        ),
      },
    ];
  }, []);

  const content = useMemo(() => {
    if (state.kind === "loading") {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-6 text-sm text-secondary">
            Loading statement…
          </div>
          <SkeletonTable rows={8} />
        </div>
      );
    }

    if (state.kind === "error") {
      return (
        <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-6">
          <div className="text-sm font-semibold text-primary">
            Could not load statement
          </div>
          <div className="mt-2 text-sm text-secondary whitespace-pre-wrap">
            {state.message}
          </div>
          <div className="mt-4">
            <Link
              href="/vendor/statements"
              className="rounded-xl border border-line/70 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt"
            >
              Back to statements
            </Link>
          </div>
        </div>
      );
    }

    const s = state.data;
    const period = monthLabel(s.periodStart);

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-primary">
                Statement · {period}
              </div>
              <div className="mt-1 text-xs text-secondary font-mono">
                {s.id}
              </div>
              <div className="mt-3">
                <StatusPill status={s.status} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/vendor/statements"
                className="rounded-xl border border-line/70 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt"
              >
                Back
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-4">
              <div className="text-xs font-semibold text-secondary">Gross</div>
              <div className="mt-1 text-sm font-semibold text-primary">
                <MoneyText amount={s.grossBookings} currency={s.currency} />
              </div>
            </div>

            <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-4">
              <div className="text-xs font-semibold text-secondary">Mgmt fees</div>
              <div className="mt-1 text-sm font-semibold text-primary">
                <MoneyText amount={s.managementFees} currency={s.currency} />
              </div>
            </div>

            <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-4">
              <div className="text-xs font-semibold text-secondary">Refunds</div>
              <div className="mt-1 text-sm font-semibold text-primary">
                <MoneyText amount={s.refunds} currency={s.currency} />
              </div>
            </div>

            <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-4">
              <div className="text-xs font-semibold text-secondary">Adjustments</div>
              <div className="mt-1 text-sm font-semibold text-primary">
                <MoneyText amount={s.adjustments} currency={s.currency} />
              </div>
            </div>

            <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-4">
              <div className="text-xs font-semibold text-secondary">Net payable</div>
              <div className="mt-1 text-sm font-semibold text-primary">
                <MoneyText amount={s.netPayable} currency={s.currency} />
              </div>
            </div>
          </div>

          {s.payout ? (
            <div className="mt-5 rounded-2xl border border-line/70 bg-warm-alt p-4">
              <div className="text-xs font-semibold text-secondary">Payout</div>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-primary">
                  <span className="font-semibold">Status:</span>{" "}
                  <span className="font-mono">{s.payout.status}</span>
                </div>
                <div className="text-sm text-primary">
                  <span className="font-semibold">Amount:</span>{" "}
                  <MoneyText amount={s.payout.amount} currency={s.payout.currency} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DataTable
          title="Ledger entries"
          subtitle="This is the exact ledger snapshot linked to this statement."
          rows={Array.isArray(s.ledgerEntries) ? s.ledgerEntries : []}
          columns={columns}
          empty="No ledger entries were attached to this statement."
        />
      </div>
    );
  }, [state, columns]);

  return (
    <PortalShell role="vendor" title="Statement detail" nav={nav}>
      {content}
    </PortalShell>
  );
}
