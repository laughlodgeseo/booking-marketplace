"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Timer } from "lucide-react";
import { useBookingPoll } from "@/components/checkout/useBookingPoll";
import { findUserBookingById, type BookingListItem } from "@/lib/api/bookings";

type ViewState =
  | { kind: "idle" }
  | { kind: "refreshing" }
  | { kind: "error"; message: string };

function upper(s: string): string {
  return (s ?? "").toUpperCase();
}

function fmtCountdown(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

export function PaymentReturnCard(props: { bookingId: string }) {
  const router = useRouter();
  const bookingId = (props.bookingId ?? "").trim();
  const [latest, setLatest] = useState<BookingListItem | null>(null);
  const [state, setState] = useState<ViewState>({ kind: "idle" });

  const poll = useBookingPoll({
    bookingId,
    enabled: Boolean(bookingId),
    intervalMs: 5000,
    maxMs: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (poll.state.booking) setLatest(poll.state.booking);
  }, [poll.state.booking]);

  const status = latest?.status ?? "";
  const s = upper(status);

  useEffect(() => {
    if (!bookingId) return;
    if (s.includes("CONFIRM")) {
      router.replace(`/payment/success?bookingId=${encodeURIComponent(bookingId)}`);
    } else if (s.includes("CANCEL")) {
      router.replace(`/payment/cancelled?bookingId=${encodeURIComponent(bookingId)}`);
    } else if (s.includes("EXPIRE")) {
      router.replace(`/payment/failed?bookingId=${encodeURIComponent(bookingId)}`);
    }
  }, [bookingId, router, s]);

  async function refresh() {
    if (!bookingId) return;
    setState({ kind: "refreshing" });
    try {
      const b = await findUserBookingById({ bookingId, maxPages: 50, pageSize: 20 });
      setLatest(b);
      setState({ kind: "idle" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Could not refresh" });
    }
  }

  useEffect(() => {
    if (!bookingId) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const pill = useMemo(() => {
    if (!status) return { label: "Pending", cls: "border-warning/30 bg-warning/12 text-warning" };
    if (s.includes("CONFIRM")) return { label: "CONFIRMED", cls: "border-success/30 bg-success/12 text-success" };
    if (s.includes("CANCEL")) return { label: "CANCELLED", cls: "border-danger/30 bg-danger/12 text-danger" };
    if (s.includes("EXPIRE")) return { label: "EXPIRED", cls: "border-danger/30 bg-danger/12 text-danger" };
    return { label: status, cls: "border-line/80 bg-warm-alt text-secondary" };
  }, [s, status]);

  return (
    <div className="premium-card premium-card-tinted rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-muted">Payment verification</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-primary">Verifying your payment</h1>
          <p className="mt-2 text-sm text-secondary">
            We&apos;re waiting for Stripe to confirm the payment and for the backend to finalize your booking.
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${pill.cls}`}>
          {pill.label}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-line/80 bg-surface/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-secondary">Booking</div>
            <div className="mt-1 text-sm text-primary">
              ID: <span className="font-mono text-xs">{bookingId || "—"}</span>
            </div>
            <div className="mt-1 text-sm text-secondary">
              Status: <span className="font-semibold">{status || "Pending"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-line/80 bg-white/70 px-3 py-1 text-xs font-semibold text-secondary">
            <Timer className="h-3.5 w-3.5" />
            Live updates
          </div>
        </div>

        {poll.remainingMs !== null ? (
          <div className="mt-2 text-xs text-warning">
            Remaining: <span className="font-semibold">{fmtCountdown(poll.remainingMs)}</span>
          </div>
        ) : null}

        {state.kind === "error" ? (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
            <span className="font-semibold">Error:</span> {state.message}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={state.kind !== "idle"}
            className="inline-flex items-center justify-center rounded-xl border border-line/80 bg-surface/70 px-4 py-2 text-sm font-semibold text-primary hover:bg-surface disabled:opacity-60"
          >
            {state.kind === "refreshing" ? "Refreshing…" : "Refresh status"}
          </button>

          <Link
            href="/account/bookings"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
          >
            View my bookings
          </Link>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-secondary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Booking confirmation happens only after verified Stripe webhooks.
        </div>
      </div>
    </div>
  );
}
