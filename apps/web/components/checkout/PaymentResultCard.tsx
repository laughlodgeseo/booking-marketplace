"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useBookingPoll } from "@/components/checkout/useBookingPoll";
import { findUserBookingById, type BookingListItem } from "@/lib/api/bookings";
import { normalizeLocale } from "@/lib/i18n/config";

type Tone = "success" | "failed" | "cancelled";

type ViewState =
  | { kind: "idle" }
  | { kind: "refreshing" }
  | { kind: "error"; message: string };

const COPY = {
  en: {
    sectionLabel: "Payment",
    headline: {
      success: "Payment successful",
      cancelled: "Payment cancelled",
      failed: "Payment failed",
    },
    subline: {
      success:
        "Your booking will be confirmed once the provider webhook is verified by the backend.",
      cancelled: "No worries - you can retry payment while the booking is still pending.",
      failed: "If your booking is still pending and not expired, you can retry payment.",
    },
    status: {
      confirmed: "CONFIRMED",
      pending: "PENDING",
      cancelled: "CANCELLED",
      expired: "EXPIRED",
    },
    booking: "Booking",
    id: "ID:",
    statusLabel: "Status:",
    total: "Total:",
    expiresAt: "Expires at:",
    remaining: "Payment window remaining:",
    error: "Error:",
    refreshing: "Refreshing...",
    refresh: "Refresh status",
    viewBookings: "View my bookings",
    notePrefix: "Note:",
    noteBody:
      "bookings become CONFIRMED only via verified provider webhooks.",
    continueBrowsing: "Continue browsing",
    unknown: "—",
    refreshError: "Failed to refresh",
  },
  ar: {
    sectionLabel: "الدفع",
    headline: {
      success: "تم الدفع بنجاح",
      cancelled: "تم إلغاء الدفع",
      failed: "فشل الدفع",
    },
    subline: {
      success:
        "سيتم تأكيد الحجز بعد التحقق من إشعار مزود الدفع (Webhook) من الخادم.",
      cancelled: "لا مشكلة - يمكنك إعادة المحاولة طالما أن الحجز ما زال قيد الانتظار.",
      failed: "إذا كان الحجز ما زال قيد الانتظار ولم تنتهِ صلاحيته، يمكنك إعادة محاولة الدفع.",
    },
    status: {
      confirmed: "مؤكد",
      pending: "قيد الانتظار",
      cancelled: "ملغي",
      expired: "منتهي",
    },
    booking: "الحجز",
    id: "المعرف:",
    statusLabel: "الحالة:",
    total: "الإجمالي:",
    expiresAt: "ينتهي في:",
    remaining: "الوقت المتبقي لنافذة الدفع:",
    error: "خطأ:",
    refreshing: "جارٍ التحديث...",
    refresh: "تحديث الحالة",
    viewBookings: "عرض حجوزاتي",
    notePrefix: "ملاحظة:",
    noteBody:
      "يصبح الحجز مؤكداً فقط عبر إشعارات مزود الدفع الموثقة.",
    continueBrowsing: "متابعة التصفح",
    unknown: "—",
    refreshError: "تعذر تحديث الحالة",
  },
} as const;

function upper(s: string): string {
  return (s ?? "").toUpperCase();
}

function fmtDate(s?: string | null): string {
  if (!s) return COPY.en.unknown;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function moneyFromCents(cents?: number | null, currency?: string | null): string {
  if (cents == null || !currency) return COPY.en.unknown;
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function PaymentResultCard(props: { tone: Tone; bookingId?: string }) {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];
  const bookingId = (props.bookingId ?? "").trim();
  const [latest, setLatest] = useState<BookingListItem | null>(null);
  const [state, setState] = useState<ViewState>({ kind: "idle" });

  const status = latest?.status ?? "";
  const s = upper(status);

  // Poll only if we have an id and it still looks pending
  const poll = useBookingPoll({
    bookingId,
    enabled: Boolean(bookingId) && s.includes("PENDING"),
    intervalMs: 5000,
    maxMs: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (poll.state.booking) setLatest(poll.state.booking);
  }, [poll.state.booking]);

  async function refresh() {
    if (!bookingId) return;
    setState({ kind: "refreshing" });
    try {
      const b = await findUserBookingById({ bookingId, maxPages: 50, pageSize: 20 });
      setLatest(b);
      setState({ kind: "idle" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : copy.refreshError });
    }
  }

  useEffect(() => {
    if (!bookingId) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const pill = useMemo(() => {
    if (!status) return { label: copy.unknown, cls: "border-line bg-warm-alt text-secondary" };
    if (s.includes("CONFIRM")) return { label: copy.status.confirmed, cls: "border-success/30 bg-success/12 text-success" };
    if (s.includes("PENDING")) return { label: copy.status.pending, cls: "border-warning/30 bg-warning/12 text-warning" };
    if (s.includes("CANCEL")) return { label: copy.status.cancelled, cls: "border-danger/30 bg-danger/12 text-danger" };
    if (s.includes("EXPIRE")) return { label: copy.status.expired, cls: "border-danger/30 bg-danger/12 text-danger" };
    return { label: status, cls: "border-line bg-warm-alt text-secondary" };
  }, [copy.status.cancelled, copy.status.confirmed, copy.status.expired, copy.status.pending, copy.unknown, s, status]);

  const toneShell =
    props.tone === "success"
      ? "premium-card premium-card-dark"
      : "premium-card premium-card-tinted";

  return (
    <div className={`${toneShell} rounded-2xl p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-muted">{copy.sectionLabel}</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-primary">{copy.headline[props.tone]}</h1>
          <p className="mt-2 text-sm text-secondary">{copy.subline[props.tone]}</p>
        </div>

        <span className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-semibold ${pill.cls}`}>
          {pill.label}
        </span>
      </div>

      <div className="premium-card premium-card-tinted mt-4 rounded-xl p-4">
        <div className="text-xs font-semibold text-secondary">{copy.booking}</div>
        <div className="mt-1 text-sm text-primary">
          {copy.id} <span className="font-mono text-xs">{bookingId || copy.unknown}</span>
        </div>
        <div className="mt-1 text-sm text-secondary">
          {copy.statusLabel} <span className="font-semibold">{status || copy.unknown}</span>
        </div>

        {latest?.totalAmount != null && latest?.currency ? (
          <div className="mt-1 text-sm text-secondary">
            {copy.total} <span className="font-semibold">{moneyFromCents(latest.totalAmount, latest.currency)}</span>
          </div>
        ) : null}

        {latest?.expiresAt ? (
          <div className="mt-1 text-xs text-secondary">
            {copy.expiresAt} <span className="font-semibold">{fmtDate(latest.expiresAt)}</span>
          </div>
        ) : null}

        {poll.remainingMs != null && s.includes("PENDING") ? (
          <div className="mt-2 text-xs text-warning">
            {copy.remaining} <span className="font-semibold">{Math.ceil(poll.remainingMs / 1000)}s</span>
          </div>
        ) : null}

        {state.kind === "error" ? (
          <div className="mt-3 rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
            <span className="font-semibold">{copy.error}</span> {state.message}
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={state.kind !== "idle"}
            className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-accent-soft/55 disabled:opacity-60"
          >
            {state.kind === "refreshing" ? copy.refreshing : copy.refresh}
          </button>

          <Link
            href="/account/bookings"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
          >
            {copy.viewBookings}
          </Link>
        </div>

        <div className="mt-3 text-xs text-secondary">
          {copy.notePrefix} {copy.noteBody}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/properties"
          className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-accent-soft/55"
        >
          {copy.continueBrowsing}
        </Link>
      </div>
    </div>
  );
}
