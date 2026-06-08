import type { ReactNode } from "react";

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "dark";

interface Props {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  tone?: Tone;
  compact?: boolean;
}

const TONE_STYLES: Record<Tone, { shell: string; icon: string; value: string }> = {
  default: {
    shell: "border-[#e8e8f0] bg-white",
    icon: "bg-[#eef2ff] text-[#4f46e5]",
    value: "text-[#1e1b4b]",
  },
  primary: {
    shell: "border-[#c7d2fe] bg-[#f5f3ff]",
    icon: "bg-[#4f46e5] text-white",
    value: "text-[#1e1b4b]",
  },
  success: {
    shell: "border-[#bbf7d0] bg-[#f0fdf4]",
    icon: "bg-[#16a34a] text-white",
    value: "text-[#14532d]",
  },
  warning: {
    shell: "border-[#fde68a] bg-[#fffbeb]",
    icon: "bg-[#f59e0b] text-white",
    value: "text-[#78350f]",
  },
  danger: {
    shell: "border-[#fecaca] bg-[#fef2f2]",
    icon: "bg-[#dc2626] text-white",
    value: "text-[#7f1d1d]",
  },
  dark: {
    shell: "border-[#4338ca]/30 bg-gradient-to-br from-[#312e81] to-[#4f46e5]",
    icon: "bg-white/14 text-white",
    value: "text-white",
  },
};

export function KpiCard({ label, value, helper, icon, tone = "default", compact = false }: Props) {
  const styles = TONE_STYLES[tone];
  const pad = compact ? "p-3.5" : "p-4 sm:p-5";
  const labelColor = tone === "dark" ? "text-white/65" : "text-[#6b7280]";
  const helperColor = tone === "dark" ? "text-white/50" : "text-[#9ca3af]";

  return (
    <div
      className={[
        "group relative min-w-0 overflow-hidden rounded-2xl border shadow-[0_1px_4px_rgba(15,23,42,0.06)]",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        styles.shell,
        pad,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${labelColor}`}>
            {label}
          </div>
          <div className={`mt-1.5 text-xl font-bold sm:text-2xl ${styles.value}`}>
            {value}
          </div>
          {helper ? (
            <div className={`mt-1 text-[11px] ${helperColor}`}>{helper}</div>
          ) : null}
        </div>
        {icon ? (
          <div
            className={[
              "flex shrink-0 items-center justify-center rounded-xl",
              compact ? "h-8 w-8" : "h-10 w-10",
              styles.icon,
            ].join(" ")}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
