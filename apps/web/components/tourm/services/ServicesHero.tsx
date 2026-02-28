import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck, Clock3, ShieldCheck } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Highlight = {
  title: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type ServicesHeroCopy = {
  eyebrow: string;
  title: string;
  description: string;
  exploreCta: string;
  bookOpsCallCta: string;
  comparePrograms: string;
  reviewPricing: string;
  requestScope: string;
  modelEyebrow: string;
  modelTitle: string;
  highlights: Highlight[];
};

const COPY: Record<AppLocale, ServicesHeroCopy> = {
  en: {
    eyebrow: "Operator services",
    title: "Premium service operations made simple",
    description:
      "From pre-arrival setup to post-checkout tasks, we run every service step with clear standards. This keeps guest experience consistent, even in busy periods.",
    exploreCta: "Explore capabilities",
    bookOpsCallCta: "Book an operations call",
    comparePrograms: "See owner programs",
    reviewPricing: "See pricing",
    requestScope: "Request a custom scope",
    modelEyebrow: "Operating model",
    modelTitle: "Service delivery tied to booking milestones",
    highlights: [
      {
        title: "Booking-linked tasks",
        desc: "Cleaning and inspection tasks trigger automatically from booking events.",
        Icon: ClipboardCheck,
      },
      {
        title: "Fast turnover",
        desc: "Same-day changeovers with clear checklists and completion tracking.",
        Icon: Clock3,
      },
      {
        title: "Quality checks",
        desc: "Repeatable checkpoints reduce guest issues and protect reviews.",
        Icon: ShieldCheck,
      },
      {
        title: "Clear visibility",
        desc: "Owners can see assignments, progress, and status changes at any time.",
        Icon: BadgeCheck,
      },
    ],
  },
  ar: {
    eyebrow: "الخدمات التشغيلية",
    title: "تشغيل ضيافة مصمم لنتائج ضيف متوقعة وموثوقة",
    description:
      "ندير تقديم الخدمات عبر معايير واضحة وتوقعات أداء ومسارات تصعيد دقيقة. من جاهزية ما قبل الوصول إلى معالجة ما بعد المغادرة، ترتبط سير العمل بمحطات دورة الحجز لضمان ثبات الجودة حتى في فترات التحويل المرتفعة.",
    exploreCta: "استكشف القدرات",
    bookOpsCallCta: "احجز مكالمة تشغيلية",
    comparePrograms: "قارن برامج الملاك",
    reviewPricing: "راجع نموذج التسعير",
    requestScope: "اطلب نطاقاً مخصصاً",
    modelEyebrow: "النموذج التشغيلي",
    modelTitle: "تسليم الخدمات متوافق مع مراحل الحجز",
    highlights: [
      {
        title: "تنفيذ متزامن مع الحجز",
        desc: "مهام التنظيف والتفتيش والجاهزية تُفعّل مباشرة من حالات الحجز.",
        Icon: ClipboardCheck,
      },
      {
        title: "موثوقية التحويل",
        desc: "انتقالات سريعة خلال اليوم نفسه مع قوائم تحقق موحدة ودليل إنجاز.",
        Icon: Clock3,
      },
      {
        title: "حوكمة جودة",
        desc: "نقاط فحص جودة قابلة للتكرار تقلل شكاوى الضيوف وتحمي مستوى التقييم.",
        Icon: ShieldCheck,
      },
      {
        title: "تشغيل قابل للتدقيق",
        desc: "تغييرات التعيين وانتقالات الحالة مرئية للمالك وقيادات التشغيل.",
        Icon: BadgeCheck,
      },
    ],
  },
};

export default function ServicesHero(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-700 rotate-180" : "h-4 w-4 text-indigo-700";

  return (
    <section className="relative overflow-hidden border-b border-white/24 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/84 sm:text-base">{copy.description}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#capabilities"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-950 shadow-[0_12px_28px_rgba(11,15,25,0.24)] transition hover:bg-indigo-50"
              >
                {copy.exploreCta}
                <ArrowRight className={arrowClass} />
              </a>
              <Link
                href="/contact"
                className="rounded-xl border border-white/60 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copy.bookOpsCallCta}
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-white/85">
              <Link href="/owners" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
                {copy.comparePrograms}
              </Link>
              <Link href="/pricing" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
                {copy.reviewPricing}
              </Link>
              <Link href="/contact" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
                {copy.requestScope}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/30 bg-white/10 p-6 shadow-[0_18px_48px_rgba(11,15,25,0.2)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/76">{copy.modelEyebrow}</p>
            <p className="mt-2 text-base font-semibold text-white">{copy.modelTitle}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {copy.highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/24 bg-white/12 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/12">
                      <item.Icon className="h-4 w-4 text-white" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/82">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
