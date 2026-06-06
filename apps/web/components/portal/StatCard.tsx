import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  trend?: {
    direction: "up" | "down";
    label: string;
  };
  /** Visual hierarchy variant */
  variant?: "standard" | "tinted" | "dark";
  /** Compact mode for dense dashboards */
  compact?: boolean;
  /** Role accent for icon plate — overrides default brand */
  roleAccent?: "customer" | "vendor" | "admin" | "brand";
}

const ROLE_ICON_PLATE: Record<string, string> = {
  customer: "bg-indigo-50 text-indigo-600",
  vendor: "bg-violet-50 text-violet-600",
  admin: "bg-slate-100 text-slate-600",
  brand: "card-icon-plate",
};

export function StatCard(props: StatCardProps) {
  const variant = props.variant ?? "tinted";
  const compact = props.compact ?? false;

  const shellClass =
    variant === "dark"
      ? "premium-card premium-card-dark"
      : variant === "tinted"
        ? "premium-card premium-card-tinted premium-card-hover card-accent-left"
        : "premium-card premium-card-hover card-accent-left";

  const iconPlateClass =
    variant === "dark"
      ? "border border-inverted/24 bg-dark-1/35 text-brand"
      : props.roleAccent && props.roleAccent !== "brand"
        ? ROLE_ICON_PLATE[props.roleAccent]
        : "card-icon-plate";

  const pad = compact ? "p-3.5 sm:p-4" : "p-4 sm:p-5 lg:p-6";
  const valueSize = compact
    ? "mt-1.5 text-xl font-semibold text-primary sm:text-2xl"
    : "mt-2 text-2xl font-semibold text-primary sm:text-3xl";
  const iconSize = compact ? "h-8 w-8 rounded-xl" : "h-10 w-10 rounded-2xl";

  return (
    <div
      className={`${shellClass} group relative min-w-0 overflow-hidden rounded-2xl ${pad} transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md`}
    >
      {/* decorative hover gradient */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-accent-soft/80 blur-3xl" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {props.label}
            </div>
            <div className={valueSize}>{props.value}</div>
          </div>

          {props.icon ? (
            <div
              className={`flex shrink-0 items-center justify-center ${iconSize} ${iconPlateClass}`}
            >
              {props.icon}
            </div>
          ) : null}
        </div>

        {props.trend || props.helper ? (
          <div className={`flex items-center justify-between gap-2 ${compact ? "mt-3" : "mt-4"}`}>
            {props.trend ? (
              <div
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  props.trend.direction === "up"
                    ? "bg-success/12 text-success"
                    : "bg-danger/12 text-danger",
                ].join(" ")}
              >
                {props.trend.direction === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {props.trend.label}
              </div>
            ) : (
              <span />
            )}

            {props.helper ? (
              <div className="text-[11px] text-muted">{props.helper}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
