import type { ReactNode } from "react";
import { getAmenityMeta } from "@/components/icons/amenities";

export type AmenitiesGridItem = {
  key: string; // can be backend enum or raw string
  label?: string; // optional override (rare)
};

export type AmenitiesGridProps = {
  title?: string;
  items: AmenitiesGridItem[];
  columns?: 2 | 3 | 4;
  variant?: "card" | "section";
  minItems?: number;
  footer?: ReactNode;
};

function colsClass(columns: 2 | 3 | 4) {
  if (columns === 2) return "grid-cols-2 md:grid-cols-2";
  if (columns === 3) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}

export default function AmenitiesGrid({
  title = "Amenities",
  items,
  columns = 3,
  variant = "section",
  minItems = 0,
  footer,
}: AmenitiesGridProps) {
  const isLight = variant === "section";
  const hasShell = Boolean(title || footer || variant === "card");

  const shell = isLight
    ? "premium-card premium-card-tinted rounded-2xl border border-white/70 p-5 shadow-[0_18px_44px_rgba(11,15,25,0.1)] md:p-6"
    : "rounded-2xl bg-surface/[0.06] p-5 shadow-sm ring-1 ring-black/10 md:p-6";

  const titleText = isLight ? "text-primary" : "text-inverted/90";
  const subText = isLight ? "text-secondary" : "text-inverted/60";

  const itemBg = isLight
    ? "bg-[rgb(var(--color-bg-rgb)/0.78)]"
    : "bg-[rgb(var(--color-surface-rgb)/0.08)]";
  const itemHover = isLight
    ? "hover:bg-[rgb(var(--color-bg-rgb)/0.9)] hover:shadow-sm"
    : "hover:bg-[rgb(var(--color-surface-rgb)/0.12)] hover:shadow-sm";

  const iconWrapBg = isLight
    ? "bg-indigo-600/10"
    : "bg-[rgb(var(--color-surface-rgb)/0.16)]";
  const iconColor = isLight ? "text-indigo-600/90" : "text-indigo-200";

  const labelText = isLight ? "text-primary" : "text-inverted/85";
  const smallText = isLight ? "text-muted" : "text-inverted/50";
  const slots: Array<AmenitiesGridItem | null> = [...items];
  while (slots.length < minItems) slots.push(null);

  return (
    <section className={hasShell ? shell : undefined}>
      {title ? (
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className={`text-lg font-semibold tracking-tight ${titleText}`}>{title}</h3>
            <p className={`mt-1 text-sm ${subText}`}>
              Everything included in your stay — clearly listed, icon-first.
            </p>
          </div>
        </div>
      ) : null}

      <div className={`${title ? "mt-5" : ""} grid gap-3 ${colsClass(columns)}`.trim()}>
        {slots.map((it, index) => {
          if (!it) {
            return (
              <div
                key={`ghost-${index}`}
                aria-hidden="true"
                className="min-h-[68px] rounded-xl bg-[rgb(var(--color-bg-rgb)/0.78)] ring-1 ring-white/72"
              />
            );
          }

          const meta = getAmenityMeta(it.key);
          const Icon = meta.Icon;
          const label = it.label?.trim() ? it.label.trim() : meta.label;

          return (
            <div
              key={`${it.key}-${label}`}
                className={[
                "group flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-shadow ring-1 ring-white/72",
                itemBg,
                itemHover,
              ].join(" ")}
            >
              <div
                className={[
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-white/72",
                  iconWrapBg,
                ].join(" ")}
              >
                <Icon className={`h-[19px] w-[19px] stroke-[1.9] ${iconColor}`} />
              </div>

              <div className="min-w-0">
                <div className={`truncate text-sm font-medium ${labelText}`}>{label}</div>
                <div className={`mt-0.5 text-xs ${smallText}`}>Included</div>
              </div>
            </div>
          );
        })}
      </div>

      {footer ? <div className="mt-5">{footer}</div> : null}
    </section>
  );
}
