"use client";

import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PropertyMedia } from "@/lib/types/property";
import { ChevronLeft, ChevronRight, X, Images } from "lucide-react";

type Props = {
  media: PropertyMedia[];
  title: string;
};

type GalleryItem = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function stableId(maybeId: string | null | undefined, url: string, sortOrder: number) {
  const id = (maybeId ?? "").trim();
  if (id) return id;
  return `${url}#${sortOrder}`;
}

export default function PropertyGallery({ media, title }: Props) {
  const items = useMemo<GalleryItem[]>(() => {
    const cleaned: GalleryItem[] = [];

    for (const m of [...media].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const url = (m.url ?? "").trim();
      if (!url) continue;

      const alt = ((m.alt ?? title).trim() || title).trim();

      cleaned.push({
        id: stableId(m.id, url, m.sortOrder),
        url,
        alt,
        sortOrder: m.sortOrder,
      });
    }

    return cleaned;
  }, [media, title]);

  const hero = items[0] ?? null;
  const grid = items.slice(1, 5);
  const total = items.length;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openAt = useCallback(
    (index: number) => {
      if (!items.length) return;
      setActiveIndex(clamp(index, 0, items.length - 1));
      setOpen(true);
    },
    [items.length],
  );

  const close = useCallback(() => setOpen(false), []);

  const prev = useCallback(() => {
    setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
  }, [items.length]);

  const next = useCallback(() => {
    setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
  }, [items.length]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close, prev, next]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const remainingCount = Math.max(0, total - 5);
  const showGrid = grid.length > 0;

  return (
    <>
      <div className="grid gap-3">
        <motion.div
          className="relative aspect-[16/10] overflow-hidden rounded-2xl"
          initial={{ scale: 0.985, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {hero ? (
            <button
              type="button"
              onClick={() => openAt(0)}
              className="absolute inset-0 text-left"
              aria-label="Open photo gallery"
            >
              <OptimizedImage
                src={hero.url}
                alt={hero.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 65vw"
                className="object-cover"
                priority
              />
            </button>
          ) : (
            <div className="h-full w-full bg-warm-alt" />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-1/40 via-transparent to-transparent" />

          <div className="pointer-events-none absolute bottom-4 left-4">
            <div className="rounded-xl bg-surface/90 px-3 py-2 text-xs font-semibold text-primary backdrop-blur">
              Verified availability • Operator-managed
            </div>
          </div>

          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <div className="pointer-events-none hidden rounded-xl bg-surface/90 px-3 py-2 text-xs font-semibold text-primary backdrop-blur sm:block">
              {total > 0 ? `${total} photos` : "Photos"}
            </div>

            <button
              type="button"
              onClick={() => openAt(0)}
              className="inline-flex items-center gap-2 rounded-xl bg-surface/90 px-3 py-2 text-xs font-semibold text-primary backdrop-blur transition hover:bg-surface"
            >
              <Images className="h-4 w-4" />
              View all
            </button>
          </div>
        </motion.div>

        {showGrid ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {grid.map((m, idx) => {
              const absoluteIndex = idx + 1;
              const isLastTile = idx === grid.length - 1 && remainingCount > 0;

              return (
                <button
                  key={`${m.id}-${idx}`}
                  type="button"
                  onClick={() => openAt(absoluteIndex)}
                  className="relative aspect-[16/10] overflow-hidden rounded-2xl text-left"
                  aria-label="Open photo"
                >
                  <OptimizedImage
                    src={m.url}
                    alt={m.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-dark-1/10" />

                  {isLastTile ? (
                    <div className="absolute inset-0 grid place-items-center bg-dark-1/40">
                      <div className="rounded-2xl bg-surface/95 px-4 py-3 text-sm font-semibold text-primary shadow-sm">
                        +{remainingCount} more photos
                      </div>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {open && items.length > 0 ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close gallery"
              onClick={close}
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(12,16,26,0.6),rgba(0,0,0,0.9))]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-6xl overflow-hidden rounded-[2rem] border border-inverted/15 bg-dark-1/95 shadow-card"
            >
              <div className="flex items-center justify-between gap-3 border-b border-inverted/10 px-4 py-3 sm:px-6">
                <div className="text-xs font-semibold text-inverted/90">
                  {activeIndex + 1} / {items.length}
                </div>

                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center gap-2 rounded-full border border-inverted/20 bg-surface/10 px-4 py-2 text-xs font-semibold text-inverted backdrop-blur transition hover:bg-surface/15"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>

              <div className="px-2 pb-3 pt-3 sm:px-6 sm:pb-6 sm:pt-5">
                <div className="relative mx-auto h-[62vh] min-h-[320px] max-h-[760px] w-full overflow-hidden rounded-[1.65rem] bg-dark-1/70 sm:h-[70vh]">
                  <OptimizedImage
                    src={items[activeIndex].url}
                    alt={items[activeIndex].alt}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority
                  />

                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-inverted/20 bg-dark-1/35 p-3 text-inverted backdrop-blur transition hover:bg-dark-1/50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={next}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-inverted/20 bg-dark-1/35 p-3 text-inverted backdrop-blur transition hover:bg-dark-1/50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                  {items.map((it, idx) => {
                    const active = idx === activeIndex;
                    return (
                      <button
                        key={`${it.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={[
                          "relative h-16 w-24 flex-none overflow-hidden rounded-xl border transition sm:h-20 sm:w-32",
                          active ? "border-inverted" : "border-inverted/20 hover:border-inverted/40",
                        ].join(" ")}
                        aria-label={`Go to photo ${idx + 1}`}
                      >
                        <OptimizedImage src={it.url} alt={it.alt} fill sizes="160px" className="object-cover" />
                        {active ? (
                          <div className="absolute inset-0 ring-2 ring-inverted" />
                        ) : (
                          <div className="absolute inset-0 bg-dark-1/10" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 text-center text-[11px] text-inverted/70">
                  Tip: use ← / → to navigate, Esc to close.
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
