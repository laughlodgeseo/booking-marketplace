"use client";

export interface StatusSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: StatusSegment[];
  height?: number;
}

export function SegmentedStatusBar({ segments, height = 10 }: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <div className="w-full">
      {/* Bar */}
      <div
        className="flex w-full overflow-hidden rounded-full"
        style={{ height }}
        role="img"
        aria-label="Status distribution"
      >
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={seg.key}
              style={{
                width: `${pct}%`,
                background: seg.color,
                borderRadius:
                  i === 0
                    ? `${height / 2}px 0 0 ${height / 2}px`
                    : i === segments.length - 1
                      ? `0 ${height / 2}px ${height / 2}px 0`
                      : "0",
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: seg.color }}
              />
              <span className="text-[11px] text-[#6b7280]">{seg.label}</span>
              <span className="text-[11px] font-semibold text-[#374151]">{seg.value}</span>
              <span className="text-[10px] text-[#9ca3af]">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
