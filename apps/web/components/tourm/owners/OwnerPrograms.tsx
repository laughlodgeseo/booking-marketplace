import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Building2, CheckCircle2, Layers3, Sparkles } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Program = {
  name: string;
  tagline: string;
  idealFor: string;
  highlights: ReadonlyArray<string>;
  Icon: LucideIcon;
  controlLevel: string;
  opsCoverage: string;
  emphasis?: boolean;
};

type OwnerProgramsCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  reviewCapabilities: string;
  discussProgram: string;
  vendorSignup: string;
  recommended: string;
  idealForPrefix: string;
  controlLevelLabel: string;
  opsCoverageLabel: string;
  programs: Program[];
};

const COPY: Record<AppLocale, OwnerProgramsCopy> = {
  en: {
    eyebrow: "Programs",
    title: "Select the operating depth that fits your ownership strategy",
    subtitle:
      "Program architecture is designed around measurable execution standards, transparent responsibility, and scalable delivery.",
    reviewCapabilities: "Review service capabilities",
    discussProgram: "Discuss this program",
    vendorSignup: "Start vendor onboarding",
    recommended: "Recommended",
    idealForPrefix: "Ideal for",
    controlLevelLabel: "Control level",
    opsCoverageLabel: "Ops coverage",
    programs: [
      {
        name: "Listing-only",
        tagline: "You control operations in-house while we provide booking controls, visibility, and distribution support.",
        idealFor: "Owners with an internal operations team and established SOPs.",
        highlights: [
          "Search and demand visibility",
          "Calendar safety and availability discipline",
          "Policy-based booking and cancellation framework",
          "Clear payout and reservation reporting",
        ],
        controlLevel: "High owner control",
        opsCoverage: "Platform + distribution",
        Icon: Building2,
      },
      {
        name: "Semi-managed",
        tagline: "Shared operating model where we coordinate critical workflows while you retain strategic control.",
        idealFor: "Owners seeking stronger performance without full delegation.",
        highlights: [
          "Turnover and readiness workflow coordination",
          "Inspection checkpoints and exception handling",
          "Service-level visibility and escalation routing",
          "Flexible split of responsibilities by property",
        ],
        controlLevel: "Shared control",
        opsCoverage: "Core workflows co-managed",
        Icon: Layers3,
        emphasis: true,
      },
      {
        name: "Managed",
        tagline: "End-to-end execution across housekeeping, inspections, maintenance, and guest issue management.",
        idealFor: "Owners focused on consistency, scale, and minimal day-to-day involvement.",
        highlights: [
          "Booking-driven operations lifecycle execution",
          "Readiness and quality standards governance",
          "Maintenance workflow ownership and closure",
          "Consistent delivery model across multiple assets",
        ],
        controlLevel: "Low owner overhead",
        opsCoverage: "Full operations coverage",
        Icon: Sparkles,
      },
    ],
  },
  ar: {
    eyebrow: "البرامج",
    title: "اختر عمق التشغيل الأنسب لاستراتيجية ملكيتك",
    subtitle: "هيكل البرامج مصمم حول معايير تنفيذ قابلة للقياس ومسؤوليات واضحة وتسليم قابل للتوسع.",
    reviewCapabilities: "راجع قدرات الخدمات",
    discussProgram: "ناقش هذا البرنامج",
    vendorSignup: "ابدأ تسجيل المورّد",
    recommended: "موصى به",
    idealForPrefix: "مناسب لـ",
    controlLevelLabel: "مستوى التحكم",
    opsCoverageLabel: "التغطية التشغيلية",
    programs: [
      {
        name: "عرض فقط",
        tagline: "تدير التشغيل داخلياً بينما نوفر لك ضوابط الحجز والرؤية والتوزيع.",
        idealFor: "الملاك الذين لديهم فريق تشغيل داخلي وإجراءات عمل مستقرة.",
        highlights: [
          "رؤية أوضح للطلب والظهور",
          "انضباط التقويم وحماية التوافر",
          "إطار حجز وإلغاء قائم على السياسات",
          "تقارير واضحة للحجوزات والمدفوعات",
        ],
        controlLevel: "تحكم عالٍ للمالك",
        opsCoverage: "المنصة + التوزيع",
        Icon: Building2,
      },
      {
        name: "إدارة مشتركة",
        tagline: "نموذج تشغيلي مشترك ننسق فيه المهام الحرجة مع احتفاظك بالتحكم الاستراتيجي.",
        idealFor: "الملاك الراغبين بتحسين الأداء دون تفويض كامل.",
        highlights: [
          "تنسيق التحويل وجاهزية العقار",
          "نقاط تفتيش ومعالجة الاستثناءات",
          "رؤية تشغيلية مع مسارات تصعيد",
          "تقسيم مرن للمسؤوليات حسب كل عقار",
        ],
        controlLevel: "تحكم مشترك",
        opsCoverage: "إدارة مشتركة للعمليات الأساسية",
        Icon: Layers3,
        emphasis: true,
      },
      {
        name: "إدارة كاملة",
        tagline: "تنفيذ متكامل يشمل التدبير والتفتيش والصيانة ومعالجة ملاحظات الضيوف.",
        idealFor: "الملاك الذين يركزون على الثبات والتوسع وتقليل الانشغال اليومي.",
        highlights: [
          "تنفيذ دورة تشغيلية مرتبطة بالحجوزات",
          "حوكمة معايير الجاهزية والجودة",
          "ملكية كاملة لمسار طلبات الصيانة حتى الإغلاق",
          "نموذج تسليم متسق عبر عدة أصول",
        ],
        controlLevel: "عبء أقل على المالك",
        opsCoverage: "تغطية تشغيلية كاملة",
        Icon: Sparkles,
      },
    ],
  },
};

function ProgramCard(props: {
  program: Program;
  copy: OwnerProgramsCopy;
}) {
  const emphasized = props.program.emphasis === true;

  return (
    <article
      className={
        emphasized
          ? "relative overflow-hidden rounded-2xl border border-indigo-300/65 bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-6 text-white shadow-[0_26px_54px_rgba(67,56,202,0.34)]"
          : "site-surface-card site-surface-card-hover group relative overflow-hidden rounded-2xl p-6"
      }
    >
      {!emphasized ? (
        <div className="pointer-events-none absolute inset-x-6 top-0 h-[2px] rounded-full bg-gradient-to-r from-indigo-300/85 to-transparent" />
      ) : null}
      {!emphasized ? (
        <div className="pointer-events-none absolute -right-16 -top-14 h-40 w-40 rounded-full bg-indigo-200/30 opacity-0 blur-3xl transition group-hover:opacity-100" />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={[
              "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border",
              emphasized ? "border-white/35 bg-white/92 text-indigo-700" : "site-icon-plate text-indigo-600",
            ].join(" ")}
          >
            <props.program.Icon className="h-5 w-5" />
          </span>
          <div>
            <p className={["text-lg font-semibold", emphasized ? "text-white" : "text-primary"].join(" ")}>{props.program.name}</p>
            <p className={["mt-2 text-sm", emphasized ? "text-white/84" : "text-secondary/82"].join(" ")}>{props.program.tagline}</p>
          </div>
        </div>

        {emphasized ? (
          <span className="rounded-xl border border-white/35 bg-white/14 px-3 py-2 text-xs font-semibold text-white">
            {props.copy.recommended}
          </span>
        ) : null}
      </div>

      <p
        className={[
          "mt-5 rounded-xl px-3 py-2 text-xs font-semibold",
          emphasized ? "border border-white/26 bg-white/10 text-white/90" : "border border-indigo-200/70 bg-indigo-50/75 text-indigo-900",
        ].join(" ")}
      >
        {props.copy.idealForPrefix}: {props.program.idealFor}
      </p>

      <ul className="mt-6 space-y-2">
        {props.program.highlights.slice(0, 7).map((item) => (
          <li key={item} className={["flex gap-3 text-sm", emphasized ? "text-white/88" : "text-secondary/84"].join(" ")}>
            <span
              className={[
                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg",
                emphasized ? "bg-white/92" : "bg-indigo-100",
              ].join(" ")}
            >
              <CheckCircle2 className={["h-3.5 w-3.5", emphasized ? "text-indigo-700" : "text-indigo-600"].join(" ")} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/contact"
          className={[
            "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
            emphasized ? "bg-white text-indigo-700 hover:bg-indigo-50" : "site-cta-primary text-white",
          ].join(" ")}
        >
          {props.copy.discussProgram}
          <ArrowRight className={["h-4 w-4", emphasized ? "text-indigo-700" : "text-indigo-100"].join(" ")} />
        </Link>

        <Link
          href="/signup?role=vendor"
          className={[
            "inline-flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition",
            emphasized
              ? "border border-white/35 bg-transparent text-white hover:bg-white/12"
              : "site-cta-muted",
          ].join(" ")}
        >
          {props.copy.vendorSignup}
        </Link>
      </div>
    </article>
  );
}

export default function OwnerPrograms(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];

  return (
    <section id="owner-programs" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.title}</h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.subtitle}</p>
          </div>

          <Link
            href="/services"
            className="site-cta-muted inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
          >
            {copy.reviewCapabilities}
            <ArrowRight className={props.locale === "ar" ? "h-4 w-4 rotate-180 text-indigo-600" : "h-4 w-4 text-indigo-600"} />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {copy.programs.map((program) => (
            <ProgramCard key={program.name} program={program} copy={copy} />
          ))}
        </div>

        <div className="site-surface-card mt-8 overflow-hidden rounded-2xl">
          <div className="grid gap-0 md:grid-cols-3">
            {copy.programs.map((program, idx) => (
              <div
                key={`${program.name}-meta`}
                className={[
                  "p-5 transition hover:bg-indigo-50/35",
                  idx < copy.programs.length - 1 ? "border-b border-indigo-100/70 md:border-b-0 md:border-r" : "",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-primary">{program.name}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary/65">{copy.controlLevelLabel}</p>
                <p className="mt-1 text-sm text-secondary/82">{program.controlLevel}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-secondary/65">{copy.opsCoverageLabel}</p>
                <p className="mt-1 text-sm text-secondary/82">{program.opsCoverage}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-indigo-200/70 blur-3xl" />
      </div>
    </section>
  );
}
