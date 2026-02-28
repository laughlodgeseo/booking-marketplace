import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PricingHero from "@/components/tourm/pricing/PricingHero";
import PricingCards from "@/components/tourm/pricing/PricingCards";
import PricingBreakdown from "@/components/tourm/pricing/PricingBreakdown";
import PricingFaq from "@/components/tourm/pricing/PricingFaq";
import PricingCta from "@/components/tourm/pricing/PricingCta";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Pricing | Laugh & Lodge",
  description: "Clear short-stay pricing with transparent fees and simple checkout rules.",
};

const COPY = {
  en: {
    jumpTo: "Navigate",
    jumpLinks: [
      { label: "Pricing model", href: "#pricing-model" },
      { label: "Quote example", href: "#pricing-breakdown" },
      { label: "FAQ", href: "#pricing-faq" },
    ],
    browseStays: "Browse stays",
    cancellationPolicy: "Cancellation policy",
    pricingQuestions: "Talk to pricing team",
  },
  ar: {
    jumpTo: "تنقل إلى",
    jumpLinks: [
      { label: "نموذج التسعير", href: "#pricing-model" },
      { label: "مثال عرض السعر", href: "#pricing-breakdown" },
      { label: "الأسئلة الشائعة", href: "#pricing-faq" },
    ],
    browseStays: "تصفح الإقامات",
    cancellationPolicy: "سياسة الإلغاء",
    pricingQuestions: "تواصل مع مختص التسعير",
  },
} as const;

export default async function PricingPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const arrowClass = locale === "ar" ? "h-3.5 w-3.5 text-indigo-100 rotate-180" : "h-3.5 w-3.5 text-indigo-100";

  return (
    <main className="indigo-no-gold min-h-screen bg-transparent">
      <PricingHero locale={locale} />

      <section className="site-surface-subtle border-y py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-xs font-semibold uppercase tracking-[0.22em] text-secondary/72">{copy.jumpTo}</p>
              {copy.jumpLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="site-chip inline-flex h-11 items-center px-3 text-xs font-semibold transition hover:bg-indigo-100/66"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/properties"
                className="site-cta-muted inline-flex h-11 items-center rounded-full px-3 text-xs font-semibold transition"
              >
                {copy.browseStays}
              </Link>
              <Link
                href="/cancellation"
                className="site-cta-muted inline-flex h-11 items-center rounded-full px-3 text-xs font-semibold transition"
              >
                {copy.cancellationPolicy}
              </Link>
              <Link
                href="/contact"
                className="site-cta-primary inline-flex h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold transition"
              >
                {copy.pricingQuestions} <ArrowRight className={arrowClass} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <PricingCards locale={locale} />
      </div>
      <div className="bg-transparent">
        <PricingBreakdown locale={locale} />
      </div>
      <div className="bg-transparent">
        <PricingFaq locale={locale} />
      </div>
      <div className="bg-transparent">
        <PricingCta locale={locale} />
      </div>
      <div className="h-10 sm:h-16" />
    </main>
  );
}
