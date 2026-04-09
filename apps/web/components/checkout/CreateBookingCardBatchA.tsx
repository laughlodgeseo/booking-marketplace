"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { createBookingFromHold } from "@/lib/api/bookings";
import { PendingPaymentCard } from "@/components/checkout/PendingPaymentCard";
import { HoldExpiredCard } from "@/components/checkout/HoldExpiredCard";
import { normalizeLocale } from "@/lib/i18n/config";

type ViewState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "unauthorized" }
  | { kind: "holdExpired" }
  | { kind: "error"; message: string }
  | { kind: "created"; bookingId: string; status: string };

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isUnauthorizedError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const s = msg.toLowerCase();
  return s.includes("unauthorized") || s.includes("401");
}

function isHoldExpiredError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const s = msg.toLowerCase();
  // match multiple realistic backend messages
  return (
    (s.includes("hold") && s.includes("expire")) ||
    (s.includes("hold") && s.includes("not active")) ||
    s.includes("expired hold") ||
    s.includes("hold is not active")
  );
}

function getOrCreateIdempotencyKey(holdId: string): string {
  const key = `booking:idemp:${holdId}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing && existing.trim().length > 0) return existing.trim();
  } catch {
    // ignore
  }

  const v =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `idemp_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  try {
    localStorage.setItem(key, v);
  } catch {
    // ignore
  }
  return v;
}

function extractBookingFromUnknown(x: unknown): { id: string; status: string } | null {
  if (!x || typeof x !== "object") return null;

  // Most likely backend returns booking object: { id, status, ... }
  const anyObj = x as Record<string, unknown>;
  const id = typeof anyObj.id === "string" ? anyObj.id : null;
  const status = typeof anyObj.status === "string" ? anyObj.status : null;

  if (id && status) return { id, status };

  // Sometimes wrapped: { booking: { id, status } }
  const booking = anyObj.booking;
  if (booking && typeof booking === "object") {
    const b = booking as Record<string, unknown>;
    const id2 = typeof b.id === "string" ? b.id : null;
    const st2 = typeof b.status === "string" ? b.status : null;
    if (id2 && st2) return { id: id2, status: st2 };
  }

  return null;
}

export function CreateBookingCardBatchA(props: { propertyId: string; holdId: string; guests: number }) {
  const locale = normalizeLocale(useLocale());
  const isAr = locale === "ar";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const propertyId = (props.propertyId ?? "").trim();
  const holdId = (props.holdId ?? "").trim();

  const canCreate = useMemo(() => holdId.length > 0 && propertyId.length > 0, [holdId, propertyId]);
  const loginHref = useMemo(() => {
    const currentQuery = searchParams.toString();
    const next = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    const qp = new URLSearchParams();
    qp.set("role", "customer");
    qp.set("next", next);
    return `/login?${qp.toString()}`;
  }, [pathname, searchParams]);

  const [view, setView] = useState<ViewState>({ kind: "idle" });

  // If a previous run already created booking (e.g., refresh), we keep UI stable by not resetting automatically.
  // The PendingPaymentCard itself will refresh/poll backend truth.
  useEffect(() => {
    // no-op placeholder for future: could restore last bookingId per hold if desired
  }, []);

  async function onCreate() {
    if (!canCreate) return;

    setView({ kind: "creating" });

    try {
      const idempotencyKey = getOrCreateIdempotencyKey(holdId);
      const res = await createBookingFromHold({ holdId, idempotencyKey });

      const hit = extractBookingFromUnknown(res);
      if (!hit) {
        // fallback: we *must* still show something safe
        setView({
          kind: "error",
          message: isAr
            ? "تم إنشاء الحجز لكن صيغة الاستجابة غير متوقعة. يرجى الذهاب إلى الحساب ← الحجوزات."
            : "Booking created but response shape was unexpected. Please go to Account → Bookings.",
        });
        return;
      }

      setView({ kind: "created", bookingId: hit.id, status: hit.status });
    } catch (e) {
      if (isUnauthorizedError(e)) {
        setView({ kind: "unauthorized" });
        return;
      }
      if (isHoldExpiredError(e)) {
        setView({ kind: "holdExpired" });
        return;
      }

      setView({ kind: "error", message: e instanceof Error ? e.message : "Failed to create booking" });
    }
  }

  if (view.kind === "created") {
    // This becomes B2/B3 (pending payment) handled by PendingPaymentCard
    return <PendingPaymentCard bookingId={view.bookingId} status={view.status} />;
  }

  if (view.kind === "holdExpired") {
    return <HoldExpiredCard propertyId={propertyId} propertySlug={null} />;
  }

  if (view.kind === "unauthorized") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="text-sm font-semibold text-primary">{isAr ? "يرجى تسجيل الدخول" : "Please log in"}</div>
        <p className="mt-2 text-sm text-secondary">
          {isAr ? "يجب تسجيل الدخول لإنشاء الحجز." : "You must be logged in to create a booking."}
        </p>
        <div className="mt-5">
          <Link
            href={loginHref}
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
          >
            {isAr ? "الذهاب لتسجيل الدخول" : "Go to login"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status banner when not ready */}
      {!canCreate && (
        <div className="rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {isAr ? "الحجز المؤقت مفقود. يرجى العودة واختيار التواريخ مجدداً." : "Reservation hold is missing. Please go back and select your dates again."}
        </div>
      )}

      {/* Intro */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {isAr ? "تأكيد حجزك" : "Confirm your reservation"}
        </h2>
        <p className="mt-1.5 text-sm text-secondary">
          {isAr
            ? "تواريخك محجوزة مؤقتاً. انقر أدناه لتأكيد الحجز والانتقال إلى صفحة الدفع."
            : "Your dates are temporarily held. Click below to confirm your reservation and proceed to payment."}
        </p>
      </div>

      {view.kind === "error" ? (
        <div className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {view.message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void onCreate()}
        disabled={!canCreate || view.kind === "creating"}
        className={classNames(
          "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold shadow-sm transition",
          !canCreate || view.kind === "creating"
            ? "cursor-not-allowed bg-warm-alt text-muted"
            : "bg-brand text-accent-text hover:bg-brand-hover"
        )}
      >
        {view.kind === "creating"
          ? isAr ? "جارٍ التأكيد…" : "Confirming…"
          : isAr ? "تأكيد والانتقال للدفع" : "Confirm & go to payment"}
      </button>

      <p className="text-xs text-muted">
        {isAr
          ? "لن يتم تحصيل أي رسوم حتى إتمام عملية الدفع بنجاح."
          : "You won't be charged until payment is successfully completed."}
      </p>
    </div>
  );
}
