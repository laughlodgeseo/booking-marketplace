import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/server";
import { CreateBookingCardBatchA } from "@/components/checkout/CreateBookingCardBatchA";
import { PendingPaymentCard } from "@/components/checkout/PendingPaymentCard";
import CurrencySwitcher from "@/components/currency/CurrencySwitcher";

type PageProps = {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{
    holdId?: string;
    slug?: string;
    guests?: string;
    checkIn?: string;
    checkOut?: string;
  }>;
};

export default async function CheckoutPage(props: PageProps) {
  const locale = await getRequestLocale();
  const isAr = locale === "ar";
  const { propertyId } = await props.params;
  const sp = await props.searchParams;

  const holdId = (sp.holdId ?? "").trim();
  const slug = (sp.slug ?? "").trim();
  const isDirectBooking = !holdId;

  const guestsRaw = (sp.guests ?? "").trim();
  const guestsNum = Number(guestsRaw);
  const guestsSafe = Number.isFinite(guestsNum) && guestsNum >= 1 ? guestsNum : 2;
  const checkIn = (sp.checkIn ?? "").trim();
  const checkOut = (sp.checkOut ?? "").trim();
  const hasStayDates = /^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut);
  const nights = hasStayDates
    ? Math.max(
        1,
        Math.round(
          (new Date(`${checkOut}T00:00:00Z`).getTime() -
            new Date(`${checkIn}T00:00:00Z`).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : null;

  const backToPropertyHref = slug ? `/properties/${encodeURIComponent(slug)}` : `/properties`;

  return (
    <main className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-primary">
              {isAr ? "إتمام الحجز" : "Complete your booking"}
            </h1>
            <p className="mt-1 text-sm text-secondary">
              {isAr ? "راجع تفاصيل إقامتك وأكمل الدفع." : "Review your stay details and complete payment."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={backToPropertyHref}
              className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-primary transition hover:bg-warm-alt"
            >
              {isAr ? "العودة إلى العقار" : "Back to property"}
            </Link>
          </div>
        </div>

        {/* Stay details card */}
        {hasStayDates && (
          <div className="premium-card premium-card-tinted mt-6 rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm font-semibold text-primary">{isAr ? "تفاصيل الإقامة" : "Your stay"}</div>
              <CurrencySwitcher compact />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[rgb(var(--color-bg-rgb)/0.72)] px-4 py-3 text-xs text-secondary">
                <span className="block font-semibold text-primary">{isAr ? "تاريخ الوصول" : "Check-in"}</span>
                {checkIn}
              </div>
              <div className="rounded-xl bg-[rgb(var(--color-bg-rgb)/0.72)] px-4 py-3 text-xs text-secondary">
                <span className="block font-semibold text-primary">{isAr ? "تاريخ المغادرة" : "Check-out"}</span>
                {checkOut}
              </div>
              <div className="rounded-xl bg-[rgb(var(--color-bg-rgb)/0.72)] px-4 py-3 text-xs text-secondary">
                <span className="block font-semibold text-primary">{isAr ? "الضيوف" : "Guests"}</span>
                {guestsSafe}{typeof nights === "number" ? ` · ${nights} ${isAr ? "ليالٍ" : "nights"}` : ""}
              </div>
            </div>
          </div>
        )}

        {isDirectBooking ? (
          <div className="mt-6">
            <PendingPaymentCard bookingId={propertyId} status="PENDING_PAYMENT" />
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <CreateBookingCardBatchA propertyId={propertyId} holdId={holdId} guests={guestsSafe} />
          </div>
        )}
      </div>
    </main>
  );
}
