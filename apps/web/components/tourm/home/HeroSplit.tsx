"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";

type HeroSplitProps = {
  titleTop?: string;
  titleEmphasis?: string;
  subtitle?: string;
  heroImageUrl?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const HERO_CONTENT = {
  en: {
    eyebrow: "Dubai premium stays with hotel-style operations",
    headlineTop: "Where every Dubai stay",
    headlineEmphasis: "feels professionally hosted.",
    subcopy:
      "Fast confirmation, clear pricing, and premium hosting with real 24/7 support.",
    primaryCta: "Explore stays",
    secondaryCta: "List your property",
    collageBadge: "Verified availability",
    concierge: "24/7 guest support",
  },
  ar: {
    eyebrow: "إقامات دبي الفاخرة بإدارة تشغيلية احترافية",
    headlineTop: "حيث تتحول كل إقامة في دبي",
    headlineEmphasis: "إلى تجربة استضافة احترافية.",
    subcopy:
      "تأكيد فوري، تسعير واضح، واستضافة بمعايير فندقية مدعومة بفريق كونسيرج حقيقي على مدار الساعة.",
    primaryCta: "استكشف الإقامات",
    secondaryCta: "أدرج عقارك",
    collageBadge: "توافر موثّق",
    concierge: "كونسيرج 24/7",
  },
} as const;

const COLLAGE_IMAGES = {
  main: "/images/home/hero-main.webp",
  topAccent: "/images/home/hero-top-accent.webp",
  bottomSupport: "/images/home/hero-bottom-support.webp",
  microInterior: "/images/home/interior-suite.webp",
} as const;

function safeHref(v: string | undefined, fallback: string): string {
  const value = (v ?? "").trim();
  return value.length > 0 ? value : fallback;
}

function safeValue(v: string | undefined, fallback: string): string {
  const value = (v ?? "").trim();
  return value.length > 0 ? value : fallback;
}

function reveal(delay: number, reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      initial: false as const,
      animate: { y: 0, opacity: 1 },
      transition: { duration: 0 },
    };
  }

  return {
    initial: { y: 12, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.62, delay, ease: EASE },
  };
}

function tileReveal(delay: number, reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      initial: false as const,
      animate: { y: 0, opacity: 1, scale: 1 },
      transition: { duration: 0 },
    };
  }

  return {
    initial: { y: 14, opacity: 0, scale: 0.986 },
    animate: { y: 0, opacity: 1, scale: 1 },
    transition: { duration: 0.7, delay, ease: EASE },
  };
}

export default function HeroSplit(props: HeroSplitProps) {
  const locale = normalizeLocale(useLocale());
  const copy = HERO_CONTENT[locale];
  const primaryCtaHref = safeHref(props.primaryCtaHref, "/properties");
  const secondaryCtaHref = safeHref(props.secondaryCtaHref, "/owners");
  const reduceMotion = useReducedMotion() ?? false;
  const headlineTop = safeValue(props.titleTop, copy.headlineTop);
  const headlineEmphasis = safeValue(props.titleEmphasis, copy.headlineEmphasis);
  const subcopy = safeValue(props.subtitle, copy.subcopy);
  const primaryCtaLabel = safeValue(props.primaryCtaLabel, copy.primaryCta);
  const secondaryCtaLabel = safeValue(props.secondaryCtaLabel, copy.secondaryCta);
  const mainImageSrc = safeValue(props.heroImageUrl, COLLAGE_IMAGES.main);

  return (
    <section className="relative -mt-14 w-full overflow-hidden bg-transparent pt-14 lg:-mt-[80px] lg:pt-[80px]">
      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-8 lg:pt-12">
        <div className="relative lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
          <div className="relative z-20 max-w-[35rem] lg:col-span-5 lg:pt-4">
            <div className="space-y-4 md:space-y-6">
              <motion.div
                {...reveal(0, reduceMotion)}
                className="inline-flex items-center gap-2 rounded-full border border-[#d8ddf5] bg-white/84 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#222a49] shadow-[0_10px_24px_rgba(67,56,202,0.12)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#4f46e5]" />
                {copy.eyebrow}
              </motion.div>

              <motion.h1
                {...reveal(0.08, reduceMotion)}
                className="balance-wrap text-[30px] font-heading font-semibold leading-[1.1] tracking-[-0.017em] text-[#0f1638] sm:text-[3.3rem]"
              >
                <span className="block">{headlineTop}</span>
                <span className="block bg-gradient-to-r from-[#1a2350] via-[#273c8f] to-[#4157b8] bg-clip-text text-transparent">
                  {headlineEmphasis}
                </span>
              </motion.h1>

              <motion.p
                {...reveal(0.16, reduceMotion)}
                className="mobile-body mobile-copy-max max-w-[38ch] tracking-[0.012em] text-[#24305a]/80 sm:text-[1.02rem]"
              >
                {subcopy}
              </motion.p>

              <motion.div
                {...reveal(0.24, reduceMotion)}
                className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-center"
              >
                <Link
                  href={primaryCtaHref}
                  className="group relative isolate inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#4f46e5] via-[#5d58f0] to-[#6b79ff] px-7 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(79,70,229,0.34)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(79,70,229,0.4)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-[#6366f1]/30 before:blur-xl before:content-[''] min-[460px]:w-auto lg:h-[52px]"
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href={secondaryCtaHref}
                  className="group inline-flex h-11 w-full items-center justify-center rounded-full border border-[#b9c4ff] bg-[#f5f7ff]/90 px-6 text-sm font-semibold text-[#1b2450] shadow-[0_9px_20px_rgba(11,15,25,0.1)] transition duration-300 hover:-translate-y-0.5 hover:border-[#8fa1ff] hover:bg-[#e8edff] min-[460px]:w-auto lg:h-[52px]"
                >
                  <span>{secondaryCtaLabel}</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>

              <motion.div
                {...reveal(0.3, reduceMotion)}
                className="flex flex-wrap items-center justify-center gap-2 lg:justify-start"
              >
                <span className="inline-flex h-8 items-center rounded-full border border-[#c8d2ff] bg-white/86 px-3 text-xs font-semibold text-[#223064]">
                  {copy.collageBadge}
                </span>
                <span className="inline-flex h-8 items-center rounded-full border border-[#c8d2ff] bg-white/86 px-3 text-xs font-semibold text-[#223064]">
                  {copy.concierge}
                </span>
              </motion.div>
            </div>
          </div>

          <motion.div
            {...reveal(0.34, reduceMotion)}
            className="mt-6 lg:hidden"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-[0_24px_54px_rgba(11,15,25,0.2)]">
              <Image
                src={mainImageSrc}
                alt="Dubai skyline with luxury towers"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1023px) 90vw, 1px"
                className="object-cover"
                priority
              />
            </div>
          </motion.div>

          <motion.div
            {...reveal(0.34, reduceMotion)}
            className="relative z-10 hidden -translate-y-2 lg:col-span-7 lg:mt-0 lg:block lg:pl-4 lg:pt-6"
          >
            <div className="relative mx-auto h-[514px] max-w-[642px]">
              <div className="pointer-events-none absolute inset-[22%_14%_17%_17%] -z-10 rounded-[56px] bg-[radial-gradient(70%_82%_at_60%_46%,rgba(208,168,122,0.12),rgba(95,105,242,0.12)_56%,transparent_84%)] blur-[120px]" />

              <motion.div
                {...tileReveal(0.42, reduceMotion)}
                whileHover={reduceMotion ? undefined : { y: -3, scale: 1.004 }}
                className="group absolute inset-[4%_9%_10%_9%]"
              >
                <div className="relative h-full w-full overflow-hidden rounded-[26px] border border-white/45 bg-white/84 shadow-[0_60px_140px_rgba(0,0,0,0.22)]">
                  <motion.div
                    initial={reduceMotion ? false : { scale: 1.02, opacity: 0.92 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.58, delay: 0.42, ease: EASE }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={mainImageSrc}
                      alt="Dubai skyline with luxury towers"
                      fill
                      sizes="(min-width: 1280px) 50rem, (min-width: 1024px) 66vw, (min-width: 768px) 72vw, 90vw"
                      className="object-cover transition duration-1000 group-hover:scale-[1.02]"
                      priority
                    />
                  </motion.div>

                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,15,25,0.34)_0%,rgba(11,15,25,0.12)_34%,rgba(11,15,25,0)_74%)]" />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_54%_44%,transparent_36%,rgba(2,6,23,0.2)_100%)]" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:radial-gradient(rgba(255,255,255,0.76)_0.5px,transparent_0.5px)] [background-size:3px_3px]" />

                  <motion.div
                    {...reveal(0.6, reduceMotion)}
                    className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-white/52 bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#20305d] shadow-[0_10px_28px_rgba(13,18,35,0.16)]"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-[#4b55de]" />
                    {copy.collageBadge}
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                {...tileReveal(0.5, reduceMotion)}
                whileHover={reduceMotion ? undefined : { y: -5, scale: 1.01 }}
                className="group absolute -left-8 -top-7 w-[32%] sm:-left-10 sm:-top-8 sm:w-[29%] md:-left-[68px] md:-top-[36px] md:w-[27%] md:scale-[0.96]"
              >
                <motion.div
                  animate={reduceMotion ? { y: 0 } : { y: [0, -3, 0] }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 8.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                  }
                  className="relative h-0 overflow-hidden rounded-[22px] border border-white/4 bg-white/84 pb-[120%] shadow-[0_20px_50px_rgba(0,0,0,0.14)]"
                >
                  <Image
                    src={COLLAGE_IMAGES.topAccent}
                    alt="Luxury interior detail"
                    fill
                    sizes="(min-width: 768px) 18vw, 34vw"
                    className="object-cover transition duration-1000 group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f172a]/24 via-transparent to-transparent" />
                </motion.div>
              </motion.div>

              <motion.div
                {...tileReveal(0.58, reduceMotion)}
                whileHover={reduceMotion ? undefined : { y: -5, scale: 1.01 }}
                className="group absolute right-0 top-[52%] w-[38%] -translate-y-1/2 sm:right-0 sm:top-[52%] sm:w-[34%] md:right-[6px] md:top-[50%] md:w-[31%]"
              >
                <motion.div
                  animate={reduceMotion ? { y: 0 } : { y: [0, 3, 0] }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 9.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                  }
                  className="relative h-0 overflow-hidden rounded-[24px] border border-white/4 bg-white/84 pb-[72%] shadow-[0_35px_80px_rgba(0,0,0,0.18)]"
                >
                  <Image
                    src={COLLAGE_IMAGES.bottomSupport}
                    alt="Premium rooftop stay"
                    fill
                    sizes="(min-width: 768px) 26vw, 44vw"
                    className="object-cover transition duration-1000 group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f172a]/24 via-transparent to-transparent" />
                </motion.div>
              </motion.div>

              <motion.div
                {...tileReveal(0.66, reduceMotion)}
                whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
                className="group absolute bottom-[4%] right-[14%] w-[23%] sm:bottom-[3.5%] sm:w-[21%] md:bottom-[2%] md:w-[19%]"
              >
                <motion.div
                  animate={reduceMotion ? { y: 0 } : { y: [0, -2.5, 0] }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 8.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                  }
                  className="relative h-0 overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.05)] bg-white/84 pb-[80%] shadow-[0_20px_50px_rgba(0,0,0,0.14)]"
                >
                  <Image
                    src={COLLAGE_IMAGES.microInterior}
                    alt="Suite interior accent"
                    fill
                    sizes="(min-width: 768px) 14vw, 22vw"
                    className="object-cover transition duration-1000 group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f172a]/18 via-transparent to-transparent" />
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
