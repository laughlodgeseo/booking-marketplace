"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { PropertyGalleryImage } from "./property-gallery.types";

type Props = {
  open: boolean;
  images: PropertyGalleryImage[];
  propertyName: string;
  initialIndex?: number;
  onClose: () => void;
};

function clampIndex(index: number, total: number) {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

function altText(raw: string | undefined, propertyName: string) {
  const text = (raw ?? "").trim();
  return text.length > 0 ? text : propertyName;
}

type RowKind = "A" | "B" | "C";
type GalleryRow = {
  kind: RowKind;
  items: Array<{ image: PropertyGalleryImage; index: number }>;
};

function buildRows(images: PropertyGalleryImage[]): GalleryRow[] {
  const rows: GalleryRow[] = [];
  const pattern: Array<{ kind: RowKind; count: number }> = [
    { kind: "A", count: 1 },
    { kind: "B", count: 2 },
    { kind: "C", count: 3 },
  ];

  let cursor = 0;
  let step = 0;

  while (cursor < images.length) {
    const slot = pattern[step % pattern.length];
    const items: Array<{ image: PropertyGalleryImage; index: number }> = [];

    for (let i = 0; i < slot.count && cursor < images.length; i += 1) {
      items.push({ image: images[cursor], index: cursor });
      cursor += 1;
    }

    rows.push({ kind: slot.kind, items });
    step += 1;
  }

  return rows;
}

export default function PropertyGalleryViewer({
  open,
  images,
  propertyName,
  initialIndex = 0,
  onClose,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    clampIndex(initialIndex, images.length),
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

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
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      tileRefs.current[highlightedIndex]?.scrollIntoView({
        block: "center",
        inline: "nearest",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [highlightedIndex, open]);

  if (!open) return null;

  const rows = buildRows(images);

  const rowGridClass = (kind: RowKind) => {
    if (kind === "A") return "grid grid-cols-1 gap-4 lg:gap-6";
    if (kind === "B") return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6";
    return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6";
  };

  const tileAspectClass = (kind: RowKind) => {
    if (kind === "A") return "aspect-[16/9]";
    if (kind === "B") return "aspect-[3/2]";
    return "aspect-[4/3]";
  };

  return (
    <div
      className="fixed inset-0 z-[95] bg-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo gallery for ${propertyName}`}
    >
      <div className="flex h-full flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-4 py-3 shadow-[0_2px_14px_rgba(11,15,25,0.05)] backdrop-blur sm:px-6">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {images.length}
            </span>
            <p className="text-sm font-semibold text-primary">photos</p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary shadow-[0_8px_20px_rgba(11,15,25,0.12)] transition hover:bg-accent-soft/45"
            aria-label="Close gallery"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl space-y-4 lg:space-y-6">
            {rows.map((row, rowIndex) => (
              <div key={`row-${row.kind}-${rowIndex}`} className={rowGridClass(row.kind)}>
                {row.items.map(({ image, index }) => {
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={`${image.id}-${index}`}
                      ref={(node) => {
                        tileRefs.current[index] = node;
                      }}
                      type="button"
                      onClick={() => setHighlightedIndex(index)}
                      className={[
                        "group relative overflow-hidden rounded-2xl bg-transparent text-left transition-transform md:hover:scale-[1.01]",
                        isHighlighted
                          ? "shadow-[0_14px_30px_rgba(11,15,25,0.14)]"
                          : "shadow-[0_10px_24px_rgba(11,15,25,0.1)]",
                      ].join(" ")}
                      aria-label={`Photo ${index + 1} of ${images.length}`}
                    >
                      <div
                        className={[
                          "relative overflow-hidden rounded-2xl bg-transparent",
                          tileAspectClass(row.kind),
                        ].join(" ")}
                      >
                        <Image
                          src={image.url}
                          alt={altText(image.alt, propertyName)}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 700px"
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <span className="pointer-events-none absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-xs font-semibold text-primary shadow-sm">
                        {index + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
