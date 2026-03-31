"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { PortalCard } from "@/components/portal/ui/PortalCard";

export type BarPoint = {
  label: string;
  value: number;
};

function clampMin(v: number, min: number): number {
  return v < min ? min : v;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

export function SimpleBarChart(props: {
  title: string;
  subtitle?: string;
  points: BarPoint[];
  valueSuffix?: string;
}) {
  const tPortal = useTranslations("portal");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const max = props.points.reduce((m, p) => (p.value > m ? p.value : m), 0);
  const safeMax = clampMin(max, 1);
  const total = props.points.reduce((sum, p) => sum + p.value, 0);

  return (
    <PortalCard className="rounded-2xl p-4 sm:p-5 lg:p-6" as="div">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-primary lg:text-sm">{props.title}</div>
          {props.subtitle ? <div className="mt-1 text-xs text-muted">{props.subtitle}</div> : null}
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-primary">{formatValue(total)}{props.valueSuffix ?? ""}</div>
          <div className="text-[10px] text-muted">{tPortal("chart.max")}: {formatValue(safeMax)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {props.points.length === 0 ? (
          <div className="text-sm text-secondary">{tPortal("chart.noData")}</div>
        ) : (
          props.points.map((p, index) => {
            const widthPct = (p.value / safeMax) * 100;
            const isHovered = hoveredIndex === index;
            const barStyle: CSSProperties = {
              width: `${Math.max(2, widthPct)}%`,
              transition: "width 600ms ease-out, opacity 200ms",
              animationDelay: `${index * 60}ms`,
            };

            return (
              <div
                key={p.label}
                className="group relative grid grid-cols-[92px_1fr_52px] items-center gap-3 sm:grid-cols-[120px_1fr_60px]"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="truncate text-xs text-secondary">{p.label}</div>
                <div className="relative h-3 rounded-full bg-warm-alt/60 overflow-hidden">
                  <div
                    className={[
                      "h-3 rounded-full transition-all duration-200",
                      isHovered ? "bg-brand-hover shadow-[0_0_8px_rgba(79,70,229,0.3)]" : "bg-brand",
                    ].join(" ")}
                    style={barStyle}
                  />
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-dark-1 px-2 py-1 text-[10px] font-semibold text-white shadow-lg whitespace-nowrap z-10">
                      {formatValue(p.value)}{props.valueSuffix ?? ""}
                    </div>
                  )}
                </div>
                <div className={[
                  "text-right text-xs font-semibold transition-colors",
                  isHovered ? "text-brand" : "text-primary",
                ].join(" ")}>
                  {formatValue(p.value)}
                  {props.valueSuffix ?? ""}
                </div>
              </div>
            );
          })
        )}
      </div>
    </PortalCard>
  );
}
