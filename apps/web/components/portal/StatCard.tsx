import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: ReactNode;

  /** Optional short helper / description */
  helper?: string;

  /** Optional icon (top-left visual anchor) */
  icon?: ReactNode;

  /** Optional trend indicator */
  trend?: {
    direction: "up" | "down";
    label: string;
  };

  /** Visual hierarchy variant for executive dashboards */
  variant?: "standard" | "tinted" | "dark";
}

export function StatCard(props: StatCardProps) {
  const variant = props.variant ?? "tinted";
  const shellClass =
    variant === "dark"
      ? "premium-card premium-card-dark"
      : variant === "tinted"
        ? "premium-card premium-card-tinted premium-card-hover card-accent-left"
        : "premium-card premium-card-hover card-accent-left";

  return (
    <div className={`${shellClass} group relative min-w-0 overflow-hidden rounded-3xl p-4 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-md sm:p-5 lg:p-6`}>
      {/* subtle decorative gradient */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-accent-soft/80 blur-3xl" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-muted">
              {props.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-primary sm:text-3xl">
              {props.value}
            </div>
          </div>

          {props.icon ? (
            <div
              className={[
                "flex h-10 w-10 items-center justify-center rounded-2xl",
                variant === "dark"
                  ? "border border-inverted/24 bg-dark-1/35 text-brand"
                  : "card-icon-plate",
              ].join(" ")}
            >
              {props.icon}
            </div>
          ) : null}
        </div>

        {props.trend || props.helper ? (
          <div className="mt-4 flex items-center justify-between gap-2">
            {props.trend ? (
              <div
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  props.trend.direction === "up"
                    ? "bg-success/12 text-success"
                    : "bg-danger/12 text-danger",
                ].join(" ")}
              >
                {props.trend.direction === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {props.trend.label}
              </div>
            ) : (
              <span />
            )}

            {props.helper ? (
              <div className="text-xs text-muted">{props.helper}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
