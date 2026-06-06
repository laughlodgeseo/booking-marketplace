"use client";

import type { ReactNode } from "react";

/**
 * Brand palette used in illustrations
 * indigo: primary brand, sand: warm accent, emerald: success, rose: alert
 */
const C = {
  indigo:    "#4f46e5",
  indigoMid: "#6366f1",
  indigoSoft:"#e0e7ff",
  sand:      "#b87333",
  sandSoft:  "#f3e5d0",
  emerald:   "#10b981",
  emeraldSoft:"#d1fae5",
  rose:      "#f43f5e",
  roseSoft:  "#ffe4e6",
  amber:     "#f59e0b",
  amberSoft: "#fef3c7",
  slate:     "#64748b",
  slateSoft: "#f1f5f9",
  white:     "#ffffff",
  ink:       "#1e1b4b",
} as const;

/* ── Shared SVG wrapper ─────────────────────────────────────────── */
function IllustrationSVG({ children, w = 120, h = 100, className = "" }: {
  children: ReactNode;
  w?: number;
  h?: number;
  className?: string;
}) {
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/* ── Property / Building illustration ─────────────────────────── */
export function PropertyIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      {/* Sky */}
      <rect width="120" height="100" rx="16" fill={C.indigoSoft} />
      {/* Sun */}
      <circle cx="95" cy="22" r="10" fill={C.amberSoft} />
      <circle cx="95" cy="22" r="7" fill={C.amber} opacity="0.7" />
      {/* Building base */}
      <rect x="18" y="52" width="84" height="38" rx="3" fill={C.white} />
      {/* Roof */}
      <polygon points="14,52 60,24 106,52" fill={C.indigo} />
      <polygon points="14,52 60,28 106,52" fill={C.indigoMid} opacity="0.5" />
      {/* Door */}
      <rect x="50" y="68" width="20" height="22" rx="2" fill={C.sandSoft} />
      <circle cx="67" cy="80" r="1.5" fill={C.sand} />
      {/* Windows */}
      <rect x="26" y="62" width="14" height="12" rx="2" fill={C.indigoSoft} />
      <rect x="80" y="62" width="14" height="12" rx="2" fill={C.indigoSoft} />
      {/* Ground */}
      <rect x="0" y="88" width="120" height="12" rx="0" fill={C.emeraldSoft} />
    </IllustrationSVG>
  );
}

/* ── Calendar illustration ──────────────────────────────────────── */
export function CalendarIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.indigoSoft} />
      {/* Calendar body */}
      <rect x="16" y="28" width="88" height="62" rx="6" fill={C.white} />
      {/* Header band */}
      <rect x="16" y="28" width="88" height="22" rx="6" fill={C.indigo} />
      <rect x="16" y="40" width="88" height="10" fill={C.indigo} />
      {/* Rings */}
      <rect x="38" y="22" width="6" height="14" rx="3" fill={C.indigoMid} />
      <rect x="76" y="22" width="6" height="14" rx="3" fill={C.indigoMid} />
      {/* Month label */}
      <rect x="42" y="34" width="36" height="5" rx="2.5" fill={C.white} opacity="0.7" />
      {/* Grid rows of days */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4, 5, 6].map((col) => {
          const x = 22 + col * 12;
          const y = 58 + row * 11;
          const isHighlight = row === 0 && col === 2;
          return (
            <rect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width="8"
              height="7"
              rx="2"
              fill={isHighlight ? C.sand : C.indigoSoft}
              opacity={isHighlight ? 1 : 0.8}
            />
          );
        }),
      )}
    </IllustrationSVG>
  );
}

/* ── Booking / check-in illustration ───────────────────────────── */
export function BookingIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.emeraldSoft} />
      {/* Checkmark circle */}
      <circle cx="60" cy="46" r="28" fill={C.emerald} opacity="0.15" />
      <circle cx="60" cy="46" r="20" fill={C.emerald} opacity="0.25" />
      <circle cx="60" cy="46" r="13" fill={C.emerald} />
      {/* Tick */}
      <polyline points="53,46 58,52 68,40" stroke={C.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Keys / luggage */}
      <rect x="20" y="72" width="30" height="16" rx="4" fill={C.white} />
      <rect x="70" y="72" width="30" height="16" rx="4" fill={C.white} />
      <rect x="33" y="68" width="4" height="8" rx="2" fill={C.emeraldSoft} />
      <rect x="83" y="68" width="4" height="8" rx="2" fill={C.emeraldSoft} />
    </IllustrationSVG>
  );
}

/* ── Documents illustration ─────────────────────────────────────── */
export function DocumentsIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.slateSoft} />
      {/* Back doc */}
      <rect x="34" y="22" width="54" height="66" rx="5" fill={C.indigoSoft} />
      {/* Front doc */}
      <rect x="28" y="16" width="54" height="66" rx="5" fill={C.white} />
      {/* Lines */}
      <rect x="38" y="32" width="34" height="4" rx="2" fill={C.indigoSoft} />
      <rect x="38" y="42" width="28" height="4" rx="2" fill={C.indigoSoft} />
      <rect x="38" y="52" width="22" height="4" rx="2" fill={C.indigoSoft} />
      <rect x="38" y="62" width="30" height="4" rx="2" fill={C.indigoSoft} />
      {/* Seal / stamp */}
      <circle cx="64" cy="74" r="9" fill={C.sandSoft} />
      <circle cx="64" cy="74" r="6" fill={C.sand} opacity="0.6" />
    </IllustrationSVG>
  );
}

/* ── Messages illustration ─────────────────────────────────────── */
export function MessagesIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.indigoSoft} />
      {/* Chat bubble 1 */}
      <rect x="16" y="22" width="68" height="30" rx="10" fill={C.indigo} />
      <polygon points="24,52 18,62 36,52" fill={C.indigo} />
      <rect x="24" y="31" width="40" height="5" rx="2.5" fill={C.white} opacity="0.7" />
      <rect x="24" y="40" width="28" height="5" rx="2.5" fill={C.white} opacity="0.5" />
      {/* Chat bubble 2 */}
      <rect x="36" y="58" width="68" height="24" rx="10" fill={C.white} />
      <polygon points="96,82 104,90 88,82" fill={C.white} />
      <rect x="44" y="65" width="36" height="4" rx="2" fill={C.indigoSoft} />
      <rect x="44" y="73" width="24" height="4" rx="2" fill={C.indigoSoft} />
    </IllustrationSVG>
  );
}

/* ── Refunds / wallet illustration ─────────────────────────────── */
export function RefundIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.amberSoft} />
      {/* Wallet */}
      <rect x="16" y="30" width="88" height="54" rx="8" fill={C.white} />
      <rect x="16" y="30" width="88" height="22" rx="8" fill={C.amber} opacity="0.3" />
      {/* Card inside */}
      <rect x="26" y="56" width="48" height="20" rx="4" fill={C.amberSoft} />
      <rect x="26" y="64" width="20" height="5" rx="2.5" fill={C.amber} opacity="0.6" />
      {/* Coins */}
      <circle cx="88" cy="66" r="10" fill={C.amber} opacity="0.5" />
      <circle cx="88" cy="66" r="6" fill={C.amber} />
      <text x="85" y="70" fontSize="8" fill={C.white} fontWeight="bold">$</text>
    </IllustrationSVG>
  );
}

/* ── Vendor / host illustration ─────────────────────────────────── */
export function HostIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.indigoSoft} />
      {/* Person silhouette */}
      <circle cx="60" cy="34" r="14" fill={C.indigo} opacity="0.3" />
      <circle cx="60" cy="34" r="10" fill={C.indigo} opacity="0.6" />
      {/* Body / house combo */}
      <path d="M36 78 Q36 58 60 52 Q84 58 84 78 Z" fill={C.indigo} opacity="0.25" />
      <path d="M40 78 Q40 62 60 56 Q80 62 80 78 Z" fill={C.indigo} opacity="0.5" />
      {/* Star / sparkle */}
      <circle cx="88" cy="22" r="7" fill={C.sandSoft} />
      <circle cx="88" cy="22" r="4" fill={C.sand} opacity="0.7" />
    </IllustrationSVG>
  );
}

/* ── Analytics / revenue illustration ──────────────────────────── */
export function AnalyticsIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.indigoSoft} />
      {/* Bars */}
      <rect x="18" y="62" width="14" height="24" rx="3" fill={C.indigo} opacity="0.5" />
      <rect x="38" y="48" width="14" height="38" rx="3" fill={C.indigo} opacity="0.7" />
      <rect x="58" y="36" width="14" height="50" rx="3" fill={C.indigo} />
      <rect x="78" y="52" width="14" height="34" rx="3" fill={C.sand} opacity="0.7" />
      <rect x="98" y="42" width="14" height="44" rx="3" fill={C.sand} />
      {/* Baseline */}
      <rect x="14" y="86" width="100" height="2" rx="1" fill={C.indigoMid} opacity="0.3" />
      {/* Trend arrow */}
      <polyline points="22,58 42,44 62,32 82,46" stroke={C.emerald} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="82" cy="46" r="3" fill={C.emerald} />
    </IllustrationSVG>
  );
}

/* ── Operations / maintenance illustration ──────────────────────── */
export function MaintenanceIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.slateSoft} />
      {/* Wrench */}
      <rect x="52" y="18" width="16" height="64" rx="8" fill={C.slate} opacity="0.2" transform="rotate(40 60 50)" />
      <circle cx="60" cy="30" r="12" fill={C.slate} opacity="0.25" />
      <circle cx="60" cy="30" r="7" fill={C.white} />
      <circle cx="60" cy="30" r="4" fill={C.slate} opacity="0.4" />
      {/* Settings gear */}
      <circle cx="82" cy="68" r="12" fill={C.indigoSoft} />
      <circle cx="82" cy="68" r="7" fill={C.indigo} opacity="0.5" />
      <circle cx="82" cy="68" r="3" fill={C.white} />
    </IllustrationSVG>
  );
}

/* ── Review queue illustration ─────────────────────────────────── */
export function ReviewQueueIllustration({ className }: { className?: string }) {
  return (
    <IllustrationSVG w={120} h={100} className={className}>
      <rect width="120" height="100" rx="16" fill={C.amberSoft} />
      {/* Clipboard */}
      <rect x="26" y="20" width="68" height="70" rx="6" fill={C.white} />
      <rect x="44" y="14" width="32" height="12" rx="4" fill={C.amber} opacity="0.4" />
      <rect x="50" y="14" width="20" height="12" rx="4" fill={C.amber} opacity="0.7" />
      {/* Check items */}
      <circle cx="40" cy="40" r="5" fill={C.emeraldSoft} />
      <polyline points="37,40 39,43 44,37" stroke={C.emerald} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="50" y="37" width="32" height="4" rx="2" fill={C.indigoSoft} />

      <circle cx="40" cy="55" r="5" fill={C.emeraldSoft} />
      <polyline points="37,55 39,58 44,52" stroke={C.emerald} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="50" y="52" width="26" height="4" rx="2" fill={C.indigoSoft} />

      <circle cx="40" cy="70" r="5" fill={C.amberSoft} />
      <rect x="37" y="68" width="6" height="6" rx="1" fill={C.amber} opacity="0.5" />
      <rect x="50" y="67" width="34" height="4" rx="2" fill={C.indigoSoft} />
    </IllustrationSVG>
  );
}

/* ── Empty state wrapper ────────────────────────────────────────── */
export function EmptyIllustrationPanel(props: {
  illustration: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 bg-surface/60 px-6 py-10 text-center">
      <div className="flex items-center justify-center rounded-2xl">{props.illustration}</div>
      <div className="mt-4 text-sm font-semibold text-primary">{props.title}</div>
      {props.description ? (
        <div className="mt-1.5 max-w-xs text-xs leading-relaxed text-secondary">{props.description}</div>
      ) : null}
      {props.action ? <div className="mt-5">{props.action}</div> : null}
    </div>
  );
}
