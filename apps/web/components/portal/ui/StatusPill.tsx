"use client";

import type React from "react";

type Tone = "neutral" | "success" | "warning" | "danger";

const TONES: Record<Tone, { bg: string; fg: string; ring: string }> = {
  neutral: {
    bg: "bg-accent-soft/22",
    fg: "text-brand",
    ring: "ring-1 ring-brand/20",
  },
  success: {
    bg: "bg-accent-soft/32",
    fg: "text-brand",
    ring: "ring-1 ring-brand/26",
  },
  warning: {
    bg: "bg-accent-soft/30",
    fg: "text-brand",
    ring: "ring-1 ring-brand/24",
  },
  danger: {
    bg: "bg-accent-soft/40",
    fg: "text-brand",
    ring: "ring-1 ring-brand/34",
  },
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function toneFromStatus(raw: string | null | undefined): Tone {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s) return "neutral";

  if (["SUCCEEDED", "SUCCESS", "PAID", "FINALIZED", "COMPLETED", "APPROVED", "PUBLISHED", "ACTIVE"].includes(s)) {
    return "success";
  }
  if (["FAILED", "FAIL", "CANCELLED", "CANCELED", "VOID", "REJECTED", "BLOCKED", "EXPIRED"].includes(s)) {
    return "danger";
  }
  if (["PENDING", "PROCESSING", "DRAFT", "REVIEW", "IN_REVIEW", "ON_HOLD", "HOLD", "UNDER_REVIEW"].includes(s)) {
    return "warning";
  }
  return "neutral";
}

export function StatusPill(props: {
  tone?: Tone;
  children?: React.ReactNode;
  status?: string;
  value?: string;
  className?: string;
}) {
  const statusText = props.status ?? props.value;
  const t = TONES[props.tone ?? toneFromStatus(statusText)] ?? TONES.neutral;
  const content = props.children ?? statusText ?? "—";

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs",
        t.bg,
        t.fg,
        t.ring,
        props.className
      )}
    >
      {content}
    </span>
  );
}
