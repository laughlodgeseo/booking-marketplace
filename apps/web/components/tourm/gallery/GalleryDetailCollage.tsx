"use client";

import Image from "next/image";
import { useState } from "react";
import type { GalleryImage } from "@/lib/content/gallery-items";
import GalleryLightbox from "./GalleryLightbox";

type GalleryDetailCollageProps = {
  title: string;
  images: GalleryImage[];
};

function pick(images: GalleryImage[], index: number): { image: GalleryImage; index: number } {
  const safeIndex = ((index % images.length) + images.length) % images.length;
  return { image: images[safeIndex], index: safeIndex };
}

function TileButton(props: {
  image: GalleryImage;
  index: number;
  onClick: (index: number) => void;
  className: string;
  sizes: string;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onClick(props.index)}
      className={["group relative overflow-hidden border border-white/75", props.className].join(" ")}
      aria-label={`Open image ${props.index + 1}`}
    >
      <Image
        src={props.image.src}
        alt={props.image.alt}
        fill
        sizes={props.sizes}
        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03] group-hover:brightness-105"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-dark-1/42 via-transparent to-transparent" />
    </button>
  );
}

export default function GalleryDetailCollage(props: GalleryDetailCollageProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!props.images.length) return null;

  const cover = pick(props.images, 0);
  const desktopTopLeft = pick(props.images, 1);
  const desktopTopRight = pick(props.images, 2);
  const desktopCircle = pick(props.images, 3);
  const desktopBottom = pick(props.images, 4);

  const mobileGrid = [pick(props.images, 1), pick(props.images, 2), pick(props.images, 3), pick(props.images, 4)];
  const mobileFinal = pick(props.images, 5);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  return (
    <>
      <div className="lg:hidden">
        <TileButton
          image={cover.image}
          index={cover.index}
          onClick={openAt}
          className="aspect-[16/10] rounded-[2.25rem] shadow-[0_22px_52px_rgba(11,15,25,0.14)]"
          sizes="100vw"
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          {mobileGrid.map((entry, idx) => (
            <TileButton
              key={`${entry.image.id}-${idx}`}
              image={entry.image}
              index={entry.index}
              onClick={openAt}
              className={[
                "rounded-[1.7rem] shadow-[0_16px_38px_rgba(11,15,25,0.12)]",
                idx % 2 === 0 ? "aspect-[4/3]" : "aspect-[3/4]",
              ].join(" ")}
              sizes="50vw"
            />
          ))}
        </div>

        <div className="mx-auto mt-4 w-full max-w-[26rem]">
          <TileButton
            image={mobileFinal.image}
            index={mobileFinal.index}
            onClick={openAt}
            className="aspect-[16/10] rounded-[1.7rem] shadow-[0_16px_38px_rgba(11,15,25,0.12)]"
            sizes="100vw"
          />
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-5">
        <TileButton
          image={cover.image}
          index={cover.index}
          onClick={openAt}
          className="lg:col-span-7 lg:min-h-[38rem] rounded-[2.25rem] shadow-[0_24px_58px_rgba(11,15,25,0.16)]"
          sizes="(max-width: 1023px) 100vw, 62vw"
        />

        <div className="lg:col-span-5">
          <div className="grid grid-cols-2 gap-4">
            <TileButton
              image={desktopTopLeft.image}
              index={desktopTopLeft.index}
              onClick={openAt}
              className="aspect-[4/3] rounded-[1.75rem] shadow-[0_16px_38px_rgba(11,15,25,0.12)]"
              sizes="22vw"
            />
            <TileButton
              image={desktopTopRight.image}
              index={desktopTopRight.index}
              onClick={openAt}
              className="aspect-[4/3] rounded-[1.75rem] shadow-[0_16px_38px_rgba(11,15,25,0.12)]"
              sizes="22vw"
            />
          </div>

          <div className="mx-auto my-4 w-56">
            <TileButton
              image={desktopCircle.image}
              index={desktopCircle.index}
              onClick={openAt}
              className="aspect-square rounded-full shadow-[0_18px_40px_rgba(11,15,25,0.15)]"
              sizes="220px"
            />
          </div>

          <TileButton
            image={desktopBottom.image}
            index={desktopBottom.index}
            onClick={openAt}
            className="aspect-[16/10] rounded-[1.75rem] shadow-[0_16px_38px_rgba(11,15,25,0.12)]"
            sizes="44vw"
          />
        </div>
      </div>

      <GalleryLightbox
        open={open}
        images={props.images}
        activeIndex={activeIndex}
        onClose={() => setOpen(false)}
        onIndexChange={setActiveIndex}
        label={`${props.title} image gallery`}
      />
    </>
  );
}
