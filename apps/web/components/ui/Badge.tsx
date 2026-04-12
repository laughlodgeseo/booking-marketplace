import type { ReactNode } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral:
    "bg-[linear-gradient(180deg,rgba(79,70,229,0.16),rgba(79,70,229,0.08))] text-brand ring-1 ring-brand/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  success:
    "bg-[linear-gradient(180deg,rgba(22,163,74,0.18),rgba(22,163,74,0.10))] text-success ring-1 ring-success/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.56)]",
  warning:
    "bg-[linear-gradient(180deg,rgba(245,158,11,0.22),rgba(245,158,11,0.12))] text-warning ring-1 ring-warning/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]",
  danger:
    "bg-[linear-gradient(180deg,rgba(220,38,38,0.20),rgba(220,38,38,0.10))] text-danger ring-1 ring-danger/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]",
  info:
    "bg-[linear-gradient(180deg,rgba(14,165,233,0.20),rgba(14,165,233,0.10))] text-info ring-1 ring-info/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.54)]",
};

export function Badge(props: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tone = props.tone ?? "neutral";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200 ease-in-out",
        TONE_CLASS[tone],
        props.className,
      )}
    >
      {props.children}
    </span>
  );
}
