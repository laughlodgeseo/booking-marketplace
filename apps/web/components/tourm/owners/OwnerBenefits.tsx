import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BadgeCheck, CalendarClock, Layers3, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Benefit = {
  title: string;
  desc: string;
  outcome: string;
  Icon: LucideIcon;
};

type OwnerBenefitsCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  outcomePrefix: string;
  benefits: Benefit[];
};

const COPY: Record<AppLocale, OwnerBenefitsCopy> = {
  en: {
    eyebrow: "Benefits",
    title: "Why owners choose us",
    subtitle:
      "Simple operations, premium standards, and clear reporting to help your property grow with less effort.",
    cta: "See matching programs",
    outcomePrefix: "Outcome",
    benefits: [
      {
        title: "Smart revenue growth",
        desc: "We update pricing based on season, demand, and local events instead of fixed rates.",
        outcome: "Better occupancy and stronger monthly income stability.",
        Icon: TrendingUp,
      },
      {
        title: "Reliable turnovers",
        desc: "Cleaning, linen, and inspections are scheduled around every checkout and next check-in.",
        outcome: "Smoother arrivals and better guest reviews.",
        Icon: CalendarClock,
      },
      {
        title: "Easy to scale",
        desc: "Our standard process works for one home or many homes.",
        outcome: "Consistent quality as your portfolio grows.",
        Icon: Layers3,
      },
      {
        title: "Compliance support",
        desc: "Operations follow local short-stay rules, building rules, and guest ID checks.",
        outcome: "Lower legal and building-management risk.",
        Icon: ShieldCheck,
      },
      {
        title: "Clear accountability",
        desc: "You can see tasks, delays, and completion status in one place.",
        outcome: "Everyone knows what is done and what is pending.",
        Icon: BadgeCheck,
      },
      {
        title: "Premium guest experience",
        desc: "Service standards are repeatable across all properties, not based on chance.",
        outcome: "More trust, more repeat guests, and more referrals.",
        Icon: Sparkles,
      },
    ],
  },
  ar: {
    eyebrow: "المزايا",
    title: "مزايا محفظة مصممة لملكية الإقامات القصيرة المتميزة",
    subtitle:
      "من حوكمة الإيراد إلى ضوابط الجودة، كل طبقة مصممة لرفع ثقة المالك واستقرار تجربة الضيف على نطاق أوسع.",
    cta: "طابق المزايا مع البرامج",
    outcomePrefix: "النتيجة",
    benefits: [
      {
        title: "انضباط الإيرادات",
        desc: "تُدار استراتيجية التسعير حسب المواسم والأحداث ونوافذ الحجز بدل الاعتماد على أسعار ثابتة.",
        outcome: "استقرار أعلى في الإشغال وتماسك أفضل في العائد لكل وحدة متاحة بمرور الوقت.",
        Icon: TrendingUp,
      },
      {
        title: "موثوقية التحويل",
        desc: "تنفيذ التنظيف والمفروشات والتفتيش مرتبط بتوقيت مغادرة الضيف وموعد الوصول التالي.",
        outcome: "انخفاض المشكلات يوم الوصول وتحسن استقرار التقييمات.",
        Icon: CalendarClock,
      },
      {
        title: "قابلية توسع المحفظة",
        desc: "توحيد إجراءات التشغيل وتوزيع المسؤولية يمكّنك من إدارة وحدة أو عدة أصول بثبات.",
        outcome: "تشغيل قابل للتوقع مع نمو محفظتك.",
        Icon: Layers3,
      },
      {
        title: "جاهزية الامتثال",
        desc: "الممارسات التشغيلية متوافقة مع متطلبات الإقامات القصيرة وأنظمة المجتمع وفحوصات هوية الضيف.",
        outcome: "خفض التعرض لمخاطر الجهات التنظيمية وإدارات المباني.",
        Icon: ShieldCheck,
      },
      {
        title: "مساءلة الجودة",
        desc: "المهام والاستثناءات وحالات الإغلاق مرئية لضمان شفافية التنفيذ وجودته.",
        outcome: "مسؤولية واضحة عبر أعضاء الفريق والموردين.",
        Icon: BadgeCheck,
      },
      {
        title: "تجربة ضيف بمعيار علامة",
        desc: "معايير التجربة قابلة للتكرار عبر العقارات وليست معتمدة على جهود فردية متفرقة.",
        outcome: "ثقة أقوى، إقامات متكررة، واحتمالية إحالات أعلى.",
        Icon: Sparkles,
      },
    ],
  },
};

function BenefitCard(props: {
  benefit: Benefit;
  featured?: boolean;
  outcomePrefix: string;
}) {
  return (
    <article
      className={[
        "site-surface-card site-surface-card-hover group relative overflow-hidden rounded-2xl p-6",
        props.featured ? "lg:p-7" : "",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-200/35 blur-3xl" />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <span className="site-icon-plate h-11 w-11">
          <props.benefit.Icon className="h-5 w-5" />
        </span>
        <span className="h-2.5 w-2.5 rounded-full bg-indigo-300/70 opacity-0 transition group-hover:opacity-100" />
      </div>

      <p className="relative mt-4 text-base font-semibold text-primary">{props.benefit.title}</p>
      <p className="relative mt-2 text-sm leading-relaxed text-secondary/82">{props.benefit.desc}</p>

      <p className="relative mt-4 rounded-xl border border-indigo-200/75 bg-indigo-50/72 px-3 py-2 text-xs font-semibold text-indigo-900">
        {props.outcomePrefix}: {props.benefit.outcome}
      </p>
    </article>
  );
}

export default function OwnerBenefits(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const [featured, ...rest] = copy.benefits;

  return (
    <section id="owner-benefits" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.title}</h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.subtitle}</p>
          </div>

          <Link
            href="/owners#owner-programs"
            className="site-cta-muted inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
          >
            {copy.cta}
            <ArrowRight className={props.locale === "ar" ? "h-4 w-4 rotate-180 text-indigo-600" : "h-4 w-4 text-indigo-600"} />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <BenefitCard benefit={featured} featured outcomePrefix={copy.outcomePrefix} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-6">
            {rest.map((benefit) => (
              <BenefitCard key={benefit.title} benefit={benefit} outcomePrefix={copy.outcomePrefix} />
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/3 h-72 w-72 -translate-y-1/2 rounded-full bg-indigo-200/70 blur-3xl" />
      </div>
    </section>
  );
}
