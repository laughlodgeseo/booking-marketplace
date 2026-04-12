import type { ReactNode } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type PortalCardTone = "default" | "muted" | "accent" | "indigo" | "success" | "warning" | "danger";

const TONES: Record<PortalCardTone, string> = {
  default: "bg-warm-base/94 lg:bg-surface/92",
  muted: "bg-warm-alt/86",
  accent: "bg-accent-soft/24",
  indigo: "bg-accent-soft/24",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
};

export function PortalCard(props: {
  children: ReactNode;
  className?: string;
  tone?: PortalCardTone;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  as?: "section" | "div" | "article" | "aside";
}) {
  const Component = props.as ?? "section";
  const padding =
    props.padding === "none"
      ? ""
      : props.padding === "sm"
        ? "p-4"
      : props.padding === "lg"
        ? "p-4 sm:p-5 lg:p-6"
      : "p-4 sm:p-5";

  return (
    <Component
      className={cn(
        "portal-card min-w-0 overflow-hidden rounded-3xl",
        TONES[props.tone ?? "default"],
        padding,
        props.interactive
          ? "transition-all duration-200 ease-in-out hover:-translate-y-1 hover:bg-accent-soft/26 hover:shadow-md"
          : "",
        props.className,
      )}
    >
      {props.children}
    </Component>
  );
}
