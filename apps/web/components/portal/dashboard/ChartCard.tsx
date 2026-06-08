"use client";

import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function ChartCard({ title, subtitle, children, className = "", actions }: Props) {
  return (
    <div
      className={[
        "rounded-2xl border border-[#e8e8f0] bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:p-5",
        className,
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#1e1b4b]">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 text-[11px] text-[#9ca3af]">{subtitle}</div>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
