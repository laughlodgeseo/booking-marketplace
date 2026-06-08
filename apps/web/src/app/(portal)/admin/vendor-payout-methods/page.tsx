"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Loader2, Search, ShieldX } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  adminGetPayoutMethod,
  adminListPayoutMethods,
  adminRejectPayoutMethod,
  adminVerifyPayoutMethod,
  type VendorPayoutMethodRow,
} from "@/lib/api/portal/finance";

function pretty(value: string): string {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminVendorPayoutMethodsPage() {
  const [rows, setRows] = useState<VendorPayoutMethodRow[]>([]);
  const [detail, setDetail] = useState<VendorPayoutMethodRow | null>(null);
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await adminListPayoutMethods({ status: status === "ALL" ? undefined : status });
      setRows(Array.isArray(res.items) ? res.items : []);
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
    return rows.filter((row) => [row.vendor?.email ?? "", row.vendor?.fullName ?? "", row.accountHolderName ?? "", row.bankName ?? "", row.ibanMasked ?? "", row.type, row.status].join(" | ").toLowerCase().includes(needle));
  }, [q, rows]);

  async function reveal(row: VendorPayoutMethodRow) {
    setBusy(row.id);
    try {
      setDetail(await adminGetPayoutMethod(row.id));
    } finally {
      setBusy(null);
    }
  }

  async function verify(row: VendorPayoutMethodRow) {
    setBusy(row.id);
    setMessage(null);
    try {
      await adminVerifyPayoutMethod(row.id);
      setMessage("Payout method verified and set as default.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify method.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(row: VendorPayoutMethodRow) {
    const reason = window.prompt("Rejection reason");
    if (!reason?.trim()) return;
    setBusy(row.id);
    setMessage(null);
    try {
      await adminRejectPayoutMethod(row.id, reason);
      setMessage("Payout method rejected.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reject method.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell role="admin" title="Payout Methods" subtitle="Review vendor banking and manual payout details">
      <div className="space-y-5">
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendor, holder, bank, masked IBAN..." className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="portal-select">
            <option value="ALL">All statuses</option>
            {["PENDING_REVIEW", "VERIFIED", "REJECTED", "DISABLED"].map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
          </select>
        </div>

        {message ? <div className="rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{message}</div> : null}

        {loading ? (
          <div className="rounded-2xl border border-line/70 bg-surface p-6 text-sm text-secondary">Loading payout methods...</div>
        ) : (
          <div className="grid gap-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line/70 bg-surface p-8 text-center text-sm text-secondary">No payout methods found.</div>
            ) : filtered.map((row) => (
              <article key={row.id} className="rounded-2xl border border-line/70 bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary">{row.vendor?.fullName ?? row.vendor?.email ?? row.vendorId}</div>
                    <div className="mt-1 text-xs text-secondary">{pretty(row.type)} · {row.accountHolderName ?? row.manualMethodLabel ?? "Manual"} · {row.bankName ?? "—"}</div>
                    <div className="mt-1 text-xs text-muted">IBAN {row.ibanMasked ?? "—"} · account ending {row.accountNumberLast4 ?? "—"}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusPill status={row.status}>{pretty(row.status)}</StatusPill>
                    <button type="button" onClick={() => void reveal(row)} disabled={busy === row.id} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-primary">
                      <Eye className="h-3.5 w-3.5" /> Details
                    </button>
                    <button type="button" onClick={() => void verify(row)} disabled={busy === row.id || row.status === "VERIFIED"} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                    </button>
                    <button type="button" onClick={() => void reject(row)} disabled={busy === row.id || row.status === "REJECTED"} className="inline-flex items-center gap-1 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-50">
                      <ShieldX className="h-3.5 w-3.5" /> Reject
                    </button>
                    {busy === row.id ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {detail ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
            <div className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-2xl bg-surface p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-primary">Full payout method details</div>
                  <div className="mt-1 text-xs text-muted">Visible only in this admin review drawer.</div>
                </div>
                <button type="button" onClick={() => setDetail(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold">Close</button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Detail label="Vendor" value={detail.vendor?.email ?? detail.vendorId} />
                <Detail label="Status" value={pretty(detail.status)} />
                <Detail label="Type" value={pretty(detail.type)} />
                <Detail label="Account holder" value={detail.accountHolderName ?? "—"} />
                <Detail label="Bank" value={detail.bankName ?? "—"} />
                <Detail label="IBAN" value={detail.iban ?? "—"} />
                <Detail label="Account number" value={detail.accountNumber ?? "—"} />
                <Detail label="SWIFT/BIC" value={detail.swiftCode ?? "—"} />
                <Detail label="Country" value={detail.bankCountry ?? "—"} />
                <Detail label="City/branch" value={detail.bankCity ?? "—"} />
                <Detail label="Currency" value={detail.currency} />
                <Detail label="Manual identifier" value={detail.manualIdentifier ?? "—"} />
                <Detail label="Instructions" value={detail.transferInstructions ?? detail.manualInstructions ?? "—"} wide />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}

function Detail(props: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-line/70 bg-neutral-50 p-3 ${props.wide ? "sm:col-span-2" : ""}`}>
      <div className="text-[10px] font-semibold uppercase text-muted">{props.label}</div>
      <div className="mt-1 break-words text-sm text-primary">{props.value}</div>
    </div>
  );
}
