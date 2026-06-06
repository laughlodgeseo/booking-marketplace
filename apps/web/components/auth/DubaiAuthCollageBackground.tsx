"use client";

import Image from "next/image";

interface Tile {
  src: string;
  label?: string;
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
  priority?: boolean;
  objectPos?: string;
}

const TILES: Tile[] = [
  // Large anchor — Dubai Marina (2 cols × 2 rows, top-left)
  {
    src: "/areas/dubai-marina.webp",
    label: "Dubai Marina",
    colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2,
    priority: true,
    objectPos: "center 40%",
  },
  // Tall — Downtown Dubai (1 col × 2 rows, top-center-right)
  {
    src: "/areas/downtown-dubai.webp",
    label: "Downtown Dubai",
    colStart: 3, colSpan: 1, rowStart: 1, rowSpan: 2,
    priority: true,
    objectPos: "center 30%",
  },
  // Small — Palm Jumeirah (1×1, top-right)
  {
    src: "/areas/palm-jumeirah.webp",
    label: "Palm Jumeirah",
    colStart: 4, colSpan: 1, rowStart: 1, rowSpan: 1,
    priority: true,
    objectPos: "center 60%",
  },
  // Small — JBR (1×1, mid-right)
  {
    src: "/areas/jbr.webp",
    label: "JBR",
    colStart: 4, colSpan: 1, rowStart: 2, rowSpan: 1,
    objectPos: "center",
  },
  // Tall — Business Bay (1 col × 2 rows, bottom-left)
  {
    src: "/images/owners/hero-src/main_business_bay.webp",
    label: "Business Bay",
    colStart: 1, colSpan: 1, rowStart: 3, rowSpan: 2,
    objectPos: "center 35%",
  },
  // Wide — Interior Lounge (2 cols × 1 row, center-bottom)
  {
    src: "/auth-scene/interior-lounge.webp",
    colStart: 2, colSpan: 2, rowStart: 3, rowSpan: 1,
    objectPos: "center 30%",
  },
  // Wide — Interior Suite (2 cols × 1 row, bottom-center)
  {
    src: "/images/home/interior-suite.webp",
    colStart: 2, colSpan: 2, rowStart: 4, rowSpan: 1,
    objectPos: "center top",
  },
  // Small — Dubai Creek (1×1, bottom-right-upper)
  {
    src: "/areas/dubai-creek-harbour.webp",
    label: "Dubai Creek",
    colStart: 4, colSpan: 1, rowStart: 3, rowSpan: 1,
    objectPos: "center 50%",
  },
  // Small — DIFC (1×1, bottom-right)
  {
    src: "/areas/difc.webp",
    label: "DIFC",
    colStart: 4, colSpan: 1, rowStart: 4, rowSpan: 1,
    objectPos: "center 40%",
  },
];

function CollageTile({ tile }: { tile: Tile }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        gridColumn: `${tile.colStart} / span ${tile.colSpan}`,
        gridRow: `${tile.rowStart} / span ${tile.rowSpan}`,
      }}
    >
      <Image
        src={tile.src}
        alt=""
        fill
        priority={tile.priority}
        className="object-cover"
        style={{ objectPosition: tile.objectPos ?? "center" }}
        sizes={`(min-width: 1024px) ${tile.colSpan * 25}vw, 100vw`}
      />
      {/* Per-tile depth gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-black/10" />
      {/* Location chip */}
      {tile.label ? (
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-[5px] backdrop-blur-sm ring-1 ring-white/15">
          <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          <span className="text-[10px] font-semibold leading-none tracking-wide text-white/90">
            {tile.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function DubaiAuthCollageBackground() {
  return (
    <>
      {/* ── Mobile: single hero image (hidden on lg+) ── */}
      <div className="absolute inset-0 lg:hidden">
        <Image
          src="/areas/dubai-marina.webp"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Warm gradient overlay for mobile — heavier at bottom for card readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/30 to-slate-950/60" />
      </div>

      {/* ── Desktop: full 4×4 collage grid (shown on lg+) ── */}
      <div className="absolute inset-0 hidden lg:block">
        <div
          className="h-full w-full"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: "3px",
          }}
        >
          {TILES.map((tile) => (
            <CollageTile key={tile.src} tile={tile} />
          ))}
        </div>
      </div>
    </>
  );
}
