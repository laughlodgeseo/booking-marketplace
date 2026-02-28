import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, ShieldCheck } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Cancellation Policy | Laugh & Lodge",
  description: "Simple cancellation policy for stays booked through Laugh & Lodge.",
};

type LegalSection = {
  title: string;
  body: ReadonlyArray<string>;
};

type CancellationCopy = {
  legalEyebrow: string;
  title: string;
  effectiveDate: string;
  heroBody: string;
  refundsPolicy: string;
  termsAndConditions: string;
  note: string;
  reviewRefundPolicy: string;
  contactSupport: string;
  sections: ReadonlyArray<LegalSection>;
};

const COPY: Record<"en" | "ar", CancellationCopy> = {
  en: {
    legalEyebrow: "Legal",
    title: "Cancellation Policy",
    effectiveDate: "February 19, 2026",
    heroBody: "Cancellation outcomes depend on policy windows and booking status.",
    refundsPolicy: "Refund Policy",
    termsAndConditions: "Terms and Conditions",
    note:
      "Please review cancellation terms before payment. Policy windows can change refund eligibility.",
    reviewRefundPolicy: "Review refund policy",
    contactSupport: "Contact support",
    sections: [
      {
        title: "1. Policy Basis",
        body: [
          "Each reservation has a cancellation policy that defines timing, charges, and refunds.",
          "Policy rules depend on booking state and time details.",
        ],
      },
      {
        title: "2. Cancellation Windows",
        body: [
          "Some bookings allow full or partial refunds before a cutoff time, and lower or no refunds after it.",
          "The exact window depends on reservation policy, property terms, and booking timing.",
        ],
      },
      {
        title: "3. How to Cancel",
        body: [
          "Guests should cancel through their account booking area or approved support channels.",
          "Eligibility and outcomes are calculated based on the booking-specific policy.",
        ],
      },
      {
        title: "4. No-Show and Late Cancellation",
        body: [
          "No-show or late cancellation outcomes follow the reservation policy and may include partial or full charges.",
          "Final outcomes are based on the policy rules attached to that booking.",
        ],
      },
      {
        title: "5. Operational Exception Handling",
        body: [
          "In exceptional situations, support teams may review context within policy and legal limits.",
          "Any approved exception is documented for accountability.",
        ],
      },
    ],
  },
  ar: {
    legalEyebrow: "قانوني",
    title: "سياسة الإلغاء",
    effectiveDate: "19 فبراير 2026",
    heroBody: "نتائج الإلغاء تعتمد على نافذة السياسة ويتم تطبيقها عبر ضوابط حالة الحجز.",
    refundsPolicy: "سياسة الاسترداد",
    termsAndConditions: "الشروط والأحكام",
    note:
      "راجع دائماً شروط الإلغاء الظاهرة في سياق حجزك قبل الدفع، إذ قد تؤثر نوافذ السياسة بشكل مباشر على مبالغ الاسترداد.",
    reviewRefundPolicy: "مراجعة سياسة الاسترداد",
    contactSupport: "تواصل مع الدعم",
    sections: [
      {
        title: "1. أساس السياسة",
        body: [
          "يرتبط كل حجز بسياق سياسة إلغاء يحدد توقيت الإلغاء المسموح والرسوم أو المبالغ المستردة الناتجة.",
          "ترتبط قواعد السياسة بحالة الحجز وبيانات التوقيت لضمان الاتساق وقابلية التدقيق.",
        ],
      },
      {
        title: "2. نوافذ الإلغاء",
        body: [
          "قد تسمح بعض الحجوزات باسترداد كامل أو جزئي قبل موعد القطع، وباسترداد منخفض أو معدوم بعده.",
          "تعتمد النافذة المطبقة على إعدادات سياسة الحجز وشروط العقار وتوقيت إنشاء الحجز.",
        ],
      },
      {
        title: "3. طريقة الإلغاء",
        body: [
          "يجب على الضيوف تقديم طلب الإلغاء عبر صفحة الحجوزات في الحساب أو قنوات الدعم المعتمدة.",
          "تُحسب أهلية الإلغاء والنتائج وفق سياق السياسة الخاص بكل حجز.",
        ],
      },
      {
        title: "4. عدم الحضور والإلغاء المتأخر",
        body: [
          "نتائج عدم الحضور أو الإلغاء المتأخر تتبع السياسة المرفقة بالحجز وقد تتضمن خصماً جزئياً أو كاملاً.",
          "المعالجة النهائية تعتمد على القواعد السارية لذلك الحجز.",
        ],
      },
      {
        title: "5. معالجة الاستثناءات التشغيلية",
        body: [
          "عند حدوث ظروف استثنائية، قد يقوم فريق الدعم بمراجعة الحالة وتطبيق قرار ضمن حدود السياسة والمتطلبات القانونية.",
          "يتم توثيق أي استثناء معتمد لضمان المساءلة.",
        ],
      },
    ],
  },
};

export default async function CancellationPage() {
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
            <Link href="/refunds" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
              {copy.refundsPolicy}
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
                <CalendarClock className="h-4 w-4" />
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
                href="/refunds"
                className="site-cta-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
              >
                {copy.reviewRefundPolicy}
                <ArrowRight className={arrowClass} />
              </Link>
              <Link
                href="/contact"
                className="site-cta-muted inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
              >
                {copy.contactSupport}
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
