import Link from "next/link";
import { CircleHelp, FileText, Plus, ShieldCheck } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Faq = { q: string; a: string };

type OwnersFaqCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  needReviewTitle: string;
  needReviewBody: string;
  bookCall: string;
  createVendor: string;
  policySafe: string;
  policySafeBody: string;
  legalTitle: string;
  legalBody: string;
  faqs: Faq[];
};

const COPY: Record<AppLocale, OwnersFaqCopy> = {
  en: {
    eyebrow: "FAQs",
    title: "Questions owners ask before onboarding",
    subtitle: "Clear answers on operating model, risk controls, and what to expect from launch to scale.",
    needReviewTitle: "Need property-specific review?",
    needReviewBody: "Share your unit details and target goals for tailored guidance.",
    bookCall: "Book an owner call",
    createVendor: "Create vendor account",
    policySafe: "Policy-safe onboarding framework",
    policySafeBody: "Commercial and operational expectations are documented before launch.",
    legalTitle: "Need commercial or legal clarification?",
    legalBody:
      "Our team can walk you through scope boundaries, program responsibilities, and policy implications before you commit.",
    faqs: [
      {
        q: "How do you reduce double-booking and availability conflicts?",
        a: "Inventory safety is controlled through reservation-state logic, holds, and backend quote validation before booking creation.",
      },
      {
        q: "Can you manage Dubai holiday-home operations end-to-end?",
        a: "Yes. Managed and semi-managed programs cover operational execution layers including readiness, service delivery, and issue escalation.",
      },
      {
        q: "How are cancellations and refund outcomes controlled?",
        a: "Outcomes follow stored policy windows and timing rules enforced server-side, so decisions remain consistent and auditable.",
      },
      {
        q: "What is required from me to start onboarding?",
        a: "Core property details, media readiness, contact information, and your preferred management depth are required for initial scoping.",
      },
      {
        q: "Can I start listing-only and move to managed later?",
        a: "Yes. Program depth can evolve as your portfolio scales or your operating preference changes.",
      },
      {
        q: "How do you report performance to owners?",
        a: "Operational and booking visibility is structured around occupancy, revenue trend, quality outcomes, and exception tracking.",
      },
    ],
  },
  ar: {
    eyebrow: "الأسئلة الشائعة",
    title: "أسئلة يطرحها الملاك قبل بدء التسجيل",
    subtitle: "إجابات واضحة حول نموذج التشغيل وضبط المخاطر وما يمكن توقعه من الإطلاق إلى التوسع.",
    needReviewTitle: "هل تحتاج مراجعة خاصة لعقارك؟",
    needReviewBody: "شارك تفاصيل وحدتك وأهدافك لنقدم لك توجيهاً مخصصاً.",
    bookCall: "احجز مكالمة للمالك",
    createVendor: "أنشئ حساب مورّد",
    policySafe: "إطار تسجيل متوافق مع السياسات",
    policySafeBody: "يتم توثيق التوقعات التجارية والتشغيلية قبل الإطلاق.",
    legalTitle: "هل تحتاج توضيحاً تجارياً أو قانونياً؟",
    legalBody:
      "يمكن لفريقنا شرح حدود النطاق ومسؤوليات البرنامج والآثار المرتبطة بالسياسات قبل اتخاذ القرار.",
    faqs: [
      {
        q: "كيف تقللون مخاطر التداخل في الحجوزات وتعارض التوافر؟",
        a: "سلامة المخزون تُدار عبر منطق حالات الحجز والحجز المؤقت والتحقق الخلفي من عروض الأسعار قبل إنشاء الحجز النهائي.",
      },
      {
        q: "هل يمكنكم إدارة تشغيل بيوت العطلات في دبي بشكل متكامل؟",
        a: "نعم. برامج الإدارة الكاملة والمشتركة تغطي طبقات التنفيذ التشغيلي بما فيها الجاهزية وتقديم الخدمة والتصعيد.",
      },
      {
        q: "كيف يتم ضبط نتائج الإلغاء والاسترداد؟",
        a: "النتائج تتبع نوافذ السياسات وقواعد التوقيت المخزنة والمطبقة على الخادم لضمان الاتساق وقابلية التدقيق.",
      },
      {
        q: "ما المطلوب مني لبدء التسجيل؟",
        a: "يلزم توفير بيانات العقار الأساسية وجاهزية الوسائط وبيانات التواصل ومستوى الإدارة المفضل للتقييم المبدئي.",
      },
      {
        q: "هل يمكن البدء بنموذج العرض فقط ثم الانتقال للإدارة الكاملة لاحقاً؟",
        a: "نعم. عمق البرنامج قابل للتطور مع توسع محفظتك أو تغير تفضيلاتك التشغيلية.",
      },
      {
        q: "كيف يتم تقديم تقارير الأداء للملاك؟",
        a: "يتم تنظيم الرؤية التشغيلية والحجزية حول الإشغال واتجاه الإيراد ونتائج الجودة وتتبع الاستثناءات.",
      },
    ],
  },
};

export default function OwnersFaq(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];

  return (
    <section id="owner-faq" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="rounded-2xl border border-indigo-100/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] lg:sticky lg:top-24 lg:h-fit">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.title}</h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.subtitle}</p>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/72 p-3 text-sm text-indigo-900">
                <p className="font-semibold">{copy.needReviewTitle}</p>
                <p className="mt-1 text-xs">{copy.needReviewBody}</p>
              </div>

              <div className="space-y-2 text-sm">
                <Link href="/contact" className="inline-flex items-center gap-2 font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500">
                  {copy.bookCall}
                </Link>
                <Link href="/signup?role=vendor" className="inline-flex items-center gap-2 font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500">
                  {copy.createVendor}
                </Link>
              </div>

              <div className="rounded-xl border border-indigo-100/85 bg-white p-3 text-xs text-secondary/78">
                <p className="inline-flex items-center gap-1.5 font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  {copy.policySafe}
                </p>
                <p className="mt-1">{copy.policySafeBody}</p>
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            {copy.faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-indigo-100/90 bg-white/88 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_20px_40px_rgba(15,23,42,0.1)] open:border-indigo-200"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-base font-semibold text-primary">
                  <span className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-indigo-200/75 bg-indigo-50 text-indigo-600">
                      <CircleHelp className="h-4 w-4" />
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-indigo-200/75 bg-indigo-50 text-indigo-600">
                    <Plus className="h-4 w-4 transition-transform duration-200 group-open:rotate-45" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-secondary/84">{faq.a}</p>
              </details>
            ))}

            <div className="rounded-2xl border border-indigo-100/90 bg-white/88 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <FileText className="h-4 w-4 text-indigo-600" />
                {copy.legalTitle}
              </p>
              <p className="mt-1 text-sm text-secondary/82">{copy.legalBody}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-[-120px] top-10 h-72 w-72 rounded-full bg-indigo-200/58 blur-3xl" />
      </div>
    </section>
  );
}
