"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Brush, ClipboardCheck, Shirt, PackageOpen, ArrowRight } from "lucide-react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";

type Service = {
  title: string;
  desc: string;
  note?: string;
};

type ServiceIcon = {
  Icon: React.ComponentType<{ className?: string }>;
};

const ICONS: ReadonlyArray<ServiceIcon> = [
  { Icon: Brush }, // Cleaning
  { Icon: ClipboardCheck }, // Inspection
  { Icon: Shirt }, // Linen
  { Icon: PackageOpen }, // Restock
];

const COPY = {
  en: {
    eyebrow: "Operator services",
    capabilitySuffix: "core service areas",
    cta: "Explore services",
  },
  ar: {
    eyebrow: "الخدمات التشغيلية",
    capabilitySuffix: "قدرات خدمية أساسية",
    cta: "استكشف الخدمات",
  },
} as const;

export default function ServicesPreview({
  title,
  subtitle,
  services,
}: {
  title: string;
  subtitle: string;
  services: ReadonlyArray<Service>;
}) {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];
  const list = services.slice(0, 4);
  const indigoPlateClass =
    "grid place-items-center rounded-[0.95rem] border border-indigo-200/80 bg-indigo-50/85 text-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]";
  const indigoRailCardClass =
    "premium-card premium-card-tinted premium-card-hover group relative flex h-full flex-col rounded-3xl p-6 before:!bg-[linear-gradient(180deg,rgb(99_102_241_/_0.12),transparent_68%)]";

  return (
    <section className="relative w-full py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/60">
              {copy.eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-secondary/80 sm:text-lg">{subtitle}</p>
            <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-700/80">
              {list.length} {copy.capabilitySuffix}
            </p>
          </div>

          <Link
            href="/services"
            className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-[0_14px_34px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            {copy.cta}
            <ArrowRight className="h-4 w-4 text-white/90" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((s, idx) => {
            const Icon = ICONS[idx]?.Icon ?? Sparkles;

            return (
              <motion.div
                key={s.title}
                className={indigoRailCardClass}
                initial={{ y: 18, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{
                  duration: 0.45,
                  delay: Math.min(idx * 0.06, 0.24),
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`${indigoPlateClass} h-12 w-12 rounded-3xl`}>
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>

                  <div className="h-3 w-3 rounded-full bg-indigo-500/35 opacity-0 transition group-hover:opacity-100" />
                </div>

                <p className="mt-5 text-lg font-extrabold text-primary">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-secondary/80">{s.desc}</p>

                {s.note ? (
                  <div className="mt-auto pt-5">
                    <div className="border-t border-indigo-200/55 pt-3 text-xs font-semibold text-primary/82">
                      {s.note}
                    </div>
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-indigo-200/45 blur-3xl" />
        <div className="absolute left-10 bottom-10 h-64 w-64 rounded-full bg-dark-1/10 blur-3xl" />
      </div>
    </section>
  );
}
