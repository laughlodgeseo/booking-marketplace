import Link from "next/link";
import { ArrowRight, CalendarCheck2, CheckCircle2, ClipboardList, PhoneCall } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type NextStep = {
  title: string;
  detail: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type ServicesCtaCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  consultationCta: string;
  ownerProgramsCta: string;
  viewPricingCta: string;
  compareModelsCta: string;
  nextStepsTitle: string;
  receiveTitle: string;
  nextSteps: NextStep[];
  deliverables: string[];
};

const COPY: Record<AppLocale, ServicesCtaCopy> = {
  en: {
    eyebrow: "Next step",
    title: "Build the right service plan for your property",
    subtitle:
      "Share your goals and preferred involvement level. We will suggest a clear scope, timeline, and recommended model.",
    consultationCta: "Start with a consultation",
    ownerProgramsCta: "Owner programs",
    viewPricingCta: "View pricing",
    compareModelsCta: "Compare delivery models",
    nextStepsTitle: "What happens after you contact us",
    receiveTitle: "What you receive",
    nextSteps: [
      {
        title: "Discovery call",
        detail: "A quick call to understand your goals, property type, and current setup.",
        Icon: PhoneCall,
      },
      {
        title: "Scope definition",
        detail: "We define service boundaries, responsibilities, and support flow.",
        Icon: ClipboardList,
      },
      {
        title: "Program launch plan",
        detail: "You get onboarding milestones and go-live checkpoints.",
        Icon: CalendarCheck2,
      },
    ],
    deliverables: [
      "Service scope by property",
      "Clear ownership model for each workflow",
      "Launch timeline with checkpoints",
      "Commercial recommendation based on your goals",
    ],
  },
  ar: {
    eyebrow: "الخطوة التالية",
    title: "ابنِ برنامج خدمة مصمم لعمليات عقارك",
    subtitle:
      "شارك أهدافك وقيود التشغيل ومستوى المشاركة المفضل لديك، وسنقدّم نطاق خدمة عملياً وجدولاً زمنياً ونموذج تسليم موصى به.",
    consultationCta: "ابدأ باستشارة",
    ownerProgramsCta: "برامج الملاك",
    viewPricingCta: "عرض نموذج التسعير",
    compareModelsCta: "قارن نماذج التسليم",
    nextStepsTitle: "ماذا يحدث بعد تواصلك معنا",
    receiveTitle: "ما الذي ستحصل عليه",
    nextSteps: [
      {
        title: "مكالمة استكشافية",
        detail: "مناقشة لمدة 30 دقيقة حول الأهداف وملف العقار ونموذج التشغيل الحالي.",
        Icon: PhoneCall,
      },
      {
        title: "تحديد النطاق",
        detail: "نقترح حدود الخدمة والمسؤوليات واتفاقيات الأداء ومسارات التصعيد.",
        Icon: ClipboardList,
      },
      {
        title: "خطة إطلاق البرنامج",
        detail: "مراحل التسجيل ونقاط تحقق الجاهزية وتسلسل الإطلاق لكل عقار.",
        Icon: CalendarCheck2,
      },
    ],
    deliverables: [
      "نطاق خدمة محدد لكل عقار وبرنامج مالك",
      "نموذج مسؤولية واضح لكل سير عمل تشغيلي",
      "جدول زمني بمراحل الإطلاق ونقاط التحقق",
      "توصية تجارية متوافقة مع أهداف محفظتك",
    ],
  },
};

export default function ServicesCta(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-700 rotate-180" : "h-4 w-4 text-indigo-700";

  return (
    <section id="next-step" className="relative w-full scroll-mt-24 pb-16 pt-6 sm:pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-indigo-300/60 bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 text-white shadow-[0_26px_72px_rgba(67,56,202,0.34)]">
          <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{copy.title}</h3>
              <p className="mt-3 text-sm text-white/84 sm:text-base">{copy.subtitle}</p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  {copy.consultationCta}
                  <ArrowRight className={arrowClass} />
                </Link>
                <Link
                  href="/owners"
                  className="rounded-xl border border-white/35 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {copy.ownerProgramsCta}
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-white/85">
                <Link href="/pricing" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
                  {copy.viewPricingCta}
                </Link>
                <Link
                  href="/services#programs"
                  className="underline decoration-white/35 underline-offset-4 hover:decoration-white"
                >
                  {copy.compareModelsCta}
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/28 bg-white/12 p-6 backdrop-blur">
                <p className="text-sm font-semibold text-white">{copy.nextStepsTitle}</p>
                <ul className="mt-4 space-y-3">
                  {copy.nextSteps.map((step) => (
                    <li key={step.title} className="flex gap-3 text-sm text-white/88">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-white/30 bg-white/12">
                        <step.Icon className="h-3.5 w-3.5 text-white" />
                      </span>
                      <span>
                        <span className="font-semibold text-white">{step.title}: </span>
                        {step.detail}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/28 bg-white/12 p-6 backdrop-blur">
                <p className="text-sm font-semibold text-white">{copy.receiveTitle}</p>
                <ul className="mt-4 space-y-2">
                  {copy.deliverables.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-white/88">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/16">
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 bottom-0 h-72 w-72 rounded-full bg-indigo-200/80 blur-3xl" />
      </div>
    </section>
  );
}
