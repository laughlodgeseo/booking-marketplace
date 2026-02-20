import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Building2, CalendarClock, ShieldCheck, Workflow } from "lucide-react";
import OwnersHero from "@/components/tourm/owners/OwnersHero";
import OwnerBenefits from "@/components/tourm/owners/OwnerBenefits";
import OwnerPrograms from "@/components/tourm/owners/OwnerPrograms";
import OwnerProcess from "@/components/tourm/owners/OwnerProcess";
import OwnersFaq from "@/components/tourm/owners/OwnersFaq";
import OwnersCta from "@/components/tourm/owners/OwnersCta";
import { LOCALE_COOKIE_NAME, normalizeLocale, type AppLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "For Owners | Laugh & Lodge",
  description:
    "Owner programs for Dubai and UAE short-stay assets with booking-safe operations, service standards, and performance accountability.",
};

type ControlPoint = {
  title: string;
  value: string;
  note: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type OwnersPageCopy = {
  jumpTo: string;
  jumpLinks: Array<{ label: string; href: string }>;
  vendorSignup: string;
  serviceScope: string;
  bookConsultation: string;
  ownerProposition: string;
  propositionTitle: string;
  propositionDesc: string;
  startOnboarding: string;
  reviewCommercial: string;
  controlPoints: ControlPoint[];
};

const COPY: Record<AppLocale, OwnersPageCopy> = {
  en: {
    jumpTo: "Jump to",
    jumpLinks: [
      { label: "Benefits", href: "#owner-benefits" },
      { label: "Programs", href: "#owner-programs" },
      { label: "Process", href: "#owner-process" },
      { label: "FAQ", href: "#owner-faq" },
    ],
    vendorSignup: "Vendor sign up",
    serviceScope: "Service scope",
    bookConsultation: "Book consultation",
    ownerProposition: "Owner proposition",
    propositionTitle: "Premium ownership experience with operational certainty",
    propositionDesc:
      "You get structured execution, clear accountability, and scalable delivery standards designed for real guest and portfolio performance.",
    startOnboarding: "Start vendor onboarding",
    reviewCommercial: "Review commercial model",
    controlPoints: [
      {
        title: "Execution model",
        value: "SLA-backed",
        note: "Task ownership and escalation paths are explicit.",
        Icon: Workflow,
      },
      {
        title: "Risk control",
        value: "Policy-safe",
        note: "Reservation and cancellation logic stays rule-driven.",
        Icon: ShieldCheck,
      },
      {
        title: "Readiness cadence",
        value: "Turnover-first",
        note: "Arrival quality is protected with readiness checkpoints.",
        Icon: CalendarClock,
      },
      {
        title: "Portfolio fit",
        value: "1 to multi-unit",
        note: "Program depth can scale by property and ownership style.",
        Icon: Building2,
      },
    ],
  },
  ar: {
    jumpTo: "انتقل إلى",
    jumpLinks: [
      { label: "المزايا", href: "#owner-benefits" },
      { label: "البرامج", href: "#owner-programs" },
      { label: "العملية", href: "#owner-process" },
      { label: "الأسئلة الشائعة", href: "#owner-faq" },
    ],
    vendorSignup: "تسجيل مورّد",
    serviceScope: "نطاق الخدمات",
    bookConsultation: "احجز استشارة",
    ownerProposition: "عرض المالك",
    propositionTitle: "تجربة ملكية راقية بثبات تشغيلي واضح",
    propositionDesc:
      "تحصل على تنفيذ منظّم ومسؤوليات واضحة ومعايير تشغيل قابلة للتوسع، بما يحقق أداءً أفضل للضيف ولمحفظتك العقارية.",
    startOnboarding: "ابدأ تسجيل المورّد",
    reviewCommercial: "راجع النموذج التجاري",
    controlPoints: [
      {
        title: "نموذج التنفيذ",
        value: "مدعوم باتفاقية مستوى خدمة",
        note: "توزيع المسؤوليات ومسارات التصعيد محددة بوضوح.",
        Icon: Workflow,
      },
      {
        title: "ضبط المخاطر",
        value: "متوافق مع السياسات",
        note: "منطق الحجز والإلغاء يبقى محكوماً بالقواعد.",
        Icon: ShieldCheck,
      },
      {
        title: "إيقاع الجاهزية",
        value: "التحويل أولاً",
        note: "يتم حماية جودة الوصول عبر نقاط تحقق جاهزية واضحة.",
        Icon: CalendarClock,
      },
      {
        title: "ملاءمة المحفظة",
        value: "من وحدة إلى عدة وحدات",
        note: "يمكن توسيع عمق البرنامج حسب العقار وأسلوب الملكية.",
        Icon: Building2,
      },
    ],
  },
};

export default async function OwnersPage() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const copy = COPY[locale];

  return (
    <main className="indigo-no-gold relative min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-220px] top-[180px] h-[520px] w-[520px] rounded-full bg-indigo-200/42 blur-3xl" />
        <div className="absolute right-[-220px] top-[620px] h-[560px] w-[560px] rounded-full bg-indigo-300/30 blur-3xl" />
      </div>

      <OwnersHero locale={locale} />

      <section className="-mt-7 py-0 sm:-mt-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative z-20 rounded-3xl border border-indigo-100/90 bg-white/82 p-4 shadow-[0_20px_52px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">
                  {copy.jumpTo}
                </p>
                {copy.jumpLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="inline-flex h-11 items-center rounded-full border border-indigo-200/85 bg-indigo-50/85 px-3 text-xs font-semibold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-100"
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/signup?role=vendor"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-indigo-300/80 bg-indigo-600 px-3 text-xs font-semibold text-white shadow-[0_12px_26px_rgba(79,70,229,0.26)] transition hover:-translate-y-0.5 hover:bg-indigo-700"
                >
                  {copy.vendorSignup} <ArrowRight className="h-3.5 w-3.5 text-white/90" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
                >
                  {copy.serviceScope}
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
                >
                  {copy.bookConsultation}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-6 pt-6 sm:pb-8 sm:pt-7">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {copy.controlPoints.map((point) => (
              <article
                key={point.title}
                className="rounded-2xl border border-indigo-100/90 bg-white/84 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/66">{point.title}</p>
                    <p className="mt-2 text-base font-semibold text-primary">{point.value}</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-indigo-200/80 bg-indigo-50 text-indigo-600">
                    <point.Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-sm text-secondary/82">{point.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-100/90 bg-white/82 px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">{copy.ownerProposition}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                  {copy.propositionTitle}
                </h2>
                <p className="mt-2 text-sm text-secondary/82 sm:text-base">
                  {copy.propositionDesc}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup?role=vendor"
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/80 bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  {copy.startOnboarding}
                  <ArrowRight className="h-4 w-4 text-white/90" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-xl border border-line/80 bg-white px-4 py-3 text-sm font-semibold text-primary transition hover:bg-indigo-50"
                >
                  {copy.reviewCommercial}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <OwnerBenefits locale={locale} />
      </div>
      <div className="bg-transparent">
        <OwnerPrograms locale={locale} />
      </div>
      <div className="bg-transparent">
        <OwnerProcess locale={locale} />
      </div>
      <div className="bg-transparent">
        <OwnersFaq locale={locale} />
      </div>
      <div className="bg-transparent">
        <OwnersCta locale={locale} />
      </div>
      <div className="h-10 sm:h-16" />
    </main>
  );
}
