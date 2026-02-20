"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { CardList, type CardListItem } from "@/components/portal/ui/CardList";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { getAdminBookings } from "@/lib/api/portal/admin";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getAdminBookings>> };

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatDate(value: unknown): string {
  const raw = readString(value);
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
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
  }, [page]);

  const derived = useMemo(() => {
    if (state.kind !== "ready") return null;

    const statuses = Array.from(
      new Set(state.data.items.map((item) => readString((item as Record<string, unknown>).status)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const q = query.trim().toLowerCase();

    const filtered = state.data.items
      .filter((item) => {
        if (statusFilter === "ALL") return true;
        const status = readString((item as Record<string, unknown>).status);
        return status === statusFilter;
      })
      .filter((item) => {
        if (!q) return true;
        return JSON.stringify(item).toLowerCase().includes(q);
      });

    const totalPages = Math.max(1, Math.ceil(state.data.total / state.data.pageSize));
    return { statuses, filtered, totalPages };
  }, [query, state, statusFilter]);

  const items = useMemo<CardListItem[]>(() => {
    if (!derived) return [];

    return derived.filtered.map((booking, index) => {
      const row = booking as Record<string, unknown>;
      const id = readString(row.id);
      const propertyTitle =
        readString(row.propertyTitle) || readString(row.propertyName) || readString(row.propertyId) || "Property";
      const status = readString(row.status) || "UNKNOWN";
      const customer = readString(row.customerEmail) || readString(row.customerName) || "Guest";
      const totalAmount = readNumber(row.totalAmount) ?? readNumber(row.amount);
      const totalCurrency = readString(row.currency) || "AED";
      const route = id ? `/admin/bookings/${id}` : "/admin/bookings";

      return {
        id: id || `row-${index}`,
        title: propertyTitle,
        subtitle: `Check-in ${formatDate(row.checkIn)} - Check-out ${formatDate(row.checkOut)}`,
        status: <StatusPill status={status}>{status}</StatusPill>,
        meta: (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-warm-alt px-3 py-1 font-semibold text-secondary">
              Booking: {id ? id.slice(0, 8) : "-"}
            </span>
            <span className="rounded-full bg-warm-alt px-3 py-1 font-semibold text-secondary">
              Guest: {customer}
            </span>
            {totalAmount !== null ? (
              <span className="rounded-full bg-warm-alt px-3 py-1 font-semibold text-secondary">
                Total: {formatMoney(totalAmount, totalCurrency)}
              </span>
            ) : null}
          </div>
        ),
        actions: (
          <Link
            href={route}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm hover:bg-accent-soft/22 lg:bg-surface"
          >
            Open detail
          </Link>
        ),
        onClick: () => {
          if (!id) return;
          router.push(route);
        },
      };
    });
  }, [derived, router]);

  return (
    <PortalShell role="admin" title="Bookings" subtitle="Full-page booking details with audit actions">
      {state.kind === "loading" ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
          {state.message}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-3xl border border-line/40 bg-warm-base/95 p-4 shadow-sm lg:border-line/50 lg:bg-surface">
            <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search booking id, property, guest..."
                className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base text-primary outline-none focus:border-brand/45 focus:ring-4 focus:ring-brand/20 lg:bg-surface lg:text-sm"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base font-semibold text-primary lg:bg-surface lg:text-sm"
              >
                <option value="ALL">All statuses</option>
                {(derived?.statuses ?? []).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <CardList
            title="Platform bookings"
            subtitle="Open full booking detail pages for timeline, payment events, documents, and force-cancel"
            items={items}
            emptyTitle="No bookings"
            emptyDescription="No records match the current filters."
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-secondary">
              Page {state.data.page} of {derived?.totalPages ?? 1}
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                disabled={state.data.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-11 flex-1 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm disabled:opacity-50 sm:flex-none lg:bg-surface"
              >
                Prev
              </button>

              <button
                type="button"
                disabled={state.data.page >= (derived?.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
                className="h-11 flex-1 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm disabled:opacity-50 sm:flex-none lg:bg-surface"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
