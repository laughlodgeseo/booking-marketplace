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
// Desktop 4×4 tile map — 9 tiles covering all 16 cells
//
// ┌────────────────┬──────────┬──────────┐
// │                │          │   Palm   │
// │  Dubai Marina  │ Downtown │ Jumeirah │
// │   (2 col × 2)  │  (1×2)   ├──────────┤
// │                │          │   JBR    │
// ├────────┬───────────────────┬──────────┤
// │        │                   │  Dubai   │
// │  Biz   │  Interior Lounge  │  Creek   │
// │  Bay   │     (2 col × 1)   ├──────────┤
// │ (1×2)  ├───────────────────┤   DIFC   │
// │        │   Interior Suite  │          │
// └────────┴───────────────────┴──────────┘
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
// Tile renderer — each tile is a crisp printed destination card
// ---------------------------------------------------------------------------

function CollageTile({ tile, sizesHint }: { tile: Tile; sizesHint: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] ring-1 ring-white/60 shadow-[0_18px_45px_rgba(120,90,45,0.14)]"
      style={{
        gridColumn: `${tile.colStart} / span ${tile.colSpan}`,
        gridRow: `${tile.rowStart} / span ${tile.rowSpan}`,
      }}
    >
      {/* Image — sharp, warm, no blur */}
      <Image
        src={tile.src}
        alt=""
        fill
        priority={tile.priority}
        className="object-cover brightness-[1.03] saturate-[1.05] contrast-[1.03]"
        style={{ objectPosition: tile.objectPos ?? "center" }}
        sizes={sizesHint}
      />

      {/* Minimal bottom gradient — only exists for chip label readability */}
      {tile.label ? (
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/22 to-transparent" />
      ) : null}

      {/* Location chip — crisp, no heavy blur */}
      {tile.label ? (
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full border border-white/80 bg-white/78 px-2.5 py-[5px] shadow-sm">
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#b87333]" />
          <span className="text-[10px] font-semibold leading-none tracking-wide text-slate-800">
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
          Hero full-bleed — crisp, warm, no fog
          ════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 block md:hidden">
        {/* Dubai Marina crisp hero */}
        <Image
          src="/areas/dubai-marina.webp"
          alt=""
          fill
          priority
          className="object-cover object-center brightness-[1.03] saturate-[1.05] contrast-[1.03]"
          sizes="100vw"
        />

        {/* Warm gradient: only at top (header) and bottom (accent tiles) — center stays clear */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#fff8ed]/[0.55] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#fff8ed]/[0.60] to-transparent" />

        {/* Two accent tiles at bottom */}
        <div className="absolute bottom-4 left-3 right-3 flex gap-2.5">
          {/* Downtown Dubai */}
          <div className="relative h-[68px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/60 shadow-[0_8px_24px_rgba(120,90,45,0.16)]">
            <Image
              src="/areas/downtown-dubai.webp"
              alt=""
              fill
              className="object-cover brightness-[1.03] saturate-[1.04]"
              sizes="45vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/18 to-transparent" />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-[#b87333]" />
              <span className="text-[9px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Downtown Dubai</span>
            </div>
          </div>

          {/* Palm Jumeirah */}
          <div className="relative h-[68px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/60 shadow-[0_8px_24px_rgba(120,90,45,0.16)]">
            <Image
              src="/areas/palm-jumeirah.webp"
              alt=""
              fill
              className="object-cover object-top brightness-[1.03] saturate-[1.04]"
              sizes="45vw"
            />
            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/18 to-transparent" />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-[#b87333]" />
              <span className="text-[9px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">Palm Jumeirah</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          DESKTOP (≥ md / 768 px)
          Full 4×4 collage — warm gallery matting, crisp tiles
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
            // Warm luxury gallery mat — sand/lavender/ivory, crisp and premium
            background: "linear-gradient(145deg, #f7efe3 0%, #ece8ff 52%, #fff8ed 100%)",
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
