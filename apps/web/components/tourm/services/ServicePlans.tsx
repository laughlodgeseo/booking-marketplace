import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Building2, CheckCircle2, Layers3, Sparkles } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Plan = {
  name: string;
  tagline: string;
  highlights: ReadonlyArray<string>;
  Icon: LucideIcon;
  idealFor: string;
  emphasis?: boolean;
};

type ServicePlansCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  pricingOverviewCta: string;
  discussProgramCta: string;
  compareOwnerProgramsCta: string;
  recommended: string;
  idealForPrefix: string;
  plans: Plan[];
};

const COPY: Record<AppLocale, ServicePlansCopy> = {
  en: {
    eyebrow: "Programs",
    title: "Delivery models matched to owner operating style",
    subtitle:
      "Choose the operating model that matches your team capacity, control preference, and portfolio goals. Scope can be defined per property.",
    pricingOverviewCta: "Pricing overview",
    discussProgramCta: "Discuss this program",
    compareOwnerProgramsCta: "Compare owner programs",
    recommended: "Recommended",
    idealForPrefix: "Ideal for",
    plans: [
      {
        name: "Listing-only",
        tagline:
          "You keep execution in-house while we provide distribution, booking safeguards, and operating visibility.",
        idealFor: "Owners with an internal operations team and existing SOPs.",
        highlights: [
          "Search and demand exposure",
          "Calendar discipline and inventory protection",
          "Policy-led booking states and controls",
          "Core onboarding and operating guidance",
        ],
        Icon: Building2,
      },
      {
        name: "Semi-managed",
        tagline:
          "Shared execution model where we coordinate operationally critical workflows and escalations.",
        idealFor: "Owners who want performance without giving up full control.",
        highlights: [
          "Turnover coordination and task orchestration",
          "Inspection checkpoints and readiness standards",
          "Operational visibility with escalation routing",
          "Flexible ownership split by property",
        ],
        Icon: Layers3,
        emphasis: true,
      },
      {
        name: "Managed",
        tagline:
          "End-to-end operator execution across housekeeping, readiness, maintenance, and guest issue workflows.",
        idealFor: "Owners prioritizing consistency, review quality, and scale.",
        highlights: [
          "Booking-driven operational workflow execution",
          "Inspection standards and readiness controls",
          "Maintenance request and work-order lifecycle",
          "Program governance with consistent service quality",
        ],
        Icon: Sparkles,
      },
    ],
  },
  ar: {
    eyebrow: "البرامج",
    title: "نماذج تسليم متوافقة مع أسلوب تشغيل المالك",
    subtitle:
      "اختر النموذج التشغيلي الذي يناسب قدرة فريقك وتفضيلك في التحكم وأهداف محفظتك. يمكن تحديد النطاق لكل عقار بشكل مستقل.",
    pricingOverviewCta: "نظرة على التسعير",
    discussProgramCta: "ناقش هذا البرنامج",
    compareOwnerProgramsCta: "قارن برامج الملاك",
    recommended: "موصى به",
    idealForPrefix: "مناسب لـ",
    plans: [
      {
        name: "عرض فقط",
        tagline: "تحتفظ بإدارة التنفيذ داخلياً بينما نوفر التوزيع وضمانات الحجز والرؤية التشغيلية.",
        idealFor: "الملاك الذين لديهم فريق تشغيل داخلي وإجراءات عمل معتمدة.",
        highlights: [
          "وصول أوسع للبحث والطلب",
          "انضباط التقويم وحماية المخزون",
          "حالات حجز وضوابط قائمة على السياسات",
          "إرشاد أساسي للتسجيل والتشغيل",
        ],
        Icon: Building2,
      },
      {
        name: "إدارة مشتركة",
        tagline: "نموذج تنفيذ مشترك ننسق فيه سير العمل التشغيلي الحرج ومسارات التصعيد.",
        idealFor: "الملاك الذين يريدون أداء أقوى دون التخلي عن التحكم الكامل.",
        highlights: [
          "تنسيق التحويل وتنظيم المهام",
          "نقاط تفتيش ومعايير جاهزية",
          "رؤية تشغيلية مع توجيه التصعيد",
          "تقسيم مرن للمسؤوليات حسب العقار",
        ],
        Icon: Layers3,
        emphasis: true,
      },
      {
        name: "إدارة كاملة",
        tagline: "تنفيذ تشغيلي متكامل يشمل التدبير والجاهزية والصيانة ومعالجة ملاحظات الضيوف.",
        idealFor: "الملاك الذين يركزون على الثبات وجودة التقييم وقابلية التوسع.",
        highlights: [
          "تنفيذ سير عمل تشغيلي مرتبط بالحجز",
          "معايير تفتيش وضوابط جاهزية",
          "دورة طلبات الصيانة وأوامر العمل",
          "حوكمة برنامج بجودة خدمة متسقة",
        ],
        Icon: Sparkles,
      },
    ],
  },
};

function PlanCard(props: {
  plan: Plan;
  copy: ServicePlansCopy;
  locale: AppLocale;
}) {
  const dark = props.plan.emphasis === true;
  const arrowClass = props.locale === "ar" ? "h-4 w-4 rotate-180" : "h-4 w-4";

  return (
    <article
      className={
        dark
          ? "relative overflow-hidden rounded-2xl border border-indigo-300/60 bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-6 text-white shadow-[0_24px_56px_rgba(67,56,202,0.34)]"
          : "premium-card premium-card-tinted premium-card-hover card-accent-left rounded-2xl p-6"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={[
              "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border",
              dark ? "border-white/35 bg-white/12 text-white" : "border-indigo-200/80 bg-indigo-50/80 text-indigo-600",
            ].join(" ")}
          >
            <props.plan.Icon className="h-5 w-5" />
          </span>
          <div>
            <p className={["text-lg font-semibold", dark ? "text-white" : "text-primary"].join(" ")}>{props.plan.name}</p>
            <p className={["mt-2 text-sm", dark ? "text-white/84" : "text-secondary/82"].join(" ")}>{props.plan.tagline}</p>
          </div>
        </div>
        {dark ? (
          <span className="rounded-xl border border-white/35 bg-white/14 px-3 py-2 text-xs font-semibold text-white">
            {props.copy.recommended}
          </span>
        ) : null}
      </div>

      <p
        className={[
          "mt-5 rounded-xl px-3 py-2 text-xs font-semibold",
          dark ? "border border-white/26 bg-white/10 text-white/90" : "border border-indigo-200/70 bg-indigo-50/75 text-indigo-900",
        ].join(" ")}
      >
        {props.copy.idealForPrefix}: {props.plan.idealFor}
      </p>

      <ul className="mt-6 space-y-2">
        {props.plan.highlights.slice(0, 6).map((highlight) => (
          <li key={highlight} className={["flex gap-3 text-sm", dark ? "text-white/88" : "text-secondary/84"].join(" ")}>
            <span className={["mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg", dark ? "bg-white/14" : "bg-indigo-100"].join(" ")}>
              <CheckCircle2 className={["h-3.5 w-3.5", dark ? "text-white" : "text-indigo-600"].join(" ")} />
            </span>
            <span>{highlight}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/contact"
          className={[
            "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
            dark
              ? "bg-white text-indigo-700 hover:bg-indigo-50"
              : "border border-indigo-300/80 bg-indigo-600 text-white hover:bg-indigo-700",
          ].join(" ")}
        >
          {props.copy.discussProgramCta}
          <ArrowRight className={[arrowClass, dark ? "text-indigo-700" : "text-white/90"].join(" ")} />
        </Link>

        <Link
          href="/owners"
          className={[
            "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
            dark
              ? "border border-white/35 bg-transparent text-white hover:bg-white/12"
              : "border border-line/80 bg-surface/70 text-primary hover:bg-accent-soft/55",
          ].join(" ")}
        >
          {props.copy.compareOwnerProgramsCta}
        </Link>
      </div>
    </article>
  );
}

export default function ServicePlans(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-600 rotate-180" : "h-4 w-4 text-indigo-600";

  return (
    <section id="programs" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.title}</h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.subtitle}</p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-line/80 bg-surface/70 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-surface"
          >
            {copy.pricingOverviewCta} <ArrowRight className={arrowClass} />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {copy.plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} copy={copy} locale={props.locale} />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-accent-soft/80 blur-3xl" />
      </div>
    </section>
  );
}
