import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck2, MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type OwnersHeroCopy = {
  eyebrow: string;
  title: string;
  description: string;
  signupCta: string;
  consultCta: string;
  comparePrograms: string;
  viewServices: string;
  reviewPricing: string;
  locationTag: string;
  locationNote: string;
  prioritiesEyebrow: string;
  prioritiesTitle: string;
  readinessHint: string;
  supportLabels: {
    demandZones: string;
    stayStandards: string;
    guestExperience: string;
  };
  supportAlt: {
    skyline: string;
    interior: string;
    experience: string;
    main: string;
  };
  highlights: Array<{ title: string; desc: string; Icon: React.ComponentType<{ className?: string }> }>;
};

const COPY: Record<AppLocale, OwnersHeroCopy> = {
  en: {
    eyebrow: "For owners",
    title: "Run your short-stay asset with hotel-grade operating discipline",
    description:
      "We combine distribution, booking controls, and on-ground operations so your property performs consistently in a competitive Dubai market. You choose your management depth, we execute to a defined service standard.",
    signupCta: "Sign up as vendor",
    consultCta: "Book owner consultation",
    comparePrograms: "Compare programs",
    viewServices: "View service scope",
    reviewPricing: "Review pricing model",
    locationTag: "Business Bay, Dubai",
    locationNote: "Core short-stay demand corridor with strong business and leisure traffic.",
    prioritiesEyebrow: "Owner operating priorities",
    prioritiesTitle:
      "Designed for assets targeting stable occupancy, stronger reviews, and predictable monthly reporting.",
    readinessHint: "Typical go-live readiness target: 7-14 days depending on property condition and document readiness.",
    supportLabels: {
      demandZones: "Demand zones",
      stayStandards: "Stay standards",
      guestExperience: "Guest experience",
    },
    supportAlt: {
      skyline: "Dubai skyline view representing high-demand short-stay districts",
      interior: "Luxury apartment interior representing premium stay standards",
      experience: "Premium hospitality setting representing guest experience quality",
      main: "Business Bay Dubai skyline and waterfront district",
    },
    highlights: [
      {
        title: "Demand-aware pricing",
        desc: "Rate governance aligned with seasonality, major events, and booking windows in Dubai.",
        Icon: TrendingUp,
      },
      {
        title: "Readiness discipline",
        desc: "Turnover, inspection, and issue resolution tied to reservation milestones.",
        Icon: CalendarCheck2,
      },
      {
        title: "Compliance-first operations",
        desc: "Processes designed around holiday-home operating requirements and community rules.",
        Icon: ShieldCheck,
      },
      {
        title: "Audit visibility",
        desc: "Clear tracking of tasks, responsibility, and exceptions across your portfolio.",
        Icon: BadgeCheck,
      },
    ],
  },
  ar: {
    eyebrow: "للملاك",
    title: "أدر عقارك قصير الإقامة بانضباط تشغيلي بمعيار فندقي",
    description:
      "نجمع بين التوزيع وضوابط الحجز والتنفيذ الميداني لضمان أداء ثابت لعقارك في سوق دبي التنافسي. أنت تختار مستوى الإدارة، ونحن ننفذ وفق معيار خدمة واضح.",
    signupCta: "التسجيل كمورّد",
    consultCta: "احجز استشارة للمالك",
    comparePrograms: "قارن البرامج",
    viewServices: "اطّلع على نطاق الخدمات",
    reviewPricing: "راجع نموذج التسعير",
    locationTag: "الخليج التجاري، دبي",
    locationNote: "ممر طلب رئيسي للإقامات القصيرة بحركة قوية من قطاعي الأعمال والترفيه.",
    prioritiesEyebrow: "أولويات التشغيل للمالك",
    prioritiesTitle: "مصمم للعقارات التي تستهدف إشغالاً مستقراً وتقييمات أقوى وتقارير شهرية متوقعة.",
    readinessHint: "المدة المعتادة للجاهزية قبل الإطلاق: 7-14 يوماً بحسب حالة العقار واستكمال المستندات.",
    supportLabels: {
      demandZones: "مناطق الطلب",
      stayStandards: "معايير الإقامة",
      guestExperience: "تجربة الضيف",
    },
    supportAlt: {
      skyline: "إطلالة أفق دبي التي تعكس مناطق الطلب المرتفع للإقامات القصيرة",
      interior: "تصميم داخلي فاخر يعكس معايير إقامة راقية",
      experience: "بيئة ضيافة راقية تعكس جودة تجربة الضيف",
      main: "أفق الخليج التجاري والواجهة المائية في دبي",
    },
    highlights: [
      {
        title: "تسعير مرتبط بالطلب",
        desc: "حوكمة الأسعار مرتبطة بالمواسم والأحداث الكبرى ونوافذ الحجز في دبي.",
        Icon: TrendingUp,
      },
      {
        title: "انضباط الجاهزية",
        desc: "التحويل والتفتيش ومعالجة الملاحظات مرتبطة بمحطات الحجز.",
        Icon: CalendarCheck2,
      },
      {
        title: "تشغيل يراعي الامتثال",
        desc: "العمليات مصممة وفق متطلبات تشغيل بيوت العطلات وأنظمة المجتمع السكني.",
        Icon: ShieldCheck,
      },
      {
        title: "رؤية تدقيقية",
        desc: "تتبع واضح للمهام والمسؤوليات والاستثناءات على مستوى محفظتك.",
        Icon: BadgeCheck,
      },
    ],
  },
};

export default function OwnersHero(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const heroImages = {
    main: "/images/owners/hero-4k/main_business_bay-4k.webp",
    skyline: "/images/owners/hero-4k/support_dubai_skyline-4k.webp",
    interior: "/images/owners/hero-4k/support_luxury_interior-4k.webp",
    experience: "/images/owners/hero-4k/support_guest_experience-4k.webp",
  } as const;

  const supportImages = [
    {
      key: "skyline",
      src: heroImages.skyline,
      alt: copy.supportAlt.skyline,
      label: copy.supportLabels.demandZones,
    },
    {
      key: "interior",
      src: heroImages.interior,
      alt: copy.supportAlt.interior,
      label: copy.supportLabels.stayStandards,
    },
    {
      key: "experience",
      src: heroImages.experience,
      alt: copy.supportAlt.experience,
      label: copy.supportLabels.guestExperience,
    },
  ] as const;

  return (
    <section className="relative overflow-hidden bg-transparent text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_8%_8%,rgba(99,102,241,0.18),rgba(255,255,255,0)_56%),radial-gradient(90%_80%_at_94%_10%,rgba(129,140,248,0.14),rgba(255,255,255,0)_58%)]" />
        <div className="absolute -left-28 top-[-130px] h-[420px] w-[420px] rounded-full bg-indigo-200/55 blur-3xl" />
        <div className="absolute right-[-150px] top-12 h-[460px] w-[460px] rounded-full bg-indigo-300/38 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(rgba(15,23,42,0.55)_0.5px,transparent_0.5px)] [background-size:4px_4px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/72">{copy.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-primary sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-secondary/84 sm:text-base">{copy.description}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/signup?role=vendor"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/80 bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(79,70,229,0.32)] transition hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              {copy.signupCta}
              <ArrowRight className="h-4 w-4 text-white/92" />
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-line/80 bg-white/78 px-5 py-3 text-sm font-semibold text-primary shadow-[0_10px_26px_rgba(11,15,25,0.08)] transition hover:bg-white"
            >
              {copy.consultCta}
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
            <Link href="/owners#owner-programs" className="text-indigo-700 underline decoration-indigo-300 underline-offset-4 transition hover:text-indigo-800 hover:decoration-indigo-500">
              {copy.comparePrograms}
            </Link>
            <Link href="/services" className="text-indigo-700 underline decoration-indigo-300 underline-offset-4 transition hover:text-indigo-800 hover:decoration-indigo-500">
              {copy.viewServices}
            </Link>
            <Link href="/pricing" className="text-indigo-700 underline decoration-indigo-300 underline-offset-4 transition hover:text-indigo-800 hover:decoration-indigo-500">
              {copy.reviewPricing}
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-3xl border border-indigo-100/90 bg-white/86 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="relative overflow-hidden rounded-2xl border border-indigo-100/80 bg-white">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src={heroImages.main}
                  alt={copy.supportAlt.main}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 38vw"
                  className="object-cover"
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/52 via-black/10 to-transparent" />
              <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/35 bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white">
                <MapPin className="h-3 w-3" />
                {copy.locationTag}
              </div>
              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/26 bg-black/30 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                {copy.locationNote}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {supportImages.map((image) => (
                <div key={image.key} className="overflow-hidden rounded-xl border border-indigo-100/80 bg-white">
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 640px) 30vw, (max-width: 1024px) 18vw, 12vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="bg-white/94 px-2 py-1.5 text-center text-[11px] font-semibold text-primary/88">{image.label}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-indigo-100/90 bg-white/86 p-6 shadow-[0_18px_46px_rgba(15,23,42,0.10)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">{copy.prioritiesEyebrow}</p>
            <p className="mt-2 text-sm font-semibold text-primary sm:text-base">{copy.prioritiesTitle}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {copy.highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-indigo-100/85 bg-indigo-50/42 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-indigo-200/80 bg-white">
                      <item.Icon className="h-4 w-4 text-indigo-600" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-primary">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-secondary/82">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-indigo-200/80 bg-indigo-50/72 px-3 py-2 text-xs font-semibold text-indigo-900">
              {copy.readinessHint}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
