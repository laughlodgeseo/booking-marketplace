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
      className="relative overflow-hidden rounded-[20px] ring-1 ring-white/50 shadow-[0_18px_45px_rgba(120,90,45,0.16)]"
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
        className="object-cover brightness-[1.04] saturate-[1.06]"
        style={{ objectPosition: tile.objectPos ?? "center" }}
        sizes={sizesHint}
      />
      {/* Very light base gradient — only provides depth for chip readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/14 via-transparent to-transparent" />

      {/* Warm light location chip */}
      {tile.label ? (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/[0.68] px-2.5 py-[5px] shadow-sm backdrop-blur-md ring-1 ring-white/70">
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-amber-500/80" />
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
          Hero full-bleed + warm ivory gradient + 2 accent tiles
          ════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 block md:hidden">
        {/* Dubai Marina full-screen base — slightly brightened */}
        <Image
          src="/areas/dubai-marina.webp"
          alt=""
          fill
          priority
          className="object-cover object-center brightness-[1.04]"
          sizes="100vw"
        />

        {/* Warm ivory overlay — light and welcoming, not dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff8ed]/[0.72] via-[#fff8ed]/[0.20] to-[#fff8ed]/[0.58]" />

        {/* Two accent tiles — bottom strip, below the centered card */}
        <div className="absolute bottom-4 left-3 right-3 flex gap-2.5">
          {/* Downtown Dubai accent */}
          <div className="relative h-[68px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/55 shadow-[0_8px_24px_rgba(120,90,45,0.18)]">
            <Image
              src="/areas/downtown-dubai.webp"
              alt=""
              fill
              className="object-cover brightness-[1.04]"
              sizes="45vw"
            />
            <div className="absolute inset-0 bg-[#fff8ed]/[0.20]" />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-amber-500/85" />
              <span className="text-[9px] font-semibold text-slate-800 drop-shadow-sm">Downtown Dubai</span>
            </div>
          </div>

          {/* Palm Jumeirah accent */}
          <div className="relative h-[68px] flex-1 overflow-hidden rounded-2xl ring-1 ring-white/55 shadow-[0_8px_24px_rgba(120,90,45,0.18)]">
            <Image
              src="/areas/palm-jumeirah.webp"
              alt=""
              fill
              className="object-cover object-top brightness-[1.04]"
              sizes="45vw"
            />
            <div className="absolute inset-0 bg-[#fff8ed]/[0.20]" />
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-amber-500/85" />
              <span className="text-[9px] font-semibold text-slate-800 drop-shadow-sm">Palm Jumeirah</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          DESKTOP (≥ md / 768 px)
          Full 4×4 collage with warm sand/ivory gallery matting
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
            // Warm luxury gallery mat — sand/ivory/lavender, not dark navy
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
