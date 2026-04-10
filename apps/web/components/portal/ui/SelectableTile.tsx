import type { ReactNode } from "react";
import { Check } from "lucide-react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function SelectableTile(props: {
  label: ReactNode;
  hint?: ReactNode;
  meta?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        "group flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left",
        "outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-brand/16",
        "hover:-translate-y-0.5 active:translate-y-0",
        props.selected
          ? "bg-[linear-gradient(135deg,rgba(79,70,229,0.18),rgba(79,70,229,0.08))] text-primary shadow-[0_12px_28px_rgba(79,70,229,0.22)] ring-2 ring-brand/55"
          : "bg-surface/92 text-primary ring-1 ring-line/28 hover:bg-accent-soft/24 hover:ring-brand/24",
        props.disabled ? "cursor-not-allowed opacity-60 hover:translate-y-0" : "",
        props.className,
      )}
    >
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full",
          props.selected
            ? "bg-brand text-accent-text shadow-[0_6px_16px_rgba(79,70,229,0.28)]"
            : "bg-warm-alt text-transparent ring-1 ring-line/42 group-hover:text-brand/60",
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{props.label}</span>
        {props.hint ? <span className="mt-0.5 block truncate text-xs text-secondary">{props.hint}</span> : null}
      </span>

      <span className={cn("shrink-0 text-xs font-semibold", props.selected ? "text-brand" : "text-secondary")}>
        {props.meta ?? (props.selected ? "Selected" : "Select")}
      </span>
    </button>
  );
}
