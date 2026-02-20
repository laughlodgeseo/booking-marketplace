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
        "outline-none transition duration-200 focus-visible:ring-4 focus-visible:ring-brand/16",
        props.selected
          ? "bg-accent-soft/30 text-primary shadow-[0_10px_24px_rgba(79,70,229,0.18)] ring-2 ring-brand/50"
          : "bg-surface/88 text-primary ring-1 ring-line/22 hover:bg-accent-soft/20",
        props.disabled ? "opacity-60" : "",
        props.className,
      )}
    >
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full",
          props.selected
            ? "bg-brand text-accent-text shadow-[0_6px_16px_rgba(79,70,229,0.28)]"
            : "bg-warm-alt text-transparent ring-1 ring-line/40 group-hover:text-brand/55",
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{props.label}</span>
        {props.hint ? <span className="mt-0.5 block truncate text-xs text-secondary">{props.hint}</span> : null}
      </span>

      <span className="shrink-0 text-xs font-semibold text-brand">
        {props.meta ?? (props.selected ? "Selected" : "Select")}
      </span>
    </button>
  );
}
