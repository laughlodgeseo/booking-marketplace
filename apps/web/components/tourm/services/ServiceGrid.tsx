import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Brush, CheckCircle2, ClipboardCheck, LifeBuoy, PackageOpen, Shirt, Wrench } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Service = {
  title: string;
  desc: string;
  outcome: string;
  bullets: ReadonlyArray<string>;
  Icon: LucideIcon;
};

type ServiceGridCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  scopeCta: string;
  mapCta: string;
  orLabel: string;
  reviewOptionsCta: string;
  outcomePrefix: string;
  services: Service[];
};

const COPY: Record<AppLocale, ServiceGridCopy> = {
  en: {
    eyebrow: "Capabilities",
    title: "Service execution layers that protect guest experience",
    subtitle:
      "Each service is mapped to reservation lifecycle events so tasks trigger on time, ownership is clear, and operational quality is measurable.",
    scopeCta: "Scope services for my property",
    mapCta: "See how these capabilities map to owner programs",
    orLabel: "or",
    reviewOptionsCta: "review commercial options",
    outcomePrefix: "Outcome",
    services: [
      {
        title: "Cleaning",
        desc: "Professional turnover cleaning standards calibrated for short-stay frequency and premium guest expectation.",
        outcome: "Ready-to-check-in units with fewer day-of-arrival escalations and rework.",
        bullets: [
          "Booking-linked turnover scheduling",
          "Room-by-room checklist completion",
          "Exception capture and escalation path",
          "Completion status visible to operations leads",
        ],
        Icon: Brush,
      },
      {
        title: "Inspection",
        desc: "Structured inspections that verify readiness, safety, and presentation consistency before check-in.",
        outcome: "Lower defect rates and stronger review reliability across stays.",
        bullets: [
          "Pre-arrival readiness inspection",
          "Post-checkout condition walkthrough",
          "Checklist-based quality scoring",
          "Maintenance issue flagging with severity",
        ],
        Icon: ClipboardCheck,
      },
      {
        title: "Linen",
        desc: "Linen rotation and replacement flows that maintain standards across high-turnover properties.",
        outcome: "Consistent presentation quality and fewer guest comfort complaints.",
        bullets: [
          "Turnover-linked linen change tasks",
          "Category-based linen handling standards",
          "Exceptions flagged to operations queue",
          "Property-level SOP alignment",
        ],
        Icon: Shirt,
      },
      {
        title: "Restock",
        desc: "Amenity and essentials restocking with clear par-level expectations by property configuration.",
        outcome: "Reduced guest friction and fewer arrival-day support tickets.",
        bullets: [
          "Essentials and amenity restock checks",
          "Task prompts tied to turnover events",
          "Configured scope by property program",
          "Escalation for out-of-stock dependencies",
        ],
        Icon: PackageOpen,
      },
      {
        title: "Maintenance",
        desc: "Maintenance requests and work-order lifecycle management with accountability at each stage.",
        outcome: "Faster issue resolution and stronger long-term asset protection.",
        bullets: [
          "Structured request intake and triage",
          "Work-order assignment and SLA tracking",
          "Progress visibility for owner and operator",
          "Audit history for each intervention",
        ],
        Icon: Wrench,
      },
      {
        title: "Guest support",
        desc: "Operational guest support tied to booking context and backed by clear escalation workflows.",
        outcome: "Faster policy-aligned resolutions and better guest trust.",
        bullets: [
          "Booking-context issue handling",
          "Policy-aware escalation logic",
          "Ops handoff to maintenance or housekeeping",
          "Consistent communication standards",
        ],
        Icon: LifeBuoy,
      },
    ],
  },
  ar: {
    eyebrow: "القدرات",
    title: "طبقات تنفيذ خدمية تحمي تجربة الضيف",
    subtitle:
      "كل خدمة مرتبطة بمحطات دورة الحجز لضمان تفعيل المهام في الوقت المناسب ووضوح المسؤولية وإمكانية قياس جودة التشغيل.",
    scopeCta: "حدّد نطاق الخدمات لعقاري",
    mapCta: "اعرف كيف ترتبط هذه القدرات ببرامج الملاك",
    orLabel: "أو",
    reviewOptionsCta: "راجع الخيارات التجارية",
    outcomePrefix: "النتيجة",
    services: [
      {
        title: "التنظيف",
        desc: "معايير تنظيف احترافية لعمليات التحويل بما يتناسب مع وتيرة الإقامات القصيرة وتوقعات الضيوف الراقية.",
        outcome: "وحدات جاهزة لتسجيل الدخول مع انخفاض التصعيدات وإعادة العمل يوم الوصول.",
        bullets: [
          "جدولة التحويل مرتبطة بالحجز",
          "إتمام قوائم تحقق لكل غرفة",
          "توثيق الاستثناءات ومسار التصعيد",
          "إظهار حالة الإنجاز لقيادات التشغيل",
        ],
        Icon: Brush,
      },
      {
        title: "التفتيش",
        desc: "عمليات تفتيش منظمة للتحقق من الجاهزية والسلامة وثبات العرض قبل تسجيل الدخول.",
        outcome: "انخفاض معدلات العيوب وتعزيز موثوقية التقييمات عبر الإقامات.",
        bullets: [
          "تفتيش جاهزية قبل الوصول",
          "جولة حالة بعد المغادرة",
          "تقييم جودة قائم على قوائم تحقق",
          "الإبلاغ عن ملاحظات الصيانة حسب درجة الأولوية",
        ],
        Icon: ClipboardCheck,
      },
      {
        title: "البياضات",
        desc: "دورات تبديل وتجديد بياضات تحافظ على المعايير عبر العقارات مرتفعة التحويل.",
        outcome: "ثبات جودة العرض وتقليل شكاوى الراحة لدى الضيوف.",
        bullets: [
          "مهام تبديل بياضات مرتبطة بالتحويل",
          "معايير معالجة حسب فئة البياضات",
          "توجيه الاستثناءات إلى طابور العمليات",
          "مواءمة مع إجراءات التشغيل لكل عقار",
        ],
        Icon: Shirt,
      },
      {
        title: "إعادة التزويد",
        desc: "إعادة تزويد المستلزمات والمرافق وفق حدود مخزون واضحة حسب تكوين كل عقار.",
        outcome: "تقليل الاحتكاك لدى الضيف وانخفاض طلبات الدعم في يوم الوصول.",
        bullets: [
          "فحوصات إعادة تزويد للمستلزمات الأساسية",
          "تنبيهات مهام مرتبطة بأحداث التحويل",
          "نطاق خدمة مضبوط حسب برنامج العقار",
          "تصعيد عند نقص عناصر الإمداد",
        ],
        Icon: PackageOpen,
      },
      {
        title: "الصيانة",
        desc: "إدارة طلبات الصيانة ودورة أوامر العمل مع مساءلة واضحة في كل مرحلة.",
        outcome: "سرعة أعلى في حل الأعطال وحماية أفضل للأصل على المدى الطويل.",
        bullets: [
          "استقبال وفرز منظم للطلبات",
          "تعيين أوامر العمل وتتبع اتفاقية الخدمة",
          "رؤية تقدم العمل للمالك والمشغّل",
          "سجل تدقيقي لكل تدخل",
        ],
        Icon: Wrench,
      },
      {
        title: "دعم الضيوف",
        desc: "دعم تشغيلي مرتبط بسياق الحجز ومدعوم بمسارات تصعيد واضحة.",
        outcome: "حلول أسرع ومتوافقة مع السياسات وثقة أعلى لدى الضيف.",
        bullets: [
          "معالجة المشكلات ضمن سياق الحجز",
          "منطق تصعيد مطابق للسياسات",
          "تحويل تشغيلي إلى الصيانة أو التدبير",
          "معايير تواصل متسقة",
        ],
        Icon: LifeBuoy,
      },
    ],
  },
};

function ServiceCard(props: { s: Service; outcomePrefix: string }) {
  return (
    <article className="premium-card premium-card-tinted premium-card-hover card-accent-left rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-primary">{props.s.title}</p>
        <span className="grid h-11 w-11 place-items-center rounded-[0.95rem] border border-indigo-200/80 bg-indigo-50/85 text-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
          <props.s.Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-secondary/82">{props.s.desc}</p>

      <p className="mt-4 rounded-xl border border-indigo-200/70 bg-indigo-50/72 px-3 py-2 text-xs font-semibold text-indigo-900">
        {props.outcomePrefix}: {props.s.outcome}
      </p>

      <ul className="mt-5 space-y-2">
        {props.s.bullets.slice(0, 5).map((bullet) => (
          <li key={bullet} className="flex gap-3 text-sm text-secondary">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg bg-indigo-100">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function ServiceGrid(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];

  return (
    <section id="capabilities" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.title}</h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.subtitle}</p>
          </div>

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/70 bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            {copy.scopeCta}
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {copy.services.map((service) => (
            <ServiceCard key={service.title} s={service} outcomePrefix={copy.outcomePrefix} />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/owners"
            className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500"
          >
            {copy.mapCta}
          </Link>
          <span className="text-secondary/70">{copy.orLabel}</span>
          <Link
            href="/pricing"
            className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500"
          >
            {copy.reviewOptionsCta}
          </Link>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/3 h-72 w-72 -translate-y-1/2 rounded-full bg-indigo-200/70 blur-3xl" />
      </div>
    </section>
  );
}
