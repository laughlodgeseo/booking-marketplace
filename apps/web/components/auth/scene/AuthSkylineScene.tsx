"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

/**
 * AuthSkylineScene (Cinematic v6.2 — spacing + de-bulk)
 * Changes requested:
 * - Scene looks bulky -> add breathing room
 * - Move elements so some sit higher, some lower (more dynamic, less stacked)
 * - Keep center clear for form
 *
 * Strategy:
 * - Reduce plane presence slightly (more air above)
 * - Reposition side cards + props: stagger vertical placement
 * - Nudge big props outward to open center even more
 */
export function AuthSkylineScene() {
  const reduce = useReducedMotion() ?? false;
return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base atmosphere */}
      <div className="absolute inset-0 bg-warm-base" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(198,169,109,0.28),transparent_52%),radial-gradient(circle_at_80%_12%,rgba(198,169,109,0.22),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.65)_0%,rgba(246,243,236,1)_58%)]" />

      {/* Premium glows */}
      <div className="absolute -left-48 -top-56 h-[680px] w-[680px] rounded-full bg-brand/22 blur-[120px]" />
      <div className="absolute right-[-260px] top-[-220px] h-[760px] w-[760px] rounded-full bg-brand/18 blur-[130px]" />
      <div className="absolute left-[22%] bottom-[-420px] h-[940px] w-[940px] rounded-full bg-brand/14 blur-[160px]" />

      {/* Ink depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(11,34,48,0.14),transparent_55%),radial-gradient(circle_at_35%_80%,rgba(11,34,48,0.10),transparent_60%)]" />

      {/* Clouds */}
      <motion.div
        className="absolute left-[-18%] top-[4%] w-[136%]"
        animate={reduce ? undefined : { x: ["0%", "-10%", "0%"] }}
        transition={reduce ? undefined : { duration: 22, repeat: Infinity, ease: "easeInOut" }}
      >
        <Clouds opacity={0.88} />
      </motion.div>

      <motion.div
        className="absolute left-[-12%] top-[10%] w-[124%]"
        animate={reduce ? undefined : { x: ["0%", "10%", "0%"] }}
        transition={reduce ? undefined : { duration: 30, repeat: Infinity, ease: "easeInOut" }}
      >
        <Clouds opacity={0.58} />
      </motion.div>

      {/* Mist sweep (slightly higher so it doesn't crowd bottom) */}
      <motion.div
        className="absolute left-[-40%] top-[26%] h-[180px] w-[180%] opacity-65"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 24%, rgba(198,169,109,0.22) 52%, rgba(255,255,255,0.48) 76%, transparent 100%)",
          filter: "blur(18px)",
        }}
        animate={reduce ? undefined : { x: ["0%", "-10%", "0%"] }}
        transition={reduce ? undefined : { duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Map diorama plane (slightly lower + smaller height = more breathing room) */}
      <div className="absolute inset-x-0 bottom-[-10px]">
        <MapPlane reduce={reduce} />
      </div>

      {/* Premium light sweep */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          background:
            "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.70) 45%, transparent 70%)",
          mixBlendMode: "soft-light",
        }}
        animate={reduce ? undefined : { x: ["-95%", "120%"] }}
        transition={reduce ? undefined : { duration: 7.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
      />
    </div>
  );
}

/* ----------------------------- Clouds ----------------------------- */

function Clouds({ opacity }: { opacity: number }) {
  return (
    <svg viewBox="0 0 1200 160" className="h-auto w-full" preserveAspectRatio="none" aria-hidden="true">
      <g opacity={opacity}>
        <path
          d="M88,104c-30,0-55-19-55-45c0-22,16-40,41-45c10-26,38-45,72-45c34,0,63,18,74,44
             c27,6,49,25,49,47c0,26-25,44-55,44H88z"
          fill="rgba(255,255,255,0.94)"
        />
        <path
          d="M420,118c-34,0-63-20-63-48c0-22,18-41,46-47c12-30,44-50,81-50c37,0,68,20,81,49
             c30,6,55,26,55,48c0,28-29,48-63,48H420z"
          fill="rgba(255,255,255,0.90)"
        />
        <path
          d="M820,106c-30,0-55-18-55-43c0-20,16-38,41-43c10-25,38-43,72-43c34,0,63,17,74,42
             c27,5,50,24,50,44c0,25-25,43-55,43H820z"
          fill="rgba(255,255,255,0.92)"
        />
      </g>
    </svg>
  );
}

/* ----------------------------- Map Plane ----------------------------- */

function MapPlane({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative h-[350px] w-full">
      {/* Plane base */}
      <div className="absolute inset-x-0 bottom-0 h-[320px]">
        <svg viewBox="0 0 1200 350" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
          <path
            d="M0,350 L0,146 C160,88 340,66 600,80 C860,96 1040,72 1200,120 L1200,350 Z"
            fill="rgba(255,255,255,0.44)"
          />
          <path
            d="M0,350 L0,188 C170,136 360,116 600,130 C860,146 1040,124 1200,162 L1200,350 Z"
            fill="rgba(255,255,255,0.32)"
          />

          <g opacity="0.55">
            {Array.from({ length: 10 }).map((_, i) => {
              const y = 182 + i * 14;
              return (
                <path
                  key={`h-${i}`}
                  d={`M0 ${y} C220 ${y - 16} 420 ${y - 10} 600 ${y} C820 ${y + 16} 1020 ${y + 10} 1200 ${y - 8}`}
                  stroke="rgba(11,34,48,0.06)"
                  strokeWidth="1.2"
                  fill="none"
                />
              );
            })}
            {Array.from({ length: 9 }).map((_, i) => {
              const x = 90 + i * 120;
              return (
                <path
                  key={`v-${i}`}
                  d={`M${x} 166 C${x + 40} 206 ${x + 30} 256 ${x + 10} 350`}
                  stroke="rgba(11,34,48,0.06)"
                  strokeWidth="1.2"
                  fill="none"
                />
              );
            })}
          </g>

          <path
            d="M120 278 C280 236 420 228 600 242 C770 256 910 246 1080 224"
            stroke="rgba(198,169,109,0.24)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M140 276 C300 236 430 228 600 242 C780 258 920 246 1088 224"
            stroke="rgba(255,255,255,0.60)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="10 12"
            fill="none"
          />

          <path
            d="M210 212 C320 190 450 188 600 200 C770 214 880 210 980 194"
            stroke="rgba(198,169,109,0.16)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M224 212 C338 190 456 188 600 200 C780 216 892 210 990 194"
            stroke="rgba(255,255,255,0.52)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray="9 12"
            fill="none"
          />
        </svg>
      </div>

      {/* SIDE image cards — staggered (one higher, one lower) */}
      <motion.div
        className="pointer-events-none absolute left-[4%] top-[14%] hidden sm:block"
        animate={reduce ? undefined : { y: [0, -10, 0], rotate: [0, -1, 0] }}
        transition={reduce ? undefined : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <ImageTile
          label="Premium interiors"
          src="/images/auth/premium-interiors.webp"
        />
      </motion.div>

      <motion.div
        className="pointer-events-none absolute right-[4%] top-[26%] hidden sm:block"
        animate={reduce ? undefined : { y: [0, -12, 0], rotate: [0, 1, 0] }}
        transition={reduce ? undefined : { duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ImageTile
          label="Verified homes"
          src="/images/auth/verified-homes.webp"
        />
      </motion.div>

      {/* Floating property tiles — staggered up/down */}
      <div className="absolute inset-0">
        <motion.div
          className="pointer-events-none absolute left-[9%] top-[38%]"
          animate={reduce ? undefined : { y: [0, -10, 0], rotate: [0, -1, 0] }}
          transition={reduce ? undefined : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <PropertyTile kind="villa" />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute left-[78%] top-[40%]"
          animate={reduce ? undefined : { y: [0, -12, 0], rotate: [0, 1, 0] }}
          transition={reduce ? undefined : { duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <PropertyTile kind="tower" />
        </motion.div>

        {/* Billboard — lower-right so it doesn't crowd the top image */}
        <motion.div
          className="pointer-events-none absolute left-[80%] top-[60%] hidden sm:block"
          animate={reduce ? undefined : { y: [0, -8, 0], rotate: [0, 0.6, 0] }}
          transition={reduce ? undefined : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Billboard />
        </motion.div>

        {/* Pins — pull them away from center */}
        <motion.div
          className="pointer-events-none absolute left-[16%] top-[66%]"
          animate={reduce ? undefined : { y: [0, -12, 0] }}
          transition={reduce ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Pin />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute left-[76%] top-[66%]"
          animate={reduce ? undefined : { y: [0, -14, 0] }}
          transition={reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Pin />
        </motion.div>

        {/* Sparkles — separated */}
        <motion.div
          className="pointer-events-none absolute left-[12%] top-[58%]"
          animate={reduce ? undefined : { opacity: [0.15, 1, 0.15] }}
          transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkle />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute left-[88%] top-[54%]"
          animate={reduce ? undefined : { opacity: [0.15, 1, 0.15] }}
          transition={reduce ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkle />
        </motion.div>

        {/* Objects & characters — more spacing, more sides */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[18px] h-[260px]">
          {/* Sofa corner (LEFT, lower) */}
          <div className="absolute left-[3%] bottom-[44px] scale-[1.12]">
            <SofaCorner reduce={reduce} />
          </div>

          {/* Vendor (RIGHT, slightly higher than sofa) */}
          <div className="absolute left-[78%] bottom-[70px] -translate-x-1/2 scale-[1.12]">
            <VendorWithClipboard reduce={reduce} />
          </div>

          {/* Suitcase (mid-low pass) */}
          <motion.div
            className="absolute left-[-24%] bottom-[68px] scale-[1.02]"
            animate={reduce ? undefined : { x: ["0%", "155%"] }}
            transition={reduce ? undefined : { duration: 19.5, repeat: Infinity, ease: "linear" }}
          >
            <Suitcase reduce={reduce} />
          </motion.div>

          {/* SUV glide (upper pass) */}
          <motion.div
            className="absolute left-[122%] bottom-[132px] scale-[1.04]"
            animate={reduce ? undefined : { x: ["0%", "-178%"] }}
            transition={reduce ? undefined : { duration: 25, repeat: Infinity, ease: "linear" }}
          >
            <SUV reduce={reduce} />
          </motion.div>

          {/* Walkers — stagger vertical positions for “upper/lower” feel */}
          <motion.div
            className="absolute left-[-18%] bottom-[56px] scale-[1.06]"
            animate={reduce ? undefined : { x: ["0%", "158%"] }}
            transition={reduce ? undefined : { duration: 14.5, repeat: Infinity, ease: "linear" }}
          >
            <WalkerBig variant="cyan" reduce={reduce} />
          </motion.div>

          <motion.div
            className="absolute left-[118%] bottom-[86px] scale-[1.06]"
            animate={reduce ? undefined : { x: ["0%", "-162%"] }}
            transition={reduce ? undefined : { duration: 16.5, repeat: Infinity, ease: "linear" }}
          >
            <WalkerBig variant="ink" reduce={reduce} />
          </motion.div>

          <motion.div
            className="absolute left-[-18%] bottom-[112px]"
            style={{ transform: "scale(0.90)" }}
            animate={reduce ? undefined : { x: ["0%", "162%"] }}
            transition={reduce ? undefined : { duration: 19, repeat: Infinity, ease: "linear" }}
          >
            <WalkerBig variant="cyanSoft" reduce={reduce} />
          </motion.div>

          <motion.div
            className="absolute left-[118%] bottom-[120px]"
            style={{ transform: "scale(0.80)" }}
            animate={reduce ? undefined : { x: ["0%", "-172%"] }}
            transition={reduce ? undefined : { duration: 22.5, repeat: Infinity, ease: "linear" }}
          >
            <WalkerBig variant="inkSoft" reduce={reduce} />
          </motion.div>

          <motion.div
            className="absolute left-[-20%] bottom-[148px]"
            style={{ transform: "scale(0.74)" }}
            animate={reduce ? undefined : { x: ["0%", "178%"] }}
            transition={reduce ? undefined : { duration: 27, repeat: Infinity, ease: "linear" }}
          >
            <WalkerBig variant="cyanSoft" reduce={reduce} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Image Tile ----------------------------- */

function ImageTile(props: { src: string; label: string }) {
  return (
    <div className="relative h-[110px] w-[176px] overflow-hidden rounded-2xl bg-surface/75 ring-1 ring-line/90 shadow-[0_18px_55px_rgba(2,10,20,0.12)] backdrop-blur-md">
      <div className="absolute inset-0">
        <Image
          src={props.src}
          alt={props.label}
          width={736}
          height={472}
          className="h-full w-full object-cover"
          priority={false}
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10)_0%,rgba(198,169,109,0.14)_100%)]" />
      <div className="absolute inset-0 ring-1 ring-inverted/40" />

      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-[11px] font-semibold text-primary ring-1 ring-line/55">
        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
        {props.label}
      </div>
    </div>
  );
}

/* ----------------------------- Floating Tiles / Billboard ----------------------------- */

function PropertyTile({ kind }: { kind: "villa" | "tower" }) {
  const accent = "rgba(198,169,109,0.70)";
  const ink = "rgba(11,34,48,0.14)";
  const glass = "rgba(255,255,255,0.80)";

  return (
    <svg width="178" height="126" viewBox="0 0 170 120" aria-hidden="true" className="scale-[1.03]">
      <ellipse cx="84" cy="106" rx="64" ry="10" fill="rgba(2,10,20,0.10)" />
      <rect x="20" y="20" width="130" height="82" rx="18" fill={glass} stroke={ink} strokeWidth="1" />
      <rect x="20" y="20" width="130" height="82" rx="18" fill="rgba(255,255,255,0.35)" />

      <rect x="32" y="32" width="64" height="10" rx="5" fill="rgba(11,34,48,0.10)" />
      <rect x="32" y="50" width="88" height="8" rx="4" fill="rgba(11,34,48,0.08)" />
      <rect x="32" y="64" width="74" height="8" rx="4" fill="rgba(11,34,48,0.07)" />

      {kind === "villa" ? (
        <g transform="translate(112 48)">
          <rect x="0" y="16" width="32" height="24" rx="8" fill="rgba(11,34,48,0.12)" />
          <path d="M16 0L0 16h32L16 0z" fill={accent} />
          <rect x="12" y="26" width="8" height="14" rx="3" fill="rgba(255,255,255,0.65)" />
        </g>
      ) : (
        <g transform="translate(114 42)">
          <rect x="0" y="4" width="30" height="44" rx="10" fill="rgba(11,34,48,0.12)" />
          <rect x="6" y="12" width="6" height="6" rx="2" fill={accent} />
          <rect x="18" y="12" width="6" height="6" rx="2" fill="rgba(255,255,255,0.55)" />
          <rect x="6" y="24" width="6" height="6" rx="2" fill="rgba(255,255,255,0.55)" />
          <rect x="18" y="24" width="6" height="6" rx="2" fill={accent} />
          <rect x="12" y="36" width="6" height="10" rx="3" fill="rgba(255,255,255,0.55)" />
        </g>
      )}

      <circle cx="144" cy="30" r="7" fill="rgba(198,169,109,0.22)" />
      <circle cx="144" cy="30" r="3" fill="rgba(198,169,109,0.75)" />
    </svg>
  );
}

function Billboard() {
  return (
    <svg width="210" height="96" viewBox="0 0 210 96" aria-hidden="true">
      <ellipse cx="108" cy="84" rx="68" ry="9" fill="rgba(2,10,20,0.10)" />
      <rect x="24" y="14" width="162" height="56" rx="18" fill="rgba(255,255,255,0.86)" stroke="rgba(11,34,48,0.12)" />
      <rect x="40" y="28" width="72" height="10" rx="5" fill="rgba(11,34,48,0.10)" />
      <rect x="40" y="44" width="112" height="10" rx="5" fill="rgba(11,34,48,0.07)" />
      <circle cx="166" cy="42" r="14" fill="rgba(198,169,109,0.18)" />
      <path
        d="M166 56c4-5 6-7.6 6-11a6 6 0 10-12 0c0 3.4 2 6 6 11z"
        fill="rgba(198,169,109,0.92)"
      />
      <circle cx="166" cy="45" r="2.2" fill="rgba(255,255,255,0.90)" />
    </svg>
  );
}

/* ----------------------------- Pins / Sparkle ----------------------------- */

function Pin() {
  return (
    <svg width="28" height="28" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="13" cy="13" r="10" fill="rgba(198,169,109,0.20)" />
      <path
        d="M13 23c4-5 6-7.6 6-11a6 6 0 10-12 0c0 3.4 2 6 6 11z"
        fill="rgba(198,169,109,0.94)"
      />
      <circle cx="13" cy="12" r="2.2" fill="rgba(255,255,255,0.9)" />
    </svg>
  );
}

function Sparkle() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path
        d="M11 1l1.6 6.2L19 9l-6.4 1.8L11 17l-1.6-6.2L3 9l6.4-1.8L11 1z"
        fill="rgba(255,255,255,0.78)"
        stroke="rgba(198,169,109,0.40)"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/* ----------------------------- Characters / Objects ----------------------------- */

type WalkerVariant = "cyan" | "ink" | "cyanSoft" | "inkSoft";

function WalkerBig({ variant, reduce }: { variant: WalkerVariant; reduce: boolean }) {
  const body =
    variant === "cyan"
      ? "rgba(198,169,109,0.98)"
      : variant === "cyanSoft"
        ? "rgba(198,169,109,0.70)"
        : variant === "ink"
          ? "rgba(11,34,48,0.84)"
          : "rgba(11,34,48,0.58)";

  return (
    <div className="relative">
      <motion.div
        className="absolute -bottom-2 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-dark-1/20"
        style={{ filter: "blur(2px)" }}
        animate={reduce ? undefined : { scaleX: [1, 0.80, 1] }}
        transition={reduce ? undefined : { duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.svg
        width="90"
        height="90"
        viewBox="0 0 86 86"
        aria-hidden="true"
        animate={reduce ? undefined : { y: [0, -2, 0] }}
        transition={reduce ? undefined : { duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="43" cy="26" r="14" fill="rgba(255,255,255,0.95)" />
        <rect x="28" y="40" width="30" height="26" rx="13" fill={body} />
        <motion.g
          animate={reduce ? undefined : { rotate: [12, -12, 12] }}
          style={{ transformOrigin: "43px 66px" }}
          transition={reduce ? undefined : { duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="31" y="66" width="7" height="16" rx="3.5" fill="rgba(11,34,48,0.38)" />
          <rect x="48" y="66" width="7" height="16" rx="3.5" fill="rgba(11,34,48,0.38)" />
        </motion.g>
        <circle cx="56" cy="52" r="2.8" fill="rgba(255,255,255,0.70)" />
      </motion.svg>
    </div>
  );
}

function VendorWithClipboard({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative">
      <motion.div
        className="absolute -bottom-2 left-1/2 h-2 w-20 -translate-x-1/2 rounded-full bg-dark-1/25"
        style={{ filter: "blur(2px)" }}
        animate={reduce ? undefined : { scaleX: [1, 0.78, 1] }}
        transition={reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 112 112"
        aria-hidden="true"
        animate={reduce ? undefined : { y: [0, -3, 0] }}
        transition={reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.circle
          cx="56"
          cy="28"
          r="16"
          fill="rgba(255,255,255,0.96)"
          animate={reduce ? undefined : { rotate: [0, 2, 0, -2, 0] }}
          style={{ transformOrigin: "56px 28px" }}
          transition={reduce ? undefined : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <rect x="38" y="46" width="36" height="34" rx="14" fill="rgba(11,34,48,0.86)" />
        <path d="M56 50c4 4 5 6 0 10c-5-4-4-6 0-10z" fill="rgba(198,169,109,0.95)" />
        <rect x="54.6" y="60" width="2.8" height="16" rx="1.4" fill="rgba(198,169,109,0.90)" />

        <rect x="44" y="80" width="8" height="22" rx="4" fill="rgba(11,34,48,0.48)" />
        <rect x="60" y="80" width="8" height="22" rx="4" fill="rgba(11,34,48,0.48)" />

        <motion.g
          animate={reduce ? undefined : { rotate: [0, 6, 0, 4, 0] }}
          style={{ transformOrigin: "82px 64px" }}
          transition={reduce ? undefined : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="72" y="58" width="20" height="6" rx="3" fill="rgba(11,34,48,0.40)" />
          <rect
            x="78"
            y="62"
            width="24"
            height="28"
            rx="6"
            fill="rgba(255,255,255,0.88)"
            stroke="rgba(11,34,48,0.14)"
            strokeWidth="1"
          />
          <rect x="82" y="68" width="16" height="3" rx="1.5" fill="rgba(198,169,109,0.55)" />
          <rect x="82" y="75" width="16" height="3" rx="1.5" fill="rgba(11,34,48,0.12)" />
          <rect x="82" y="82" width="14" height="3" rx="1.5" fill="rgba(11,34,48,0.10)" />
        </motion.g>
      </motion.svg>
    </div>
  );
}

function SofaCorner({ reduce }: { reduce: boolean }) {
  return (
    <motion.svg
      width="164"
      height="106"
      viewBox="0 0 150 98"
      aria-hidden="true"
      animate={reduce ? undefined : { y: [0, -2, 0] }}
      transition={reduce ? undefined : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <rect x="18" y="46" width="112" height="34" rx="16" fill="rgba(255,255,255,0.80)" stroke="rgba(11,34,48,0.12)" strokeWidth="1" />
      <rect x="26" y="22" width="94" height="30" rx="14" fill="rgba(255,255,255,0.84)" stroke="rgba(11,34,48,0.10)" strokeWidth="1" />
      <rect x="10" y="36" width="24" height="42" rx="14" fill="rgba(255,255,255,0.80)" stroke="rgba(11,34,48,0.10)" strokeWidth="1" />
      <path d="M46 48v30" stroke="rgba(11,34,48,0.10)" strokeWidth="2" strokeLinecap="round" />
      <path d="M78 48v30" stroke="rgba(11,34,48,0.08)" strokeWidth="2" strokeLinecap="round" />
      <rect x="90" y="34" width="24" height="18" rx="8" fill="rgba(198,169,109,0.42)" />
      <ellipse cx="70" cy="86" rx="56" ry="8" fill="rgba(2,10,20,0.12)" />
    </motion.svg>
  );
}

function Suitcase({ reduce }: { reduce: boolean }) {
  return (
    <motion.svg
      width="82"
      height="82"
      viewBox="0 0 78 78"
      aria-hidden="true"
      animate={reduce ? undefined : { rotate: [0, 1.5, 0, -1.5, 0] }}
      style={{ transformOrigin: "39px 60px" }}
      transition={reduce ? undefined : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <circle cx="26" cy="70" r="4" fill="rgba(11,34,48,0.45)" />
      <circle cx="52" cy="70" r="4" fill="rgba(11,34,48,0.45)" />
      <path d="M30 18c0-6 18-6 18 0v10h-4V20c0-2-10-2-10 0v8h-4V18z" fill="rgba(11,34,48,0.22)" />
      <rect x="18" y="26" width="42" height="44" rx="10" fill="rgba(255,255,255,0.84)" stroke="rgba(11,34,48,0.14)" strokeWidth="1" />
      <rect x="18" y="44" width="42" height="6" rx="3" fill="rgba(198,169,109,0.55)" />
      <ellipse cx="39" cy="74" rx="22" ry="6" fill="rgba(2,10,20,0.10)" />
    </motion.svg>
  );
}

function SUV({ reduce }: { reduce: boolean }) {
  return (
    <motion.svg
      width="196"
      height="92"
      viewBox="0 0 180 86"
      aria-hidden="true"
      animate={reduce ? undefined : { y: [0, -1.5, 0] }}
      transition={reduce ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <ellipse cx="92" cy="74" rx="64" ry="10" fill="rgba(2,10,20,0.10)" />
      <path
        d="M22 52c8-18 22-26 46-26h46c16 0 28 6 38 18l10 8c4 3 6 6 6 10v6H22v-16z"
        fill="rgba(11,34,48,0.26)"
        stroke="rgba(11,34,48,0.14)"
        strokeWidth="1"
      />
      <path d="M54 32h56c12 0 20 4 28 12H46c4-8 10-12 8-12z" fill="rgba(255,255,255,0.34)" />
      <rect x="26" y="56" width="128" height="5" rx="2.5" fill="rgba(198,169,109,0.42)" />
      <circle cx="56" cy="68" r="10" fill="rgba(11,34,48,0.55)" />
      <circle cx="130" cy="68" r="10" fill="rgba(11,34,48,0.55)" />
      <circle cx="56" cy="68" r="4" fill="rgba(255,255,255,0.45)" />
      <circle cx="130" cy="68" r="4" fill="rgba(255,255,255,0.45)" />
    </motion.svg>
  );
}
