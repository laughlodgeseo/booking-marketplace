"use client";

import Link from "next/link";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type AreaChip = {
  title: string;
  q: string;
  imageUrl?: string;
  hint?: string;
};

type Props = {
  title: string;
  subtitle: string;
  areas: AreaChip[];
};

type DragState = {
  pointerId: number | null;
  down: boolean;
  moved: boolean;
  axis: "none" | "horizontal" | "vertical";
  startX: number;
  startY: number;
  rawDx: number;
  rawDy: number;
};

type VisualProfile = {
  scale: number;
  blur: number;
  brightness: number;
  opacity: number;
  dim: number;
  zIndex: number;
  shadow: string;
};

const SLOT_OFFSETS = [-1, 0, 1] as const;
const DRAG_SENSITIVITY = 0.26;
const SNAP_MS = 460;
const CLICK_DRAG_THRESHOLD = 8;
const INTENT_LOCK_THRESHOLD = 8;

function safeAreas(input: AreaChip[]): AreaChip[] {
  return (input ?? []).filter((a) => a && a.title && a.q);
}

function useViewportWidth() {
  const [vw, setVw] = useState(1280);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return vw;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

function profileForDistance(distanceRaw: number): VisualProfile {
  const d = Math.abs(distanceRaw);
  const t = clamp01(d);

  const scale = lerp(1, 0.88, t);
  const blur = lerp(0, 1.8, t);
  const brightness = lerp(1, 0.84, t);
  const opacity = lerp(1, 0.8, t);
  const dim = lerp(0.02, 0.2, t);
  const zIndex = Math.round(50 - Math.min(16, d * 12));

  const shadowAlpha = lerp(0.3, 0.18, t);
  const shadowY = lerp(30, 18, t);
  const shadowBlur = lerp(90, 52, t);

  return {
    scale,
    blur,
    brightness,
    opacity,
    dim,
    zIndex,
    shadow: `0 ${shadowY}px ${shadowBlur}px rgba(2, 10, 20, ${shadowAlpha})`,
  };
}

export default function AreasSlider({ title, subtitle, areas }: Props) {
  const list = useMemo(() => safeAreas(areas), [areas]);
  const count = list.length;

  const vw = useViewportWidth();
  const stageRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<DragState>({
    pointerId: null,
    down: false,
    moved: false,
    axis: "none",
    startX: 0,
    startY: 0,
    rawDx: 0,
    rawDy: 0,
  });

  const suppressClickRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const snapFrameRef = useRef<number | null>(null);
  const snappingRef = useRef(false);
  const wheelLockRef = useRef(false);
  const wheelLockTimerRef = useRef<number | null>(null);

  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [stageWidth, setStageWidth] = useState(0);

  const dims = useMemo(() => {
    if (vw < 640) {
      return {
        xStep: 170,
        centerW: 246,
        centerH: 268,
        sideW: 212,
        sideH: 236,
        stageH: 288,
      };
    }

    if (vw < 1024) {
      return {
        xStep: 262,
        centerW: 360,
        centerH: 372,
        sideW: 302,
        sideH: 316,
        stageH: 376,
      };
    }

    return {
      xStep: 372,
      centerW: 472,
      centerH: 452,
      sideW: 386,
      sideH: 390,
      stageH: 447,
    };
  }, [vw]);

  const dragThreshold = Math.max(52, dims.xStep * 0.26);

  const wrapIndex = useCallback(
    (i: number) => {
      if (!count) return 0;
      return ((i % count) + count) % count;
    },
    [count],
  );

  const animateOffsetTo = useCallback((target: number, onDone?: () => void) => {
    if (snapFrameRef.current) {
      window.cancelAnimationFrame(snapFrameRef.current);
      snapFrameRef.current = null;
    }

    const from = dragOffsetRef.current;
    if (Math.abs(target - from) < 0.8) {
      dragOffsetRef.current = target;
      setDragOffset(target);
      onDone?.();
      return;
    }

    const startedAt = performance.now();
    snappingRef.current = true;

    const tick = (now: number) => {
      const t = clamp01((now - startedAt) / SNAP_MS);
      const eased = easeOut(t);
      const next = from + (target - from) * eased;

      dragOffsetRef.current = next;
      setDragOffset(next);

      if (t >= 1) {
        snapFrameRef.current = null;
        onDone?.();
        return;
      }

      snapFrameRef.current = window.requestAnimationFrame(tick);
    };

    snapFrameRef.current = window.requestAnimationFrame(tick);
  }, []);

  const moveByOne = useCallback(
    (step: 1 | -1) => {
      if (count < 2) return;
      if (dragRef.current.down || snappingRef.current) return;

      const target = step > 0 ? -dims.xStep : dims.xStep;
      animateOffsetTo(target, () => {
        setIndex((v) => wrapIndex(v + step));
        dragOffsetRef.current = 0;
        setDragOffset(0);
        snappingRef.current = false;
      });
    },
    [animateOffsetTo, count, dims.xStep, wrapIndex],
  );

  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    const update = () => setStageWidth(node.clientWidth);
    update();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => update());
      ro.observe(node);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    return () => {
      if (snapFrameRef.current) window.cancelAnimationFrame(snapFrameRef.current);
      if (wheelLockTimerRef.current) window.clearTimeout(wheelLockTimerRef.current);
    };
  }, []);

  const onStagePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (count < 2) return;

    const node = stageRef.current;
    if (!node) return;

    if (snapFrameRef.current) {
      window.cancelAnimationFrame(snapFrameRef.current);
      snapFrameRef.current = null;
    }
    snappingRef.current = false;

    dragRef.current.pointerId = e.pointerId;
    dragRef.current.down = true;
    dragRef.current.moved = false;
    dragRef.current.axis = "none";
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.rawDx = 0;
    dragRef.current.rawDy = 0;

    setDragging(false);
  }, [count]);

  const onStagePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const node = stageRef.current;
      if (!node) return;
      if (!dragRef.current.down) return;

      const rawDx = e.clientX - dragRef.current.startX;
      const rawDy = e.clientY - dragRef.current.startY;
      dragRef.current.rawDx = rawDx;
      dragRef.current.rawDy = rawDy;

      if (dragRef.current.axis === "none") {
        const absX = Math.abs(rawDx);
        const absY = Math.abs(rawDy);

        if (absX < INTENT_LOCK_THRESHOLD && absY < INTENT_LOCK_THRESHOLD) return;

        if (absY > absX) {
          dragRef.current.pointerId = null;
          dragRef.current.down = false;
          dragRef.current.axis = "vertical";
          dragRef.current.rawDx = 0;
          dragRef.current.rawDy = 0;
          setDragging(false);
          if (node.hasPointerCapture(e.pointerId)) {
            node.releasePointerCapture(e.pointerId);
          }
          return;
        }

        dragRef.current.axis = "horizontal";
        if (dragRef.current.pointerId !== null && !node.hasPointerCapture(dragRef.current.pointerId)) {
          node.setPointerCapture(dragRef.current.pointerId);
        }
      }

      if (dragRef.current.axis !== "horizontal") return;
      e.preventDefault();

      if (!dragRef.current.moved && Math.abs(rawDx) > CLICK_DRAG_THRESHOLD) {
        dragRef.current.moved = true;
        setDragging(true);
      }

      if (!dragRef.current.moved) return;

      const eased = Math.max(-dims.xStep * 0.95, Math.min(dims.xStep * 0.95, rawDx * DRAG_SENSITIVITY));
      dragOffsetRef.current = eased;
      setDragOffset(eased);
    },
    [dims.xStep],
  );

  const onStagePointerUp = useCallback(() => {
    const node = stageRef.current;
    if (!node || !dragRef.current.down) return;

    if (
      dragRef.current.pointerId !== null &&
      node.hasPointerCapture(dragRef.current.pointerId)
    ) {
      node.releasePointerCapture(dragRef.current.pointerId);
    }

    const moved = dragRef.current.moved;
    const rawDx = dragRef.current.rawDx;

    dragRef.current.pointerId = null;
    dragRef.current.down = false;
    dragRef.current.axis = "none";
    dragRef.current.rawDx = 0;
    dragRef.current.rawDy = 0;

    let step: 1 | -1 | 0 = 0;
    if (moved && Math.abs(rawDx) >= dragThreshold) {
      step = rawDx < 0 ? 1 : -1;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 220);
    }

    setDragging(false);
    const target = step === 0 ? 0 : step > 0 ? -dims.xStep : dims.xStep;
      animateOffsetTo(target, () => {
        if (step !== 0) setIndex((v) => wrapIndex(v + step));
        dragOffsetRef.current = 0;
        setDragOffset(0);
        snappingRef.current = false;
      });
  }, [animateOffsetTo, dims.xStep, dragThreshold, wrapIndex]);

  const onStageWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      if (count < 2) return;
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX < 0.6 && absY < 0.6) return;
      if (absX <= absY) return;

      e.preventDefault();

      if (wheelLockRef.current || dragRef.current.down || snappingRef.current) {
        return;
      }

      const delta = e.deltaX;
      moveByOne(delta > 0 ? 1 : -1);

      wheelLockRef.current = true;
      if (wheelLockTimerRef.current) window.clearTimeout(wheelLockTimerRef.current);
      wheelLockTimerRef.current = window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 260);
    },
    [count, moveByOne],
  );

  const slots = useMemo(() => {
    if (!count) return [];
    const dragProgress = dragOffset / dims.xStep;

    return SLOT_OFFSETS.map((off) => {
      const idx = wrapIndex(index + off);
      const area = list[idx];
      const relative = off + dragProgress;
      const d = Math.abs(relative);
      const t = clamp01(d);

      const cardW = lerp(dims.centerW, dims.sideW, t);
      const cardH = lerp(dims.centerH, dims.sideH, t);
      const profile = profileForDistance(relative);
      const x = relative * dims.xStep;
      const rotate = relative * 6;

      return {
        off,
        idx,
        area,
        cardW,
        cardH,
        profile,
        x,
        rotate,
      };
    });
  }, [count, dims.centerH, dims.centerW, dims.sideH, dims.sideW, dims.xStep, dragOffset, index, list, wrapIndex]);

  if (!count) return null;

  return (
    <section className="relative w-full py-[0.75rem] sm:py-[1.45rem]">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Areas</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-secondary sm:text-base">{subtitle}</p>
        </div>

        <div className="w-full">
          <div className="mx-auto w-[94%] max-w-[1120px]">
            <div
              ref={stageRef}
              className={["relative select-none touch-none", dragging ? "cursor-grabbing" : "cursor-grab"].join(" ")}
              style={{
                height: dims.stageH,
                width: "100%",
                touchAction: "pan-y",
                willChange: "transform",
              }}
              onWheel={onStageWheel}
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={onStagePointerUp}
              onPointerCancel={onStagePointerUp}
            >
            {slots.map((s) => {
              const href = `/properties?city=Dubai&area=${encodeURIComponent(s.area.q)}`;

              return (
                <div
                  key={`${s.idx}-${s.off}`}
                  className="absolute top-0"
                  style={{
                    zIndex: s.profile.zIndex,
                    left: stageWidth > 0 ? 0 : "50%",
                    transform:
                      stageWidth > 0
                        ? `translate3d(${stageWidth / 2 - s.cardW / 2 + s.x}px, 0, 0)`
                        : `translate3d(calc(-50% + ${s.x}px), 0, 0)`,
                    willChange: "transform",
                  }}
                >
                  <Link
                    href={href}
                    className="group block cursor-pointer rounded-[2.25rem] transition-[transform,filter] duration-300 ease-out hover:scale-[1.03] hover:[filter:drop-shadow(0_16px_28px_rgba(2,10,20,0.24))]"
                    aria-label={`Explore ${s.area.title}`}
                    onClick={(e) => {
                      if (!suppressClickRef.current && !dragRef.current.moved) return;
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <div
                      className="relative overflow-hidden rounded-[2.25rem] border border-white/35 bg-white/10"
                      style={{
                        width: s.cardW,
                        height: s.cardH,
                        transform: `scale(${s.profile.scale}) rotate(${s.rotate}deg)`,
                        filter: `blur(${s.profile.blur}px) brightness(${s.profile.brightness})`,
                        opacity: s.profile.opacity,
                        boxShadow: s.profile.shadow,
                        transition: dragging ? "none" : "transform 120ms linear, filter 120ms linear, opacity 120ms linear",
                        willChange: "transform, filter, opacity",
                      }}
                    >
                      {s.area.imageUrl ? (
                        <Image
                          src={s.area.imageUrl}
                          alt={s.area.title}
                          fill
                          sizes="(max-width: 639px) 246px, (max-width: 1023px) 360px, 472px"
                          className="object-cover"
                          priority={s.off === 0}
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-warm-alt to-warm-alt" />
                      )}

                      <div className="absolute inset-0" style={{ backgroundColor: `rgba(2,10,20,${s.profile.dim})` }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-1/58 via-dark-1/18 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-ink/62 to-transparent" />

                      <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                        <p className="text-2xl font-semibold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(11,15,25,0.66)] sm:text-[2rem]">
                          {s.area.title}
                        </p>
                        <p className="mt-1 text-xs text-white/90 drop-shadow-[0_2px_10px_rgba(11,15,25,0.66)] sm:text-sm">
                          {s.area.hint || "Explore this area"}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            <button
              type="button"
              onClick={() => moveByOne(-1)}
              disabled={count < 2}
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-surface px-0 shadow-sm transition-colors hover:bg-accent-soft/60 hover:text-brand disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5 text-primary transition-colors hover:text-brand" />
            </button>

            <div className="flex items-center justify-center gap-2">
              {list.map((area, dotIndex) => (
                <button
                  key={`${area.q}-${dotIndex}`}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  disabled={count < 2}
                  aria-label={`Go to ${area.title}`}
                  className={[
                    "rounded-full bg-current cursor-pointer transition-all duration-200",
                    dotIndex === index
                      ? "h-3 w-3 text-indigo-600"
                      : "h-2.5 w-2.5 text-secondary/40 hover:scale-110 hover:text-indigo-600",
                    count < 2 ? "cursor-not-allowed opacity-45" : "",
                  ].join(" ")}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => moveByOne(1)}
              disabled={count < 2}
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-surface px-0 shadow-sm transition-colors hover:bg-accent-soft/60 hover:text-brand disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5 text-primary transition-colors hover:text-brand" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
