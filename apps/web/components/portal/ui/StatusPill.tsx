"use client";

import type React from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

type Tone = "neutral" | "success" | "warning" | "danger";

const TONES: Record<Tone, BadgeTone> = {
  neutral: "neutral",
  success: "success",
  warning: "warning",
  danger: "danger",
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function toneFromStatus(raw: string | null | undefined): Tone {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s) return "neutral";

  if (s.includes("DRAFT")) {
    return "neutral";
  }
  if (
    ["FAILED", "FAIL", "CANCELLED", "CANCELED", "VOID", "REJECTED", "BLOCKED", "EXPIRED"].some((token) =>
      s.includes(token),
    )
  ) {
    return "danger";
  }
  if (
    [
      "PENDING",
      "PROCESSING",
      "REVIEW",
      "IN_REVIEW",
      "ON_HOLD",
      "HOLD",
      "UNDER_REVIEW",
      "CHANGES_REQUESTED",
    ].some((token) => s.includes(token))
  ) {
    return "warning";
  }
  if (
    ["SUCCEEDED", "SUCCESS", "PAID", "FINALIZED", "COMPLETED", "APPROVED", "PUBLISHED", "ACTIVE"].some((token) =>
      s.includes(token),
    )
  ) {
    return "success";
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
  const t = TONES[props.tone ?? toneFromStatus(statusText)] ?? "neutral";
  const content = props.children ?? statusText ?? "—";

  return (
    <Badge
      tone={t}
      className={cn(
        "status-badge min-h-7 gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs",
        props.className,
      )}
    >
      {content}
    </Badge>
  );
}
