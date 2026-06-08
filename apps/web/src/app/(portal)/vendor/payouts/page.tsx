"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, FileCheck2, Loader2, Wallet, X } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { SimpleBarChart, type BarPoint } from "@/components/portal/SimpleBarChart";
import { StatCard } from "@/components/portal/StatCard";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  portalActionDanger,
  portalActionPrimary,
  portalActionSecondary,
  portalRowPrimary,
  portalRowSecondary,
  portalRowSuccess,
} from "@/components/portal/ui/portal-actions";
import {
  vendorConfirmPayoutReceived,
  vendorFetchPayoutProofBlob,
  vendorGetPayout,
  vendorListPayouts,
  vendorReportPayoutIssue,
  type VendorPayoutRow,
} from "@/lib/api/portal/finance";

function pretty(value: string): string {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function moneyMinor(value: number | null | undefined, currency = "AED"): string {
  const amount = (value ?? 0) / 100;
  try {
    return new Intl.NumberFormat("en-AE", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function dateLabel(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function trendPoints(rows: VendorPayoutRow[]): BarPoint[] {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.createdAt);
    if (Number.isNaN(d.getTime()) || d.getTime() < cutoff) continue;
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets.set(label, (buckets.get(label) ?? 0) + row.vendorNetAmountMinor / 100);
  }
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm border-b border-line/40 last:border-0">
      <span className="text-muted shrink-0 w-36">{label}</span>
      <span className="text-primary text-right font-medium">{value}</span>
    </div>
  );
}

function ConfirmModal({
  payoutId,
  onConfirm,
  onClose,
}: {
  payoutId: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await vendorConfirmPayoutReceived(payoutId);
      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm payout.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
        <div className="mb-4 text-base font-semibold text-primary">Confirm payout received</div>
        <p className="text-sm text-secondary">
          I confirm I have received this payout in my bank or payment account.
        </p>
        {error ? <div className="mt-3 text-sm text-danger">{error}</div> : null}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-secondary disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={() => void confirm()} disabled={busy} className={`${portalActionPrimary} disabled:opacity-50`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm received"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayoutDetailDrawer({
  payoutId,
  onClose,
  onAction,
}: {
  payoutId: string;
  onClose: () => void;
  onAction: () => void;
}) {
  const [payout, setPayout] = useState<VendorPayoutRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [proofBusy, setProofBusy] = useState<"view" | "download" | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await vendorGetPayout(payoutId);
      setPayout(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [payoutId]);

  async function reportIssue() {
    const note = window.prompt("Describe the payout issue");
    if (!note?.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await vendorReportPayoutIssue(payoutId, note);
      setMessage("Issue reported. Our team will review and contact you.");
      onAction();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not report issue.");
    } finally {
      setBusy(false);
    }
  }

  async function viewProof() {
    if (!payout) return;
    setProofBusy("view");
    setProofError(null);
    // Open the blank popup synchronously before the async fetch to avoid popup blockers
    const popup = window.open("", "_blank", "noopener,noreferrer");
    try {
      const { blob } = await vendorFetchPayoutProofBlob(payout.id, "view");
      const objectUrl = URL.createObjectURL(blob);
      if (popup) {
        popup.location.href = objectUrl;
      } else {
        window.location.href = objectUrl;
      }
    } catch (err) {
      popup?.close();
      setProofError(err instanceof Error ? err.message : "Could not open payout proof. Please try again.");
    } finally {
      setProofBusy(null);
    }
  }

  async function downloadProof() {
    if (!payout) return;
    setProofBusy("download");
    setProofError(null);
    try {
      const { blob, filename } = await vendorFetchPayoutProofBlob(payout.id, "download");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename ?? `payout-proof-${payout.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : "Could not download payout proof. Please try again.");
    } finally {
      setProofBusy(null);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
            <div className="text-base font-semibold text-primary">Payout Details</div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-neutral-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center p-10 text-sm text-secondary">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !payout ? (
            <div className="p-8 text-sm text-danger">Payout not found.</div>
          ) : (
            <div className="flex-1 space-y-5 p-5">
              {message ? (
                <div className="rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{message}</div>
              ) : null}

              <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
                <div className="mb-3 text-xs font-semibold uppercase text-muted">Payout summary</div>
                <DetailRow label="Status" value={<StatusPill status={payout.status}>{pretty(payout.status)}</StatusPill>} />
                <DetailRow label="Property" value={payout.propertyTitle ?? "—"} />
                <DetailRow label="Booking" value={<span className="font-mono text-xs">{payout.bookingId ?? "—"}</span>} />
                <DetailRow label="Check-in" value={dateLabel(payout.checkIn)} />
                <DetailRow label="Check-out" value={dateLabel(payout.checkOut)} />
                <DetailRow label="Due date" value={dateLabel(payout.dueAt)} />
                <DetailRow label="Paid at" value={dateLabel(payout.paidAt)} />
                <DetailRow label="Confirmed at" value={dateLabel(payout.confirmedAt)} />
              </div>

              <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
                <div className="mb-3 text-xs font-semibold uppercase text-muted">Amounts</div>
                <DetailRow label="Gross booking" value={moneyMinor(payout.grossBookingAmountMinor, payout.currency)} />
                <DetailRow
                  label={`Commission (${(payout.platformCommissionRateBps / 100).toFixed(0)}%)`}
                  value={<span className="text-muted">{moneyMinor(payout.platformCommissionMinor, payout.currency)}</span>}
                />
                <DetailRow
                  label="Your payout"
                  value={<span className="text-lg font-bold text-primary">{moneyMinor(payout.vendorNetAmountMinor, payout.currency)}</span>}
                />
              </div>

              {payout.proofAvailable ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase text-emerald-700">Payment proof available</div>
                  {payout.proofUploadedAt ? (
                    <div className="mb-3 text-xs text-emerald-600">Uploaded on {dateLabel(payout.proofUploadedAt)}</div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {payout.proofViewUrl ? (
                      <button
                        type="button"
                        onClick={() => void viewProof()}
                        disabled={proofBusy !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {proofBusy === "view" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        {proofBusy === "view" ? "Opening…" : "View proof"}
                      </button>
                    ) : null}
                    {payout.proofDownloadUrl ? (
                      <button
                        type="button"
                        onClick={() => void downloadProof()}
                        disabled={proofBusy !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                      >
                        {proofBusy === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        {proofBusy === "download" ? "Downloading…" : "Download proof"}
                      </button>
                    ) : null}
                  </div>
                  {proofError ? (
                    <div className="mt-2 text-xs text-danger">{proofError}</div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  No payment proof uploaded yet. Proof will appear here once the admin sends your payout.
                </div>
              )}

              {payout.vendorConfirmationNote ? (
                <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
                  <div className="mb-1 text-xs font-semibold uppercase text-muted">Your note</div>
                  <p className="text-sm text-secondary">{payout.vendorConfirmationNote}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
                <div className="mb-3 text-xs font-semibold uppercase text-muted">Actions</div>
                <div className="flex flex-wrap gap-2">
                  {payout.status === "PAID_AWAITING_VENDOR_CONFIRMATION" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        disabled={busy}
                        className={`${portalActionPrimary} disabled:opacity-50`}
                      >
                        Confirm received
                      </button>
                      <button
                        type="button"
                        onClick={() => void reportIssue()}
                        disabled={busy}
                        className={`${portalActionDanger} px-4 py-2 text-sm disabled:opacity-50`}
                      >
                        Report issue
                      </button>
                    </>
                  ) : null}
                  {payout.status === "PENDING_DETAILS" ? (
                    <Link href="/vendor/payout-settings" className={portalActionSecondary}>
                      Add payout details
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirm && payout ? (
        <ConfirmModal
          payoutId={payout.id}
          onConfirm={() => {
            setShowConfirm(false);
            setMessage("Payout confirmed as received.");
            onAction();
            void load();
          }}
          onClose={() => setShowConfirm(false)}
        />
      ) : null}
    </>
  );
}

export default function VendorPayoutsPage() {
  const [rows, setRows] = useState<VendorPayoutRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [detailPayoutId, setDetailPayoutId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await vendorListPayouts();
      setRows(Array.isArray(res.items) ? res.items : []);
      setSummary(res.summary ?? {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const chart = useMemo(() => trendPoints(rows), [rows]);
  const hasMissingDetails = rows.some((r) => r.status === "PENDING_DETAILS");

  return (
    <PortalShell role="vendor" title="Payouts" subtitle="Booking earnings and payout confirmation">
      <div className="space-y-5">
        {hasMissingDetails ? (
          <Link href="/vendor/payout-settings" className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Add verified payout details to release pending payouts.</span>
            <span className="font-semibold">Open settings</span>
          </Link>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total pending payout" value={moneyMinor(summary.pendingAmountMinor ?? 0)} helper="Missing details" icon={<Wallet className="h-4 w-4" />} />
          <StatCard label="Ready for payout" value={moneyMinor(summary.readyAmountMinor ?? 0)} helper="Verified method" icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label="Paid awaiting confirmation" value={moneyMinor(summary.paidAwaitingConfirmationMinor ?? 0)} helper="Review proof" icon={<FileCheck2 className="h-4 w-4" />} />
          <StatCard label="Confirmed received" value={moneyMinor(summary.confirmedReceivedMinor ?? 0)} helper="Lifetime confirmed" icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label="Paid this month" value={moneyMinor(summary.thisMonthPaidMinor ?? 0)} helper="Net payouts" icon={<Wallet className="h-4 w-4" />} />
        </div>

        <SimpleBarChart title="90-day payout trend" subtitle="Net vendor payout amount" points={chart} />

        {message ? <div className="rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{message}</div> : null}

        {loading ? (
          <div className="rounded-2xl border border-line/70 bg-surface p-6 text-sm text-secondary">Loading payouts...</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line/70 bg-surface p-8 text-center text-sm text-secondary">No payouts yet.</div>
        ) : (
          <div className="grid gap-3">
            {rows.map((row) => (
              <article
                key={row.id}
                className="cursor-pointer rounded-2xl border border-line/70 bg-surface p-4 hover:border-brand/30 hover:bg-neutral-50/50 transition"
                onClick={() => setDetailPayoutId(row.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary">{row.propertyTitle ?? "Property payout"}</div>
                    <div className="mt-1 text-xs text-secondary">Booking {row.bookingId ?? "—"} · {dateLabel(row.checkIn)} to {dateLabel(row.checkOut)}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-neutral-100 px-2 py-1 font-semibold text-primary">
                        {moneyMinor(row.vendorNetAmountMinor, row.currency)}
                      </span>
                      <span className="rounded-lg bg-neutral-100 px-2 py-1 text-secondary">Due: {dateLabel(row.dueAt)}</span>
                      <span className="rounded-lg bg-neutral-100 px-2 py-1 text-secondary">
                        {row.payoutMethod?.bankName ?? row.payoutMethod?.manualMethodLabel ?? "No payout method"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <StatusPill status={row.status}>{pretty(row.status)}</StatusPill>
                    {row.status === "PENDING_DETAILS" ? (
                      <Link href="/vendor/payout-settings" className={portalRowSecondary}>Add payout details</Link>
                    ) : null}
                    {row.proofAvailable ? (
                      <button type="button" onClick={() => setDetailPayoutId(row.id)} className={portalRowSuccess}>
                        View proof
                      </button>
                    ) : null}
                    {row.status === "PAID_AWAITING_VENDOR_CONFIRMATION" ? (
                      <button type="button" onClick={() => setDetailPayoutId(row.id)} className={portalRowPrimary}>
                        Confirm received
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {detailPayoutId ? (
        <PayoutDetailDrawer
          payoutId={detailPayoutId}
          onClose={() => setDetailPayoutId(null)}
          onAction={() => {
            setMessage(null);
            void load();
          }}
        />
      ) : null}
    </PortalShell>
  );
}
