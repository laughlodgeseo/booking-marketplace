"use client";

import { useEffect, useState } from "react";
import { getAmenitiesCatalog, type AmenitiesCatalogResponse } from "@/lib/api/portal/vendor";
import type { StepProps } from "../types";

// Emoji fallback map by key
const ICON_MAP: Record<string, string> = {
  wifi: "🛜", air_conditioning: "❄️", heating: "🔥", kitchen: "🍳",
  washing_machine: "🫧", dryer: "🌀", free_parking: "🅿️", pool: "🏊",
  gym: "🏋️", elevator: "🛗", security_cameras: "📷", fire_extinguisher: "🧯",
  first_aid_kit: "🩺", workspace: "💻", tv: "📺", netflix: "🎬",
  balcony: "🌇", garden: "🌿", pets_allowed: "🐾", smoking_allowed: "🚬",
};

function amenityIcon(key: string, icon: string | null): string {
  if (icon && icon.trim()) return icon;
  const k = key.toLowerCase().replace(/-/g, "_");
  return ICON_MAP[k] ?? "✦";
}

type Props = StepProps & {
  /** Override the catalog fetcher (e.g. for admin). Defaults to vendor catalog. */
  fetchCatalog?: () => Promise<AmenitiesCatalogResponse>;
};

export function StepAmenities({ data, patch, fetchCatalog = getAmenitiesCatalog }: Props) {
  const [catalog, setCatalog] = useState<AmenitiesCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const c = await fetchCatalog();
        if (!alive) return;
        setCatalog(c);
        if (data.selectedAmenityIds.length === 0) {
          const allIds = c.amenitiesGrouped.flatMap((g) => g.amenities.map((a) => a.id));
          patch({ selectedAmenityIds: allIds });
        }
      } catch {
        // silent — user can retry
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    const current = new Set(data.selectedAmenityIds);
    if (current.has(id)) current.delete(id);
    else current.add(id);
    patch({ selectedAmenityIds: Array.from(current) });
  }

  function selectAll() {
    if (!catalog) return;
    const allIds = catalog.amenitiesGrouped.flatMap((g) => g.amenities.map((a) => a.id));
    patch({ selectedAmenityIds: allIds });
  }

  function clearAll() {
    patch({ selectedAmenityIds: [] });
  }

  const selectedCount = data.selectedAmenityIds.length;
  const totalCount = catalog?.amenitiesGrouped.flatMap((g) => g.amenities).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-primary">What does your property offer?</h2>
          <p className="mt-1 text-sm text-secondary">
            All amenities are selected by default — simply remove what does not apply.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-xl border border-brand/25 bg-accent-soft/15 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-accent-soft/25 transition"
          >
            All
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl border border-line/60 bg-surface px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-warm-alt transition"
          >
            None
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-3xl border border-line/50 bg-surface px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-brand shrink-0">
            {selectedCount} of {totalCount} selected
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-line/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: totalCount > 0 ? `${(selectedCount / totalCount) * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-warm-alt animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {catalog?.amenitiesGrouped.map(({ group, amenities }) => (
            <div key={group.id} className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                {group.name}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {amenities.map((amenity) => {
                  const selected = data.selectedAmenityIds.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggle(amenity.id)}
                      aria-pressed={selected}
                      className={[
                        "group relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-sm transition-all duration-200 active:scale-[0.99]",
                        selected
                          ? "border-brand bg-brand text-accent-text shadow-[0_10px_24px_rgba(79,70,229,0.24)]"
                          : "border-line/60 bg-warm-base text-secondary hover:border-brand/30 hover:bg-accent-soft/10 hover:text-primary",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "absolute right-2.5 top-2.5 h-2 w-2 rounded-full transition-all",
                          selected ? "bg-accent-text" : "bg-line/70",
                        ].join(" ")}
                      />
                      <span className="text-base shrink-0">
                        {amenityIcon(amenity.key, amenity.icon)}
                      </span>
                      <span className="font-medium leading-tight truncate">{amenity.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
