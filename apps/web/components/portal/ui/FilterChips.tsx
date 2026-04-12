import type { ReactNode } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export type FilterChipOption<T extends string> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

export function FilterChips<T extends string>(props: {
  options: Array<FilterChipOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", props.className)}>
      {props.options.map((option) => {
        const selected = option.value === props.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => props.onChange(option.value)}
            disabled={option.disabled}
            className={cn(
              "inline-flex h-11 min-w-0 max-w-full items-center rounded-full px-4 text-sm font-semibold",
              "outline-none transition focus-visible:ring-4 focus-visible:ring-brand/18",
              selected
                ? "bg-brand text-accent-text shadow-[0_12px_28px_rgba(79,70,229,0.28)]"
                : "bg-surface/90 text-primary ring-1 ring-line/28 hover:bg-accent-soft/24",
              option.disabled ? "opacity-60" : "",
            )}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
