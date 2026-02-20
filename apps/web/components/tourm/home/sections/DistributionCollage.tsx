import Image from "next/image";

const COLLAGE_IMAGES = {
  topLeft: {
    src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=2400&q=84",
    alt: "Modern neutral-toned luxury living interior with no people",
  },
  bottomLeft: {
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=2400&q=84",
    alt: "Clean bedroom suite interior with natural light and no people",
  },
  circleRight: {
    src: "/areas/downtown-dubai.jpg",
    alt: "Downtown Dubai skyline with centered Burj Khalifa and no people",
  },
};

const TILE_BASE = "overflow-hidden ring-1 ring-black/5 shadow-[0_35px_90px_-70px_rgba(0,0,0,0.6)] bg-white/40";

const TILE_IMAGE_CLASS = "object-cover saturate-[1.05] contrast-[1.03]";

export default function DistributionCollage() {
  return (
    <div
      data-testid="distribution-collage-wrapper"
      className="relative mx-auto w-full max-w-[620px] min-h-[460px] overflow-visible lg:mx-0"
    >
      <div className="pointer-events-none absolute -left-16 -top-16 -z-10 h-56 w-56 rounded-full bg-indigo-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 -z-10 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />

      <div className="absolute left-0 top-0 z-10 flex h-full w-[58%] flex-col gap-6">
        <div className={`${TILE_BASE} relative flex-1 rounded-[32px]`}>
          <Image
            src={COLLAGE_IMAGES.topLeft.src}
            alt={COLLAGE_IMAGES.topLeft.alt}
            fill
            quality={90}
            sizes="(min-width: 1024px) 22vw, 58vw"
            className={`${TILE_IMAGE_CLASS} object-center`}
          />
        </div>

        <div className={`${TILE_BASE} relative flex-1 rounded-[32px]`}>
          <Image
            src={COLLAGE_IMAGES.bottomLeft.src}
            alt={COLLAGE_IMAGES.bottomLeft.alt}
            fill
            quality={90}
            sizes="(min-width: 1024px) 22vw, 58vw"
            className={`${TILE_IMAGE_CLASS} object-center`}
          />
        </div>
      </div>

      <div className={`${TILE_BASE} absolute right-0 top-1/2 z-20 aspect-square w-[44%] -translate-x-6 -translate-y-1/2 rounded-full md:-translate-x-8`}>
        <Image
          src={COLLAGE_IMAGES.circleRight.src}
          alt={COLLAGE_IMAGES.circleRight.alt}
          fill
          quality={90}
          sizes="(min-width: 1024px) 20vw, 46vw"
          className={`${TILE_IMAGE_CLASS} object-center`}
        />
      </div>
    </div>
  );
}
