import Link from "next/link";
import { ArrowRight, BadgeCheck, ReceiptText, ShieldCheck } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type Principle = {
  title: string;
  detail: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type PricingHeroCopy = {
  eyebrow: string;
  title: string;
  body: string;
  browseStays: string;
  pricingTeam: string;
  principlesEyebrow: string;
  principles: Principle[];
};

const COPY: Record<AppLocale, PricingHeroCopy> = {
  en: {
    eyebrow: "Pricing",
    title: "Pricing clarity engineered before every checkout",
    body:
      "Nightly rates, service components, and policy-linked outcomes are shown in one structure. Server-side quote controls keep totals consistent from listing to payment.",
    browseStays: "Browse available stays",
    pricingTeam: "Talk to pricing team",
    principlesEyebrow: "Pricing principles",
    principles: [
      {
        title: "No hidden charge model",
        detail: "All known fees are surfaced before payment confirmation.",
        Icon: ReceiptText,
      },
      {
        title: "Policy-backed outcomes",
        detail: "Cancellation and refund outcomes follow defined rule windows.",
        Icon: ShieldCheck,
      },
      {
        title: "Audit consistency",
        detail: "Quote and payment events stay aligned through backend state controls.",
        Icon: BadgeCheck,
      },
    ],
  },
  ar: {
    eyebrow: "التسعير",
    title: "وضوح تسعيري مصمم قبل كل عملية دفع",
    body:
      "نعرض السعر الليلي ورسوم الخدمة والنتائج المرتبطة بالسياسات ضمن هيكل موحد. ضوابط عرض السعر على الخادم تضمن اتساق الإجماليات من الإدراج حتى الدفع.",
    browseStays: "تصفح الإقامات المتاحة",
    pricingTeam: "تواصل مع فريق التسعير",
    principlesEyebrow: "مبادئ التسعير",
    principles: [
      {
        title: "نموذج بلا رسوم مخفية",
        detail: "تظهر جميع الرسوم المعروفة قبل تأكيد الدفع.",
        Icon: ReceiptText,
      },
      {
        title: "نتائج مدعومة بالسياسات",
        detail: "نتائج الإلغاء والاسترداد تتبع نوافذ قواعد محددة.",
        Icon: ShieldCheck,
      },
      {
        title: "اتساق قابل للتدقيق",
        detail: "أحداث عرض السعر والدفع تبقى متوافقة عبر ضوابط الحالة الخلفية.",
        Icon: BadgeCheck,
      },
    ],
  },
};

export default function PricingHero(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 rotate-180" : "h-4 w-4";

  return (
    <section className="site-hero-shell relative overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="site-hero-grid absolute inset-0 opacity-25" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.65rem]">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/86 sm:text-base">{copy.body}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-900 shadow-[0_12px_28px_rgba(11,15,25,0.24)] transition hover:bg-indigo-50"
              >
                {copy.browseStays}
                <ArrowRight className={arrowClass} />
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-white/44 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
              >
                {copy.pricingTeam}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/28 bg-white/12 p-6 shadow-[0_18px_48px_rgba(11,15,25,0.2)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/76">{copy.principlesEyebrow}</p>
            <div className="mt-4 space-y-3">
              {copy.principles.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/24 bg-white/12 p-4">
                  <div className="flex items-start gap-3">
                    <span className="site-icon-plate-light mt-0.5 h-8 w-8 shrink-0">
                      <item.Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/82">{item.detail}</p>
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
