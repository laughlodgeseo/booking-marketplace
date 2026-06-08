"use client";

import { BarChart2 } from "lucide-react";

export function EmptyChartState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f0fd] text-indigo-400">
        <BarChart2 className="h-6 w-6" />
      </div>
      <div>
        <div className="text-sm font-medium text-[#6b7280]">
          {label ?? "No activity yet for this period"}
        </div>
        <div className="mt-1 text-xs text-[#9ca3af]">
          Data will appear here once activity is recorded.
        </div>
      </div>
    </div>
  );
}
