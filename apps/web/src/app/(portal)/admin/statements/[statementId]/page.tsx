"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PortalShell } from "@/components/portal/PortalShell";
import { DataTable, type Column } from "@/components/portal/ui/DataTable";
import { DateText } from "@/components/portal/ui/DateText";
import { MoneyText } from "@/components/portal/ui/MoneyText";
import { SkeletonBlock, SkeletonTable } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { portalRowSuccess, portalRowDanger } from "@/components/portal/ui/portal-actions";
import {
  adminCreatePayoutFromStatement,
  adminFinalizeStatement,
  adminGetStatementDetail,
  adminVoidStatement,
  type LedgerEntryRow,
  type VendorStatementDetail,
} from "@/lib/api/portal/finance";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: VendorStatementDetail };

function monthLabel(periodStartISO: string): string {
  const date = new Date(periodStartISO);
  if (Number.isNaN(date.getTime())) return periodStartISO;
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function canFinalize(status: string): boolean {
  return status === "DRAFT";
}

function canVoid(status: string): boolean {
  return status !== "PAID" && status !== "VOID";
}

function canCreatePayout(status: string, hasPayout: boolean): boolean {
  return status === "FINALIZED" && !hasPayout;
}

export default function AdminStatementDetailPage() {
  const params = useParams<{ statementId: string }>();
  const statementId = decodeURIComponent(params?.statementId ?? "");

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!statementId) {
      setState({ kind: "error", message: "Missing statement id." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await adminGetStatementDetail(statementId);
      setState({ kind: "ready", data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load statement.",
      });
    }
  }, [statementId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ledgerColumns = useMemo<Array<Column<LedgerEntryRow>>>(() => {
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
        className: "col-span-2",
        render: (row) => <MoneyText amount={row.amount} currency={row.currency} />,
      },
      {
        key: "refs",
        header: "Refs",
        className: "col-span-4",
        render: (row) => (
          <div className="space-y-1 text-xs text-secondary">
            {row.propertyId ? <div className="font-mono">property: {row.propertyId}</div> : null}
            {row.paymentId ? <div className="font-mono">payment: {row.paymentId}</div> : null}
            {row.refundId ? <div className="font-mono">refund: {row.refundId}</div> : null}
          </div>
        ),
      },
    ];
  }, []);

  async function finalizeStatement() {
    if (state.kind !== "ready") return;
    const note = window.prompt("Finalize note (optional):", "") ?? "";
    setBusy("Finalizing statement...");
    setMessage(null);
    try {
      await adminFinalizeStatement(state.data.id, note.trim() || null);
      await load();
      setMessage("Statement finalized.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to finalize statement.");
    } finally {
      setBusy(null);
    }
  }

  async function voidCurrentStatement() {
    if (state.kind !== "ready") return;
    const note = window.prompt("Void reason (optional):", "") ?? "";
    setBusy("Voiding statement...");
    setMessage(null);
    try {
      await adminVoidStatement(state.data.id, note.trim() || null);
      await load();
      setMessage("Statement voided.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to void statement.");
    } finally {
      setBusy(null);
    }
  }

  async function createPayout() {
    if (state.kind !== "ready") return;
    const providerRef = window.prompt("Provider reference (optional):", "") ?? "";
    setBusy("Creating payout...");
    setMessage(null);
    try {
      const payout = await adminCreatePayoutFromStatement(state.data.id, {
        provider: "MANUAL",
        providerRef: providerRef.trim() || null,
      });
      await load();
      setMessage(`Payout created (${payout.id}).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create payout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell role="admin" title="Statement Detail" subtitle="Portal Home / Statements / Detail">
      <div className="space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          <Link href="/admin" className="hover:text-primary">
            Portal Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/admin/statements" className="hover:text-primary">
            Statements
          </Link>
          <span className="mx-2">/</span>
          <span className="text-primary">Detail</span>
        </div>

        {busy ? (
          <div className="rounded-2xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{busy}</div>
        ) : null}
        {message ? (
          <div className="rounded-2xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{message}</div>
        ) : null}

        {state.kind === "loading" ? (
          <div className="space-y-4">
            <SkeletonBlock className="h-32" />
            <SkeletonTable rows={8} />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
            {state.message}
          </div>
        ) : (
          <>
            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">
                    {monthLabel(state.data.periodStart)}
                  </h2>
                  <div className="mt-1 font-mono text-xs text-secondary">{state.data.id}</div>
                  <div className="mt-2">
                    <StatusPill status={state.data.status}>{state.data.status}</StatusPill>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/admin/statements"
                    className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                  >
                    Back
                  </Link>
                  {canFinalize(state.data.status) ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void finalizeStatement()}
                      className={`${portalRowSuccess} disabled:opacity-60`}
                    >
                      Finalize
                    </button>
                  ) : null}
                  {canVoid(state.data.status) ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void voidCurrentStatement()}
                      className={`${portalRowDanger} disabled:opacity-60`}
                    >
                      Void
                    </button>
                  ) : null}
                  {canCreatePayout(state.data.status, Boolean(state.data.payout)) ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void createPayout()}
                      className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
                    >
                      Create payout
                    </button>
                  ) : null}
                  {state.data.payout ? (
                    <Link
                      href={`/admin/payouts/${encodeURIComponent(state.data.payout.id)}`}
                      className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                    >
                      Open payout
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Info label="Vendor" value={state.data.vendorId} />
                <Info
                  label="Gross bookings"
                  value={`${state.data.grossBookings} ${state.data.currency}`}
                />
                <Info
                  label="Management fees"
                  value={`${state.data.managementFees} ${state.data.currency}`}
                />
                <Info label="Refunds" value={`${state.data.refunds} ${state.data.currency}`} />
                <Info
                  label="Net payable"
                  value={`${state.data.netPayable} ${state.data.currency}`}
                />
              </div>
            </section>

            <DataTable<LedgerEntryRow>
              title="Ledger entries"
              subtitle="Exact ledger snapshot linked to this statement."
              rows={Array.isArray(state.data.ledgerEntries) ? state.data.ledgerEntries : []}
              columns={ledgerColumns}
              empty="No ledger entries were attached to this statement."
            />
          </>
        )}
      </div>
    </PortalShell>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
      <div className="text-xs font-semibold text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-primary break-words">{props.value}</div>
    </div>
  );
}
