"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, Wallet } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { SimpleBarChart, type BarPoint } from "@/components/portal/SimpleBarChart";
import { StatCard } from "@/components/portal/StatCard";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  vendorConfirmPayoutReceived,
  vendorDisputePayout,
  vendorListPayouts,
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

export default function VendorPayoutsPage() {
  const [rows, setRows] = useState<VendorPayoutRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  async function confirm(row: VendorPayoutRow) {
    setBusy(row.id);
    setMessage(null);
    try {
      await vendorConfirmPayoutReceived(row.id);
      setMessage("Payout receipt confirmed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not confirm payout.");
    } finally {
      setBusy(null);
    }
  }

  async function dispute(row: VendorPayoutRow) {
    const note = window.prompt("Describe the payout issue");
    if (!note?.trim()) return;
    setBusy(row.id);
    setMessage(null);
    try {
      await vendorDisputePayout(row.id, note);
      setMessage("Payout issue reported.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not report payout issue.");
    } finally {
      setBusy(null);
    }
  }

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
              <article key={row.id} className="rounded-2xl border border-line/70 bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary">{row.propertyTitle ?? "Property payout"}</div>
                    <div className="mt-1 text-xs text-secondary">Booking {row.bookingId ?? "—"} · {dateLabel(row.checkIn)} to {dateLabel(row.checkOut)}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-neutral-100 px-2 py-1 font-semibold text-primary">Payout amount: {moneyMinor(row.vendorNetAmountMinor, row.currency)}</span>
                      <span className="rounded-lg bg-neutral-100 px-2 py-1 text-secondary">Due: {dateLabel(row.dueAt)}</span>
                      <span className="rounded-lg bg-neutral-100 px-2 py-1 text-secondary">Method: {row.payoutMethod?.bankName ?? row.payoutMethod?.manualMethodLabel ?? "Missing"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusPill status={row.status}>{pretty(row.status)}</StatusPill>
                    {row.status === "PENDING_DETAILS" ? <Link href="/vendor/payout-settings" className="rounded-lg border border-brand/30 px-3 py-1.5 text-xs font-semibold text-brand">Add payout details</Link> : null}
                    {row.proofAvailable && row.proofViewUrl ? <a href={row.proofViewUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-primary">View proof</a> : null}
                    {row.status === "PAID_AWAITING_VENDOR_CONFIRMATION" ? (
                      <>
                        <button type="button" onClick={() => void confirm(row)} disabled={busy === row.id} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                          {busy === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm received"}
                        </button>
                        <button type="button" onClick={() => void dispute(row)} disabled={busy === row.id} className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-60">Report issue</button>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
