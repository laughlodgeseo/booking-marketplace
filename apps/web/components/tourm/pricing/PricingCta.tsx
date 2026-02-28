import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, WalletCards } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type PricingCtaCopy = {
  eyebrow: string;
  title: string;
  body: string;
  browseStays: string;
  askQuestion: string;
  expectTitle: string;
  expectItems: string[];
  paymentConfidenceTitle: string;
  paymentConfidenceBody: string;
  policyConsistencyTitle: string;
  policyConsistencyBody: string;
};

const COPY: Record<AppLocale, PricingCtaCopy> = {
  en: {
    eyebrow: "Ready to book",
    title: "Select dates and review real quote totals",
    body:
      "Browse properties, select dates, and review a clear quote before checkout. If anything is unclear, we can explain each line item.",
    browseStays: "Browse stays",
    askQuestion: "Ask a pricing question",
    expectTitle: "What you can expect",
    expectItems: [
      "Clear totals before payment authorization",
      "Policy-linked cancellation transparency",
      "Server-side quote consistency",
      "Support channel for quick clarification",
    ],
    paymentConfidenceTitle: "Payment confidence",
    paymentConfidenceBody:
      "Payment attempts and booking status are synchronized to keep outcomes reliable.",
    policyConsistencyTitle: "Policy consistency",
    policyConsistencyBody:
      "Cancellation and refund outcomes follow fixed policy windows, not ad-hoc decisions.",
  },
  ar: {
    eyebrow: "جاهز للحجز",
    title: "اختر التواريخ وراجع إجماليات عرض السعر الفعلية",
    body:
      "تصفح العقارات وحدد التواريخ وراجع عرض سعر واضح قبل الإتمام. إذا احتجت توضيحاً، يمكن لفريقنا شرح كل بند بالتفصيل.",
    browseStays: "تصفح الإقامات",
    askQuestion: "اسأل عن التسعير",
    expectTitle: "ما الذي يمكنك توقعه",
    expectItems: [
      "إجماليات واضحة قبل تفويض الدفع",
      "شفافية في الإلغاء مرتبطة بالسياسات",
      "اتساق عرض السعر على الخادم",
      "قناة دعم للتوضيح اليدوي عند الحاجة",
    ],
    paymentConfidenceTitle: "ثقة في الدفع",
    paymentConfidenceBody: "تتم مزامنة محاولات التحصيل وحالات تأكيد الحجز للحفاظ على نتائج دفع منضبطة.",
    policyConsistencyTitle: "اتساق السياسات",
    policyConsistencyBody: "نتائج الإلغاء والاسترداد تتبع نوافذ قواعد مخزنة وليست قرارات يدوية عشوائية.",
  },
};

export default function PricingCta(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-700 rotate-180" : "h-4 w-4 text-indigo-700";

  return (
    <section className="relative w-full pb-16 pt-6 sm:pb-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="site-dark-card overflow-hidden rounded-[2rem] text-white">
          <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{copy.title}</h3>
              <p className="mt-3 text-sm text-white/84 sm:text-base">{copy.body}</p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  {copy.browseStays}
                  <ArrowRight className={arrowClass} />
                </Link>
                <Link
                  href="/contact"
                  className="rounded-xl border border-white/35 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {copy.askQuestion}
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/28 bg-white/12 p-6 backdrop-blur">
                <p className="text-sm font-semibold text-white">{copy.expectTitle}</p>
                <ul className="mt-4 space-y-2">
                  {copy.expectItems.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-white/88">
                      <span className="site-icon-plate-light mt-0.5 h-5 w-5 shrink-0 rounded-md">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/28 bg-white/12 p-6 backdrop-blur">
                <div className="flex items-start gap-3">
                  <span className="site-icon-plate-light mt-0.5 h-9 w-9">
                    <WalletCards className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{copy.paymentConfidenceTitle}</p>
                    <p className="mt-1 text-sm text-white/84">{copy.paymentConfidenceBody}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <span className="site-icon-plate-light mt-0.5 h-9 w-9">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{copy.policyConsistencyTitle}</p>
                    <p className="mt-1 text-sm text-white/84">{copy.policyConsistencyBody}</p>
                  </div>
                </div>
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
