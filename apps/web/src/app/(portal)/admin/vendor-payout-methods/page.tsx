"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Loader2, Search, ShieldCheck, ShieldX, X } from "lucide-react";

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

function DetailField({
  label,
  value,
  wide,
  mono,
}: {
  label: string;
  value: string;
  wide?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
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
    return rows.filter((row) =>
      [
        row.vendor?.email ?? "",
        row.vendor?.fullName ?? "",
        row.accountHolderName ?? "",
        row.bankName ?? "",
        row.ibanMasked ?? "",
        row.type,
        row.status,
      ]
        .join(" | ")
        .toLowerCase()
        .includes(needle),
    );
  }, [q, rows]);

  async function reveal(row: VendorPayoutMethodRow) {
    setBusy(row.id);
    try {
      setDetail(await adminGetPayoutMethod(row.id));
    } finally {
      setBusy(null);
    }
  }

  async function verify(row: VendorPayoutMethodRow): Promise<boolean> {
    setBusy(row.id);
    setMessage(null);
    try {
      await adminVerifyPayoutMethod(row.id);
      setMessage("Payout method verified and set as default.");
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify method.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function reject(row: VendorPayoutMethodRow): Promise<boolean> {
    const reason = window.prompt("Rejection reason");
    if (!reason?.trim()) return false;
    setBusy(row.id);
    setMessage(null);
    try {
      await adminRejectPayoutMethod(row.id, reason);
      setMessage("Payout method rejected.");
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reject method.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  const isModalBusy = detail ? busy === detail.id : false;

  return (
    <PortalShell role="admin" title="Payout Methods" subtitle="Review vendor banking and manual payout details">
      <div className="space-y-5">
        {/* Command bar */}
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search vendor, holder, bank, masked IBAN..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="portal-select"
          >
            <option value="ALL">All statuses</option>
            {["PENDING_REVIEW", "VERIFIED", "REJECTED", "DISABLED"].map((s) => (
              <option key={s} value={s}>{pretty(s)}</option>
            ))}
          </select>
        </div>

        {message ? (
          <div className="rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">
            {message}
          </div>
        ) : null}

        {/* List */}
        {loading ? (
          <div className="rounded-2xl border border-line/70 bg-surface p-6 text-sm text-secondary">
            Loading payout methods...
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line/70 bg-surface p-8 text-center text-sm text-secondary">
                No payout methods found.
              </div>
            ) : (
              filtered.map((row) => (
                <article key={row.id} className="rounded-2xl border border-line/70 bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-primary">
                        {row.vendor?.fullName ?? row.vendor?.email ?? row.vendorId}
                      </div>
                      <div className="mt-1 text-xs text-secondary">
                        {pretty(row.type)} · {row.accountHolderName ?? row.manualMethodLabel ?? "Manual"} · {row.bankName ?? "—"}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        IBAN {row.ibanMasked ?? "—"} · account ending {row.accountNumberLast4 ?? "—"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <StatusPill status={row.status}>{pretty(row.status)}</StatusPill>
                      <button
                        type="button"
                        onClick={() => void reveal(row)}
                        disabled={busy === row.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-primary"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void verify(row)}
                        disabled={busy === row.id || row.status === "VERIFIED"}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => void reject(row)}
                        disabled={busy === row.id || row.status === "REJECTED"}
                        className="inline-flex items-center gap-1 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-50"
                      >
                        <ShieldX className="h-3.5 w-3.5" /> Reject
                      </button>
                      {busy === row.id ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <section
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl"
            style={{ maxHeight: "min(86vh, 800px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Payout method review</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Review vendor bank details before approving payouts.
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <span className="text-slate-500">
                    Vendor:{" "}
                    <span className="font-medium text-slate-800">
                      {detail.vendor?.email ?? detail.vendorId}
                    </span>
                  </span>
                  <span className="text-slate-500">
                    Status:{" "}
                    <StatusPill status={detail.status} className="ml-1">
                      {pretty(detail.status)}
                    </StatusPill>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Close"
                className="ml-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Scrollable body */}
            <main className="flex-1 overflow-y-auto px-6 py-5">
              {/* Vendor section */}
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Vendor
              </p>
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <DetailField label="Email" value={detail.vendor?.email ?? detail.vendorId} />
                <DetailField label="Account holder" value={detail.accountHolderName ?? "—"} />
              </div>

              {/* Bank details section */}
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Bank details
              </p>
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <DetailField label="Type" value={pretty(detail.type)} />
                <DetailField label="Bank" value={detail.bankName ?? "—"} />
                <DetailField label="IBAN" value={detail.iban ?? "—"} wide mono />
                <DetailField label="Account number" value={detail.accountNumber ?? "—"} mono />
                <DetailField label="SWIFT / BIC" value={detail.swiftCode ?? "—"} mono />
                <DetailField label="Currency" value={detail.currency} />
              </div>

              {/* Location section */}
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Location
              </p>
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <DetailField label="Country" value={detail.bankCountry ?? "—"} />
                <DetailField label="City / Branch" value={detail.bankCity ?? "—"} />
              </div>

              {/* Manual / instructions (conditional) */}
              {(detail.manualIdentifier || detail.transferInstructions || detail.manualInstructions) && (
                <>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Manual payout
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detail.manualIdentifier && (
                      <DetailField label="Identifier" value={detail.manualIdentifier} mono />
                    )}
                    {(detail.transferInstructions ?? detail.manualInstructions) && (
                      <DetailField
                        label="Instructions"
                        value={detail.transferInstructions ?? detail.manualInstructions ?? "—"}
                        wide
                      />
                    )}
                  </div>
                </>
              )}
            </main>

            {/* Footer with actions */}
            <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Approval enables this payout method for future vendor payouts.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isModalBusy || detail.status === "REJECTED"}
                  onClick={async () => {
                    const ok = await reject(detail);
                    if (ok) setDetail(null);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-danger/40 bg-white px-4 text-xs font-semibold text-danger transition hover:bg-danger/8 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isModalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldX className="h-3.5 w-3.5" />}
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isModalBusy || detail.status === "VERIFIED"}
                  onClick={async () => {
                    const ok = await verify(detail);
                    if (ok) setDetail(null);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isModalBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Approve
                </button>
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
