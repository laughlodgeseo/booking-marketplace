"use client";

import {
  CalendarDays,
  CheckCircle2,
  ConciergeBell,
  CreditCard,
  FileCheck2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { normalizeLocale } from "@/lib/i18n/config";

type Step = {
  step: string;
  title: string;
  desc: string;
};

type StepIcon = {
  Icon: React.ComponentType<{ className?: string }>;
};

const ICONS: ReadonlyArray<StepIcon> = [
  { Icon: Search },
  { Icon: MapPin },
  { Icon: CalendarDays },
  { Icon: ShieldCheck },
  { Icon: Sparkles },
  { Icon: CheckCircle2 },
  { Icon: CreditCard },
  { Icon: ConciergeBell },
  { Icon: FileCheck2 },
];

const UI_COPY = {
  en: {
    eyebrow: "How it works",
    stepsCountLabel: (count: number) => `${count} operational steps`,
    scrollLabel: "Scroll to advance",
    swipeLabel: "Swipe to explore",
    stepPrefix: "Step",
  },
  ar: {
    eyebrow: "كيف يعمل",
    stepsCountLabel: (count: number) => `${count} خطوات تشغيلية`,
    scrollLabel: "مرر للأسفل للمتابعة",
    swipeLabel: "اسحب للاستكشاف",
    stepPrefix: "الخطوة",
  },
} as const;

export default function HowItWorks({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: ReadonlyArray<Step>;
}) {
  const locale = normalizeLocale(useLocale());
  const isRtl = locale === "ar";
  const copy = UI_COPY[locale];
  const list = useMemo(() => {
    const filtered = steps.filter((s) => s.step && s.title && s.desc);
    return filtered
      .map((step, index) => ({ step, index }))
      .sort((a, b) => {
        const aNumber = Number.parseInt(a.step.step, 10);
        const bNumber = Number.parseInt(b.step.step, 10);
        const aNumeric = Number.isFinite(aNumber);
        const bNumeric = Number.isFinite(bNumber);

        if (aNumeric && bNumeric && aNumber !== bNumber) {
          return aNumber - bNumber;
        }
        if (aNumeric !== bNumeric) {
          return aNumeric ? -1 : 1;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.step);
  }, [steps]);
  const sectionRef = useRef<HTMLElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [gsapMode, setGsapMode] = useState(false);
  const cardWidth = 280;
  const cardHeight = 300;
  const trackGap = 20;
  const [edgeInset, setEdgeInset] = useState(0);

  useEffect(() => {
    const updateEdgeInset = () => {
      const viewport = viewportRef.current;
      const viewportWidth = viewport?.clientWidth ?? window.innerWidth;
      // Compensate for flex gap before the first card so its right edge lands at center.
      setEdgeInset(Math.max(0, Math.round(viewportWidth / 2 - cardWidth - trackGap)));
    };

    updateEdgeInset();
    window.addEventListener("resize", updateEdgeInset);
    return () => window.removeEventListener("resize", updateEdgeInset);
  }, [cardWidth]);

  useEffect(() => {
    if (list.length < 2) return;

    let mounted = true;
    let mediaMatcher: gsap.MatchMedia | null = null;

    const init = async () => {
      try {
        const gsapModule = await import("gsap");
        const scrollTriggerModule = await import("gsap/ScrollTrigger");

        if (!mounted) return;

        const gsap = gsapModule.gsap ?? gsapModule.default;
        const ScrollTrigger = scrollTriggerModule.ScrollTrigger ?? scrollTriggerModule.default;
        gsap.registerPlugin(ScrollTrigger);

        const mm = gsap.matchMedia();
        mediaMatcher = mm;

        mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
          const section = sectionRef.current;
          const viewport = viewportRef.current;
          const track = trackRef.current;
          if (!section || !viewport || !track) return;

          const shiftDistance = () => {
            const styles = window.getComputedStyle(viewport);
            const leftPad = Number.parseFloat(styles.paddingLeft || "0");
            const rightPad = Number.parseFloat(styles.paddingRight || "0");
            const visibleWidth = viewport.clientWidth - leftPad - rightPad;
            return Math.max(0, track.scrollWidth - visibleWidth);
          };
          if (shiftDistance() < 48) {
            setGsapMode(false);
            return;
          }

          setGsapMode(true);

          const horizontalTween = gsap.fromTo(
            track,
            { x: 0 },
            {
              x: () => -shiftDistance(),
              ease: "none",
              scrollTrigger: {
                trigger: viewport,
                start: "center center",
                end: () => `+=${Math.max(window.innerHeight * 1.2, shiftDistance() + window.innerHeight * 0.72)}`,
                pin: true,
                scrub: 1,
                anticipatePin: 1,
                invalidateOnRefresh: true,
              },
            },
          );

          const cards = track.querySelectorAll<HTMLElement>("[data-step-card]");
          cards.forEach((card) => {
            gsap.fromTo(
              card,
              { autoAlpha: 0.32, x: 72, y: 0, scale: 0.94 },
              {
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  containerAnimation: horizontalTween,
                  start: "left 88%",
                  end: "left 40%",
                  scrub: true,
                },
              },
            );
          });

          return () => {
            horizontalTween.kill();
            gsap.set(track, { clearProps: "transform" });
            if (mounted) {
              setGsapMode(false);
            }
          };
        });

        mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
          setGsapMode(false);
        });
      } catch {
        if (mounted) {
          setGsapMode(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      mediaMatcher?.revert();
    };
  }, [isRtl, list.length, edgeInset]);

  const indigoPlateClass =
    "grid place-items-center rounded-[0.95rem] border border-white/65 bg-white/90 text-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]";
  const squareCardClass =
    "premium-card premium-card-tinted premium-card-hover group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-[1.35rem] p-4 sm:p-5 before:!bg-[linear-gradient(180deg,rgb(99_102_241_/_0.12),transparent_68%)]";

  return (
    <section ref={sectionRef} className="relative w-full py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-7 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/60">
              {copy.eyebrow}
            </p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
              {title}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-secondary/80 sm:text-lg">{subtitle}</p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-300" />
          </div>
        </div>

        <div className="relative mt-10 sm:mt-12">
          <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-secondary/70">
              {copy.stepsCountLabel(list.length)}
            </p>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-indigo-700/80">
              {gsapMode ? copy.scrollLabel : copy.swipeLabel}
            </p>
          </div>

          <div
            ref={viewportRef}
            dir="ltr"
            className={[
              "relative w-screen max-w-none snap-x snap-mandatory touch-pan-x overscroll-x-contain",
              gsapMode ? "overflow-hidden" : "no-scrollbar overflow-x-auto",
            ].join(" ")}
            style={{ marginLeft: "calc(50% - 50vw)" }}
          >
            <div ref={trackRef} className="flex w-max gap-5">
              <div aria-hidden className="h-px shrink-0" style={{ width: `${edgeInset}px` }} />
              {list.map((s, idx) => {
                const Icon = ICONS[idx % ICONS.length]?.Icon ?? Sparkles;

                return (
                  <article
                    key={`${s.step}-${s.title}`}
                    data-step-card
                    dir={isRtl ? "rtl" : "ltr"}
                    className={`${squareCardClass} ${isRtl ? "text-right" : ""}`}
                    style={{ width: `${cardWidth}px`, height: `${cardHeight}px` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`${indigoPlateClass} h-12 w-12`}>
                          <span className="text-lg font-extrabold text-indigo-600">{s.step}</span>
                        </div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-secondary/70">
                          {copy.stepPrefix} {s.step}
                        </p>
                      </div>

                      <div className={`${indigoPlateClass} h-12 w-12 shrink-0`}>
                        <Icon className="h-6 w-6 text-indigo-600" />
                      </div>
                    </div>

                    <div className="mt-6 flex-1">
                      <p className="text-lg font-extrabold leading-tight text-primary [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">
                        {s.title}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-secondary/80 [display:-webkit-box] [-webkit-line-clamp:6] [-webkit-box-orient:vertical] overflow-hidden">
                        {s.desc}
                      </p>
                    </div>
                  </article>
                );
              })}
              <div aria-hidden className="h-px shrink-0" style={{ width: `${edgeInset}px` }} />
            </div>
          </div>

        </div>
      </div>

    </section>
  );
}
