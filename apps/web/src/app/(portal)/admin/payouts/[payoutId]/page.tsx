"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { portalRowSuccess, portalRowDanger } from "@/components/portal/ui/portal-actions";
import {
  adminCancelPayout,
  adminGetPayoutDetail,
  adminMarkPayoutFailed,
  adminMarkPayoutProcessing,
  adminMarkPayoutSucceeded,
  type PayoutRow,
  type VendorStatementListItem,
} from "@/lib/api/portal/finance";

type PayoutDetail = PayoutRow & { statement?: VendorStatementListItem | null };

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: PayoutDetail };

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function canMarkProcessing(status: string): boolean {
  return status === "PENDING";
}

function canMarkSucceeded(status: string): boolean {
  return status === "PROCESSING";
}

function canMarkFailed(status: string): boolean {
  return status === "PROCESSING";
}

function canCancel(status: string): boolean {
  return status === "PENDING" || status === "PROCESSING";
}

export default function AdminPayoutDetailPage() {
  const params = useParams<{ payoutId: string }>();
  const payoutId = decodeURIComponent(params?.payoutId ?? "");

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!payoutId) {
      setState({ kind: "error", message: "Missing payout id." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const data = await adminGetPayoutDetail(payoutId);
      setState({ kind: "ready", data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load payout.",
      });
    }
  }, [payoutId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markProcessing() {
    if (state.kind !== "ready") return;
    const providerRef = window.prompt("Provider reference (optional):", state.data.providerRef ?? "") ?? "";
    setBusy("Updating payout...");
    setMessage(null);
    try {
      await adminMarkPayoutProcessing(state.data.id, {
        providerRef: providerRef.trim() || null,
      });
      await load();
      setMessage("Payout marked as PROCESSING.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update payout.");
    } finally {
      setBusy(null);
    }
  }

  async function markSucceeded() {
    if (state.kind !== "ready") return;
    const providerRef = window.prompt("Provider reference (optional):", state.data.providerRef ?? "") ?? "";
    const idempotencyKey = window.prompt("Idempotency key (optional):", "") ?? "";
    setBusy("Marking payout as SUCCEEDED...");
    setMessage(null);
    try {
      await adminMarkPayoutSucceeded(state.data.id, {
        providerRef: providerRef.trim() || null,
        idempotencyKey: idempotencyKey.trim() || undefined,
      });
      await load();
      setMessage("Payout marked as SUCCEEDED.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update payout.");
    } finally {
      setBusy(null);
    }
  }

  async function markFailed() {
    if (state.kind !== "ready") return;
    const failureReason = window.prompt("Failure reason:", state.data.failureReason ?? "") ?? "";
    if (!failureReason.trim()) {
      setMessage("Failure reason is required.");
      return;
    }
    const providerRef = window.prompt("Provider reference (optional):", state.data.providerRef ?? "") ?? "";
    setBusy("Marking payout as FAILED...");
    setMessage(null);
    try {
      await adminMarkPayoutFailed(state.data.id, {
        failureReason: failureReason.trim(),
        providerRef: providerRef.trim() || null,
      });
      await load();
      setMessage("Payout marked as FAILED.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update payout.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (state.kind !== "ready") return;
    const reason = window.prompt("Cancel reason (optional):", "") ?? "";
    setBusy("Cancelling payout...");
    setMessage(null);
    try {
      await adminCancelPayout(state.data.id, reason.trim() || null);
      await load();
      setMessage("Payout cancelled.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to cancel payout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell role="admin" title="Payout Detail" subtitle="Portal Home / Payouts / Detail">
      <div className="space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          <Link href="/admin" className="hover:text-primary">
            Portal Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/admin/payouts" className="hover:text-primary">
            Payouts
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
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
            {state.message}
          </div>
        ) : (
          <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">{state.data.id}</h2>
                <div className="mt-1 text-xs text-secondary">Statement: {state.data.statementId}</div>
                <div className="mt-2">
                  <StatusPill status={state.data.status}>{state.data.status}</StatusPill>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/payouts"
                  className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                >
                  Back
                </Link>
                {state.data.statementId ? (
                  <Link
                    href={`/admin/statements/${encodeURIComponent(state.data.statementId)}`}
                    className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                  >
                    Open statement
                  </Link>
                ) : null}
                {canMarkProcessing(state.data.status) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void markProcessing()}
                    className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
                  >
                    Mark processing
                  </button>
                ) : null}
                {canMarkSucceeded(state.data.status) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void markSucceeded()}
                    className={`${portalRowSuccess} disabled:opacity-60`}
                  >
                    Mark succeeded
                  </button>
                ) : null}
                {canMarkFailed(state.data.status) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void markFailed()}
                    className={`${portalRowDanger} disabled:opacity-60`}
                  >
                    Mark failed
                  </button>
                ) : null}
                {canCancel(state.data.status) ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void cancel()}
                    className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                  >
                    Cancel payout
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Vendor" value={state.data.vendorId} />
              <Info label="Amount" value={`${state.data.amount} ${state.data.currency}`} />
              <Info label="Provider" value={state.data.provider} />
              <Info label="Provider ref" value={state.data.providerRef || "-"} />
              <Info label="Created" value={fmtDate(state.data.createdAt)} />
              <Info label="Updated" value={fmtDate(state.data.updatedAt)} />
              <Info label="Processed" value={fmtDate(state.data.processedAt)} />
              <Info label="Failed" value={fmtDate(state.data.failedAt)} />
            </div>

            {state.data.failureReason ? (
              <div className="mt-4 rounded-2xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
                Failure reason: {state.data.failureReason}
              </div>
            ) : null}
          </section>
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
