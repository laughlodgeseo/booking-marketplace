import Link from "next/link";
import { CircleHelp, Plus } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Faq = { q: string; a: string };

type PricingFaqCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  needHelp: string;
  contactTeam: string;
  faqs: Faq[];
};

const COPY: Record<AppLocale, PricingFaqCopy> = {
  en: {
    eyebrow: "FAQs",
    title: "Common questions on pricing and policy behavior",
    subtitle: "Quick clarity on totals, fees, and cancellation-linked outcomes before checkout.",
    needHelp: "Need booking-specific pricing help?",
    contactTeam: "Contact our team",
    faqs: [
      {
        q: "Can the total change after I reserve?",
        a: "Confirmed reservations use server-side state and pricing logic, so the charged amount follows the confirmed quote context.",
      },
      {
        q: "Is cleaning charged per night or per booking?",
        a: "Cleaning is usually a per-booking service component, not a nightly multiplier.",
      },
      {
        q: "Will I see cancellation terms before paying?",
        a: "Yes. Cancellation context is shown before payment so guests can review outcome windows in advance.",
      },
      {
        q: "Do you include local or regulatory fee components?",
        a: "Where applicable, local fee components are presented as part of the quote structure before checkout.",
      },
      {
        q: "How are refunds calculated if I cancel?",
        a: "Refund outcomes are policy-window based and applied through backend rules to keep calculations consistent.",
      },
      {
        q: "What if I need manual clarification on a quote?",
        a: "Our team can explain line items and policy implications before you commit payment.",
      },
    ],
  },
  ar: {
    eyebrow: "الأسئلة الشائعة",
    title: "أسئلة شائعة حول التسعير وسلوك السياسات",
    subtitle: "توضيح سريع للإجماليات والرسوم ونتائج الإلغاء قبل الدفع.",
    needHelp: "هل تحتاج مساعدة تسعير مرتبطة بحجز محدد؟",
    contactTeam: "تواصل مع فريقنا",
    faqs: [
      {
        q: "هل يمكن أن يتغير الإجمالي بعد إنشاء الحجز؟",
        a: "تستخدم الحجوزات المؤكدة منطق حالة وتسعير على الخادم، لذلك يتبع المبلغ المحصل سياق عرض السعر المؤكد.",
      },
      {
        q: "هل رسوم التنظيف تُحسب لكل ليلة أم لكل حجز؟",
        a: "غالباً تُحسب رسوم التنظيف كبند لكل حجز وليست مضاعفاً لعدد الليالي.",
      },
      {
        q: "هل أرى شروط الإلغاء قبل الدفع؟",
        a: "نعم. يتم عرض سياق الإلغاء قبل الدفع حتى يراجع الضيف نوافذ النتائج مسبقاً.",
      },
      {
        q: "هل تُدرج الرسوم المحلية أو التنظيمية؟",
        a: "عند الانطباق، تُعرض العناصر المحلية ضمن هيكل عرض السعر قبل الإتمام.",
      },
      {
        q: "كيف يتم احتساب الاسترداد عند الإلغاء؟",
        a: "نتائج الاسترداد قائمة على نافذة السياسة وتطبق عبر قواعد خلفية لضمان الاتساق.",
      },
      {
        q: "ماذا لو احتجت توضيحاً يدوياً لعناصر عرض السعر؟",
        a: "يمكن لفريقنا شرح البنود وتأثيرات السياسة قبل التزامك بالدفع.",
      },
    ],
  },
};

export default function PricingFaq(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];

  return (
    <section id="pricing-faq" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.title}</h2>
          <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.subtitle}</p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {copy.faqs.map((faq) => (
            <details
              key={faq.q}
              className="site-surface-card group rounded-2xl p-6 open:border-indigo-200"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-base font-semibold text-primary">
                <span className="flex items-start gap-3">
                  <span className="site-icon-plate mt-0.5 h-7 w-7 shrink-0 rounded-lg">
                    <CircleHelp className="h-4 w-4" />
                  </span>
                  <span>{faq.q}</span>
                </span>
                <span className="site-icon-plate h-7 w-7 shrink-0 rounded-lg">
                  <Plus className="h-4 w-4 transition-transform duration-200 group-open:rotate-45" />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-secondary/84">{faq.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-secondary/75">{copy.needHelp}</span>
          <Link
            href="/contact"
            className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500"
          >
            {copy.contactTeam}
          </Link>
        </div>
      </div>
    </section>
  );
}
