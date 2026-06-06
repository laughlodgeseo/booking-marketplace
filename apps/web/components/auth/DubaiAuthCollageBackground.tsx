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

// ---------------------------------------------------------------------------
// Desktop 4×4 tile map — 9 tiles filling all 16 cells
//
// Layout:
// [Marina 2×2] [Downtown 1×2] [Palm 1×1]
// [Marina 2×2] [Downtown 1×2] [JBR  1×1]
// [BizBay 1×2] [Lounge  2×1 ] [Creek 1×1]
// [BizBay 1×2] [Suite   2×1 ] [DIFC  1×1]
// ---------------------------------------------------------------------------
const DESKTOP_TILES: Tile[] = [
  {
    src: "/areas/dubai-marina.webp",
    label: "Dubai Marina",
    colStart: 1, colSpan: 2, rowStart: 1, rowSpan: 2,
    priority: true,
    objectPos: "center 40%",
  },
  {
    src: "/areas/downtown-dubai.webp",
    label: "Downtown Dubai",
    colStart: 3, colSpan: 1, rowStart: 1, rowSpan: 2,
    priority: true,
    objectPos: "center 30%",
  },
  {
    src: "/areas/palm-jumeirah.webp",
    label: "Palm Jumeirah",
    colStart: 4, colSpan: 1, rowStart: 1, rowSpan: 1,
    priority: true,
    objectPos: "center 60%",
  },
  {
    src: "/areas/jbr.webp",
    label: "JBR",
    colStart: 4, colSpan: 1, rowStart: 2, rowSpan: 1,
    objectPos: "center",
  },
  {
    src: "/images/owners/hero-src/main_business_bay.webp",
    label: "Business Bay",
    colStart: 1, colSpan: 1, rowStart: 3, rowSpan: 2,
    objectPos: "center 35%",
  },
  {
    src: "/auth-scene/interior-lounge.webp",
    colStart: 2, colSpan: 2, rowStart: 3, rowSpan: 1,
    objectPos: "center 30%",
  },
  {
    src: "/images/home/interior-suite.webp",
    colStart: 2, colSpan: 2, rowStart: 4, rowSpan: 1,
    objectPos: "center top",
  },
  {
    src: "/areas/dubai-creek-harbour.webp",
    label: "Dubai Creek",
    colStart: 4, colSpan: 1, rowStart: 3, rowSpan: 1,
    objectPos: "center 50%",
  },
  {
    src: "/areas/difc.webp",
    label: "DIFC",
    colStart: 4, colSpan: 1, rowStart: 4, rowSpan: 1,
    objectPos: "center 40%",
  },
];

// ---------------------------------------------------------------------------
// Shared tile renderer
// ---------------------------------------------------------------------------

function CollageTile({ tile, sizesHint }: { tile: Tile; sizesHint: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] ring-1 ring-white/10 shadow-[0_10px_32px_rgba(2,6,23,0.28)]"
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
        sizes={sizesHint}
      />
      {/* Light depth gradient — preserves image detail at top, gentle fade at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      {/* Premium location chip */}
      {tile.label ? (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-950/50 px-2.5 py-[5px] backdrop-blur-md ring-1 ring-white/12">
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-amber-300/80" />
          <span className="text-[10px] font-semibold leading-none tracking-wide text-white/88">
            {tile.label}
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function DubaiAuthCollageBackground() {
  return (
    <>
      {/* ════════════════════════════════════════════════════════
          MOBILE (< md / 768 px)
          Hero full-bleed + two accent tiles at the bottom
          ════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 block md:hidden">
        {/* Dubai Marina full-screen base */}
        <Image
          src="/areas/dubai-marina.webp"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />

        {/* Multi-stop overlay: darker at extremes, lighter in middle for card */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/18 to-slate-950/60" />

        {/* Two accent tiles — bottom strip, clearly below the centered card */}
        <div className="absolute bottom-4 left-3 right-3 flex gap-2.5">
          {/* Downtown Dubai accent */}
          <div className="relative h-[68px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/18 shadow-[0_8px_28px_rgba(2,6,23,0.38)]">
            <Image
              src="/areas/downtown-dubai.webp"
              alt=""
              fill
              className="object-cover opacity-80"
              sizes="45vw"
            />
            <div className="absolute inset-0 bg-slate-950/18" />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-amber-300/80" />
              <span className="text-[9px] font-semibold text-white/78">Downtown Dubai</span>
            </div>
          </div>

          {/* Palm Jumeirah accent */}
          <div className="relative h-[68px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/18 shadow-[0_8px_28px_rgba(2,6,23,0.38)]">
            <Image
              src="/areas/palm-jumeirah.webp"
              alt=""
              fill
              className="object-cover object-top opacity-80"
              sizes="45vw"
            />
            <div className="absolute inset-0 bg-slate-950/18" />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-amber-300/80" />
              <span className="text-[9px] font-semibold text-white/78">Palm Jumeirah</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          DESKTOP (≥ md / 768 px)
          Full 4×4 collage grid with gutters + rounded tiles
          ════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 hidden md:block">
        <div
          className="h-full w-full"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(4, 1fr)",
            gap: "14px",
            padding: "14px",
            // Dark navy fills the gutters and outer frame between tiles
            backgroundColor: "rgba(6, 10, 26, 0.97)",
          }}
        >
          {DESKTOP_TILES.map((tile) => (
            <CollageTile
              key={tile.src}
              tile={tile}
              sizesHint={`(min-width: 768px) ${tile.colSpan * 25}vw, 100vw`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
