import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, ShieldCheck } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Cancellation Policy | Laugh & Lodge",
  description: "Cancellation policy for stays booked through Laugh & Lodge.",
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
    heroBody: "Cancellation outcomes are policy-window based and enforced through booking-state controls.",
    refundsPolicy: "Refund Policy",
    termsAndConditions: "Terms and Conditions",
    note:
      "Always review the cancellation terms shown in your booking context before payment. Policy windows can materially change refundable outcomes.",
    reviewRefundPolicy: "Review refund policy",
    contactSupport: "Contact support",
    sections: [
      {
        title: "1. Policy Basis",
        body: [
          "Each reservation is associated with a cancellation policy context that determines allowed cancellation timing and resulting charges or refunds.",
          "Policy rules are bound to reservation state and timing data for consistency and auditability.",
        ],
      },
      {
        title: "2. Cancellation Windows",
        body: [
          "Some bookings may allow full or partial refunds before a cutoff window and reduced or zero refunds after that window.",
          "The applicable window depends on reservation policy settings, property terms, and booking timing.",
        ],
      },
      {
        title: "3. How to Cancel",
        body: [
          "Guests should submit cancellation requests through their account booking area or approved support channels.",
          "Cancellation eligibility and resulting outcomes are calculated against the booking-specific policy context.",
        ],
      },
      {
        title: "4. No-Show and Late Cancellation",
        body: [
          "No-show or late cancellation outcomes follow the policy attached to the reservation and may incur partial or full booking charges.",
          "Final treatment is based on policy rules in effect for that booking.",
        ],
      },
      {
        title: "5. Operational Exception Handling",
        body: [
          "If exceptional situations occur, support teams may review context and apply decisions within policy and legal constraints.",
          "Any approved exceptions are documented for accountability.",
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
  const arrowClass = locale === "ar" ? "h-4 w-4 text-white/90 rotate-180" : "h-4 w-4 text-white/90";

  return (
    <main className="indigo-no-gold min-h-screen bg-transparent">
      <section className="relative overflow-hidden border-b border-white/24 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
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
          <div className="rounded-2xl border border-indigo-100/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-4 text-sm text-indigo-900">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-indigo-200 bg-white text-indigo-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              <span>{copy.note}</span>
            </div>

            <div className="mt-6 space-y-5">
              {copy.sections.map((section) => (
                <article key={section.title} className="rounded-2xl border border-indigo-100/80 bg-white p-5">
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
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/80 bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                {copy.reviewRefundPolicy}
                <ArrowRight className={arrowClass} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-line/80 bg-white px-4 py-3 text-sm font-semibold text-primary transition hover:bg-indigo-50"
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
