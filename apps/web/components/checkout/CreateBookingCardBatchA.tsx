"use client";

import Link from "next/link";
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
  const propertyId = (props.propertyId ?? "").trim();
  const holdId = (props.holdId ?? "").trim();

  const canCreate = useMemo(() => holdId.length > 0 && propertyId.length > 0, [holdId, propertyId]);

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
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
          >
            {isAr ? "الذهاب لتسجيل الدخول" : "Go to login"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold tracking-wide text-muted">{isAr ? "إتمام الحجز" : "Checkout"}</div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-primary">
            {isAr ? "إنشاء الحجز" : "Create booking"}
          </h2>
          <p className="mt-2 text-sm text-secondary">
            {isAr ? (
              <>
                سيتم تحويل الحجز المؤقت <span className="font-semibold">النشط</span> إلى حجز فعلي. يطبق الخادم قواعد
                سلامة المخزون.
              </>
            ) : (
              <>
                This will convert your <span className="font-semibold">ACTIVE</span> hold into a booking. Inventory
                safety rules are enforced by the backend.
              </>
            )}
          </p>
        </div>

        <div className={classNames("rounded-xl border px-3 py-1.5 text-xs font-semibold", canCreate ? "border-line bg-warm-alt text-secondary" : "border-danger/30 bg-danger/12 text-danger")}>
          {canCreate ? (isAr ? "جاهز" : "READY") : isAr ? "الحجز المؤقت مفقود" : "MISSING HOLD"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-warm-alt p-4">
          <div className="text-xs font-semibold text-secondary">{isAr ? "العقار" : "Property"}</div>
          <div className="mt-1 text-sm font-semibold text-primary break-all">{propertyId || "—"}</div>
        </div>

        <div className="rounded-xl border border-line bg-warm-alt p-4">
          <div className="text-xs font-semibold text-secondary">{isAr ? "الحجز المؤقت" : "Hold"}</div>
          <div className="mt-1 text-sm font-semibold text-primary break-all">{holdId || "—"}</div>
        </div>

        <div className="rounded-xl border border-line bg-warm-alt p-4">
          <div className="text-xs font-semibold text-secondary">{isAr ? "الضيوف" : "Guests"}</div>
          <div className="mt-1 text-sm font-semibold text-primary">{props.guests}</div>
        </div>
      </div>

      {view.kind === "error" ? (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger">
          {view.message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void onCreate()}
          disabled={!canCreate || view.kind === "creating"}
          className={classNames(
            "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm",
            !canCreate || view.kind === "creating"
              ? "cursor-not-allowed bg-warm-alt text-muted"
              : "bg-brand text-accent-text hover:bg-brand-hover"
          )}
        >
          {view.kind === "creating"
            ? isAr
              ? "جارٍ الإنشاء…"
              : "Creating…"
            : isAr
              ? "إنشاء الحجز"
              : "Create booking"}
        </button>

        <Link
          href="/properties"
          className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt"
        >
          {isAr ? "العودة للتصفح" : "Back to browsing"}
        </Link>
      </div>

      <div className="mt-4 text-xs leading-5 text-muted">
        {isAr
          ? "إذا انتهت صلاحية الحجز المؤقت ستظهر رسالة آمنة مع طلب إعادة التحقق من التواريخ."
          : "If the hold has expired, you'll be shown a safe message and asked to re-check dates."}
      </div>
    </div>
  );
}
