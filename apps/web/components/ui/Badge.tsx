import type { ReactNode } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-600",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-indigo-100 text-indigo-700",
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
