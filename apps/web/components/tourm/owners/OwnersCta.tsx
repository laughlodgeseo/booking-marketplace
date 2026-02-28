import Link from "next/link";
import { ArrowRight, CalendarCheck2, CheckCircle2, ClipboardCheck, UserRoundPlus } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type OwnersCtaCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  signupCta: string;
  onboardingTeamCta: string;
  fitTitle: string;
  fitBody: string;
  readinessTitle: string;
  readinessBody: string;
  nextStepsTitle: string;
  expectedTitle: string;
  nextSteps: Array<{ title: string; detail: string; Icon: React.ComponentType<{ className?: string }> }>;
  deliverables: string[];
};

const COPY: Record<AppLocale, OwnersCtaCopy> = {
  en: {
    eyebrow: "Final step",
    title: "Start owner onboarding in minutes",
    subtitle:
      "Move from interest to launch with a clear onboarding path, clear timeline, and full support.",
    signupCta: "Sign up as vendor",
    onboardingTeamCta: "Talk to onboarding team",
    fitTitle: "Best-fit program",
    fitBody: "We match your property with the right service model.",
    readinessTitle: "Launch readiness",
    readinessBody: "Everything is aligned before your first booking.",
    nextStepsTitle: "Next steps after sign-up",
    expectedTitle: "What you can expect",
    nextSteps: [
      {
        title: "Create vendor account",
        detail: "Set up your account to begin onboarding and document sharing.",
        Icon: UserRoundPlus,
      },
      {
        title: "Submit asset profile",
        detail: "Share your unit details, location, and preferred service level.",
        Icon: ClipboardCheck,
      },
      {
        title: "Confirm launch plan",
        detail: "Confirm scope, timeline, and commercial terms before go-live.",
        Icon: CalendarCheck2,
      },
    ],
    deliverables: [
      "Clear milestones and owner responsibilities",
      "Program recommendation based on your property",
      "Operational standards before launch",
      "Commercial clarity before you commit",
    ],
  },
  ar: {
    eyebrow: "الخطوة الأخيرة",
    title: "ابدأ تسجيل المالك من خلال حساب مورّد",
    subtitle:
      "انتقل من التقييم إلى التنفيذ عبر مسار تسجيل منظم يحدد نموذج الملكية ومعايير التشغيل وجدول الإطلاق.",
    signupCta: "التسجيل كمورّد",
    onboardingTeamCta: "تحدث مع فريق التسجيل",
    fitTitle: "توصية البرنامج الأنسب",
    fitBody: "نموذج ملائم لأهداف الملكية وملف العقار.",
    readinessTitle: "حوكمة جاهزية الإطلاق",
    readinessBody: "مواءمة النطاق والمعايير قبل أول حجز.",
    nextStepsTitle: "الخطوات التالية بعد التسجيل",
    expectedTitle: "ما الذي ستحصل عليه",
    nextSteps: [
      {
        title: "إنشاء حساب مورّد",
        detail: "إعداد ملف آمن لبدء تسجيل المالك وتبادل المستندات.",
        Icon: UserRoundPlus,
      },
      {
        title: "إرسال ملف العقار",
        detail: "شارك تفاصيل الوحدة والموقع ومستوى التشغيل المطلوب لتقييم النطاق.",
        Icon: ClipboardCheck,
      },
      {
        title: "اعتماد خطة الإطلاق",
        detail: "مواءمة نطاق الخدمة والجدول الزمني والمعايير والنموذج التجاري قبل الإطلاق.",
        Icon: CalendarCheck2,
      },
    ],
    deliverables: [
      "مراحل تسجيل واضحة ومسؤوليات محددة للمالك",
      "توصية برنامج بناءً على ملف العقار",
      "إطار معايير تشغيل قبل الإطلاق",
      "شفافية تجارية كاملة قبل الالتزام",
    ],
  },
};

export default function OwnersCta(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-700 rotate-180" : "h-4 w-4 text-indigo-700";

  return (
    <section className="relative w-full pb-16 pt-8 sm:pb-20 sm:pt-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="site-dark-card relative overflow-hidden rounded-[2rem] text-white">
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.8)_0.5px,transparent_0.5px)] [background-size:4px_4px]" />
          <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{copy.title}</h3>
              <p className="mt-3 text-sm text-white/84 sm:text-base">{copy.subtitle}</p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/signup?role=vendor"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-[0_14px_30px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-indigo-50"
                >
                  {copy.signupCta}
                  <ArrowRight className={arrowClass} />
                </Link>
                <Link
                  href="/contact"
                  className="rounded-xl border border-white/35 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {copy.onboardingTeamCta}
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/28 bg-white/12 px-3 py-3 text-sm">
                  <p className="font-semibold text-white">{copy.fitTitle}</p>
                  <p className="mt-1 text-white/84">{copy.fitBody}</p>
                </div>
                <div className="rounded-xl border border-white/28 bg-white/12 px-3 py-3 text-sm">
                  <p className="font-semibold text-white">{copy.readinessTitle}</p>
                  <p className="mt-1 text-white/84">{copy.readinessBody}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/28 bg-white/12 p-6 backdrop-blur">
                <p className="text-sm font-semibold text-white">{copy.nextStepsTitle}</p>
                <ul className="mt-4 space-y-3">
                  {copy.nextSteps.map((step) => (
                    <li key={step.title} className="flex gap-3 text-sm text-white/88">
                      <span className="site-icon-plate-light mt-0.5 h-6 w-6 shrink-0 rounded-lg">
                        <step.Icon className="h-3.5 w-3.5" />
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
                <p className="text-sm font-semibold text-white">{copy.expectedTitle}</p>
                <ul className="mt-4 space-y-2">
                  {copy.deliverables.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-white/88">
                      <span className="site-icon-plate-light mt-0.5 h-5 w-5 shrink-0 rounded-md">
                        <CheckCircle2 className="h-3.5 w-3.5" />
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
