import Link from "next/link";
import { CircleHelp, Plus } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Faq = { q: string; a: string };

type ServicesFaqCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  needAnswerLabel: string;
  speakOpsCta: string;
  orLabel: string;
  compareProgramsCta: string;
  faqs: Faq[];
};

const COPY: Record<AppLocale, ServicesFaqCopy> = {
  en: {
    eyebrow: "FAQs",
    title: "Common questions before choosing a service model",
    subtitle:
      "Simple answers on scope, responsibilities, and booking-linked operations.",
    needAnswerLabel: "Need property-specific advice?",
    speakOpsCta: "Speak with operations",
    orLabel: "or",
    compareProgramsCta: "compare owner programs",
    faqs: [
      {
        q: "Are these services real operations or only advice?",
        a: "They are real operations. Tasks are linked to booking events and tracked with clear status updates.",
      },
      {
        q: "Do all properties need the same scope?",
        a: "No. Scope is set per property and per owner program.",
      },
      {
        q: "How are cleaning and turnovers scheduled?",
        a: "They are triggered from confirmed booking timelines and tracked until completion.",
      },
      {
        q: "How is maintenance handled?",
        a: "It follows a clear request-to-work-order flow with priority, ownership, and status tracking.",
      },
      {
        q: "Do you support ID checks and check-in readiness?",
        a: "Yes. Check-in readiness can include ID and policy checks before guest arrival.",
      },
      {
        q: "Can owners move between plans later?",
        a: "Yes. You can move between listing-only, semi-managed, and managed as your needs change.",
      },
      {
        q: "Can service setup affect booking confirmation?",
        a: "No. Booking confirmation remains payment-validated and policy-driven.",
      },
    ],
  },
  ar: {
    eyebrow: "الأسئلة الشائعة",
    title: "أسئلة يطرحها الملاك قبل اختيار نموذج الخدمة",
    subtitle:
      "إجابات مباشرة حول النطاق والمساءلة وكيف تتكامل سير العمل التشغيلية مع ضوابط الحجز.",
    needAnswerLabel: "هل تحتاج إجابة خاصة بعقارك؟",
    speakOpsCta: "تحدث مع فريق التشغيل",
    orLabel: "أو",
    compareProgramsCta: "قارن برامج الملاك",
    faqs: [
      {
        q: "هل هذه الخدمات تنفيذية أم استشارية فقط؟",
        a: "تنفيذية. تقديم الخدمة مرتبط بأحداث الحجز ويتم تتبعه عبر حالة المهمة والمالك الزمني ومعالجة الاستثناءات.",
      },
      {
        q: "هل جميع العقارات تحتاج نفس نطاق الخدمة؟",
        a: "لا. يتم ضبط النطاق لكل عقار وبرنامج مالك. يمكنك تشغيل نماذج مختلفة ضمن محفظتك حسب الاستراتيجية وقدرة الفريق.",
      },
      {
        q: "كيف يتم تفعيل جدولة التنظيف والتحويل؟",
        a: "يتم إنشاء مسارات التحويل من جداول الحجوزات المؤكدة وتُتابع عبر التعيين والإنجاز ونقاط تحقق الجاهزية.",
      },
      {
        q: "كيف تُدار طلبات الصيانة؟",
        a: "تتبع الصيانة مساراً منظماً من الطلب إلى أمر العمل مع ترتيب الأولوية وتحديد المسؤولية وتتبع الحالة وسجلات تدقيق واضحة.",
      },
      {
        q: "هل تدعم سير العمل متطلبات هوية الضيف وجاهزية تسجيل الدخول؟",
        a: "نعم. يمكن أن تشمل جاهزية الوصول نقاط تحقق للهوية والسياسات لضمان وصول منضبط وموثق للضيف.",
      },
      {
        q: "هل يمكن للمالك الانتقال بين عرض فقط وإدارة مشتركة وإدارة كاملة؟",
        a: "نعم. البرامج مصممة للتطور مع أهداف الأداء ونضج التشغيل ونمو المحفظة.",
      },
      {
        q: "هل يؤثر ضبط الخدمات على سلامة تأكيد الحجز؟",
        a: "تأكيد الحجز يبقى قائماً على السياسات والتحقق من الدفع. سير العمل الخدمي ينفذ بعد محطات الحجز دون تجاوز ضوابط التأكيد.",
      },
    ],
  },
};

export default function ServicesFaq(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];

  return (
    <section id="faq" className="relative w-full scroll-mt-24 py-14 sm:py-18">
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
              className="premium-card premium-card-tinted premium-card-hover group rounded-2xl border border-transparent p-6 open:border-indigo-200/70"
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
              <p className="mt-3 text-sm leading-relaxed text-secondary/85">{faq.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-secondary/75">{copy.needAnswerLabel}</span>
          <Link
            href="/contact"
            className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500"
          >
            {copy.speakOpsCta}
          </Link>
          <span className="text-secondary/70">{copy.orLabel}</span>
          <Link
            href="/owners"
            className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500"
          >
            {copy.compareProgramsCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
