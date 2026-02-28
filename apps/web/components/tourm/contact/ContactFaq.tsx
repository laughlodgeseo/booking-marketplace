import Link from "next/link";
import { CircleHelp, Plus } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Faq = { q: string; a: string };

type ContactFaqCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  needOnboarding: string;
  signupVendor: string;
  faqs: Faq[];
};

const COPY: Record<AppLocale, ContactFaqCopy> = {
  en: {
    eyebrow: "FAQs",
    title: "Common support and onboarding questions",
    subtitle: "Quick answers for guests, owners, and partners.",
    needOnboarding: "Need owner onboarding directly?",
    signupVendor: "Sign up as vendor",
    faqs: [
      {
        q: "Where should I send booking questions?",
        a: "Use Booking@rentpropertyuae.com or call +971 50 234 8756 for reservation support.",
      },
      {
        q: "I am an owner. What is the fastest way to start?",
        a: "Create a vendor account and share your property profile. Our onboarding team will guide you.",
      },
      {
        q: "Do you provide support after booking confirmation?",
        a: "Yes. Guest and operational support continue through the reservation lifecycle.",
      },
      {
        q: "How quickly do you respond?",
        a: "Most inquiries are answered within one business day. Urgent booking requests are prioritized.",
      },
      {
        q: "Can I request a custom owner operating model?",
        a: "Yes. We can set listing-only, semi-managed, or fully managed scope by property.",
      },
      {
        q: "Do you support compliance or business verification checks?",
        a: "Yes. We can provide company details for standard trust and verification checks.",
      },
    ],
  },
  ar: {
    eyebrow: "الأسئلة الشائعة",
    title: "الأسئلة الأكثر شيوعاً حول الدعم والتسجيل",
    subtitle: "توضيحات سريعة للضيوف والملاك والشركاء قبل التواصل.",
    needOnboarding: "هل تحتاج بدء تسجيل المالك مباشرة؟",
    signupVendor: "سجل كمورّد",
    faqs: [
      {
        q: "أين يمكنني إرسال استفسارات الحجز؟",
        a: "استخدم البريد Booking@rentpropertyuae.com أو اتصل على +971 50 234 8756 لدعم الحجوزات.",
      },
      {
        q: "أنا مالك. ما أسرع طريقة للبدء؟",
        a: "أنشئ حساب مورّد وشارك ملف عقارك، وسيوجهك فريق التسجيل للخطوات التالية.",
      },
      {
        q: "هل توفرون دعماً بعد تأكيد الحجز؟",
        a: "نعم. يستمر دعم الضيوف والعمليات طوال دورة الحجز.",
      },
      {
        q: "كم تستغرق الاستجابة عادة؟",
        a: "تُعالج معظم الاستفسارات خلال يوم عمل واحد، مع أولوية للحالات العاجلة المتعلقة بالحجز.",
      },
      {
        q: "هل يمكنني طلب نموذج تشغيل مخصص للمالك؟",
        a: "نعم. يمكننا تحديد نطاق عرض فقط أو إدارة مشتركة أو إدارة كاملة لكل عقار.",
      },
      {
        q: "هل تدعمون متطلبات التحقق والامتثال التجاري؟",
        a: "نعم. يمكننا توفير بيانات هوية الشركة ضمن إجراءات الثقة والتحقق القياسية.",
      },
    ],
  },
};

export default function ContactFaq(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];

  return (
    <section id="contact-faq" className="relative w-full scroll-mt-24 py-14 sm:py-18">
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
          <span className="text-secondary/75">{copy.needOnboarding}</span>
          <Link
            href="/signup?role=vendor"
            className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500"
          >
            {copy.signupVendor}
          </Link>
        </div>
      </div>
    </section>
  );
}
