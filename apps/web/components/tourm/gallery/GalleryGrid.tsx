"use client";

import { OptimizedImage } from "@/components/ui/OptimizedImage";
import Link from "next/link";
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Building2,
  Grid2x2,
  Sofa,
  Trees,
  UtensilsCrossed,
  WavesLadder,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  GALLERY_CATEGORY_LABEL,
  GALLERY_CATEGORY_ORDER,
  GALLERY_ITEMS,
  type GalleryCategory,
  type GalleryImage,
  type GalleryItem,
} from "@/lib/content/gallery-items";

type FilterValue = "ALL" | GalleryCategory;
type TileShape = "rounded" | "roundedSoft" | "pill" | "circle";
type CollageVariantKey = "A" | "B" | "C";

type SectionTile = {
  id: string;
  item: GalleryItem;
  image: GalleryImage;
};

type VariantSlot = {
  desktopPlacement: string;
  mobilePlacement: string;
  shape: TileShape;
  sizes: string;
  isHero?: boolean;
};

const SECTION_LINES: Record<GalleryCategory, string> = {
  LIVING_ROOM: "Composed lounges shaped for easy hosting, comfort, and natural light.",
  BEDROOM: "Rest-first suites tuned for recovery, deep sleep, and calm rhythm.",
  KITCHEN_DINING: "Chef-ready kitchens and dining nooks built for real routines.",
  BATHROOM: "Spa-inspired bathrooms with premium fixtures and clean-lined materials.",
  BALCONY_VIEW: "Private outdoor pockets that turn city views into a daily ritual.",
  POOL_AMENITIES: "Resort-style amenity scenes with polished poolside experiences.",
  NEIGHBORHOOD: "Street-level context around our stays, from cafes to promenades.",
};

const MAX_TILES_PER_SECTION = 8;
const COLLAGE_SLOT_COUNT = 8;

const MOBILE_SLOT_LAYOUT: Array<{ mobilePlacement: string; sizes: string }> = [
  {
    mobilePlacement: "col-span-2 aspect-[16/10] lg:aspect-auto lg:h-full",
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw",
  },
  {
    mobilePlacement: "col-span-1 aspect-[4/3] lg:aspect-auto lg:h-full",
    sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw",
  },
  {
    mobilePlacement: "col-span-1 aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto lg:h-full",
    sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw",
  },
  {
    mobilePlacement:
      "col-span-2 mx-auto w-full max-w-[320px] aspect-square lg:mx-0 lg:w-full lg:max-w-none lg:aspect-square",
    sizes: "(max-width: 640px) 320px, (max-width: 1024px) 33vw, 24vw",
  },
  {
    mobilePlacement: "col-span-1 aspect-[4/3] lg:aspect-auto lg:h-full",
    sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw",
  },
  {
    mobilePlacement: "col-span-1 aspect-[4/3] lg:aspect-auto lg:h-full",
    sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw",
  },
  {
    mobilePlacement: "col-span-2 aspect-[21/9] lg:aspect-auto lg:h-full",
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 36vw",
  },
  {
    mobilePlacement: "hidden lg:block lg:h-full",
    sizes: "(max-width: 1024px) 33vw, 20vw",
  },
];

function makeSlot(
  slotIndex: number,
  desktopPlacement: string,
  shape: TileShape,
  options?: { isHero?: boolean },
): VariantSlot {
  const mobile = MOBILE_SLOT_LAYOUT[slotIndex] ?? MOBILE_SLOT_LAYOUT[1];
  return {
    desktopPlacement,
    mobilePlacement: mobile.mobilePlacement,
    shape,
    sizes: mobile.sizes,
    ...(options?.isHero ? { isHero: true } : {}),
  };
}

const COLLAGE_VARIANTS: Record<CollageVariantKey, VariantSlot[]> = {
  A: [
    makeSlot(0, "lg:col-start-1 lg:col-end-5 lg:row-start-1 lg:row-end-2", "roundedSoft", {
      isHero: true,
    }),
    makeSlot(1, "lg:col-start-9 lg:col-end-13 lg:row-start-1 lg:row-end-2", "rounded"),
    makeSlot(2, "lg:col-start-1 lg:col-end-5 lg:row-start-2 lg:row-end-3", "rounded"),
    makeSlot(3, "lg:col-start-5 lg:col-end-9 lg:row-start-1 lg:row-end-3", "circle"),
    makeSlot(4, "lg:col-start-9 lg:col-end-13 lg:row-start-2 lg:row-end-3", "rounded"),
    makeSlot(5, "lg:col-start-1 lg:col-end-5 lg:row-start-3 lg:row-end-4", "rounded"),
    makeSlot(6, "lg:col-start-5 lg:col-end-9 lg:row-start-4 lg:row-end-5", "pill"),
    makeSlot(7, "lg:col-start-9 lg:col-end-13 lg:row-start-3 lg:row-end-4", "roundedSoft"),
  ],
  B: [
    makeSlot(0, "lg:col-start-1 lg:col-end-5 lg:row-start-1 lg:row-end-2", "pill", { isHero: true }),
    makeSlot(1, "lg:col-start-9 lg:col-end-13 lg:row-start-1 lg:row-end-2", "roundedSoft"),
    makeSlot(2, "lg:col-start-1 lg:col-end-5 lg:row-start-2 lg:row-end-4", "rounded"),
    makeSlot(3, "lg:col-start-5 lg:col-end-9 lg:row-start-1 lg:row-end-3", "circle"),
    makeSlot(4, "lg:col-start-9 lg:col-end-13 lg:row-start-2 lg:row-end-3", "pill"),
    makeSlot(5, "lg:col-start-9 lg:col-end-13 lg:row-start-3 lg:row-end-4", "rounded"),
    makeSlot(6, "lg:col-start-5 lg:col-end-13 lg:row-start-4 lg:row-end-5", "pill"),
    makeSlot(7, "lg:col-start-1 lg:col-end-5 lg:row-start-4 lg:row-end-5", "roundedSoft"),
  ],
  C: [
    makeSlot(0, "lg:col-start-1 lg:col-end-5 lg:row-start-1 lg:row-end-2", "roundedSoft", {
      isHero: true,
    }),
    makeSlot(1, "lg:col-start-9 lg:col-end-13 lg:row-start-1 lg:row-end-3", "rounded"),
    makeSlot(2, "lg:col-start-1 lg:col-end-5 lg:row-start-2 lg:row-end-3", "pill"),
    makeSlot(3, "lg:col-start-5 lg:col-end-9 lg:row-start-1 lg:row-end-3", "circle"),
    makeSlot(4, "lg:col-start-9 lg:col-end-13 lg:row-start-3 lg:row-end-4", "roundedSoft"),
    makeSlot(5, "lg:col-start-1 lg:col-end-5 lg:row-start-3 lg:row-end-4", "rounded"),
    makeSlot(6, "lg:col-start-5 lg:col-end-9 lg:row-start-4 lg:row-end-5", "pill"),
    makeSlot(7, "lg:col-start-9 lg:col-end-13 lg:row-start-4 lg:row-end-5", "rounded"),
  ],
};

const CATEGORY_COLLAGE_VARIANT: Record<GalleryCategory, CollageVariantKey> = {
  LIVING_ROOM: "A",
  BEDROOM: "B",
  KITCHEN_DINING: "C",
  BATHROOM: "A",
  BALCONY_VIEW: "C",
  POOL_AMENITIES: "B",
  NEIGHBORHOOD: "A",
};

const FILTER_ICON: Record<FilterValue, LucideIcon> = {
  ALL: Grid2x2,
  LIVING_ROOM: Sofa,
  BEDROOM: BedDouble,
  KITCHEN_DINING: UtensilsCrossed,
  BATHROOM: Bath,
  BALCONY_VIEW: Building2,
  POOL_AMENITIES: WavesLadder,
  NEIGHBORHOOD: Trees,
};

function parseFilter(raw: string | null): FilterValue {
  if (!raw) return "ALL";
  const normalized = raw.trim().toUpperCase();
  if (GALLERY_CATEGORY_ORDER.includes(normalized as GalleryCategory)) {
    return normalized as GalleryCategory;
  }
  return "ALL";
}

function shapeClass(shape: TileShape): string {
  if (shape === "circle") return "rounded-full";
  if (shape === "pill") return "rounded-[999px]";
  if (shape === "roundedSoft") return "rounded-[2.2rem]";
  return "rounded-[1.75rem]";
}

function shadowClass(shape: TileShape): string {
  if (shape === "circle") return "shadow-[0_26px_80px_rgba(11,15,25,0.16)]";
  return "shadow-[0_18px_50px_rgba(11,15,25,0.12)]";
}

function buildSectionTiles(items: GalleryItem[], limit: number, targetCount: number): SectionTile[] {
  const initialTiles = items.flatMap((item) =>
    item.gallery.map((image, index) => ({
      id: `${item.id}-${image.id}-${index}`,
      item,
      image,
    })),
  );

  if (!initialTiles.length) return [];
  const capped = initialTiles.slice(0, limit);
  if (capped.length >= targetCount) return capped.slice(0, targetCount);

  const tiles: SectionTile[] = [...capped];
  let cursor = 0;

  while (tiles.length < targetCount) {
    const source = capped[cursor % capped.length];
    tiles.push({
      ...source,
      id: `${source.id}-echo-${cursor}`,
    });
    cursor += 1;
  }

  return tiles.slice(0, targetCount);
}

function GallerySection(props: {
  category: GalleryCategory;
  items: GalleryItem[];
  limit: number;
  showViewMore: boolean;
  priorityHero: boolean;
  variantKey: CollageVariantKey;
  onViewMore: (category: GalleryCategory) => void;
}) {
  const variant = COLLAGE_VARIANTS[props.variantKey];
  const tiles = useMemo(
    () => buildSectionTiles(props.items, props.limit, COLLAGE_SLOT_COUNT),
    [props.items, props.limit],
  );
  if (!tiles.length) return null;

  return (
    <section className="mt-14 first:mt-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-primary sm:text-2xl">
            {GALLERY_CATEGORY_LABEL[props.category]}
          </h3>
          <p className="mt-1 text-sm text-secondary/76">{SECTION_LINES[props.category]}</p>
        </div>

        {props.showViewMore ? (
          <button
            type="button"
            onClick={() => props.onViewMore(props.category)}
            className="hidden rounded-full border border-white/80 bg-surface/88 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.17em] text-secondary/80 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-white sm:inline-flex"
          >
            View more
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-12 lg:grid-rows-4 lg:auto-rows-[minmax(0,170px)] lg:[grid-template-rows:repeat(4,minmax(0,170px))] lg:gap-5">
        {tiles.map((tile, index) => {
          const layout = variant[index] ?? variant[1];

          return (
            <Link
              key={tile.id}
              href={`/gallery/${tile.item.slug}`}
              className={["group relative block transition duration-300 hover:-translate-y-0.5", layout.desktopPlacement].join(" ")}
              aria-label={`Open gallery for ${tile.item.title}`}
            >
              <div
                className={[
                  "relative overflow-hidden border border-white/75 bg-surface",
                  shadowClass(layout.shape),
                  shapeClass(layout.shape),
                  layout.mobilePlacement,
                ].join(" ")}
              >
                <OptimizedImage
                  src={tile.image.src}
                  alt={tile.image.alt}
                  fill
                  sizes={layout.sizes}
                  priority={props.priorityHero && layout.isHero === true}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03] group-hover:brightness-105"
                />

                <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/82 bg-surface/90 text-primary shadow-[0_8px_18px_rgba(15,23,42,0.12)] opacity-0 transition duration-300 group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function GalleryGrid() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilter = parseFilter(searchParams.get("c"));

  const itemsByCategory = useMemo(() => {
    const grouped: Record<GalleryCategory, GalleryItem[]> = {
      LIVING_ROOM: [],
      BEDROOM: [],
      KITCHEN_DINING: [],
      BATHROOM: [],
      BALCONY_VIEW: [],
      POOL_AMENITIES: [],
      NEIGHBORHOOD: [],
    };

    for (const item of GALLERY_ITEMS) {
      grouped[item.category].push(item);
    }

    return grouped;
  }, []);

  const visibleCategories =
    activeFilter === "ALL" ? GALLERY_CATEGORY_ORDER : GALLERY_CATEGORY_ORDER.filter((c) => c === activeFilter);
  const sectionLimit = activeFilter === "ALL" ? MAX_TILES_PER_SECTION : MAX_TILES_PER_SECTION + 2;

  const chips: Array<{ id: FilterValue; label: string; Icon: LucideIcon }> = [
    { id: "ALL", label: "All spaces", Icon: FILTER_ICON.ALL },
    ...GALLERY_CATEGORY_ORDER.map((category) => ({
      id: category,
      label: GALLERY_CATEGORY_LABEL[category],
      Icon: FILTER_ICON[category],
    })),
  ];

  const setFilter = (nextFilter: FilterValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFilter === "ALL") {
      params.delete("c");
    } else {
      params.set("c", nextFilter);
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  };

  return (
    <section className="relative w-full py-8 sm:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/75 bg-surface/88 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/74 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
            <span className="inline-block h-2 w-2 rounded-full bg-brand" />
            Gallery
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            Editorial moments across every stay
          </h2>
          <p className="mt-2 text-sm text-secondary/76 sm:text-base">
            Filter by room type and explore polished visuals that map directly to real inventory in
            each neighborhood.
          </p>
        </div>

        <div className="sticky top-20 z-20 mt-8">
          <div className="relative overflow-hidden rounded-[1.65rem] border border-white/80 bg-white/82 p-3 shadow-[0_20px_46px_rgba(15,23,42,0.09)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
            <div className="pointer-events-none absolute -left-12 -top-14 h-44 w-44 rounded-full bg-brand/8 blur-3xl" />
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-secondary/66">
              Browse by space
            </p>
            <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
              {chips.map((chip) => {
                const active = activeFilter === chip.id;
                const Icon = chip.Icon;

                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilter(chip.id)}
                    aria-pressed={active}
                    aria-label={`Filter gallery by ${chip.label}`}
                    className={[
                      "group inline-flex h-11 shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-xl border px-4 text-sm font-semibold tracking-tight transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                      active
                        ? "border-brand/45 bg-brand text-accent-text shadow-[0_12px_28px_rgba(79,70,229,0.30)]"
                        : "border-white/85 bg-white/88 text-primary hover:border-brand/24 hover:bg-brand-soft/28 hover:text-primary",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-6 w-6 place-items-center rounded-lg transition",
                        active ? "bg-white/20 text-accent-text" : "bg-brand-soft/55 text-brand",
                      ].join(" ")}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {visibleCategories.map((category, index) => (
          <GallerySection
            key={category}
            category={category}
            items={itemsByCategory[category]}
            limit={sectionLimit}
            showViewMore={activeFilter === "ALL"}
            priorityHero={index === 0}
            variantKey={CATEGORY_COLLAGE_VARIANT[category]}
            onViewMore={(nextCategory) => setFilter(nextCategory)}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-28 top-1/3 h-72 w-72 rounded-full bg-brand-soft/75 blur-3xl" />
        <div className="absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-accent-soft/65 blur-3xl" />
      </div>
    </section>
  );
}
