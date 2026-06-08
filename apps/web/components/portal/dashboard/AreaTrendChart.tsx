"use client";

import { useState, useId } from "react";
import type { ChartPoint } from "./dashboard-chart-mappers";
import { EmptyChartState } from "./EmptyChartState";

const CHART_H = 160;
const CHART_W = 600;
const PAD_LEFT = 0;
const PAD_RIGHT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 28;

const INNER_W = CHART_W - PAD_LEFT - PAD_RIGHT;
const INNER_H = CHART_H - PAD_TOP - PAD_BOTTOM;

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 1} ${p.y}`;
  }
  const d: string[] = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    d.push(`C ${cpX} ${prev.y} ${cpX} ${curr.y} ${curr.x} ${curr.y}`);
  }
  return d.join(" ");
}

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  fillColor: string;
  points: ChartPoint[];
  isCurrency?: boolean;
}

interface Props {
  series: AreaSeries[];
  formatValue?: (v: number) => string;
  height?: number;
}

export function AreaTrendChart({ series, formatValue, height = CHART_H }: Props) {
  const gradId = useId();
  const [hovered, setHovered] = useState<{ seriesIdx: number; pointIdx: number } | null>(null);

  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const maxVal = Math.max(...allValues, 0);
  const safeMax = maxVal === 0 ? 1 : maxVal * 1.08;

  if (allValues.every((v) => v === 0) || series.every((s) => s.points.length === 0)) {
    return <EmptyChartState />;
  }

  const firstSeries = series[0];
  const xLabels = firstSeries?.points ?? [];
  const showEvery = xLabels.length > 12 ? Math.ceil(xLabels.length / 8) : 1;

  function getXY(pointIdx: number, totalPoints: number, value: number) {
    const x = totalPoints <= 1
      ? PAD_LEFT + INNER_W / 2
      : PAD_LEFT + (pointIdx / (totalPoints - 1)) * INNER_W;
    const y = PAD_TOP + (1 - value / safeMax) * INNER_H;
    return { x, y };
  }

  const gridLines = 4;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${CHART_W} ${height}`}
        className="w-full overflow-visible"
        style={{ height }}
        aria-hidden="true"
      >
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.key} id={`${gradId}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.fillColor} stopOpacity="0.55" />
              <stop offset="100%" stopColor={s.fillColor} stopOpacity="0.04" />
            </linearGradient>
          ))}
        </defs>

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

        {/* Area fills */}
        {series.map((s, si) => {
          const coords = s.points.map((p, pi) => getXY(pi, s.points.length, p.value));
          const linePath = buildPath(coords);
          if (!linePath) return null;
          const first = coords[0];
          const last = coords[coords.length - 1];
          const areaPath = `${linePath} L ${last.x} ${PAD_TOP + INNER_H} L ${first.x} ${PAD_TOP + INNER_H} Z`;
          return (
            <path
              key={s.key}
              d={areaPath}
              fill={`url(#${gradId}-${si})`}
            />
          );
        })}

        {/* Lines */}
        {series.map((s, si) => {
          const coords = s.points.map((p, pi) => getXY(pi, s.points.length, p.value));
          const linePath = buildPath(coords);
          if (!linePath) return null;
          return (
            <path
              key={s.key}
              d={linePath}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Data points & hover targets */}
        {series.map((s, si) =>
          s.points.map((p, pi) => {
            const { x, y } = getXY(pi, s.points.length, p.value);
            const isHov = hovered?.seriesIdx === si && hovered?.pointIdx === pi;
            return (
              <g key={`${si}-${pi}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHov ? 5 : 3}
                  fill={s.color}
                  stroke="white"
                  strokeWidth={isHov ? 2 : 1.5}
                  opacity={isHov ? 1 : 0.6}
                  style={{ transition: "r 150ms, opacity 150ms" }}
                />
                {/* Invisible hover zone */}
                <rect
                  x={x - 16}
                  y={PAD_TOP}
                  width={32}
                  height={INNER_H}
                  fill="transparent"
                  onMouseEnter={() => setHovered({ seriesIdx: si, pointIdx: pi })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "crosshair" }}
                />
              </g>
            );
          })
        )}

        {/* X-axis labels */}
        {xLabels.map((p, pi) => {
          if (pi % showEvery !== 0 && pi !== xLabels.length - 1) return null;
          const { x } = getXY(pi, xLabels.length, 0);
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
      {hovered !== null && (() => {
        const s = series[hovered.seriesIdx];
        const p = s?.points[hovered.pointIdx];
        if (!s || !p) return null;
        const { x } = getXY(hovered.pointIdx, s.points.length, p.value);
        const pct = CHART_W > 0 ? (x / CHART_W) * 100 : 50;
        const leftRight = pct > 65 ? { right: `${100 - pct}%` } : { left: `${pct}%` };
        const displayValue = formatValue ? formatValue(p.value) : p.value.toLocaleString("en");
        return (
          <div
            className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs shadow-lg"
            style={leftRight}
          >
            <div className="font-semibold text-[#374151]">{displayValue}</div>
            <div className="mt-0.5 text-[#9ca3af]">{p.label}</div>
          </div>
        );
      })()}
    </div>
  );
}
