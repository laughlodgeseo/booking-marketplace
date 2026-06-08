"use client";

import { useId } from "react";
import { EmptyChartState } from "./EmptyChartState";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  size?: number;
  innerLabel?: string;
  innerSublabel?: string;
}

export function DonutBreakdownChart({ slices, size = 140, innerLabel, innerSublabel }: Props) {
  const clipId = useId();
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0 || slices.length === 0) return <EmptyChartState />;

  const R = 44;
  const CX = 50;
  const CY = 50;
  const thickness = 12;
  const innerR = R - thickness;

  let cumulativeAngle = -Math.PI / 2;
  const arcs = slices.map((slice) => {
    const fraction = slice.value / total;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const xi1 = CX + innerR * Math.cos(endAngle);
    const yi1 = CY + innerR * Math.sin(endAngle);
    const xi2 = CX + innerR * Math.cos(startAngle);
    const yi2 = CY + innerR * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const path =
      `M ${x1} ${y1} ` +
      `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} ` +
      `L ${xi1} ${yi1} ` +
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${xi2} ${yi2} ` +
      `Z`;

    return { ...slice, path, fraction };
  });

  const displayTotal = total >= 1000 ? `${(total / 1000).toFixed(1)}K` : String(total);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      {/* Donut */}
      <div className="shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
          <defs>
            <clipPath id={clipId}>
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
          </defs>
          {arcs.map((arc) => (
            <path
              key={arc.key}
              d={arc.path}
              fill={arc.color}
              stroke="white"
              strokeWidth="1.5"
              opacity="0.9"
            />
          ))}
          {/* Center label */}
          <text
            x={CX}
            y={CY - 3}
            textAnchor="middle"
            dominantBaseline="auto"
            fontSize="11"
            fontWeight="700"
            fill="#1f2937"
          >
            {innerLabel ?? displayTotal}
          </text>
          <text
            x={CX}
            y={CY + 9}
            textAnchor="middle"
            dominantBaseline="auto"
            fontSize="7"
            fill="#9ca3af"
          >
            {innerSublabel ?? "total"}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {arcs.map((arc) => {
          const pct = Math.round(arc.fraction * 100);
          return (
            <div key={arc.key} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: arc.color }}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-[#6b7280]">{arc.label}</span>
              <span className="shrink-0 text-xs font-semibold text-[#1f2937]">{arc.value}</span>
              <span className="shrink-0 text-[10px] text-[#9ca3af]">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
