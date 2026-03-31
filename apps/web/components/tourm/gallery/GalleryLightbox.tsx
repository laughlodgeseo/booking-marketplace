"use client";

import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { GalleryImage } from "@/lib/content/gallery-items";

type GalleryLightboxProps = {
  open: boolean;
  images: GalleryImage[];
  activeIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  label: string;
};

function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return (index % total + total) % total;
}

export default function GalleryLightbox(props: GalleryLightboxProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { activeIndex, images, label, onClose, onIndexChange, open } = props;

  useEffect(() => {
    if (!open || images.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onIndexChange(activeIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onIndexChange(activeIndex + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, images.length, onClose, onIndexChange, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open || images.length <= 1) return;

    const total = images.length;
    const next = images[wrapIndex(activeIndex + 1, total)];
    const previous = images[wrapIndex(activeIndex - 1, total)];

    const preloadNext = new window.Image();
    preloadNext.src = next.src;

    const preloadPrevious = new window.Image();
    preloadPrevious.src = previous.src;
  }, [activeIndex, images, open]);

  if (!open || images.length === 0) return null;

  const total = images.length;
  const active = wrapIndex(activeIndex, total);
  const currentImage = images[active];

  const prev = () => onIndexChange(active - 1);
  const next = () => onIndexChange(active + 1);

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(34,26,84,0.76),rgba(8,12,20,0.95))]"
        onClick={onClose}
        aria-label="Close gallery"
      />

      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] bg-dark-1/68 ring-1 ring-white/22 shadow-[0_30px_85px_rgba(4,8,16,0.62)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-xs font-semibold text-inverted/92 sm:text-sm">
              {active + 1} / {total}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/16 text-inverted ring-1 ring-white/35 transition hover:bg-white/24"
              aria-label="Close lightbox"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="relative mx-3 mb-3 h-[70vh] min-h-[320px] max-h-[820px] overflow-hidden rounded-[1.55rem] bg-dark-1/55 sm:mx-6 sm:mb-6"
            onTouchStart={(event) => {
              const touch = event.changedTouches[0];
              touchStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              touchStart.current = null;
              if (!start) return;

              const touch = event.changedTouches[0];
              const deltaX = touch.clientX - start.x;
              const deltaY = touch.clientY - start.y;

              if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
              if (deltaX < 0) next();
              if (deltaX > 0) prev();
            }}
          >
            <OptimizedImage src={currentImage.src} alt={currentImage.alt} fill sizes="100vw" className="object-contain" priority />

            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/16 p-3 text-inverted ring-1 ring-white/35 backdrop-blur transition hover:bg-white/24"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/16 p-3 text-inverted ring-1 ring-white/35 backdrop-blur transition hover:bg-white/24"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
