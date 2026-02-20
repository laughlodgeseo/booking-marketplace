"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { CardList, type CardListItem } from "@/components/portal/ui/CardList";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { getUserRefunds } from "@/lib/api/portal/user";

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

function formatMoney(amount: number, currency?: string | null): string {
  if (!currency) return String(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getUserRefunds>> };

export default function AccountRefundsPage() {
  return (
    <Suspense
      fallback={
        <PortalShell role="customer" title="Refunds" subtitle="Track refund states and payouts">
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        </PortalShell>
      }
    >
      <AccountRefundsContent />
    </Suspense>
  );
}

function AccountRefundsContent() {
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
        const data = await getUserRefunds({ page, pageSize });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to load refunds",
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

    return state.data.items.map((refund) => ({
      id: refund.id,
      title: `Refund ${refund.id.slice(0, 8)}`,
      subtitle: `Booking ${refund.bookingId.slice(0, 8)} - ${formatDate(refund.createdAt)}`,
      status: <StatusPill status={refund.status}>{refund.status}</StatusPill>,
      meta: (
        <div className="text-xs font-semibold text-secondary">
          Amount: {formatMoney(refund.amount, refund.currency)}
        </div>
      ),
    }));
  }, [state]);

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
    <PortalShell role="customer" title="Refunds" subtitle="Track statuses for refund operations">
      {state.kind === "loading" ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
          {state.message}
        </div>
      ) : (
        <div className="space-y-5">
          <CardList
            title="Refund records"
            subtitle="Private, backend-driven refund data"
            items={listItems}
            emptyTitle="No refunds yet"
            emptyDescription="Refunds created from booking operations will appear here."
          />

          {pageMeta ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-secondary">
                Page {pageMeta.currentPage} of {pageMeta.totalPages}
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <Link
                  href={`/account/refunds?page=${Math.max(1, pageMeta.currentPage - 1)}&pageSize=${pageMeta.pageSize}`}
                  aria-disabled={pageMeta.currentPage <= 1}
                  className={cn(
                    "inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm sm:flex-none lg:bg-surface",
                    pageMeta.currentPage <= 1 && "pointer-events-none opacity-50",
                  )}
                >
                  Prev
                </Link>

                <Link
                  href={`/account/refunds?page=${Math.min(pageMeta.totalPages, pageMeta.currentPage + 1)}&pageSize=${pageMeta.pageSize}`}
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

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
