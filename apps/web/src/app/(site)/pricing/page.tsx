import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PricingHero from "@/components/tourm/pricing/PricingHero";
import PricingCards from "@/components/tourm/pricing/PricingCards";
import PricingBreakdown from "@/components/tourm/pricing/PricingBreakdown";
import PricingFaq from "@/components/tourm/pricing/PricingFaq";
import PricingCta from "@/components/tourm/pricing/PricingCta";

export const metadata: Metadata = {
  title: "Pricing | Laugh & Lodge",
  description: "Transparent short-stay pricing with clear fee logic, policy-backed outcomes, and checkout clarity.",
};

export default function PricingPage() {
  const jumpLinks = [
    { label: "Pricing model", href: "#pricing-model" },
    { label: "Breakdown", href: "#pricing-breakdown" },
    { label: "FAQ", href: "#pricing-faq" },
  ] as const;

  return (
    <main className="indigo-no-gold min-h-screen bg-transparent">
      <PricingHero />

      <section className="border-y border-indigo-100/80 bg-white/72 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">
                Jump to
              </p>
              {jumpLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-11 items-center rounded-full border border-indigo-200/80 bg-indigo-50/75 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/properties"
                className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
              >
                Browse stays
              </Link>
              <Link
                href="/cancellation"
                className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
              >
                Cancellation policy
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-indigo-300/80 bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                Pricing questions <ArrowRight className="h-3.5 w-3.5 text-white/90" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <PricingCards />
      </div>
      <div className="bg-transparent">
        <PricingBreakdown />
      </div>
      <div className="bg-transparent">
        <PricingFaq />
      </div>
      <div className="bg-transparent">
        <PricingCta />
      </div>
      <div className="h-10 sm:h-16" />
    </main>
  );
}
