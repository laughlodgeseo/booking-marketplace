"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Timer } from "lucide-react";
import { useBookingPoll } from "@/components/checkout/useBookingPoll";
import { getBookingStatusDirect, type BookingListItem } from "@/lib/api/bookings";
import { formatBookingStatusForCustomer, formatFriendlyBookingReference } from "@/lib/customerDisplay";

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
      const b = await getBookingStatusDirect({ bookingId });
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
    if (!status) return { label: "Payment processing", cls: "border-amber-200 bg-amber-50 text-amber-800" };
    if (s.includes("CONFIRM")) return { label: "Confirmed", cls: "border-indigo-100 bg-indigo-50 text-indigo-700" };
    if (s.includes("CANCEL")) return { label: "Cancelled", cls: "border-red-200 bg-red-50 text-red-700" };
    if (s.includes("EXPIRE")) return { label: "Expired", cls: "border-red-200 bg-red-50 text-red-700" };
    return { label: formatBookingStatusForCustomer(status), cls: "border-slate-200 bg-slate-50 text-slate-600" };
  }, [s, status]);

  return (
    <div className="rounded-[32px] border border-indigo-100 bg-white/95 p-6 shadow-[0_30px_100px_rgba(79,70,229,0.14)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-slate-500">Payment</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Finalizing your booking</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your payment is processing. This usually takes a few seconds, and we&apos;ll send you to the confirmation page automatically.
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${pill.cls}`}>
          {pill.label}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-[#faf8f5] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-500">Booking</div>
            <div className="mt-1 text-sm text-slate-950">
              Reference: <span className="font-semibold">{formatFriendlyBookingReference(bookingId)}</span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Status: <span className="font-semibold">{status ? formatBookingStatusForCustomer(status) : "Payment processing"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            <Timer className="h-3.5 w-3.5" />
            Live updates
          </div>
        </div>

        {poll.remainingMs !== null ? (
          <div className="mt-2 text-xs text-amber-800">
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
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            {state.kind === "refreshing" ? "Refreshing…" : "Refresh status"}
          </button>

          <Link
            href="/account/bookings"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            View my bookings
          </Link>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-secondary">
          <ShieldCheck className="h-3.5 w-3.5" />
          We&apos;ll update your booking automatically when payment processing finishes.
        </div>
      </div>
    </div>
  );
}
