"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Check, RotateCw } from "lucide-react";
import { useBookingPoll } from "@/components/checkout/useBookingPoll";
import { findUserBookingById, getUserBookingDetail, type BookingDetail, type BookingListItem } from "@/lib/api/bookings";
import { formatBookingStatusForCustomer, formatFriendlyBookingReference } from "@/lib/customerDisplay";
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
        "Your Dubai stay is confirmed. We have saved your booking and sent the confirmation details to your account.",
      cancelled: "You can retry payment while the booking is still pending.",
      failed: "If your booking is still pending and not expired, you can retry payment.",
    },
    status: {
      confirmed: "Confirmed",
      pending: "Payment pending",
      cancelled: "Cancelled",
      expired: "Expired",
    },
    booking: "Booking",
    id: "Booking reference:",
    statusLabel: "Status:",
    total: "Total:",
    expiresAt: "Expires at:",
    remaining: "Payment window remaining:",
    error: "Error:",
    refreshing: "Refreshing...",
    refresh: "Refresh status",
    viewBookings: "View my bookings",
    notePrefix: "Note:",
    noteBody: "Need help? Open your inbox from the customer portal.",
    continueBrowsing: "Continue browsing",
    unknown: "—",
    refreshError: "Could not refresh",
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
        "تم حفظ الحجز وإرسال تفاصيل التأكيد إلى حسابك.",
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
      "هل تحتاج إلى مساعدة؟ افتح صندوق الرسائل من بوابة العميل.",
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

function fmtShortDate(s?: string | null): string {
  if (!s) return COPY.en.unknown;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function fmtStayDates(checkIn?: string | null, checkOut?: string | null): string {
  if (!checkIn || !checkOut) return COPY.en.unknown;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return COPY.en.unknown;
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  }).format(start);
  const endText = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);
  return `${startText} - ${endText}`;
}

function moneyFromCents(cents?: number | null, currency?: string | null): string {
  if (cents == null || !currency) return COPY.en.unknown;
  const amount = cents;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency.toUpperCase() === "AED" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(currency.toUpperCase() === "AED" ? 0 : 2)} ${currency}`;
  }
}

export function PaymentResultCard(props: { tone: Tone; bookingId?: string }) {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];
  const bookingId = (props.bookingId ?? "").trim();
  const [latest, setLatest] = useState<BookingListItem | null>(null);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [state, setState] = useState<ViewState>({ kind: "idle" });

  const status = detail?.status ?? latest?.status ?? "";
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
      const [d, b] = await Promise.allSettled([
        getUserBookingDetail({ bookingId }),
        findUserBookingById({ bookingId, maxPages: 50, pageSize: 20 }),
      ]);
      if (d.status === "fulfilled") setDetail(d.value);
      if (b.status === "fulfilled") setLatest(b.value);
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
    if (props.tone === "success" && !status) return { label: copy.status.confirmed, cls: "border-indigo-100 bg-indigo-50 text-indigo-700" };
    if (!status) return { label: copy.unknown, cls: "border-slate-200 bg-slate-50 text-slate-600" };
    if (s.includes("CONFIRM")) return { label: copy.status.confirmed, cls: "border-indigo-100 bg-indigo-50 text-indigo-700" };
    if (s.includes("PENDING")) return { label: copy.status.pending, cls: "border-amber-200 bg-amber-50 text-amber-800" };
    if (s.includes("CANCEL")) return { label: copy.status.cancelled, cls: "border-red-200 bg-red-50 text-red-700" };
    if (s.includes("EXPIRE")) return { label: copy.status.expired, cls: "border-red-200 bg-red-50 text-red-700" };
    return { label: formatBookingStatusForCustomer(status), cls: "border-slate-200 bg-slate-50 text-slate-600" };
  }, [copy.status.cancelled, copy.status.confirmed, copy.status.expired, copy.status.pending, copy.unknown, props.tone, s, status]);

  const totalText = moneyFromCents(detail?.totalAmount ?? latest?.totalAmount, detail?.currency ?? latest?.currency);
  const stayDates = fmtStayDates(detail?.checkIn ?? latest?.checkIn, detail?.checkOut ?? latest?.checkOut);
  const guestCount =
    detail ? detail.adults + detail.children : null;
  const guestText = guestCount ? `${guestCount} guest${guestCount === 1 ? "" : "s"}` : null;
  const propertyTitle = detail?.property.title ?? latest?.propertyTitle ?? (props.tone === "success" ? "Your Dubai stay" : "Your booking");
  const reference = formatFriendlyBookingReference(bookingId);
  const viewBookingHref = bookingId ? `/account/bookings/${encodeURIComponent(bookingId)}` : "/account/bookings";

  return (
    <div className="rounded-[32px] border border-indigo-100 bg-white/95 p-6 shadow-[0_30px_100px_rgba(79,70,229,0.14)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-[0_18px_40px_rgba(79,70,229,0.22)]">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">{copy.headline[props.tone]}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{copy.subline[props.tone]}</p>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-[#faf8f5] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${pill.cls}`}>
            {pill.label}
          </span>
          <span className="text-xs font-semibold text-slate-500">{copy.id} {reference}</span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-2xl font-semibold text-slate-950">
            {totalText !== copy.unknown ? totalText : props.tone === "success" ? "Payment received" : copy.booking}
          </div>
          <div className="text-base font-semibold text-slate-900">{propertyTitle}</div>
          <div className="text-sm text-slate-600">{stayDates}</div>
          {guestText ? <div className="text-sm text-slate-600">{guestText}</div> : null}
          {latest?.createdAt ? (
            <div className="text-xs text-slate-500">Saved {fmtShortDate(latest.createdAt)}</div>
          ) : null}
          {latest?.expiresAt && s.includes("PENDING") ? (
            <div className="text-xs text-amber-800">
              Reservation expires {fmtDate(latest.expiresAt)}
            </div>
          ) : null}
          {poll.remainingMs != null && s.includes("PENDING") ? (
            <div className="text-xs text-amber-800">
              {copy.remaining} <span className="font-semibold">{Math.ceil(poll.remainingMs / 1000)}s</span>
            </div>
          ) : null}
        </div>

        {state.kind === "error" ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <span className="font-semibold">{copy.error}</span> {state.message}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        <Link
          href={viewBookingHref}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          View booking
        </Link>
        <Link
          href="/account/bookings"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {copy.viewBookings}
        </Link>
        <Link
          href="/properties"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950"
        >
          {copy.continueBrowsing}
        </Link>
      </div>

      {props.tone !== "success" || s.includes("PENDING") ? (
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={state.kind !== "idle"}
          className="mx-auto mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
        >
          <RotateCw className="h-3.5 w-3.5" />
          {state.kind === "refreshing" ? copy.refreshing : copy.refresh}
        </button>
      ) : null}

      <div className="mt-4 text-center text-xs text-slate-500">
        {copy.noteBody}
      </div>
    </div>
  );
}
