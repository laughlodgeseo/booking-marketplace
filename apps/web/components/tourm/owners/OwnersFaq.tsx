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
    title: "Common owner questions",
    subtitle: "Simple answers before you decide to onboard.",
    needReviewTitle: "Need property-specific advice?",
    needReviewBody: "Share your unit details and goals. We will guide you.",
    bookCall: "Book an owner call",
    createVendor: "Create vendor account",
    policySafe: "Clear onboarding policy",
    policySafeBody: "Service scope and responsibilities are confirmed before launch.",
    legalTitle: "Need legal or commercial clarity?",
    legalBody:
      "Our team can explain scope, responsibilities, and policy terms before you commit.",
    faqs: [
      {
        q: "How do you prevent double bookings?",
        a: "We use live availability checks, reservation holds, and backend validation before a booking is created.",
      },
      {
        q: "Can you manage operations end-to-end in Dubai?",
        a: "Yes. Managed and semi-managed plans cover setup, operations, support, and issue escalation.",
      },
      {
        q: "How are cancellations and refunds handled?",
        a: "They follow fixed policy windows and server rules, so outcomes stay consistent.",
      },
      {
        q: "What do I need to start onboarding?",
        a: "We need your property details, basic media, contact info, and preferred service level.",
      },
      {
        q: "Can I start with listing-only and upgrade later?",
        a: "Yes. You can move to semi-managed or fully managed as your needs change.",
      },
      {
        q: "How do owners track performance?",
        a: "You get clear visibility on occupancy, revenue trends, task status, and key issues.",
      },
    ],
  },
  ar: {
    eyebrow: "الأسئلة الشائعة",
    title: "أهم الأسئلة التي يطرحها الملاك قبل التسجيل",
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
          <aside className="site-surface-card rounded-2xl p-6 lg:sticky lg:top-24 lg:h-fit">
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

              <div className="rounded-xl border border-indigo-100/85 bg-[linear-gradient(180deg,rgba(248,242,232,0.94),rgba(240,233,220,0.72))] p-3 text-xs text-secondary/78">
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
                className="site-surface-card site-surface-card-hover group rounded-2xl p-6 transition open:border-indigo-200"
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

            <div className="site-surface-card rounded-2xl p-5">
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
