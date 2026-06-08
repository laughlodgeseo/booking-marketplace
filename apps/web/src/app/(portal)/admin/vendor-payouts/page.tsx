"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, FileUp, Loader2, Search, Wallet, X } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { SimpleBarChart, type BarPoint } from "@/components/portal/SimpleBarChart";
import { StatCard } from "@/components/portal/StatCard";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  portalRowSecondary,
  portalRowSuccess,
  portalRowWarning,
  portalRowDanger,
} from "@/components/portal/ui/portal-actions";
import {
  adminCancelVendorPayout,
  adminFetchVendorPayoutProofBlob,
  adminGetVendorPayout,
  adminListVendorPayouts,
  adminMarkVendorPayoutPaid,
  adminMarkVendorPayoutProcessing,
  adminReconcileVendorPayoutAmounts,
  adminUploadVendorPayoutProof,
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
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function monthlyPoints(rows: VendorPayoutRow[]): BarPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    map.set(label, (map.get(label) ?? 0) + row.vendorNetAmountMinor / 100);
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm border-b border-line/40 last:border-0">
      <span className="text-muted shrink-0 w-36">{label}</span>
      <span className="text-primary text-right font-medium">{value}</span>
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
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [proofBusy, setProofBusy] = useState<"view" | "download" | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await adminGetVendorPayout(payoutId);
      setPayout(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [payoutId]);

  async function markProcessing() {
    if (!payout) return;
    setBusy("processing");
    setMessage(null);
    try {
      await adminMarkVendorPayoutProcessing(payout.id);
      setMessage("Marked as processing.");
      onAction();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not mark processing.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadProof(file: File | null) {
    if (!file || !payout) return;
    setBusy("proof");
    setMessage(null);
    try {
      await adminUploadVendorPayoutProof(payout.id, file);
      setMessage("Proof uploaded. Payout is now awaiting vendor confirmation.");
      onAction();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload proof.");
    } finally {
      setBusy(null);
    }
  }

  async function markPaid() {
    if (!payout) return;
    setBusy("paid");
    setMessage(null);
    try {
      await adminMarkVendorPayoutPaid(payout.id);
      setMessage("Payout marked as paid.");
      onAction();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not mark paid.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!payout) return;
    const note = window.prompt("Cancellation note");
    if (!note?.trim()) return;
    setBusy("cancel");
    setMessage(null);
    try {
      await adminCancelVendorPayout(payout.id, note);
      setMessage("Payout cancelled.");
      onAction();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel payout.");
    } finally {
      setBusy(null);
    }
  }

  async function viewProof() {
    if (!payout) return;
    setProofBusy("view");
    setProofError(null);
    const popup = window.open("", "_blank", "noopener,noreferrer");
    try {
      const { blob } = await adminFetchVendorPayoutProofBlob(payout.id, "view");
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
      const { blob, filename } = await adminFetchVendorPayoutProofBlob(payout.id, "download");
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

  const method = payout?.payoutMethod;
  const canUploadProof =
    payout &&
    (payout.status === "PROCESSING" || payout.status === "READY_FOR_PAYOUT");
  const canMarkProcessing = payout?.status === "READY_FOR_PAYOUT";
  const canMarkPaid =
    payout?.proofAvailable &&
    payout.status !== "CONFIRMED_RECEIVED" &&
    payout.status !== "CANCELLED";
  const canCancel =
    payout &&
    ["PENDING_DETAILS", "READY_FOR_PAYOUT", "PROCESSING", "DISPUTED"].includes(payout.status);

  return (
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
              <DetailRow label="Booking ID" value={<span className="font-mono text-xs">{payout.bookingId ?? "—"}</span>} />
              <DetailRow label="Check-in" value={dateLabel(payout.checkIn)} />
              <DetailRow label="Check-out" value={dateLabel(payout.checkOut)} />
              <DetailRow label="Due date" value={dateLabel(payout.dueAt)} />
              <DetailRow label="Paid at" value={dateLabel(payout.paidAt)} />
              <DetailRow label="Confirmed at" value={dateLabel(payout.confirmedAt)} />
            </div>

            <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase text-muted">Amounts</div>
              <DetailRow label="Gross booking" value={<span className="font-semibold">{moneyMinor(payout.grossBookingAmountMinor, payout.currency)}</span>} />
              <DetailRow
                label={`Commission (${((payout.platformCommissionRateBps / 100)).toFixed(0)}%)`}
                value={<span className="text-danger">{moneyMinor(payout.platformCommissionMinor, payout.currency)}</span>}
              />
              <DetailRow label="Vendor net payout" value={<span className="text-lg font-bold text-primary">{moneyMinor(payout.vendorNetAmountMinor, payout.currency)}</span>} />
            </div>

            <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase text-muted">Payout method</div>
              {!method ? (
                <div className="text-sm text-amber-700">No payout method on file. Vendor must add one before payout can proceed.</div>
              ) : (
                <>
                  <DetailRow label="Type" value={pretty(method.type)} />
                  <DetailRow label="Status" value={<StatusPill status={method.status}>{pretty(method.status)}</StatusPill>} />
                  <DetailRow label="Account holder" value={method.accountHolderName ?? method.manualMethodLabel ?? "—"} />
                  <DetailRow label="Bank name" value={method.bankName ?? "—"} />
                  <DetailRow label="IBAN" value={method.ibanMasked ?? "—"} />
                  <DetailRow label="Account ending" value={method.accountNumberLast4 ?? "—"} />
                  <DetailRow label="SWIFT/BIC" value={method.swiftCode ?? "—"} />
                  <DetailRow label="Country" value={method.bankCountry ?? "—"} />
                  <DetailRow label="Currency" value={method.currency} />
                </>
              )}
            </div>

            {payout.proofAvailable ? (
              <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
                <div className="mb-3 text-xs font-semibold uppercase text-muted">Payment proof</div>
                <div className="flex flex-wrap gap-2">
                  {payout.proofViewUrl ? (
                    <button
                      type="button"
                      onClick={() => void viewProof()}
                      disabled={proofBusy !== null}
                      className={`${portalRowSuccess} disabled:opacity-60`}
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
                      className={`${portalRowSecondary} disabled:opacity-60`}
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
            ) : null}

            {payout.adminNotes ? (
              <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
                <div className="mb-1 text-xs font-semibold uppercase text-muted">Admin notes</div>
                <p className="text-sm text-secondary">{payout.adminNotes}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-line/70 bg-neutral-50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase text-muted">Actions</div>
              <div className="flex flex-wrap gap-2">
                {canMarkProcessing ? (
                  <button type="button" onClick={() => void markProcessing()} disabled={busy !== null} className={`${portalRowWarning} disabled:opacity-50`}>
                    {busy === "processing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark processing"}
                  </button>
                ) : null}
                {canUploadProof ? (
                  <label className={`${portalRowSecondary} cursor-pointer disabled:opacity-50`}>
                    <FileUp className="h-3.5 w-3.5" />
                    {busy === "proof" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Upload proof"}
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => void uploadProof(e.target.files?.[0] ?? null)}
                      disabled={busy !== null}
                    />
                  </label>
                ) : null}
                {canMarkPaid ? (
                  <button type="button" onClick={() => void markPaid()} disabled={busy !== null} className={`${portalRowSuccess} disabled:opacity-50`}>
                    {busy === "paid" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark paid"}
                  </button>
                ) : null}
                {canCancel ? (
                  <button type="button" onClick={() => void cancel()} disabled={busy !== null} className={`${portalRowDanger} disabled:opacity-50`}>
                    {busy === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancel"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminVendorPayoutsPage() {
  const [rows, setRows] = useState<VendorPayoutRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [detailPayoutId, setDetailPayoutId] = useState<string | null>(null);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await adminListVendorPayouts({ status: status === "ALL" ? undefined : status });
      setRows(Array.isArray(res.items) ? res.items : []);
      setSummary(res.summary ?? {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.id, row.vendorId, row.propertyTitle ?? "", row.bookingId ?? "", row.status].join(" | ").toLowerCase().includes(needle)
    );
  }, [q, rows]);

  const chart = useMemo(() => monthlyPoints(rows), [rows]);

  async function reconcile() {
    setBusy("reconcile");
    setReconcileResult(null);
    setMessage(null);
    try {
      const result = await adminReconcileVendorPayoutAmounts();
      setReconcileResult(
        `Reconcile complete: checked ${result.checked}, updated ${result.updated}, skipped ${result.skipped}, errors ${result.errors}.`
      );
      if (result.updated > 0) await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reconcile failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell role="admin" title="Vendor Payouts" subtitle="Per-booking payout liability and proof workflow">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Pending payouts" value={moneyMinor(summary.totalPendingPayoutsMinor ?? 0)} helper="Missing details" icon={<AlertTriangle className="h-4 w-4" />} />
          <StatCard label="Ready for payout" value={moneyMinor(summary.readyForPayoutMinor ?? 0)} helper="Verified method" icon={<Wallet className="h-4 w-4" />} />
          <StatCard label="Paid this month" value={moneyMinor(summary.paidThisMonthMinor ?? 0)} helper="Proof uploaded" icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label="Disputed payouts" value={summary.disputedPayouts ?? 0} helper="Needs review" icon={<AlertTriangle className="h-4 w-4" />} />
          <StatCard label="Vendors missing details" value={summary.vendorsMissingPayoutDetails ?? 0} helper="Payout blocked" icon={<AlertTriangle className="h-4 w-4" />} />
        </div>

        <SimpleBarChart title="Monthly payout volume" subtitle="Vendor net payout amount" points={chart} />

        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search vendor, property, booking..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="portal-select">
            <option value="ALL">All statuses</option>
            {["PENDING_DETAILS", "READY_FOR_PAYOUT", "PROCESSING", "PAID_AWAITING_VENDOR_CONFIRMATION", "CONFIRMED_RECEIVED", "DISPUTED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{pretty(s)}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void reconcile()}
            disabled={busy === "reconcile"}
            title="Recalculate payout amounts from source booking data (fixes existing records with wrong amounts)"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-secondary hover:bg-neutral-50 disabled:opacity-50"
          >
            {busy === "reconcile" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Reconcile amounts
          </button>
        </div>

        {reconcileResult ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{reconcileResult}</div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{message}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-line/70 bg-surface p-6 text-sm text-secondary">Loading vendor payouts...</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line/70 bg-surface">
            <div className="grid grid-cols-12 gap-3 border-b border-line/70 px-4 py-3 text-xs font-semibold uppercase text-muted">
              <div className="col-span-3">Vendor / Property</div>
              <div className="col-span-2">Gross</div>
              <div className="col-span-2">Commission</div>
              <div className="col-span-2">Vendor net</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-6 text-sm text-secondary">No payouts found.</div>
            ) : filtered.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 gap-3 border-b border-line/50 px-4 py-4 text-sm last:border-0 hover:bg-neutral-50/50 cursor-pointer"
                onClick={() => setDetailPayoutId(row.id)}
              >
                <div className="col-span-12 min-w-0 md:col-span-3">
                  <div className="truncate font-semibold text-primary">{row.propertyTitle ?? row.vendorId}</div>
                  <div className="mt-1 truncate text-xs text-muted">Booking {row.bookingId ?? "—"} · due {dateLabel(row.dueAt)}</div>
                </div>
                <div className="col-span-4 md:col-span-2">{moneyMinor(row.grossBookingAmountMinor, row.currency)}</div>
                <div className="col-span-4 md:col-span-2">{moneyMinor(row.platformCommissionMinor, row.currency)}</div>
                <div className="col-span-4 font-semibold text-primary md:col-span-2">{moneyMinor(row.vendorNetAmountMinor, row.currency)}</div>
                <div className="col-span-6 md:col-span-1"><StatusPill status={row.status}>{pretty(row.status)}</StatusPill></div>
                <div className="col-span-6 flex flex-wrap justify-end gap-2 md:col-span-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setDetailPayoutId(row.id)}
                    className={portalRowSecondary}
                  >
                    View
                  </button>
                  {row.status === "READY_FOR_PAYOUT" ? (
                    <button
                      type="button"
                      onClick={() => setDetailPayoutId(row.id)}
                      className={portalRowWarning}
                    >
                      Process
                    </button>
                  ) : null}
                  {(row.status === "PROCESSING" || row.status === "READY_FOR_PAYOUT") ? (
                    <label
                      className={`${portalRowSecondary} cursor-pointer`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Proof
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setBusy(row.id);
                          setMessage(null);
                          try {
                            await adminUploadVendorPayoutProof(row.id, file);
                            setMessage("Proof uploaded and payout marked awaiting vendor confirmation.");
                            await load();
                          } catch (err) {
                            setMessage(err instanceof Error ? err.message : "Could not upload proof.");
                          } finally {
                            setBusy(null);
                          }
                        }}
                      />
                    </label>
                  ) : null}
                  {busy === row.id ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailPayoutId ? (
        <PayoutDetailDrawer
          payoutId={detailPayoutId}
          onClose={() => setDetailPayoutId(null)}
          onAction={() => void load()}
        />
      ) : null}
    </PortalShell>
  );
}
