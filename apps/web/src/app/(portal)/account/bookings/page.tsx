"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { CardList, type CardListItem } from "@/components/portal/ui/CardList";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { useAuth } from "@/lib/auth/auth-context";
import { getUserBookings } from "@/lib/api/portal/user";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getUserBookings>> };

function toInt(value: string | null, fallback: number): number {
  const numeric = value ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatMoney(amount: number, currency: string | null | undefined): string {
  const normalizedCurrency = (currency ?? "").trim().toUpperCase() || "AED";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCurrency === "AED" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toLocaleString()}`;
  }
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
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
  const { status: authStatus } = useAuth();
  const searchParams = useSearchParams();

  const page = toInt(searchParams.get("page"), 1);
  const pageSize = toInt(searchParams.get("pageSize"), 10);

  const [state, setState] = useState<ViewState>({ kind: "loading" });

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
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to load bookings",
        });
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [authStatus, page, pageSize]);

  const listItems = useMemo<CardListItem[]>(() => {
    if (state.kind !== "ready") return [];

    return state.data.items.map((booking) => ({
      id: booking.id,
      title: booking.propertyTitle ?? `Booking ${booking.id.slice(0, 8)}`,
      subtitle: `Check-in ${formatDate(booking.checkIn)} - Check-out ${formatDate(booking.checkOut)}`,
      status: <StatusPill status={booking.status}>{booking.status}</StatusPill>,
      meta: (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full bg-warm-alt px-3 py-1 font-semibold text-secondary">
            Ref: {booking.id.slice(0, 8)}
          </span>
          <span className="rounded-full bg-warm-alt px-3 py-1 font-semibold text-secondary">
            Total: {formatMoney(booking.totalAmount, booking.currency)}
          </span>
        </div>
      ),
      actions: (
        <Link
          href={`/account/bookings/${booking.id}`}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm hover:bg-accent-soft/22 lg:bg-surface"
        >
          Open page
        </Link>
      ),
      onClick: () => {
        router.push(`/account/bookings/${booking.id}`);
      },
    }));
  }, [router, state]);

  const pageMeta = useMemo(() => {
    if (state.kind !== "ready") return null;
    const totalPages = Math.max(1, Math.ceil(state.data.total / state.data.pageSize));
    return {
      totalPages,
      currentPage: state.data.page,
      pageSize: state.data.pageSize,
    };
  }, [state]);

  return (
    <PortalShell role="customer" title="Bookings" subtitle="Open a booking for full detail, documents, and review actions">
      {state.kind === "loading" ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">{state.message}</div>
      ) : (
        <div className="space-y-5">
          <CardList
            title="My bookings"
            subtitle="Backend-driven booking states, dates, and totals"
            items={listItems}
            emptyTitle="No bookings yet"
            emptyDescription="Once you book a stay, it will appear here with live status and payment state."
          />

          {pageMeta ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-secondary">
                Page {pageMeta.currentPage} of {pageMeta.totalPages}
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Link
                  href={`/account/bookings?page=${Math.max(1, pageMeta.currentPage - 1)}&pageSize=${pageMeta.pageSize}`}
                  aria-disabled={pageMeta.currentPage <= 1}
                  className={cn(
                    "inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm sm:flex-none lg:bg-surface",
                    pageMeta.currentPage <= 1 && "pointer-events-none opacity-50",
                  )}
                >
                  Prev
                </Link>

                <Link
                  href={`/account/bookings?page=${Math.min(pageMeta.totalPages, pageMeta.currentPage + 1)}&pageSize=${pageMeta.pageSize}`}
                  aria-disabled={pageMeta.currentPage >= pageMeta.totalPages}
                  className={cn(
                    "inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm sm:flex-none lg:bg-surface",
                    pageMeta.currentPage >= pageMeta.totalPages && "pointer-events-none opacity-50",
                  )}
                >
                  Next
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </PortalShell>
  );
}
