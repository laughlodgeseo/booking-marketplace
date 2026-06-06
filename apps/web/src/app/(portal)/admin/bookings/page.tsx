"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, RefreshCw, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { portalRowPrimary, portalRowSecondary } from "@/components/portal/ui/portal-actions";
import { getAdminBookings } from "@/lib/api/portal/admin";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getAdminBookings>> };

function readString(v: unknown): string { return typeof v === "string" ? v : ""; }
function readNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(v: unknown): string {
  const raw = readString(v);
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function formatMoney(amount: number, currency: string | null | undefined): string {
  const cur = (currency ?? "AED").trim().toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminBookings({ page, pageSize: 20 });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load bookings" });
      }
    }
    void load();
    return () => { alive = false; };
  }, [page]);

  const derived = useMemo(() => {
    if (state.kind !== "ready") return null;
    const statuses = Array.from(
      new Set(state.data.items.map((i) => readString((i as Record<string, unknown>).status)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    const q = query.trim().toLowerCase();
    const filtered = state.data.items
      .filter((i) => statusFilter === "ALL" || readString((i as Record<string, unknown>).status) === statusFilter)
      .filter((i) => !q || JSON.stringify(i).toLowerCase().includes(q));
    const totalPages = Math.max(1, Math.ceil(state.data.total / state.data.pageSize));
    return { statuses, filtered, totalPages };
  }, [query, state, statusFilter]);

  return (
    <PortalShell role="admin" title="Bookings" subtitle="Full-page booking details with audit actions">
      <div className="space-y-4">
        {/* Command bar */}
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search booking, property, guest..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="portal-select"
          >
            <option value="ALL">All statuses</option>
            {(derived?.statuses ?? []).map((s) => (
              <option key={s} value={s}>{prettyStatus(s)}</option>
            ))}
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto hidden text-[11px] text-muted sm:block">
              {derived?.filtered.length ?? 0} of {state.data.total} bookings
            </div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5">
            <div className="text-sm font-semibold text-primary">Could not load bookings</div>
            <div className="mt-1 text-sm text-secondary">{state.message}</div>
            <button type="button" onClick={() => setState({ kind: "loading" })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : !derived || derived.filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">
              {query || statusFilter !== "ALL" ? "No bookings match" : "No bookings yet"}
            </div>
            <div className="mt-1 text-xs text-muted">Try adjusting your filters.</div>
            {(query || statusFilter !== "ALL") ? (
              <button type="button" onClick={() => { setQuery(""); setStatusFilter("ALL"); }} className="mt-3 text-xs font-semibold text-brand hover:underline">
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3">
            {derived.filtered.map((booking, index) => {
              const row = booking as Record<string, unknown>;
              const id = readString(row.id);
              const propertyTitle = readString(row.propertyTitle) || readString(row.propertyName) || "Property";
              const status = readString(row.status) || "UNKNOWN";
              const customer = readString(row.customerEmail) || readString(row.customerName) || "Guest";
              const totalAmount = readNumber(row.totalAmount) ?? readNumber(row.amount);
              const currency = readString(row.currency) || "AED";
              const route = id ? `/admin/bookings/${id}` : "/admin/bookings";

              return (
                <article
                  key={id || `row-${index}`}
                  onClick={() => { if (id) router.push(route); }}
                  className="portal-record-card group cursor-pointer"
                >
                  <div className="px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-200">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-primary">{propertyTitle}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                              <CalendarDays className="h-3 w-3 shrink-0" />
                              {formatDate(row.checkIn)} → {formatDate(row.checkOut)}
                            </div>
                          </div>
                          <StatusPill status={status}>{prettyStatus(status)}</StatusPill>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-2">
                            {id ? <span className="rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-muted">#{id.slice(0, 8).toUpperCase()}</span> : null}
                            <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] text-secondary">{customer}</span>
                            {totalAmount !== null ? (
                              <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                                {formatMoney(totalAmount, currency)}
                              </span>
                            ) : null}
                          </div>
                          <Link
                            href={route}
                            onClick={(e) => e.stopPropagation()}
                            className={portalRowPrimary}
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {state.kind === "ready" && (derived?.totalPages ?? 1) > 1 ? (
          <div className="flex items-center justify-between rounded-xl border border-line/40 bg-surface/80 px-4 py-3">
            <div className="text-xs text-muted">Page {state.data.page} of {derived?.totalPages ?? 1} · {state.data.total} records</div>
            <div className="flex gap-2">
              <button type="button" disabled={state.data.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={portalRowSecondary}>Previous</button>
              <button type="button" disabled={state.data.page >= (derived?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)} className={portalRowSecondary}>Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}
