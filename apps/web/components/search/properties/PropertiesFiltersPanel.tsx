"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, BedDouble, Bath, SlidersHorizontal, X } from "lucide-react";
import type { PropertiesQuery } from "@/lib/search/params";
import { AMENITY_CATALOG, type AmenityKey } from "@/components/icons/amenities";

type Props = {
  query: PropertiesQuery;
  resultsCount: number | null;
  onChange: (partial: Partial<PropertiesQuery>) => void;
  busyKey: string;
};

const PRESETS: Array<{ city: string; area: string; label: string }> = [
  { city: "Dubai", area: "Dubai Marina", label: "Dubai Marina" },
  { city: "Dubai", area: "Downtown", label: "Downtown" },
  { city: "Dubai", area: "JBR", label: "JBR" },
  { city: "Dubai", area: "Business Bay", label: "Business Bay" },
  { city: "Dubai", area: "Palm Jumeirah", label: "Palm Jumeirah" },
];

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function FiltersPanel(props: Props) {
  const [open, setOpen] = useState(true);

  const amenitiesSelected = useMemo(() => {
    const raw = props.query.amenities ?? [];
    return uniq(raw.map((x) => x.trim()).filter(Boolean));
  }, [props.query.amenities]);

  const amenityList = useMemo(() => {
    const preferred: AmenityKey[] = [
      "WIFI",
      "POOL",
      "GYM",
      "PARKING_FREE",
      "AIR_CONDITIONING",
      "KITCHEN",
      "ELEVATOR",
      "PET_FRIENDLY",
      "NO_SMOKING",
      "SEA_VIEW",
      "BALCONY",
      "CONCIERGE",
    ];
    return preferred.filter((k) => Boolean(AMENITY_CATALOG[k])).map((k) => AMENITY_CATALOG[k]);
  }, []);

  const hasAnyFilter = useMemo(() => {
    return Boolean(
      props.query.q ||
        props.query.city ||
        props.query.area ||
        props.query.guests ||
        props.query.bedrooms ||
        props.query.bathrooms ||
        props.query.minPrice !== undefined ||
        props.query.maxPrice !== undefined ||
        (props.query.amenities && props.query.amenities.length > 0),
    );
  }, [props.query]);

  return (
    <div className="rounded-2xl bg-white p-4 text-neutral-900 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
          <div className="text-sm font-semibold text-neutral-900">Filters</div>
          {props.resultsCount !== null ? (
            <div className="hidden text-xs text-neutral-500 sm:block">{props.resultsCount} total</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {hasAnyFilter ? (
            <button
              type="button"
              onClick={() =>
                props.onChange({
                  q: undefined,
                  city: undefined,
                  area: undefined,
                  guests: undefined,
                  bedrooms: undefined,
                  bathrooms: undefined,
                  minPrice: undefined,
                  maxPrice: undefined,
                  amenities: undefined,
                })
              }
              className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200"
            >
              Reset
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200"
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open ? (
        <motion.div
          className="mt-4 space-y-4"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Popular areas
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = props.query.city === p.city && props.query.area === p.area;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => props.onChange({ city: p.city, area: p.area })}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
                    ].join(" ")}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                <MapPin className="h-4 w-4" />
                City
              </div>
              <input
                value={props.query.city ?? ""}
                onChange={(e) => props.onChange({ city: e.target.value.trim() || undefined })}
                placeholder="Dubai"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                <MapPin className="h-4 w-4" />
                Area
              </div>
              <input
                value={props.query.area ?? ""}
                onChange={(e) => props.onChange({ area: e.target.value.trim() || undefined })}
                placeholder="Dubai Marina"
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                <Users className="h-4 w-4" />
                Guests
              </div>
              <input
                type="number"
                min={1}
                max={16}
                value={props.query.guests ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  props.onChange({ guests: Number.isFinite(n) && n > 0 ? n : undefined });
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900"
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                <BedDouble className="h-4 w-4" />
                Bedrooms
              </div>
              <input
                type="number"
                min={0}
                max={12}
                value={props.query.bedrooms ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  props.onChange({ bedrooms: Number.isFinite(n) && n >= 0 ? n : undefined });
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900"
              />
            </label>

            <label className="block">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                <Bath className="h-4 w-4" />
                Bathrooms
              </div>
              <input
                type="number"
                min={0}
                max={12}
                value={props.query.bathrooms ?? ""}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  props.onChange({ bathrooms: Number.isFinite(n) && n >= 0 ? n : undefined });
                }}
                className="w-full rounded-xl bg-white px-3 py-2 text-sm text-neutral-900"
              />
            </label>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Amenities
            </div>

            <div className="flex flex-wrap gap-2">
              {amenityList.map((a) => {
                const active = amenitiesSelected.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? amenitiesSelected.filter((x) => x !== a.key)
                        : uniq([...amenitiesSelected, a.key]);

                      props.onChange({ amenities: next.length ? next : undefined });
                    }}
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "bg-indigo-600 text-white"
                        : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
                    ].join(" ")}
                  >
                    <a.Icon className="h-4 w-4" />
                    {a.label}
                  </button>
                );
              })}
            </div>

            {amenitiesSelected.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="text-xs text-neutral-500">
                  Selected: <span className="font-semibold text-neutral-600">{amenitiesSelected.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => props.onChange({ amenities: undefined })}
                  className="inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              </div>
            ) : null}

            <div className="mt-2 text-[11px] leading-relaxed text-neutral-500">
              Server-driven filters. Query is passed to backend (no fake UI).
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
