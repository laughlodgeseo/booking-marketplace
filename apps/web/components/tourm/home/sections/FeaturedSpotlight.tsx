"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Bath, BedDouble, ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";
import type { SearchPropertyCard } from "@/lib/api/publicTypes";
import Clamp from "@/components/ui/Clamp";

type FeaturedSpotlightProps = {
  title: string;
  subtitle: string;
  items: ReadonlyArray<SearchPropertyCard>;
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

type SlotProfile = {
  scale: number;
  blur: number;
  brightness: number;
  dim: number;
  opacity: number;
  shadow: string;
  zIndex: number;
};

type CursorState = {
  x: number;
  y: number;
  visible: boolean;
  pressed: boolean;
};

const SLOT_OFFSETS = [-2, -1, 0, 1, 2] as const;
const DRAG_SENSITIVITY = 0.26;
const SNAP_MS = 460;
const CLICK_DRAG_THRESHOLD = 8;
const INTENT_LOCK_THRESHOLD = 8;

function safeText(v: string | null | undefined): string {
  return (v ?? "").trim();
}

const TITLE_SEPARATORS = [" - ", " | ", " • ", ",", "·", "—", "(", " at "] as const;

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined) return "";
  const c = safeText(currency);

  try {
    const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
    return c ? `${nf.format(amount)} ${c}` : nf.format(amount);
  } catch {
    return c ? `${amount} ${c}` : String(amount);
  }
}

function getDisplayTitle(raw: string | null | undefined): string {
  const title = safeText(raw);
  if (!title) return "Stay";

  let cutAt = title.length;
  TITLE_SEPARATORS.forEach((separator) => {
    const idx = title.indexOf(separator);
    if (idx !== -1 && idx < cutAt) {
      cutAt = idx;
    }
  });

  const cleaned = title.slice(0, cutAt).trim() || title;
  return cleaned.slice(0, 32).trim();
}

function ensureRotationSize(items: ReadonlyArray<SearchPropertyCard>, minCount: number): SearchPropertyCard[] {
  const clean = items.filter((it) => Boolean(safeText(it?.slug)));
  if (!clean.length) return [];
  if (clean.length >= minCount) return [...clean];

  const expanded = [...clean];
  let cursor = 0;

  while (expanded.length < minCount) {
    expanded.push(clean[cursor % clean.length]);
    cursor += 1;
  }

  return expanded;
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

function profileForDistance(distanceRaw: number): SlotProfile {
  const d = Math.abs(distanceRaw);
  const nearT = clamp01(d);
  const farT = clamp01(d - 1);

  const scale = d <= 1 ? lerp(1.08, 0.94, nearT) : lerp(0.94, 0.89, farT);
  const blur = d <= 1 ? lerp(0, 2.8, nearT) : lerp(2.8, 4.6, farT);
  const brightness = d <= 1 ? lerp(1, 0.9, nearT) : lerp(0.9, 0.84, farT);
  const dim = d <= 1 ? lerp(0, 0.18, nearT) : lerp(0.18, 0.26, farT);
  const opacity = d <= 1 ? lerp(1, 0.95, nearT) : lerp(0.95, 0.9, farT);
  const zIndex = Math.round(60 - Math.min(24, d * 10));

  const shadowAlpha = d <= 1 ? lerp(0.36, 0.22, nearT) : lerp(0.22, 0.18, farT);
  const shadowY = d <= 1 ? lerp(42, 22, nearT) : lerp(22, 14, farT);
  const shadowBlur = d <= 1 ? lerp(112, 66, nearT) : lerp(66, 44, farT);

  return {
    scale,
    blur,
    brightness,
    dim,
    opacity,
    shadow: `0 ${shadowY}px ${shadowBlur}px rgba(2, 10, 20, ${shadowAlpha})`,
    zIndex,
  };
}

export default function FeaturedSpotlight(props: FeaturedSpotlightProps) {
  const router = useRouter();
  const vw = useViewportWidth();
  const list = useMemo(() => ensureRotationSize(props.items, 9), [props.items]);
  const mobileItems = useMemo(() => {
    const clean = props.items.filter((it) => Boolean(safeText(it?.slug)));
    return clean.length > 0 ? clean : list;
  }, [list, props.items]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
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

  const [activeIdx, setActiveIdx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [stageWidth, setStageWidth] = useState(0);
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, visible: false, pressed: false });
  const cursorFrameRef = useRef<number | null>(null);
  const cursorPosRef = useRef({ x: 0, y: 0 });

  const dims = useMemo(() => {
    if (vw < 640) {
      return {
        cardW: 194,
        slotStep: 110,
      };
    }

    if (vw < 1024) {
      return {
        cardW: 286,
        slotStep: 162,
      };
    }

    if (vw < 1440) {
      return {
        cardW: 412,
        slotStep: 226,
      };
    }

    return {
      cardW: 438,
      slotStep: 242,
    };
  }, [vw]);

  const stageH = useMemo(() => Math.round(dims.cardW * 1.25), [dims.cardW]);

  const dragThreshold = Math.max(52, dims.slotStep * 0.26);

  const wrapIndex = useCallback(
    (idx: number) => {
      if (!list.length) return 0;
      return ((idx % list.length) + list.length) % list.length;
    },
    [list.length],
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

    const startAt = performance.now();
    snappingRef.current = true;

    const tick = (now: number) => {
      const t = clamp01((now - startAt) / SNAP_MS);
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
      if (!list.length) return;
      if (dragRef.current.down || snappingRef.current) return;

      const target = step > 0 ? -dims.slotStep : dims.slotStep;
      animateOffsetTo(target, () => {
        setActiveIdx((v) => wrapIndex(v + step));
        dragOffsetRef.current = 0;
        setDragOffset(0);
        snappingRef.current = false;
      });
    },
    [animateOffsetTo, dims.slotStep, list.length, wrapIndex],
  );

  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  useEffect(() => {
    const node = scrollerRef.current;
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
      if (cursorFrameRef.current) {
        window.cancelAnimationFrame(cursorFrameRef.current);
      }
      if (snapFrameRef.current) {
        window.cancelAnimationFrame(snapFrameRef.current);
      }
      if (wheelLockTimerRef.current) {
        window.clearTimeout(wheelLockTimerRef.current);
      }
    };
  }, []);

  const onStagePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!list.length) return;

    const node = scrollerRef.current;
    if (!node) return;

    dragRef.current.pointerId = e.pointerId;
    dragRef.current.down = true;
    dragRef.current.moved = false;
    dragRef.current.axis = "none";
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.rawDx = 0;
    dragRef.current.rawDy = 0;

    setDragging(false);
    if (snapFrameRef.current) {
      window.cancelAnimationFrame(snapFrameRef.current);
      snapFrameRef.current = null;
    }
    snappingRef.current = false;
    if (e.pointerType === "mouse") {
      setCursor((prev) => ({ ...prev, visible: true, pressed: true }));
    }

  }, [list.length]);

  const onStagePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const node = scrollerRef.current;
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
          setCursor((prev) => ({ ...prev, pressed: false }));
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

      const eased = Math.max(-dims.slotStep * 0.95, Math.min(dims.slotStep * 0.95, rawDx * DRAG_SENSITIVITY));
      dragOffsetRef.current = eased;
      setDragOffset(eased);
    },
    [dims.slotStep],
  );

  const onStagePointerUp = useCallback(
    () => {
      const node = scrollerRef.current;
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
      setCursor((prev) => ({ ...prev, pressed: false }));

      const target = step === 0 ? 0 : step > 0 ? -dims.slotStep : dims.slotStep;
      animateOffsetTo(target, () => {
        if (step !== 0) {
          setActiveIdx((v) => wrapIndex(v + step));
        }
        dragOffsetRef.current = 0;
        setDragOffset(0);
        snappingRef.current = false;
      });
    },
    [animateOffsetTo, dims.slotStep, dragThreshold, wrapIndex],
  );

  const onStageWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      if (list.length < 2) return;
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
      if (wheelLockTimerRef.current) {
        window.clearTimeout(wheelLockTimerRef.current);
      }
      wheelLockTimerRef.current = window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 260);
    },
    [list.length, moveByOne],
  );

  const slots = useMemo(() => {
    if (!list.length) return [];

    const dragProgress = dragOffset / dims.slotStep;

    return SLOT_OFFSETS.map((off) => {
      const idx = wrapIndex(activeIdx + off);
      const item = list[idx];
      const profile = profileForDistance(off + dragProgress);
      const x = (off + dragProgress) * dims.slotStep;

      return {
        off,
        idx,
        item,
        profile,
        x,
      };
    });
  }, [activeIdx, dims.slotStep, dragOffset, list, wrapIndex]);

  if (!list.length) {
    return null;
  }

  return (
    <section className="relative h-auto w-full py-10 lg:py-12">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-14">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/60">Featured</p>
            <h2 className="mt-2 text-[22px] font-semibold leading-[1.15] tracking-[-0.01em] text-primary sm:text-3xl">
              {props.title}
            </h2>
            <p className="mt-2 text-sm text-secondary/75 sm:text-base">{props.subtitle}</p>
          </div>
        </div>

        <div className="mt-8 lg:hidden">
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {mobileItems.map((item, idx) => {
              const title = getDisplayTitle(item.title);
              const cover = safeText(item.coverImageUrl);
              const city = safeText(item.city);
              const area = safeText(item.area);
              const location = area ? `${area}${city ? `, ${city}` : ""}` : city || "Dubai";
              const price = formatMoney(item.priceFrom, item.currency);
              const guests = item.guests && item.guests > 0 ? item.guests : 6;
              const beds = item.bedrooms && item.bedrooms > 0 ? item.bedrooms : null;
              const baths = item.bathrooms && item.bathrooms > 0 ? item.bathrooms : null;

              return (
                <article
                  key={`${item.slug}-${idx}`}
                  className="w-[84%] shrink-0 snap-center overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_14px_30px_rgba(11,15,25,0.12)] sm:w-[60%]"
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => router.push(`/properties/${item.slug}`)}
                    aria-label={`Open ${title}`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={title}
                          fill
                          sizes="(max-width: 639px) 84vw, (max-width: 1023px) 60vw, 1px"
                          className="object-cover"
                          priority={idx === 0}
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-warm-alt to-surface" />
                      )}
                    </div>

                    <div className="flex min-h-[206px] flex-col gap-3 p-4">
                      <div>
                        <Clamp as="h3" lines={2} className="text-base font-semibold leading-snug tracking-[-0.01em] text-primary">
                          {title}
                        </Clamp>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-secondary">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-secondary/80" />
                          <Clamp as="span" lines={1} className="min-w-0">
                            {location}
                          </Clamp>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary/88">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-secondary/75" />
                          {guests} guests
                        </span>
                        {beds ? (
                          <span className="inline-flex items-center gap-1.5">
                            <BedDouble className="h-3.5 w-3.5 text-secondary/75" />
                            {beds} beds
                          </span>
                        ) : null}
                        {baths ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Bath className="h-3.5 w-3.5 text-secondary/75" />
                            {baths} baths
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-neutral-200/80 pt-3">
                        <span className="text-sm font-semibold text-primary">{price ? `From ${price}` : "From AED --"}</span>
                        <span className="inline-flex h-11 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white">
                          View
                        </span>
                      </div>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <Link
              href="/properties"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              View all stays
              <span aria-hidden className="text-white/85">→</span>
            </Link>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="mt-10 w-full pb-4 md:mt-12">
          <div className="mx-auto w-full max-w-[1260px]">
            <div
              ref={scrollerRef}
              className={[
                "relative select-none touch-none overflow-visible",
                dragging ? "cursor-grabbing" : "cursor-grab",
              ].join(" ")}
              style={{
                height: stageH,
                width: "100%",
                touchAction: "pan-y",
                willChange: "transform",
              }}
              onWheel={onStageWheel}
              onMouseEnter={() => {
                setCursor((prev) => ({ ...prev, visible: true }));
              }}
              onMouseMove={(e) => {
                const node = scrollerRef.current;
                if (!node) return;

                const rect = node.getBoundingClientRect();
                cursorPosRef.current = {
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                };

                if (cursorFrameRef.current) return;
                cursorFrameRef.current = window.requestAnimationFrame(() => {
                  cursorFrameRef.current = null;
                  setCursor((prev) => ({
                    ...prev,
                    visible: true,
                    x: cursorPosRef.current.x,
                    y: cursorPosRef.current.y,
                  }));
                });
              }}
              onMouseLeave={() => {
                setCursor((prev) => ({ ...prev, visible: false, pressed: false }));
              }}
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={onStagePointerUp}
              onPointerCancel={onStagePointerUp}
            >
          <div
            className={[
              "pointer-events-none absolute z-[80] hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-inverted/45 bg-surface/14 backdrop-blur-md transition-all duration-200 md:block",
              cursor.visible ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: `translate(-50%, -50%) scale(${cursor.pressed ? 1.16 : 1})`,
            }}
            aria-hidden
          />

          {slots.map((slot) => {
            const title = getDisplayTitle(slot.item.title);
            const cover = safeText(slot.item.coverImageUrl);
            const price = formatMoney(slot.item.priceFrom, slot.item.currency);
            const guestCount = slot.item.guests && slot.item.guests > 0 ? slot.item.guests : 6;
            const city = safeText(slot.item.city);
            const area = safeText(slot.item.area);
            const loc = area ? `${area}${city ? `, ${city}` : ""}` : city;

            return (
              <div
                key={`${slot.off}-${slot.idx}`}
                className="pointer-events-none absolute top-0"
                style={{
                  width: dims.cardW,
                  left: stageWidth > 0 ? 0 : "50%",
                  transform:
                    stageWidth > 0
                      ? `translate3d(${stageWidth / 2 - dims.cardW / 2 + slot.x}px, 0, 0)`
                      : `translate3d(calc(-50% + ${slot.x}px), 0, 0)`,
                  zIndex: slot.profile.zIndex,
                  willChange: "transform",
                }}
              >
                <div
                  className="group relative w-full overflow-hidden rounded-[2rem] border border-black/5 bg-white/16"
                  style={{
                    boxShadow: slot.profile.shadow,
                    transform: `scale(${slot.profile.scale})`,
                    filter: `blur(${slot.profile.blur}px) brightness(${slot.profile.brightness})`,
                    opacity: slot.profile.opacity,
                    transition: dragging ? "none" : "transform 120ms linear, filter 120ms linear, opacity 120ms linear",
                    willChange: "transform, filter, opacity",
                  }}
                >
                  <div className="pointer-events-none absolute inset-x-7 top-0 z-20 h-[2px] rounded-full bg-gradient-to-r from-brand/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative w-full aspect-[4/5]">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={title}
                        fill
                        sizes="(max-width: 639px) 194px, (max-width: 1023px) 286px, (max-width: 1439px) 412px, 438px"
                        className="object-cover"
                        priority={slot.off === 0}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-warm-alt to-surface" />
                    )}

                    <span className="absolute bottom-3 left-3 z-20 rounded-full bg-black/35 px-3 py-1.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm sm:bottom-4 sm:left-4">
                      {price ? `From ${price}` : "From AED --"}
                    </span>
                    <span className="absolute bottom-3 right-3 z-20 rounded-full bg-black/30 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm sm:bottom-4 sm:right-4">
                      Up to {guestCount} guests
                    </span>

                    <div className="absolute bottom-0 left-0 right-0 p-4 pb-16 sm:p-5 sm:pb-[4.5rem]">
                      <p className="line-clamp-1 text-lg font-semibold leading-snug tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.35)] md:text-xl">
                        {title}
                      </p>
                      <p className="mt-1 truncate text-sm text-white/85 drop-shadow-[0_2px_14px_rgba(0,0,0,0.35)]">
                        {loc || "Dubai"}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="pointer-events-auto absolute inset-0 cursor-pointer"
                      aria-label={`Open ${title}`}
                      onClick={(e) => {
                        if (suppressClickRef.current || dragRef.current.moved) {
                          e.preventDefault();
                          return;
                        }
                        router.push(`/properties/${slot.item.slug}`);
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
        </div>

        <div className="mb-6 mt-7 hidden items-center justify-center lg:flex">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            <button
              type="button"
              onClick={() => moveByOne(-1)}
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-surface px-0 shadow-sm transition hover:bg-accent-soft/60 hover:text-brand"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5 text-primary transition hover:text-brand" />
            </button>
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700"
            >
              View all stays
              <span aria-hidden className="text-white/85">→</span>
            </Link>
            <button
              type="button"
              onClick={() => moveByOne(1)}
              className="grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-surface px-0 shadow-sm transition hover:bg-accent-soft/60 hover:text-brand"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5 text-primary transition hover:text-brand" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
