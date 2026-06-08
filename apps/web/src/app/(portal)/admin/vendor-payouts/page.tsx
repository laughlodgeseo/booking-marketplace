"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Search, Wallet } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { SimpleBarChart, type BarPoint } from "@/components/portal/SimpleBarChart";
import { StatCard } from "@/components/portal/StatCard";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  adminCancelVendorPayout,
  adminListVendorPayouts,
  adminMarkVendorPayoutPaid,
  adminMarkVendorPayoutProcessing,
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

export default function AdminVendorPayoutsPage() {
  const [rows, setRows] = useState<VendorPayoutRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
    return rows.filter((row) => [row.id, row.vendorId, row.propertyTitle ?? "", row.bookingId ?? "", row.status].join(" | ").toLowerCase().includes(needle));
  }, [q, rows]);

  const chart = useMemo(() => monthlyPoints(rows), [rows]);

  async function markProcessing(row: VendorPayoutRow) {
    setBusy(row.id);
    setMessage(null);
    try {
      await adminMarkVendorPayoutProcessing(row.id);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not mark processing.");
    } finally {
      setBusy(null);
    }
  }

  async function uploadProof(row: VendorPayoutRow, file: File | null) {
    if (!file) return;
    setBusy(row.id);
    setMessage(null);
    try {
      await adminUploadVendorPayoutProof(row.id, file);
      setMessage("Proof uploaded and payout marked paid awaiting vendor confirmation.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload proof.");
    } finally {
      setBusy(null);
    }
  }

  async function markPaid(row: VendorPayoutRow) {
    setBusy(row.id);
    setMessage(null);
    try {
      await adminMarkVendorPayoutPaid(row.id);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not mark paid.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel(row: VendorPayoutRow) {
    const note = window.prompt("Cancellation note");
    if (!note?.trim()) return;
    setBusy(row.id);
    setMessage(null);
    try {
      await adminCancelVendorPayout(row.id, note);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not cancel payout.");
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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor, property, booking..." className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="portal-select">
            <option value="ALL">All statuses</option>
            {["PENDING_DETAILS", "READY_FOR_PAYOUT", "PROCESSING", "PAID_AWAITING_VENDOR_CONFIRMATION", "CONFIRMED_RECEIVED", "DISPUTED", "CANCELLED"].map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
          </select>
        </div>

        {message ? <div className="rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{message}</div> : null}

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
              <div key={row.id} className="grid grid-cols-12 gap-3 border-b border-line/50 px-4 py-4 text-sm last:border-0">
                <div className="col-span-12 min-w-0 md:col-span-3">
                  <div className="truncate font-semibold text-primary">{row.propertyTitle ?? row.vendorId}</div>
                  <div className="mt-1 truncate text-xs text-muted">Booking {row.bookingId ?? "—"} · due {dateLabel(row.dueAt)}</div>
                </div>
                <div className="col-span-4 md:col-span-2">{moneyMinor(row.grossBookingAmountMinor, row.currency)}</div>
                <div className="col-span-4 md:col-span-2">{moneyMinor(row.platformCommissionMinor, row.currency)}</div>
                <div className="col-span-4 font-semibold text-primary md:col-span-2">{moneyMinor(row.vendorNetAmountMinor, row.currency)}</div>
                <div className="col-span-6 md:col-span-1"><StatusPill status={row.status}>{pretty(row.status)}</StatusPill></div>
                <div className="col-span-6 flex flex-wrap justify-end gap-2 md:col-span-2">
                  {row.status === "READY_FOR_PAYOUT" ? <button type="button" onClick={() => void markProcessing(row)} disabled={busy === row.id} className="rounded-lg border border-line px-2 py-1 text-xs font-semibold">Processing</button> : null}
                  {row.status === "PROCESSING" || row.status === "READY_FOR_PAYOUT" ? (
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold">
                      <FileUp className="h-3.5 w-3.5" />
                      Proof
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => void uploadProof(row, e.target.files?.[0] ?? null)} />
                    </label>
                  ) : null}
                  {row.proofAvailable ? <button type="button" onClick={() => void markPaid(row)} disabled={busy === row.id} className="rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-white">Mark paid</button> : null}
                  {["PENDING_DETAILS", "READY_FOR_PAYOUT", "PROCESSING", "DISPUTED"].includes(row.status) ? <button type="button" onClick={() => void cancel(row)} disabled={busy === row.id} className="rounded-lg border border-danger/30 px-2 py-1 text-xs font-semibold text-danger">Cancel</button> : null}
                  {busy === row.id ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
