import Link from "next/link";
import { ArrowRight, CalendarDays, ClipboardList, KeyRound, Rocket } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Step = {
  n: string;
  title: string;
  desc: string;
  timeline: string;
  deliverable: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type OwnerProcessCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  timelineLabel: string;
  deliverableLabel: string;
  steps: Step[];
};

const COPY: Record<AppLocale, OwnerProcessCopy> = {
  en: {
    eyebrow: "Process",
    title: "Onboarding timeline designed for dependable go-live",
    subtitle:
      "Each stage closes with a concrete deliverable so go-live decisions are based on readiness, not assumptions.",
    cta: "Start onboarding discussion",
    timelineLabel: "Timeline",
    deliverableLabel: "Deliverable",
    steps: [
      {
        n: "1",
        title: "Portfolio discovery",
        desc: "We review location, property type, furnishing readiness, and your target ownership model.",
        timeline: "Day 1",
        deliverable: "Initial scope direction",
        Icon: ClipboardList,
      },
      {
        n: "2",
        title: "Scope and commercial alignment",
        desc: "Program scope, responsibilities, operating standards, and commercials are defined clearly.",
        timeline: "Day 2-4",
        deliverable: "Program proposal",
        Icon: CalendarDays,
      },
      {
        n: "3",
        title: "Readiness and onboarding",
        desc: "Asset setup, media, policy mapping, and operational playbooks are prepared for launch.",
        timeline: "Day 4-10",
        deliverable: "Launch-ready setup",
        Icon: KeyRound,
      },
      {
        n: "4",
        title: "Go-live and optimization",
        desc: "Listings go live with active monitoring across pricing, occupancy, and service performance.",
        timeline: "Day 10+",
        deliverable: "Stabilized operations",
        Icon: Rocket,
      },
    ],
  },
  ar: {
    eyebrow: "العملية",
    title: "جدول تسجيل مصمم لإطلاق موثوق",
    subtitle: "كل مرحلة تنتهي بمخرج واضح حتى تكون قرارات الإطلاق مبنية على الجاهزية لا على الافتراضات.",
    cta: "ابدأ نقاش التسجيل",
    timelineLabel: "الجدول الزمني",
    deliverableLabel: "المخرج",
    steps: [
      {
        n: "1",
        title: "استكشاف المحفظة",
        desc: "نراجع الموقع ونوع العقار وجاهزية التجهيز ونموذج الملكية المستهدف.",
        timeline: "اليوم 1",
        deliverable: "اتجاه مبدئي للنطاق",
        Icon: ClipboardList,
      },
      {
        n: "2",
        title: "مواءمة النطاق والتجاري",
        desc: "يتم تحديد نطاق البرنامج والمسؤوليات والمعايير التشغيلية والنموذج التجاري بوضوح.",
        timeline: "اليوم 2-4",
        deliverable: "مقترح البرنامج",
        Icon: CalendarDays,
      },
      {
        n: "3",
        title: "الجاهزية والتسجيل",
        desc: "تجهيز الأصل والوسائط ومواءمة السياسات وخطط التشغيل قبل الإطلاق.",
        timeline: "اليوم 4-10",
        deliverable: "إعداد جاهز للإطلاق",
        Icon: KeyRound,
      },
      {
        n: "4",
        title: "الإطلاق والتحسين",
        desc: "يتم نشر العقارات مع متابعة نشطة للتسعير والإشغال وأداء الخدمة.",
        timeline: "اليوم 10+",
        deliverable: "تشغيل مستقر",
        Icon: Rocket,
      },
    ],
  },
};

export default function OwnerProcess(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-100 rotate-180" : "h-4 w-4 text-indigo-100";

  return (
    <section id="owner-process" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.title}</h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.subtitle}</p>
          </div>

          <Link
            href="/contact"
            className="site-cta-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
          >
            {copy.cta}
            <ArrowRight className={arrowClass} />
          </Link>
        </div>

        <div className="relative mt-10">
          <div className="pointer-events-none absolute left-0 right-0 top-11 hidden h-px bg-gradient-to-r from-indigo-200/0 via-indigo-300/85 to-indigo-200/0 lg:block" />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {copy.steps.map((step) => (
              <article
                key={step.n}
                className="site-surface-card site-surface-card-hover group relative overflow-hidden rounded-2xl p-6"
              >
                <div className="pointer-events-none absolute -right-14 -top-12 h-32 w-32 rounded-full bg-indigo-200/28 opacity-0 blur-3xl transition group-hover:opacity-100" />
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-50 px-2 text-xs font-semibold text-indigo-700">
                    {step.n}
                  </span>
                  <span className="site-icon-plate h-8 w-8 rounded-lg">
                    <step.Icon className="h-4 w-4" />
                  </span>
                </div>

                <p className="mt-3 text-lg font-semibold text-primary">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-secondary/82">{step.desc}</p>

                <div className="mt-4 space-y-2">
                  <p className="rounded-lg border border-indigo-200/75 bg-indigo-50/72 px-3 py-2 text-xs font-semibold text-indigo-900">
                    {copy.timelineLabel}: {step.timeline}
                  </p>
                  <p className="rounded-lg border border-indigo-100/85 bg-[linear-gradient(180deg,rgba(248,242,232,0.90),rgba(240,233,220,0.66))] px-3 py-2 text-xs font-semibold text-secondary/82">
                    {copy.deliverableLabel}: {step.deliverable}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 h-44 w-[92%] -translate-x-1/2 rounded-[2.5rem] border border-indigo-100/80 bg-[linear-gradient(180deg,rgba(248,242,232,0.32),rgba(240,233,220,0.18))]" />
      </div>
    </section>
  );
}
