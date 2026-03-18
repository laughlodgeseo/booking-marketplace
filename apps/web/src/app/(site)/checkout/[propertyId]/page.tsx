import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/server";
import { CreateBookingCardBatchA } from "@/components/checkout/CreateBookingCardBatchA";
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
        <div className="premium-card premium-card-dark rounded-3xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-primary">
              {isAr ? "إتمام الحجز" : "Checkout"}
            </h1>
            <p className="mt-2 text-sm text-secondary">
              {isAr ? (
                <>
                  حوّل الحجز المؤقت إلى حجز فعلي. يصبح الحجز{" "}
                  <span className="font-semibold">مؤكداً</span> فقط بعد التحقق من أحداث الدفع.
                </>
              ) : (
                <>
                  Convert your hold into a booking. Booking becomes{" "}
                  <span className="font-semibold">CONFIRMED</span> only after verified payment events.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={backToPropertyHref}
              className="inline-flex items-center justify-center rounded-full border border-inverted/35 bg-transparent px-4 py-2 text-xs font-semibold text-inverted transition hover:bg-accent-soft/16"
            >
              {isAr ? "العودة إلى العقار" : "Back to property"}
            </Link>

            <Link
              href="/properties"
              className="inline-flex items-center justify-center rounded-full border border-inverted/35 bg-transparent px-4 py-2 text-xs font-semibold text-inverted transition hover:bg-accent-soft/16"
            >
              {isAr ? "تصفح الإقامات" : "Browse stays"}
            </Link>
          </div>
        </div>
        </div>

        <div className="premium-card premium-card-tinted mt-6 rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-primary">
                {isAr ? "مسار الحجز" : "Your reservation flow"}
              </div>
              <p className="mt-1 text-xs text-secondary">
                {isAr
                  ? "الحجز المؤقت يمنع التداخل، والحجز النهائي مرتبط بالدفع ومؤكد عبر Webhook."
                  : "A hold prevents double booking. Final confirmation is done through verified payment webhooks."}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <CurrencySwitcher compact />
              <div className="flex flex-wrap justify-end gap-2">
              <div className="rounded-full border border-line bg-warm-alt px-4 py-2 text-xs font-semibold text-primary">
                {isAr ? "معرف العقار:" : "Property ID:"} <span className="font-mono">{propertyId}</span>
              </div>

              {holdId ? (
                <div className="rounded-full border border-line bg-warm-alt px-4 py-2 text-xs font-semibold text-primary">
                  {isAr ? "معرف الحجز المؤقت:" : "Hold ID:"} <span className="font-mono">{holdId}</span>
                </div>
              ) : null}
              </div>
            </div>
          </div>

          <ol className="mt-5 grid gap-3 text-sm text-secondary sm:grid-cols-3">
            <li className="premium-card premium-card-tinted rounded-2xl p-4">
              <div className="text-xs font-semibold text-muted">{isAr ? "الخطوة 1" : "Step 1"}</div>
              <div className="mt-1 font-semibold text-primary">{isAr ? "تسجيل الدخول" : "Sign in"}</div>
              <div className="mt-1 text-xs text-secondary">
                {isAr ? "تحويلك لتسجيل الدخول يتم مع الحفاظ على تفاصيل الحجز." : "Login redirects keep your selected stay details."}
              </div>
            </li>

            <li className="premium-card premium-card-tinted rounded-2xl p-4">
              <div className="text-xs font-semibold text-muted">{isAr ? "الخطوة 2" : "Step 2"}</div>
              <div className="mt-1 font-semibold text-primary">{isAr ? "إنشاء الحجز المؤقت" : "Create hold"}</div>
              <div className="mt-1 text-xs text-secondary">
                {isAr ? "منع الحجز المزدوج عبر تجميد المخزون." : "Inventory is safely locked to prevent double booking."}
              </div>
            </li>

            <li className="premium-card premium-card-tinted rounded-2xl p-4">
              <div className="text-xs font-semibold text-muted">{isAr ? "الخطوة 3" : "Step 3"}</div>
              <div className="mt-1 font-semibold text-primary">{isAr ? "تأكيد ودفع" : "Confirm & pay"}</div>
              <div className="mt-1 text-xs text-secondary">
                {isAr ? "يتم تأكيد الحجز عبر Webhook." : "Webhooks confirm booking."}
              </div>
            </li>
          </ol>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-warm-alt px-4 py-3 text-xs text-secondary">
              <span className="font-semibold text-primary">{isAr ? "تاريخ الوصول:" : "Check-in:"}</span>{" "}
              {hasStayDates ? checkIn : "—"}
            </div>
            <div className="rounded-xl border border-line bg-warm-alt px-4 py-3 text-xs text-secondary">
              <span className="font-semibold text-primary">{isAr ? "تاريخ المغادرة:" : "Check-out:"}</span>{" "}
              {hasStayDates ? checkOut : "—"}
            </div>
            <div className="rounded-xl border border-line bg-warm-alt px-4 py-3 text-xs text-secondary">
              <span className="font-semibold text-primary">{isAr ? "الضيوف:" : "Guests:"}</span> {guestsSafe}
              {typeof nights === "number" ? (
                <span className="ml-1">
                  • {nights} {isAr ? "ليالٍ" : "nights"}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-line bg-warm-alt px-4 py-3 text-xs text-secondary">
            <span className="font-semibold">{isAr ? "مهم:" : "Important:"}</span>{" "}
            {isAr
              ? "إذا فشل الدفع أو انتهت المهلة، قد يُلغى الحجز تلقائياً ويتم تحرير التوافر بأمان."
              : "if payment fails or expires, the booking may be cancelled automatically and availability is released safely."}
          </div>
        </div>

        {!holdId ? (
          <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/12 p-6 text-sm text-warning">
            <div className="font-semibold">{isAr ? "لا يوجد حجز مؤقت" : "No hold found"}</div>
            <p className="mt-2 text-warning/80">
              {isAr ? (
                <>
                  تتطلب هذه الصفحة <span className="font-semibold">holdId</span>. ارجع للعقار واختر التواريخ ثم اضغط{" "}
                  <span className="font-semibold">حجز مؤقت (تجميد التوافر)</span>.
                </>
              ) : (
                <>
                  This page requires <span className="font-semibold">holdId</span>. Go back to the property, select
                  dates, and click <span className="font-semibold">Reserve (hold inventory)</span>.
                </>
              )}
            </p>

            <div className="mt-4">
              <Link
                href={backToPropertyHref}
                className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-accent-text transition hover:bg-brand-hover"
              >
                {isAr ? "العودة إلى العقار" : "Back to property"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <CreateBookingCardBatchA propertyId={propertyId} holdId={holdId} guests={guestsSafe} />
          </div>
        )}
      </div>
    </main>
  );
}
