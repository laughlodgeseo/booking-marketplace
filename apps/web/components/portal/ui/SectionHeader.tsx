import type { ReactNode } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function SectionHeader(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  count?: number;
  divider?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", props.className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-semibold text-primary sm:text-lg lg:text-sm">
              {props.title}
            </h2>
            {typeof props.count === "number" ? (
              <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-accent-soft/42 px-2.5 text-xs font-semibold text-brand">
                {props.count}
              </span>
            ) : null}
          </div>
          {props.subtitle ? (
            <p className="mt-1 text-sm leading-relaxed text-secondary sm:text-base lg:text-sm lg:leading-normal">
              {props.subtitle}
            </p>
          ) : null}
        </div>

        {props.right ? (
          <div className="flex min-w-0 w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
            {props.right}
          </div>
        ) : null}
      </div>

      {props.divider !== false ? <div className="portal-divider mt-4" /> : null}
    </div>
  );
}
