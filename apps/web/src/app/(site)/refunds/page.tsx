import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Refund Policy | Laugh & Lodge",
  description: "Refund policy for reservations booked through Laugh & Lodge.",
};

type LegalSection = {
  title: string;
  body: ReadonlyArray<string>;
};

type RefundCopy = {
  legalEyebrow: string;
  title: string;
  effectiveDate: string;
  heroBody: string;
  cancellationPolicy: string;
  termsAndConditions: string;
  note: string;
  contactRefundSupport: string;
  reviewCancellation: string;
  sections: ReadonlyArray<LegalSection>;
};

const COPY: Record<"en" | "ar", RefundCopy> = {
  en: {
    legalEyebrow: "Legal",
    title: "Refund Policy",
    effectiveDate: "February 19, 2026",
    heroBody: "Refund processing follows policy-window eligibility and payment-state controls to protect consistency.",
    cancellationPolicy: "Cancellation Policy",
    termsAndConditions: "Terms and Conditions",
    note: "Refund timing depends on provider and bank processing cycles even after approval is recorded.",
    contactRefundSupport: "Contact refund support",
    reviewCancellation: "Review cancellation policy",
    sections: [
      {
        title: "1. Refund Eligibility",
        body: [
          "Refund outcomes depend on the booking-specific cancellation policy, timing of the cancellation request, and payment status.",
          "Some reservations may be fully refundable, partially refundable, or non-refundable based on policy context.",
        ],
      },
      {
        title: "2. Refund Calculation Logic",
        body: [
          "Refund amounts are derived from policy-window outcomes and reservation data, then applied through backend processing workflows.",
          "Applicable charges, penalties, or retained components are reflected according to policy conditions.",
        ],
      },
      {
        title: "3. Processing Timeline",
        body: [
          "Once approved, refund settlement timing depends on payment provider and banking channels.",
          "Processing visibility may vary by payment method and issuer.",
        ],
      },
      {
        title: "4. Duplicate and Fraud Prevention",
        body: [
          "Refund workflows use state controls to reduce duplicate processing and inconsistent outcomes.",
          "Disputed or suspicious activity may be reviewed before final release.",
        ],
      },
      {
        title: "5. Support and Disputes",
        body: [
          "If you believe a refund outcome is incorrect, contact support with booking reference details and relevant context.",
          "All refund-related communications should be made through official support channels for traceability.",
        ],
      },
    ],
  },
  ar: {
    legalEyebrow: "قانوني",
    title: "سياسة الاسترداد",
    effectiveDate: "19 فبراير 2026",
    heroBody: "تتم معالجة الاسترداد وفق أهلية نافذة السياسة وضوابط حالة الدفع لضمان الاتساق.",
    cancellationPolicy: "سياسة الإلغاء",
    termsAndConditions: "الشروط والأحكام",
    note: "توقيت وصول مبلغ الاسترداد يعتمد على مزود الدفع ودورات المعالجة البنكية حتى بعد اعتماد الطلب.",
    contactRefundSupport: "تواصل مع دعم الاسترداد",
    reviewCancellation: "مراجعة سياسة الإلغاء",
    sections: [
      {
        title: "1. أهلية الاسترداد",
        body: [
          "تعتمد نتائج الاسترداد على سياسة الإلغاء الخاصة بالحجز وتوقيت طلب الإلغاء وحالة الدفع.",
          "قد تكون بعض الحجوزات قابلة للاسترداد الكامل أو الجزئي أو غير قابلة للاسترداد بحسب سياق السياسة.",
        ],
      },
      {
        title: "2. منطق احتساب الاسترداد",
        body: [
          "يتم اشتقاق مبالغ الاسترداد من نتائج نافذة السياسة وبيانات الحجز ثم تطبيقها عبر سير عمل خلفي.",
          "تظهر الرسوم أو الخصومات أو البنود المحتجزة وفق شروط السياسة المعمول بها.",
        ],
      },
      {
        title: "3. الجدول الزمني للمعالجة",
        body: [
          "بعد الموافقة، يعتمد وقت تسوية الاسترداد على مزود الدفع والقنوات البنكية.",
          "قد تختلف سرعة ظهور المعالجة حسب وسيلة الدفع والجهة المصدرة.",
        ],
      },
      {
        title: "4. منع التكرار والاحتيال",
        body: [
          "تستخدم مسارات الاسترداد ضوابط حالة لتقليل التكرار والنتائج غير المتسقة.",
          "قد تتم مراجعة الحالات المتنازع عليها أو المشتبه بها قبل الإطلاق النهائي للمبلغ.",
        ],
      },
      {
        title: "5. الدعم والنزاعات",
        body: [
          "إذا كنت ترى أن نتيجة الاسترداد غير صحيحة، تواصل مع الدعم مع مرجع الحجز والسياق المرتبط.",
          "يجب أن تتم مراسلات الاسترداد عبر قنوات الدعم الرسمية لضمان التتبع.",
        ],
      },
    ],
  },
};

export default async function RefundsPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const arrowClass = locale === "ar" ? "h-4 w-4 text-indigo-100 rotate-180" : "h-4 w-4 text-indigo-100";

  return (
    <main className="indigo-no-gold min-h-screen bg-transparent">
      <section className="site-hero-shell relative overflow-hidden text-white">
        <div className="site-hero-grid absolute inset-0 opacity-25" />
        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-12 sm:px-6 sm:pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.legalEyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-sm text-white/84 sm:text-base">
            {locale === "ar" ? "تاريخ النفاذ:" : "Effective date:"} {copy.effectiveDate}. {copy.heroBody}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-white/85">
            <Link href="/cancellation" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
              {copy.cancellationPolicy}
            </Link>
            <Link href="/terms" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
              {copy.termsAndConditions}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="site-surface-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/58 p-4 text-sm text-indigo-900">
              <span className="site-icon-plate mt-0.5 h-8 w-8 shrink-0 rounded-lg">
                <RotateCcw className="h-4 w-4" />
              </span>
              <span>{copy.note}</span>
            </div>

            <div className="mt-6 space-y-5">
              {copy.sections.map((section) => (
                <article
                  key={section.title}
                  className="rounded-2xl border border-indigo-100/80 bg-[linear-gradient(180deg,rgba(248,242,232,0.96),rgba(240,233,220,0.72))] p-5"
                >
                  <h2 className="text-base font-semibold text-primary">{section.title}</h2>
                  <div className="mt-2 space-y-2">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-relaxed text-secondary/84">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="site-cta-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
              >
                {copy.contactRefundSupport}
                <ArrowRight className={arrowClass} />
              </Link>
              <Link
                href="/cancellation"
                className="site-cta-muted inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
              >
                {copy.reviewCancellation}
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
