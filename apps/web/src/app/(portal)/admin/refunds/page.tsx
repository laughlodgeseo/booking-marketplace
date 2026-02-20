"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PortalShell } from "@/components/portal/PortalShell";
import { Toolbar } from "@/components/portal/ui/Toolbar";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";

import { getAdminRefunds } from "@/lib/api/portal/admin";

type AdminRefundsResponse = Awaited<ReturnType<typeof getAdminRefunds>>;

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminRefundsResponse };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function getString(value: unknown, key: string): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const field = record[key];
  return typeof field === "string" ? field : null;
}

function getNumber(value: unknown, key: string): number | null {
  const record = asRecord(value);
  if (!record) return null;
  const field = record[key];
  return typeof field === "number" && Number.isFinite(field) ? field : null;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null) return "-";
  return `${amount.toLocaleString()} ${currency ?? ""}`.trim();
}

function toneForStatus(status: string | null) {
  const normalized = (status ?? "").toUpperCase();
  if (normalized.includes("SUCCEEDED") || normalized.includes("SUCCESS")) return "success" as const;
  if (normalized.includes("FAILED") || normalized.includes("CANCEL")) return "danger" as const;
  if (normalized.includes("PENDING")) return "warning" as const;
  return "neutral" as const;
}

export default function AdminRefundsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    let alive = true;

    async function run() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminRefunds({ page: 1, pageSize: 100 });
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

    void run();
    return () => {
      alive = false;
    };
  }, []);

  const statuses = useMemo(() => {
    if (state.kind !== "ready") return [];
    return Array.from(
      new Set(
        state.data.items
          .map((row) => getString(row, "status"))
          .filter((value): value is string => Boolean(value))
      )
    );
  }, [state]);

  const rows = useMemo(() => {
    if (state.kind !== "ready") return [];

    return state.data.items.filter((row) => {
      if (status !== "ALL" && getString(row, "status") !== status) return false;
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return JSON.stringify(row).toLowerCase().includes(query);
    });
  }, [state, q, status]);

  return (
    <PortalShell
      role="admin"
      title="Refunds"
      subtitle="Open full refund detail pages with provider refs and cancellation audit"
    >
      <div className="space-y-5">
        <Toolbar
          title="Refund records"
          subtitle="Track refund execution state and related booking/payment context."
          searchPlaceholder="Search refund id, booking id, provider ref..."
          onSearch={setQ}
          right={(
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base font-semibold text-primary lg:h-10 lg:rounded-xl lg:border-line/80 lg:bg-surface lg:px-3 lg:text-sm"
            >
              <option value="ALL">All statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          )}
        />

        {state.kind === "loading" ? (
          <div className="grid gap-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
            {state.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-line/40 bg-warm-base/95 p-6 text-sm text-secondary lg:border-line/60 lg:bg-surface">
            No refunds match these filters.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const refundId = getString(row, "id") ?? String(index);
              const bookingId = getString(row, "bookingId");
              const refundStatus = getString(row, "status");
              const reason = getString(row, "reason");
              const amount = getNumber(row, "amount");
              const currency = getString(row, "currency");
              const createdAt = getString(row, "createdAt");

              return (
                <Link
                  key={refundId}
                  href={`/admin/refunds/${encodeURIComponent(refundId)}`}
                  className="block rounded-3xl border border-line/40 bg-warm-base/95 p-5 shadow-sm transition hover:bg-warm-alt/60 lg:border-line/60 lg:bg-surface"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-primary">Refund {refundId}</div>
                      <div className="mt-1 text-xs text-secondary">
                        Booking: {bookingId ?? "-"} · Reason: {reason ?? "-"}
                      </div>
                      <div className="mt-1 text-xs text-muted">Created: {formatDate(createdAt)}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-primary">{formatMoney(amount, currency)}</div>
                      <StatusPill tone={toneForStatus(refundStatus)}>{refundStatus ?? "-"}</StatusPill>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
