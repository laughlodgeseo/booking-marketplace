"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

type Reason = {
  title: string;
  desc: string;
};

type Stat = {
  label: string;
  value: string; // keep string to avoid formatting assumptions
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const FEATURE_LIST_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const FEATURE_CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: EASE,
    },
  },
};

const BADGE_LIST_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const BADGE_CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: EASE,
    },
  },
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=85",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1400&q=80",
] as const;

const FALLBACK_HORIZONTAL_IMAGE = "/auth-scene/interior-suite.webp";

export default function WhyChooseUs({
  title,
  subtitle,
  reasons,
  stats,
  images,
}: {
  title: ReactNode;
  subtitle: string;
  reasons: Reason[];
  stats: Stat[];
  images: { a?: string; b?: string; c?: string; d?: string };
}) {
  const trio = [images.a, images.b, images.c].map((src, idx) => src ?? FALLBACK_IMAGES[idx]);
  const horizontalImage = images.d ?? FALLBACK_HORIZONTAL_IMAGE;

  return (
    <section className="relative w-full py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className="text-[11px] uppercase tracking-[0.26em] text-neutral-500">WHY US</p>
            <h2 className="mt-3 max-w-[18ch] text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-neutral-900 md:max-w-[22ch] md:text-[40px] lg:max-w-[26ch]">
              {title}
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-6 text-neutral-600">{subtitle}</p>
            <div className="mt-6 h-px w-20 bg-gradient-to-r from-indigo-500/35 via-cyan-500/20 to-transparent" />

            <div className="mt-8 lg:hidden">
              <Collage images={trio} />
            </div>

            <motion.div
              className="mt-8 space-y-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-120px" }}
              variants={FEATURE_LIST_VARIANTS}
            >
              {reasons.slice(0, 4).map((r) => (
                <motion.article
                  key={r.title}
                  variants={FEATURE_CARD_VARIANTS}
                  whileHover={{ y: -5, scale: 1.01 }}
                  whileTap={{ scale: 0.997 }}
                  className="premium-card premium-card-tinted premium-card-hover group relative overflow-hidden rounded-2xl px-6 py-5 before:!bg-[linear-gradient(180deg,rgb(99_102_241_/_0.12),transparent_68%)]"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-indigo-500/35 via-cyan-500/20 to-transparent"
                  />
                  <div className="flex items-start gap-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold leading-tight text-neutral-900">
                        {r.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-neutral-600">{r.desc}</p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>

            <motion.div
              className="mx-auto mt-8 grid max-w-[520px] grid-cols-2 gap-4 lg:mx-0"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-120px" }}
              variants={BADGE_LIST_VARIANTS}
            >
              {stats.slice(0, 4).map((s) => (
                <motion.div
                  key={s.label}
                  variants={BADGE_CARD_VARIANTS}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.99 }}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 px-5 py-4 shadow-[0_24px_68px_-45px_rgba(55,48,163,0.92)] ring-1 ring-indigo-300/45 transition-all duration-300 ease-out hover:shadow-[0_36px_96px_-58px_rgba(55,48,163,0.98)]"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-indigo-200/70 via-cyan-100/70 to-transparent"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_120%_at_15%_-10%,rgba(255,255,255,0.18),transparent_56%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                  />
                  <p className="relative text-[18px] font-semibold text-white">{s.value}</p>
                  <p className="relative mt-1 text-[11px] uppercase tracking-[0.22em] text-white/80">
                    {s.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-8 lg:hidden">
              <HorizontalClippedImage
                src={horizontalImage}
                alt="Curated interior lounge visual"
                sizes="(max-width: 1023px) 92vw, 680px"
              />
            </div>
          </div>

          <div className="hidden lg:col-span-7 lg:mt-[12.25rem] lg:flex lg:flex-col lg:items-start">
            <Collage images={trio} />
            <div className="mt-8 w-full">
              <HorizontalClippedImage
                src={horizontalImage}
                alt="Curated interior lounge visual"
                sizes="(max-width: 1279px) 62vw, 720px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Collage({ images }: { images: string[] }) {
  return (
    <motion.div
      className="relative isolate mx-auto w-full max-w-[720px] min-h-[520px] lg:mx-0 lg:min-h-[560px]"
      initial={{ y: 18, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 -z-10 h-[420px] w-[420px] rounded-full bg-indigo-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-28 -z-10 h-[520px] w-[520px] rounded-full bg-cyan-200/25 blur-3xl"
      />

      <div className="absolute right-0 top-0 h-full w-[62%] overflow-hidden rounded-[34px] shadow-[0_40px_110px_-85px_rgba(0,0,0,0.65)] ring-1 ring-black/5">
        <Image
          src={images[0]}
          alt="Luxury interior showcase"
          fill
          sizes="(max-width: 1024px) 62vw, 430px"
          quality={90}
          className="object-cover saturate-[1.05] contrast-[1.04]"
        />
      </div>

      <div className="absolute left-0 top-6 flex h-[72%] w-[42%] translate-x-2 flex-col gap-5">
        {[images[1], images[2]].map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="relative flex-1 overflow-hidden rounded-[28px] shadow-[0_30px_80px_-65px_rgba(0,0,0,0.55)] ring-1 ring-black/5"
          >
            <Image
              src={src}
              alt={`Curated stay visual ${idx + 2}`}
              fill
              sizes="(max-width: 1024px) 42vw, 280px"
              quality={90}
              className="object-cover saturate-[1.05] contrast-[1.04]"
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function HorizontalClippedImage({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  return (
    <motion.div
      className="relative h-[196px] w-full max-w-[720px] overflow-hidden bg-white/70 shadow-[0_34px_92px_-66px_rgba(11,15,25,0.72)] ring-1 ring-black/8"
      style={{
        borderRadius: "34px",
        clipPath: "polygon(0% 14%, 9% 0%, 91% 0%, 100% 14%, 100% 86%, 91% 100%, 9% 100%, 0% 86%)",
      }}
      initial={{ y: 16, opacity: 0, scale: 0.985 }}
      whileInView={{ y: 0, opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-120px" }}
      transition={{ duration: 0.55, ease: EASE }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={92}
          className="object-cover object-center saturate-[1.06] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_95%_at_18%_6%,rgba(255,255,255,0.24),transparent_52%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/14 via-transparent to-cyan-700/12" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-indigo-200/80 via-cyan-100/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent" />
      </div>
    </motion.div>
  );
}
