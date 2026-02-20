"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import DistributionCollage from "./DistributionCollage";
import { normalizeLocale } from "@/lib/i18n/config";

const PARTNER_LOGOS = [
  { src: "/partner_logo/airbnb.svg", label: "Airbnb" },
  { src: "/partner_logo/booking.svg", label: "Booking.com" },
  { src: "/partner_logo/vrbo.svg", label: "Vrbo" },
  { src: "/partner_logo/expedia.svg", label: "Expedia" },
  { src: "/partner_logo/agoda.svg", label: "Agoda" },
  { src: "/partner_logo/tripadvisor.svg", label: "Tripadvisor" },
  { src: "/partner_logo/home_away.svg", label: "HomeAway" },
  { src: "/brand/logo.svg", label: "Laugh & Lodge" },
];

export default function PartnerDistributionStrip() {
  const locale = normalizeLocale(useLocale());

  return (
    <section className="relative overflow-hidden py-10 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-6">
            <DistributionCollage />
          </div>

          <div className="order-1 lg:order-2 lg:col-span-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-600/80">
              {locale === "ar" ? "قنوات التوزيع" : "Distribution"}
            </p>
            <h3 className="mt-3 max-w-[26ch] text-[30px] font-semibold leading-[1.08] tracking-[-0.01em] text-neutral-900 md:text-[38px]">
              {locale === "ar"
                ? "سنعرض عقارك على هذه المنصات"
                : "We'll list your property on these sites"}
            </h3>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-6 text-neutral-600">
              {locale === "ar"
                ? "توزيع احترافي عبر القنوات لرفع الإشغال مع إبقاء التوافر والتسعير متزامنين."
                : "Premium channel distribution designed to increase occupancy while keeping availability and pricing in sync."}
            </p>

            <div className="mt-6 h-px w-16 bg-gradient-to-r from-indigo-500/30 via-cyan-500/20 to-transparent" />

            <div
              data-testid="distribution-logo-wall"
              className="mt-10 grid grid-cols-2 items-center gap-x-10 gap-y-8 sm:grid-cols-4"
            >
              {PARTNER_LOGOS.map((logo) => (
                <div
                  data-testid="distribution-logo-cell"
                  key={logo.label}
                  className="group flex h-12 items-center justify-center transition duration-200 ease-out hover:-translate-y-0.5"
                >
                  <div className="relative h-10 w-[140px]">
                    <Image
                      src={logo.src}
                      alt={logo.label}
                      fill
                      quality={100}
                      sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 140px"
                      data-testid="distribution-logo-image"
                      className="object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
                    />
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
