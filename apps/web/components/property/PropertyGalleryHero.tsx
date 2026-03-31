"use client";

import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Images } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocale } from "next-intl";

import PropertyGalleryViewer from "./PropertyGalleryViewer";
import type { PropertyGalleryImage } from "./property-gallery.types";
import { normalizeLocale } from "@/lib/i18n/config";

type Props = {
  images: PropertyGalleryImage[];
  propertyName: string;
};

function sortOrderValue(item: PropertyGalleryImage, fallbackIndex: number) {
  if (typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)) {
    return item.sortOrder;
  }
  return fallbackIndex;
}

function cleanImages(images: PropertyGalleryImage[], propertyName: string) {
  return images
    .map((image, index) => {
      const url = (image.url ?? "").trim();
      if (!url) return null;

      const id = (image.id ?? "").trim() || `${url}#${sortOrderValue(image, index)}`;
      const alt = (image.alt ?? propertyName).trim() || propertyName;

      return {
        id,
        url,
        alt,
        sortOrder: sortOrderValue(image, index),
      };
    })
    .filter((image): image is Required<PropertyGalleryImage> => image !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function clamp(index: number, total: number) {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

export default function PropertyGalleryHero({ images, propertyName }: Props) {
  const locale = normalizeLocale(useLocale());
  const isAr = locale === "ar";
  const gallery = useMemo(() => cleanImages(images, propertyName), [images, propertyName]);
  const [open, setOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const heroImage = gallery[0];
  const supporting = gallery.slice(1, 5);
  const remainingCount = Math.max(0, gallery.length - 5);

  const openViewer = (index: number) => {
    if (gallery.length === 0) return;
    setInitialIndex(clamp(index, gallery.length));
    setOpen(true);
  };

  const closeViewer = () => {
    setOpen(false);
  };

  return (
    <>
      <section className="w-full">
        {!heroImage ? (
          <div className="aspect-[16/11] h-auto w-full overflow-hidden rounded-3xl bg-warm-alt/60 shadow-[0_14px_34px_rgba(11,15,25,0.1)] sm:h-[380px] sm:aspect-auto lg:h-[500px]" />
        ) : (
          <div className="relative aspect-[16/11] h-auto sm:h-[380px] sm:aspect-auto lg:h-[500px]">
            <div className="grid h-full gap-3 sm:grid-cols-12 sm:gap-3 lg:gap-4">
              <button
                type="button"
                onClick={() => openViewer(0)}
                className="group relative h-full overflow-hidden rounded-3xl text-left shadow-[0_12px_28px_rgba(11,15,25,0.12)] sm:col-span-7"
                aria-label={isAr ? "عرض جميع الصور" : "Open all photos"}
              >
                <OptimizedImage
                  src={heroImage.url}
                  alt={heroImage.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 68vw"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-1/35 via-transparent to-transparent" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-dark-1/30 via-transparent to-transparent" />
              </button>

              {supporting.length > 0 ? (
                <div className="hidden h-full grid-cols-2 grid-rows-2 gap-3 sm:col-span-5 sm:grid lg:gap-4">
                  {supporting.map((image, index) => {
                    const absoluteIndex = index + 1;
                    const isLast = index === supporting.length - 1;
                    const shouldShowRemaining = isLast && remainingCount > 0;

                    return (
                      <button
                        key={`${image.id}-${index}`}
                        type="button"
                        onClick={() => openViewer(absoluteIndex)}
                        className="group relative h-full overflow-hidden rounded-3xl bg-transparent text-left shadow-[0_10px_24px_rgba(11,15,25,0.1)]"
                        aria-label={
                          isAr
                            ? `عرض الصورة ${absoluteIndex + 1}`
                            : `Open photo ${absoluteIndex + 1}`
                        }
                      >
                        <OptimizedImage
                          src={image.url}
                          alt={image.alt}
                          fill
                          sizes="(max-width: 1024px) 33vw, 26vw"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                          priority={index < 2}
                        />

                        {shouldShowRemaining ? (
                          <div className="absolute inset-0 grid place-items-center bg-dark-1/34">
                            <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur">
                              +{remainingCount} {isAr ? "صور" : "photos"}
                            </span>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {supporting.length > 0 ? (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto sm:hidden">
                {supporting.map((image, index) => (
                  <button
                    key={`mobile-thumb-${image.id}-${index}`}
                    type="button"
                    onClick={() => openViewer(index + 1)}
                    className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-white/75 bg-surface text-left"
                    aria-label={isAr ? `عرض الصورة ${index + 2}` : `Open photo ${index + 2}`}
                  >
                    <OptimizedImage
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes="112px"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => openViewer(0)}
              className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white/94 px-4 py-2 text-xs font-semibold text-primary shadow-[0_14px_34px_rgba(11,15,25,0.2)] backdrop-blur transition hover:bg-white sm:bottom-4 sm:right-4"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Images className="h-3.5 w-3.5" />
              </span>
              {isAr ? `عرض كل الصور (${gallery.length})` : `View all ${gallery.length} photos`}
            </button>
          </div>
        )}
      </section>

      <PropertyGalleryViewer
        key={open ? `gallery-viewer-${gallery.length}-${initialIndex}` : "gallery-viewer-closed"}
        open={open}
        images={gallery}
        propertyName={propertyName}
        initialIndex={initialIndex}
        onClose={closeViewer}
      />
    </>
  );
}
