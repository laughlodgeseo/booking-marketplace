import type { LucideIcon } from "lucide-react";
import { BadgeCheck, CheckCircle2, Landmark, MoonStar, ReceiptText } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Card = {
  title: string;
  desc: string;
  bullets: ReadonlyArray<string>;
  Icon: LucideIcon;
  emphasis?: boolean;
};

type PricingCardsCopy = {
  sectionEyebrow: string;
  sectionTitle: string;
  sectionBody: string;
  coreLabel: string;
  cards: Card[];
};

const COPY: Record<AppLocale, PricingCardsCopy> = {
  en: {
    sectionEyebrow: "Pricing model",
    sectionTitle: "What makes up your total before payment",
    sectionBody:
      "We separate pricing components clearly so guests can make informed booking decisions and owners can trust commercial transparency.",
    coreLabel: "Core",
    cards: [
      {
        title: "Nightly rate logic",
        desc: "Base stay cost reflects date-specific demand, seasonality, and stay duration patterns.",
        bullets: [
          "Date-aware rate presentation",
          "Demand-sensitive pricing windows",
          "Displayed per-night with quote alignment",
        ],
        Icon: MoonStar,
        emphasis: true,
      },
      {
        title: "Operational and service fees",
        desc: "Applicable service fees are surfaced clearly so guests understand what supports stay delivery.",
        bullets: [
          "Cleaning and turnover preparation",
          "Operational readiness support",
          "Shown before checkout confirmation",
        ],
        Icon: ReceiptText,
      },
      {
        title: "Policy and regulatory components",
        desc: "Policy-window outcomes and local fee components are applied where relevant and disclosed transparently.",
        bullets: [
          "Cancellation-rule windows by booking",
          "Regulatory or tourism components where applicable",
          "Server-side consistency between quote and charge",
        ],
        Icon: Landmark,
      },
      {
        title: "Checkout confidence",
        desc: "Totals are presented with clear breakdown context before payment execution.",
        bullets: [
          "No hidden-charge design approach",
          "Policy summary before commit",
          "State-safe booking and payment flow",
        ],
        Icon: BadgeCheck,
      },
    ],
  },
  ar: {
    sectionEyebrow: "نموذج التسعير",
    sectionTitle: "ما الذي يشكل إجمالي السعر قبل الدفع",
    sectionBody:
      "نفصل مكونات التسعير بوضوح حتى يتخذ الضيف قراراً مدروساً ويتمتع المالك بشفافية تجارية موثوقة.",
    coreLabel: "أساسي",
    cards: [
      {
        title: "منطق السعر الليلي",
        desc: "تعكس تكلفة الإقامة الأساسية الطلب حسب التاريخ والموسمية وأنماط مدة الإقامة.",
        bullets: [
          "عرض سعر مرتبط بالتواريخ",
          "نوافذ تسعير حساسة للطلب",
          "عرض لكل ليلة مع اتساق مع عرض السعر",
        ],
        Icon: MoonStar,
        emphasis: true,
      },
      {
        title: "الرسوم التشغيلية ورسوم الخدمة",
        desc: "تظهر رسوم الخدمة المطبقة بوضوح ليفهم الضيف ما الذي يدعم تقديم الإقامة.",
        bullets: [
          "التنظيف وتجهيز التحويل",
          "دعم الجاهزية التشغيلية",
          "عرض كامل قبل تأكيد الدفع",
        ],
        Icon: ReceiptText,
      },
      {
        title: "عناصر السياسة واللوائح",
        desc: "تُطبق نتائج نوافذ السياسة والعناصر المحلية ذات الصلة وتُعرض بشفافية.",
        bullets: [
          "نوافذ إلغاء مرتبطة بكل حجز",
          "عناصر تنظيمية أو سياحية عند الانطباق",
          "اتساق خلفي بين عرض السعر والمبلغ المحصل",
        ],
        Icon: Landmark,
      },
      {
        title: "ثقة أعلى عند الإتمام",
        desc: "تُعرض الإجماليات مع تفصيل واضح قبل تنفيذ الدفع.",
        bullets: [
          "نهج بدون رسوم مخفية",
          "ملخص سياسة قبل الالتزام",
          "تدفق حجز ودفع آمن بالحالة",
        ],
        Icon: BadgeCheck,
      },
    ],
  },
};

function CardItem(props: { card: Card; coreLabel: string }) {
  const emphasized = props.card.emphasis === true;

  return (
    <article
      className={
        emphasized
          ? "relative overflow-hidden rounded-2xl border border-indigo-300/65 bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-6 text-white shadow-[0_26px_54px_rgba(67,56,202,0.34)]"
          : "rounded-2xl border border-indigo-100/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)]"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={[
              "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border",
              emphasized ? "border-white/35 bg-white/12 text-white" : "border-indigo-200/80 bg-indigo-50/80 text-indigo-600",
            ].join(" ")}
          >
            <props.card.Icon className="h-5 w-5" />
          </span>
          <div>
            <p className={["text-lg font-semibold", emphasized ? "text-white" : "text-primary"].join(" ")}>{props.card.title}</p>
            <p className={["mt-2 text-sm", emphasized ? "text-white/84" : "text-secondary/82"].join(" ")}>{props.card.desc}</p>
          </div>
        </div>
        {emphasized ? (
          <span className="rounded-xl border border-white/35 bg-white/14 px-3 py-2 text-xs font-semibold text-white">
            {props.coreLabel}
          </span>
        ) : null}
      </div>

      <ul className="mt-6 space-y-2">
        {props.card.bullets.slice(0, 7).map((bullet) => (
          <li key={bullet} className={["flex gap-3 text-sm", emphasized ? "text-white/88" : "text-secondary/84"].join(" ")}>
            <span className={["mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg", emphasized ? "bg-white/14" : "bg-indigo-100"].join(" ")}>
              <CheckCircle2 className={["h-3.5 w-3.5", emphasized ? "text-white" : "text-indigo-600"].join(" ")} />
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function PricingCards(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];

  return (
    <section id="pricing-model" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.sectionEyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.sectionTitle}</h2>
          <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.sectionBody}</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {copy.cards.map((card) => (
            <CardItem key={card.title} card={card} coreLabel={copy.coreLabel} />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/3 h-72 w-72 -translate-y-1/2 rounded-full bg-indigo-200/70 blur-3xl" />
      </div>
    </section>
  );
}
