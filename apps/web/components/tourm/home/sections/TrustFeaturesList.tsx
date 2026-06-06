"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ClipboardCheck, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";

type TrustFeature = {
  title: string;
  body: string;
  href: string;
  cta: string;
  icon: LucideIcon;
};

const TRUST_FEATURES: Record<"en" | "ar", ReadonlyArray<TrustFeature>> = {
  en: [
    {
      title: "Verified availability",
      body: "Availability is checked live so your selected dates match real inventory.",
      href: "/properties",
      cta: "Browse stays",
      icon: ShieldCheck,
    },
    {
      title: "Upfront totals",
      body: "See the full total with nightly rate, fees, and taxes before you pay.",
      href: "/pricing",
      cta: "See pricing",
      icon: Receipt,
    },
    {
      title: "Operator-managed quality",
      body: "Cleaning, linen, inspections, and support are handled through real operations.",
      href: "/services",
      cta: "Our services",
      icon: Sparkles,
    },
    {
      title: "Clear policies",
      body: "Simple cancellation and refund rules with consistent outcomes.",
      href: "/contact",
      cta: "Learn more",
      icon: ClipboardCheck,
    },
  ],
  ar: [
    {
      title: "توافر موثّق",
      body: "يتم التحقق من التوافر مباشرة لتطابق التواريخ التي تختارها مع مخزون حقيقي وليس تقديرات.",
      href: "/properties",
      cta: "تصفح الإقامات",
      icon: ShieldCheck,
    },
    {
      title: "إجمالي واضح مسبقاً",
      body: "تشاهد الإجمالي كاملاً بوضوح مع السعر الليلي والرسوم والضرائب دون إضافات مفاجئة.",
      href: "/pricing",
      cta: "عرض التسعير",
      icon: Receipt,
    },
    {
      title: "جودة مُدارة تشغيلياً",
      body: "تنظيف وبياضات وفحوصات ودعم أثناء الإقامة بمعايير فندقية تُدار عبر عمليات فعلية.",
      href: "/services",
      cta: "خدماتنا",
      icon: Sparkles,
    },
    {
      title: "سياسات واضحة",
      body: "قواعد إلغاء واسترداد مباشرة بنتائج متسقة للضيوف والمُلّاك.",
      href: "/contact",
      cta: "اعرف المزيد",
      icon: ClipboardCheck,
    },
  ],
};

export default function TrustFeaturesList() {
  const locale = normalizeLocale(useLocale());
  const features = TRUST_FEATURES[locale];

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--home-accent)]">
        {locale === "ar" ? "الثقة والعمليات" : "TRUST & OPERATIONS"}
      </p>
      <h2 className="mt-3 max-w-[18ch] text-[32px] font-semibold leading-[1.05] text-[var(--home-primary-deep)] md:text-[40px]">
        {locale === "ar" ? "احجز بثقة في دبي" : "Book with confidence in Dubai"}
      </h2>
      <p className="mt-4 max-w-[52ch] text-[15px] leading-6 text-[var(--home-muted)]">
        {locale === "ar"
          ? "توافر مباشر وإجماليات واضحة ووحدات تُدار باحتراف لتجربة إقامة سلسة بلا مفاجآت."
          : "Live availability, clear totals, and professionally managed homes for smooth stays."}
      </p>
      <div className="mt-6 h-px w-24 bg-gradient-to-r from-[#b87333]/55 to-transparent" />

      <div className="relative mt-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
          <div className="absolute bottom-2 left-1/2 top-2 w-px -translate-x-1/2 bg-[rgb(var(--home-border-rgb)/0.38)]" />
          <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-[rgb(var(--home-border-rgb)/0.38)]" />
        </div>

        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="home-feature-card group flex min-h-[174px] items-start gap-4 p-4">
                <div className="home-icon-plate h-14 w-14 shrink-0 transition-colors duration-300 group-hover:border-indigo-300/70 group-hover:bg-indigo-50/80">
                  <Icon className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <h3 className="relative inline-block text-[15px] font-semibold leading-tight text-[var(--home-primary-deep)] md:text-[16px]">
                    <span className="after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-[#b87333]/50 after:transition-all after:duration-300 after:content-[''] group-hover:after:w-full">
                      {feature.title}
                    </span>
                  </h3>
                  <p className="mt-2 text-[13px] leading-5 text-[var(--home-muted)]">{feature.body}</p>

                  <Link
                    href={feature.href}
                    aria-label={`${feature.cta} - ${feature.title}`}
                    className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--home-primary-deep)] transition-colors hover:text-[var(--home-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2"
                  >
                    {feature.cta}
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--home-accent)] opacity-80 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
