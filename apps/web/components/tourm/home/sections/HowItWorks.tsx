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

type WirePoint = {
  x: number;
  y: number;
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

const BOARD_LAYOUT_LTR: ReadonlyArray<string> = [
  "xl:col-start-1 xl:col-span-4 xl:row-start-1",
  "xl:col-start-5 xl:col-span-4 xl:row-start-1",
  "xl:col-start-9 xl:col-span-4 xl:row-start-1",
  "xl:col-start-3 xl:col-span-4 xl:row-start-2",
  "xl:col-start-7 xl:col-span-4 xl:row-start-2",
  "xl:col-start-1 xl:col-span-4 xl:row-start-3",
  "xl:col-start-5 xl:col-span-4 xl:row-start-3",
  "xl:col-start-9 xl:col-span-4 xl:row-start-3",
];

const BOARD_LAYOUT_RTL: ReadonlyArray<string> = [
  "xl:col-start-9 xl:col-span-4 xl:row-start-1",
  "xl:col-start-5 xl:col-span-4 xl:row-start-1",
  "xl:col-start-1 xl:col-span-4 xl:row-start-1",
  "xl:col-start-7 xl:col-span-4 xl:row-start-2",
  "xl:col-start-3 xl:col-span-4 xl:row-start-2",
  "xl:col-start-9 xl:col-span-4 xl:row-start-3",
  "xl:col-start-5 xl:col-span-4 xl:row-start-3",
  "xl:col-start-1 xl:col-span-4 xl:row-start-3",
];

const BOARD_TILT_CLASSES: ReadonlyArray<string> = [
  "xl:-rotate-[1.05deg]",
  "xl:rotate-[0.76deg]",
  "xl:-rotate-[0.7deg]",
  "xl:rotate-[0.95deg]",
  "xl:-rotate-[0.92deg]",
  "xl:rotate-[0.68deg]",
  "xl:-rotate-[0.78deg]",
  "xl:rotate-[0.88deg]",
];

const CARD_TONE_CLASSES: ReadonlyArray<string> = [
  "bg-[linear-gradient(160deg,rgba(255,255,255,0.96)_0%,rgba(248,242,234,0.9)_100%)]",
  "bg-[linear-gradient(158deg,rgba(255,255,255,0.95)_0%,rgba(242,238,252,0.88)_100%)]",
  "bg-[linear-gradient(165deg,rgba(255,255,255,0.96)_0%,rgba(245,240,230,0.9)_100%)]",
  "bg-[linear-gradient(162deg,rgba(255,255,255,0.95)_0%,rgba(239,244,255,0.86)_100%)]",
  "bg-[linear-gradient(160deg,rgba(255,255,255,0.96)_0%,rgba(247,241,232,0.9)_100%)]",
  "bg-[linear-gradient(156deg,rgba(255,255,255,0.95)_0%,rgba(241,239,251,0.88)_100%)]",
  "bg-[linear-gradient(164deg,rgba(255,255,255,0.96)_0%,rgba(246,240,230,0.9)_100%)]",
  "bg-[linear-gradient(161deg,rgba(255,255,255,0.95)_0%,rgba(238,244,255,0.87)_100%)]",
];

const TAPE_CLASSES: ReadonlyArray<string> = [
  "left-[20%] -rotate-[5deg]",
  "right-[18%] rotate-[4deg]",
  "left-1/2 -translate-x-1/2 -rotate-[2deg]",
  "left-[14%] rotate-[5deg]",
  "right-[14%] -rotate-[4deg]",
  "left-[22%] -rotate-[3deg]",
  "left-1/2 -translate-x-1/2 rotate-[3deg]",
  "right-[22%] rotate-[4deg]",
];

const UI_COPY = {
  en: {
    eyebrow: "How it works",
    stepsCountLabel: (count: number) => `${count} operational steps`,
    boardLabel: "Connected workflow board",
    stepPrefix: "Step",
  },
  ar: {
    eyebrow: "كيف يعمل",
    stepsCountLabel: (count: number) => `${count} خطوات تشغيلية`,
    boardLabel: "لوحة تدفق مترابطة",
    stepPrefix: "الخطوة",
  },
} as const;

const buildWirePath = (start: WirePoint, end: WirePoint, index: number) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const bend = Math.max(16, Math.min(54, distance * 0.16));
  const swing = index % 2 === 0 ? bend : -bend;

  const c1x = start.x + dx * 0.32;
  const c1y = start.y + dy * 0.2 + swing;
  const c2x = start.x + dx * 0.7;
  const c2y = start.y + dy * 0.8 - swing;

  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
};

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
  const boardRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [wirePaths, setWirePaths] = useState<ReadonlyArray<string>>([]);
  const [wirePoints, setWirePoints] = useState<ReadonlyArray<WirePoint>>([]);
  const [boardSize, setBoardSize] = useState({ width: 1, height: 1 });

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, list.length);
  }, [list.length]);

  useEffect(() => {
    if (!list.length) return;

    let frameId = 0;

    const measure = () => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const board = boardRef.current;
        if (!board) return;

        const boardRect = board.getBoundingClientRect();
        const points: WirePoint[] = [];

        for (let idx = 0; idx < list.length; idx += 1) {
          const card = cardRefs.current[idx];
          if (!card) return;
          const rect = card.getBoundingClientRect();
          points.push({
            x: rect.left - boardRect.left + rect.width / 2,
            y: rect.top - boardRect.top + rect.height / 2,
          });
        }

        const paths = points
          .slice(0, -1)
          .map((point, idx) => buildWirePath(point, points[idx + 1], idx));

        setBoardSize({
          width: Math.max(1, boardRect.width),
          height: Math.max(1, boardRect.height),
        });
        setWirePoints(points);
        setWirePaths(paths);
      });
    };

    measure();

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            measure();
          })
        : null;

    if (observer) {
      const board = boardRef.current;
      if (board) observer.observe(board);
      cardRefs.current.forEach((card) => {
        if (card) observer.observe(card);
      });
    }

    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [list, isRtl]);

  const indigoPlateClass =
    "grid place-items-center rounded-[0.95rem] border border-white/65 bg-white/90 text-indigo-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]";
  const squareCardClass =
    "premium-card premium-card-tinted premium-card-hover group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/76 p-4 shadow-[0_20px_46px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,0.84)] transition-transform duration-300 before:!bg-[linear-gradient(180deg,rgb(79_70_229_/_0.11),transparent_70%)] hover:-translate-y-1 sm:p-5";
  const boardLayout = isRtl ? BOARD_LAYOUT_RTL : BOARD_LAYOUT_LTR;

  return (
    <section className="relative w-full py-16 sm:py-20">
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
              {copy.boardLabel}
            </p>
          </div>

          <div className="relative py-4 sm:py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-6 bottom-6 opacity-70 bg-[radial-gradient(circle_at_12%_22%,rgba(198,169,109,0.08),transparent_38%),radial-gradient(circle_at_82%_74%,rgba(79,70,229,0.08),transparent_36%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1 top-8 h-2.5 w-2.5 rounded-full border border-white/82 bg-indigo-500/72 shadow-[0_0_0_2px_rgba(255,255,255,0.5)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-10 top-3 h-2.5 w-2.5 rounded-full border border-white/82 bg-indigo-500/65 shadow-[0_0_0_2px_rgba(255,255,255,0.5)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-7 left-14 h-2.5 w-2.5 rounded-full border border-white/82 bg-indigo-500/72 shadow-[0_0_0_2px_rgba(255,255,255,0.5)]"
            />

            <div ref={boardRef} className="relative">
              <svg
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${Math.ceil(boardSize.width)} ${Math.ceil(boardSize.height)}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="how-wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(79,70,229,0.22)" />
                    <stop offset="48%" stopColor="rgba(67,56,202,0.36)" />
                    <stop offset="100%" stopColor="rgba(79,70,229,0.22)" />
                  </linearGradient>
                </defs>
                {wirePaths.map((path, idx) => (
                  <g key={`wire-${idx}`}>
                    <path
                      d={path}
                      fill="none"
                      stroke="rgba(30,41,59,0.10)"
                      strokeWidth={5.2}
                      strokeLinecap="round"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="url(#how-wire-gradient)"
                      strokeWidth={2.1}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth={0.9}
                      strokeLinecap="round"
                      strokeDasharray="5 9"
                    />
                  </g>
                ))}
                {wirePoints.map((point, idx) => (
                  <g key={`wire-point-${idx}`}>
                    <circle cx={point.x} cy={point.y} r={5.2} fill="rgba(255,255,255,0.85)" />
                    <circle cx={point.x} cy={point.y} r={2.85} fill="rgba(79,70,229,0.66)" />
                  </g>
                ))}
              </svg>

              <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-12 xl:auto-rows-[minmax(228px,1fr)] xl:gap-6">
                {list.map((s, idx) => {
                  const Icon = ICONS[idx % ICONS.length]?.Icon ?? Sparkles;
                  const layoutClass = boardLayout[idx] ?? "xl:col-span-4";
                  const tiltClass = BOARD_TILT_CLASSES[idx % BOARD_TILT_CLASSES.length];
                  const toneClass = CARD_TONE_CLASSES[idx % CARD_TONE_CLASSES.length];
                  const tapeClass = TAPE_CLASSES[idx % TAPE_CLASSES.length];

                  return (
                    <article
                      key={`${s.step}-${s.title}`}
                      data-step-card
                      dir={isRtl ? "rtl" : "ltr"}
                      ref={(node) => {
                        cardRefs.current[idx] = node;
                      }}
                      className={`${squareCardClass} ${toneClass} ${layoutClass} ${tiltClass} ${isRtl ? "text-right" : ""}`}
                    >
                      <div
                        aria-hidden
                        className={`absolute top-2 h-4 w-16 rounded-[0.45rem] border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(226,219,207,0.44))] opacity-80 shadow-[0_6px_16px_rgba(15,23,42,0.1)] ${tapeClass}`}
                      />
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light bg-[repeating-linear-gradient(145deg,rgba(255,255,255,0.28)_0px,rgba(255,255,255,0.28)_1px,transparent_1px,transparent_7px)]"
                      />
                      <div
                        aria-hidden
                        className={`absolute top-4 h-3 w-3 rounded-full border border-white/85 bg-indigo-500/85 shadow-[0_0_0_2px_rgba(255,255,255,0.62),0_8px_16px_rgba(37,99,235,0.3)] ${isRtl ? "right-4" : "left-4"}`}
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`${indigoPlateClass} h-11 w-11`}>
                            <span className="text-lg font-extrabold text-indigo-600">{s.step}</span>
                          </div>
                          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-secondary/70">
                            {copy.stepPrefix} {s.step}
                          </p>
                        </div>

                        <div className={`${indigoPlateClass} h-11 w-11 shrink-0`}>
                          <Icon className="h-[22px] w-[22px] text-indigo-600" />
                        </div>
                      </div>

                      <div className="mt-5 flex-1">
                        <p className="text-lg font-extrabold leading-tight text-primary [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden">
                          {s.title}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-secondary/80 [display:-webkit-box] [-webkit-line-clamp:6] [-webkit-box-orient:vertical] overflow-hidden">
                          {s.desc}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
