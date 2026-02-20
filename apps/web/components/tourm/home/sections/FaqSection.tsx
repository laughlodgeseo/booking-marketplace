"use client";

import { motion } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";

type Faq = {
  q: string;
  a: string;
};

export default function FaqSection({
  title,
  subtitle,
  faqs,
}: {
  title: string;
  subtitle: string;
  faqs: ReadonlyArray<Faq>;
}) {
  const locale = normalizeLocale(useLocale());

  return (
    <section className="relative w-full py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/60">
            {locale === "ar" ? "الأسئلة الشائعة" : "FAQs"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-secondary/75 sm:text-base">{subtitle}</p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {faqs.slice(0, 8).map((f, idx) => (
            <motion.details
              key={f.q}
              className="premium-card premium-card-tinted premium-card-hover group rounded-3xl p-6"
              initial={{ y: 16, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{
                duration: 0.4,
                delay: Math.min(idx * 0.05, 0.25),
              }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="card-icon-plate h-8 w-8 rounded-2xl text-sm font-extrabold text-primary">
                    Q
                  </span>
                  <span className="text-base font-extrabold text-primary">
                    {f.q}
                  </span>
                </div>

                <span className="relative h-6 w-6 text-secondary/60">
                  <Plus className="absolute inset-0 transition group-open:opacity-0" />
                  <Minus className="absolute inset-0 opacity-0 transition group-open:opacity-100" />
                </span>
              </summary>

              <p className="mt-4 text-sm leading-relaxed text-secondary/75">
                {f.a}
              </p>
            </motion.details>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 bottom-0 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
      </div>
    </section>
  );
}
