"use client";

import { useState } from "react";
import type { ChartPoint } from "./dashboard-chart-mappers";
import { EmptyChartState } from "./EmptyChartState";

const CHART_H = 160;
const CHART_W = 600;
const PAD_LEFT = 0;
const PAD_RIGHT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 28;
const BAR_RADIUS = 4;

const INNER_W = CHART_W - PAD_LEFT - PAD_RIGHT;
const INNER_H = CHART_H - PAD_TOP - PAD_BOTTOM;

export interface BarSeries {
  key: string;
  label: string;
  color: string;
  points: ChartPoint[];
}

interface Props {
  series: BarSeries[];
  formatValue?: (v: number) => string;
  height?: number;
  stacked?: boolean;
}

export function BarTrendChart({ series, formatValue, height = CHART_H, stacked = false }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const firstSeries = series[0];
  const pointCount = firstSeries?.points.length ?? 0;
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));

  if (allValues.every((v) => v === 0) || pointCount === 0) {
    return <EmptyChartState />;
  }

  let maxVal: number;
  if (stacked) {
    const stackedTotals = Array.from({ length: pointCount }, (_, i) =>
      series.reduce((sum, s) => sum + (s.points[i]?.value ?? 0), 0)
    );
    maxVal = Math.max(...stackedTotals, 0);
  } else {
    maxVal = Math.max(...allValues, 0);
  }
  const safeMax = maxVal === 0 ? 1 : maxVal * 1.08;

  const groupW = INNER_W / pointCount;
  const barW = stacked
    ? Math.max(6, Math.min(groupW * 0.55, 40))
    : Math.max(6, Math.min((groupW * 0.7) / series.length, 32));
  const groupGap = (groupW - barW * (stacked ? 1 : series.length)) / 2;
  const showEvery = pointCount > 12 ? Math.ceil(pointCount / 8) : 1;
  const gridLines = 4;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${CHART_W} ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
        aria-hidden="true"
      >
        {/* Horizontal grid lines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = PAD_TOP + (i / gridLines) * INNER_H;
          return (
            <line
              key={i}
              x1={PAD_LEFT}
              y1={y}
              x2={CHART_W - PAD_RIGHT}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.8"
              strokeDasharray={i === 0 ? "0" : "4 4"}
            />
          );
        })}

        {/* Bars */}
        {Array.from({ length: pointCount }).map((_, pi) => {
          const groupX = PAD_LEFT + pi * groupW + groupGap;
          const isHov = hoveredPoint === pi;

          if (stacked) {
            let stackY = PAD_TOP + INNER_H;
            return (
              <g key={pi}>
                {series.map((s) => {
                  const val = s.points[pi]?.value ?? 0;
                  const barH = (val / safeMax) * INNER_H;
                  const y = stackY - barH;
                  stackY -= barH;
                  if (barH < 1) return null;
                  return (
                    <rect
                      key={s.key}
                      x={groupX}
                      y={y}
                      width={barW}
                      height={barH}
                      fill={s.color}
                      opacity={isHov ? 1 : 0.82}
                      rx={y === PAD_TOP + INNER_H - barH ? BAR_RADIUS : 0}
                    />
                  );
                })}
                <rect
                  x={groupX - 4}
                  y={PAD_TOP}
                  width={barW + 8}
                  height={INNER_H}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(pi)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          }

          return (
            <g key={pi}>
              {series.map((s, si) => {
                const val = s.points[pi]?.value ?? 0;
                const barH = Math.max((val / safeMax) * INNER_H, val > 0 ? 2 : 0);
                const barX = groupX + si * barW;
                const barY = PAD_TOP + INNER_H - barH;
                return (
                  <rect
                    key={s.key}
                    x={barX}
                    y={barY}
                    width={barW - 2}
                    height={barH}
                    fill={s.color}
                    opacity={isHov ? 1 : 0.8}
                    rx={BAR_RADIUS}
                  />
                );
              })}
              <rect
                x={groupX - 4}
                y={PAD_TOP}
                width={groupW}
                height={INNER_H}
                fill="transparent"
                onMouseEnter={() => setHoveredPoint(pi)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {firstSeries?.points.map((p, pi) => {
          if (pi % showEvery !== 0 && pi !== pointCount - 1) return null;
          const x = PAD_LEFT + pi * groupW + groupW / 2;
          return (
            <text
              key={pi}
              x={x}
              y={height - 2}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
            >
              {p.shortLabel}
            </text>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredPoint !== null && (() => {
        const pi = hoveredPoint;
        const x = PAD_LEFT + pi * groupW + groupW / 2;
        const pct = CHART_W > 0 ? (x / CHART_W) * 100 : 50;
        const leftRight = pct > 65 ? { right: `${100 - pct}%` } : { left: `${pct}%` };
        return (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs shadow-lg"
            style={leftRight}
          >
            <div className="mb-1 font-semibold text-[#6b7280]">
              {firstSeries?.points[pi]?.label}
            </div>
            {series.map((s) => {
              const val = s.points[pi]?.value ?? 0;
              const display = formatValue ? formatValue(val) : val.toLocaleString("en");
              return (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-[#374151]">{s.label}</span>
                  <span className="ml-1 font-semibold text-[#111827]">{display}</span>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
