"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, PhoneCall } from "lucide-react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";

const COPY = {
  en: {
    eyebrow: "For owners",
    ownerServices: "Explore owner services",
    talkTeam: "Talk to our team",
    opsTitle: "Operator-grade management, not just a listing.",
    opsBody:
      "After booking confirmation, ops tasks (cleaning, inspection, linen, restock) are auto-created by the platform.",
    imageAlt: "Owner services",
    imageTitle: "Managed stays, better reviews, higher occupancy.",
    imageBody: "We operate your property like a hotel and keep you in control.",
    tags: ["Cleaning", "Inspection", "Linen", "Restock"],
  },
  ar: {
    eyebrow: "للمُلّاك",
    ownerServices: "استكشف خدمات المُلّاك",
    talkTeam: "تحدث مع فريقنا",
    opsTitle: "إدارة تشغيلية احترافية تتجاوز مجرد الإدراج.",
    opsBody:
      "بعد تأكيد الحجز، تنشئ المنصة تلقائياً مهام التشغيل (التنظيف، الفحص، البياضات، وإعادة التزويد).",
    imageAlt: "خدمات المُلّاك",
    imageTitle: "إقامات مُدارة بجودة أعلى وتقييمات أفضل وإشغال أقوى.",
    imageBody: "ندير عقارك بمعايير فندقية مع بقاء القرار بيدك.",
    tags: ["تنظيف", "فحص", "بياضات", "إعادة تزويد"],
  },
} as const;

export default function OwnerCta({
  title,
  subtitle,
  bullets,
  imageUrl,
}: {
  title: string;
  subtitle: string;
  bullets: ReadonlyArray<string>;
  imageUrl?: string;
}) {
  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];

  return (
    <section className="relative w-full py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <motion.div
          className="premium-card premium-card-tinted grid overflow-hidden rounded-[36px] border border-white/70 shadow-[0_24px_58px_rgba(11,15,25,0.14)] lg:grid-cols-2"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* LEFT — CONTENT */}
          <div className="relative p-8 sm:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand/12 blur-3xl" />
              <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-gold/22 blur-3xl" />
            </div>

            <div className="relative">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/60">
                {copy.eyebrow}
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                {title}
              </h2>

              <p className="mt-3 text-sm text-secondary/75 sm:text-base">
                {subtitle}
              </p>

              <ul className="mt-7 space-y-3">
                {bullets.slice(0, 5).map((b) => (
                  <li key={b} className="flex gap-3 text-sm text-secondary/80">
                    <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-2xl bg-warm-base">
                      <CheckCircle2 className="h-4 w-4 text-brand" />
                    </span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/owners"
                  className="inline-flex items-center rounded-full bg-brand px-6 py-3 text-sm font-extrabold text-accent-text shadow-[0_16px_34px_rgba(79,70,229,0.34)] transition hover:-translate-y-0.5 hover:bg-brand-hover"
                >
                  {copy.ownerServices}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-extrabold text-white shadow-[0_16px_34px_rgba(79,70,229,0.34)] ring-1 ring-indigo-300/60 transition hover:bg-indigo-700"
                >
                  {copy.talkTeam}
                  <PhoneCall className="ml-2 h-4 w-4 text-white/85" />
                </Link>
              </div>

              <div className="premium-card premium-card-tinted mt-8 rounded-3xl p-5">
                <p className="text-sm font-extrabold text-primary">
                  {copy.opsTitle}
                </p>
                <p className="mt-1 text-xs text-secondary/75">
                  {copy.opsBody}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT — IMAGE */}
          <div className="relative min-h-[320px] lg:min-h-full">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={copy.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-warm-alt to-surface" />
            )}

            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(30,27,75,0.78)_0%,rgba(49,46,129,0.56)_46%,rgba(79,70,229,0.2)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(88%_92%_at_50%_100%,rgba(129,140,248,0.46),rgba(99,102,241,0.16)_52%,transparent_86%)]" />

            <motion.div
              className="absolute bottom-6 left-6 right-6 overflow-hidden rounded-[1.6rem] border border-indigo-100/44 bg-[linear-gradient(145deg,rgba(30,27,75,0.9)_0%,rgba(67,56,202,0.8)_100%)] p-5 text-white shadow-[0_24px_60px_rgba(49,46,129,0.45)] backdrop-blur-xl"
              initial={{ y: 10, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              <div className="pointer-events-none absolute inset-x-5 top-0 h-[2px] rounded-full bg-[linear-gradient(90deg,rgba(199,210,254,0.92),rgba(224,231,255,0.28),transparent)]" />

              <p className="text-sm font-extrabold tracking-[0.01em] text-white">
                {copy.imageTitle}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white">
                {copy.imageBody}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {copy.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-indigo-100/50 bg-indigo-100/18 px-3 py-1 text-xs font-semibold text-white"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
