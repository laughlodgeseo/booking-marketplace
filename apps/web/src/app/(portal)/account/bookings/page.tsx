"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, CalendarDays, RefreshCw, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { BookingIllustration } from "@/components/portal/ui/PortalIllustration";
import { useAuth } from "@/lib/auth/auth-context";
import { getUserBookings } from "@/lib/api/portal/user";

type Booking = Awaited<ReturnType<typeof getUserBookings>>["items"][number];

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getUserBookings>> };

function toInt(v: string | null, fallback: number): number {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
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

function BookingCard({ booking, onOpen }: { booking: Booking; onOpen: () => void }) {
  return (
    <article
      onClick={onOpen}
      className="portal-record-card group cursor-pointer"
    >
      <div className="px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-primary">
                  {booking.propertyTitle ?? `Booking ${booking.id.slice(0, 8)}`}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                </div>
              </div>
              <StatusPill status={booking.status}>{prettyStatus(booking.status)}</StatusPill>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-muted">
                  #{booking.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                  {formatMoney(booking.totalAmount, booking.currency)}
                </span>
              </div>
              <Link
                href={`/account/bookings/${booking.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt transition"
              >
                View details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AccountBookingsPage() {
  return (
    <Suspense
      fallback={
        <PortalShell role="customer" title="Bookings" subtitle="Your stays and booking statuses">
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        </PortalShell>
      }
    >
      <AccountBookingsContent />
    </Suspense>
  );
}

function AccountBookingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { status: authStatus } = useAuth();
  const searchParams = useSearchParams();

  const page = toInt(searchParams.get("page"), 1);
  const pageSize = toInt(searchParams.get("pageSize"), 10);
  const toast = searchParams.get("toast");
  const showCancelledToast = toast === "booking_cancelled";

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!showCancelledToast) return;
    const cleaned = new URLSearchParams(searchParams.toString());
    cleaned.delete("toast");
    const qs = cleaned.toString();
    const timer = window.setTimeout(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [pathname, router, searchParams, showCancelledToast]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (authStatus === "loading") return;
      setState({ kind: "loading" });
      try {
        const data = await getUserBookings({ page, pageSize });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load bookings" });
      }
    }
    void load();
    return () => { alive = false; };
  }, [authStatus, page, pageSize]);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.data.items;
    return state.data.items.filter((b) =>
      [b.propertyTitle ?? "", b.id, b.status].join(" ").toLowerCase().includes(q)
    );
  }, [state, query]);

  const pageMeta = useMemo(() => {
    if (state.kind !== "ready") return null;
    return {
      totalPages: Math.max(1, Math.ceil(state.data.total / state.data.pageSize)),
      currentPage: state.data.page,
      pageSize: state.data.pageSize,
    };
  }, [state]);

  return (
    <PortalShell role="customer" title="Bookings" subtitle="Open a booking for full detail, documents, and review actions">
      <div className="space-y-4">
        {showCancelledToast ? (
          <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            Booking cancelled and dates released.
          </div>
        ) : null}

        {/* Command bar */}
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by property, reference..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">
              {filtered.length} {filtered.length === 1 ? "booking" : "bookings"}
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
            <button
              type="button"
              onClick={() => setState({ kind: "loading" })}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 px-6 py-12 text-center">
            <BookingIllustration className="opacity-90" />
            <div className="mt-4 text-sm font-semibold text-primary">
              {query ? "No bookings match" : "No bookings yet"}
            </div>
            <div className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
              {query ? "Try a different search term." : "Once you book a stay, it will appear here."}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onOpen={() => router.push(`/account/bookings/${booking.id}`)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pageMeta && pageMeta.totalPages > 1 ? (
          <div className="flex items-center justify-between rounded-xl border border-line/40 bg-surface/80 px-4 py-3">
            <div className="text-xs text-muted">Page {pageMeta.currentPage} of {pageMeta.totalPages}</div>
            <div className="flex gap-2">
              <Link
                href={`/account/bookings?page=${Math.max(1, pageMeta.currentPage - 1)}&pageSize=${pageMeta.pageSize}`}
                aria-disabled={pageMeta.currentPage <= 1}
                className={`h-8 rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt transition ${pageMeta.currentPage <= 1 ? "pointer-events-none opacity-40" : ""}`}
              >
                Previous
              </Link>
              <Link
                href={`/account/bookings?page=${Math.min(pageMeta.totalPages, pageMeta.currentPage + 1)}&pageSize=${pageMeta.pageSize}`}
                aria-disabled={pageMeta.currentPage >= pageMeta.totalPages}
                className={`h-8 rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt transition ${pageMeta.currentPage >= pageMeta.totalPages ? "pointer-events-none opacity-40" : ""}`}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}
