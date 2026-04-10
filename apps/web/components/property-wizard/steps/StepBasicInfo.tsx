"use client";

import type { StepProps } from "../types";

const PROPERTY_TYPES = [
  { icon: "🏢", label: "Apartment", value: "apartment" },
  { icon: "🏠", label: "Villa",     value: "villa"      },
  { icon: "🏨", label: "Studio",    value: "studio"     },
  { icon: "🏡", label: "Townhouse", value: "townhouse"  },
  { icon: "🌊", label: "Penthouse", value: "penthouse"  },
  { icon: "🛖", label: "Chalet",    value: "chalet"     },
];

const INPUT = "h-11 w-full rounded-2xl border border-line/80 bg-surface px-4 text-sm text-primary shadow-sm outline-none placeholder:text-muted focus:border-brand/45 focus:ring-4 focus:ring-brand/20 transition-all";

export function StepBasicInfo({ data, patch }: StepProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-primary">Tell us about your property</h2>
        <p className="mt-1 text-sm text-secondary">
          Start with the basics — you can always refine later.
        </p>
      </div>

      {/* Property type */}
      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Property Type
        </div>
        <div className="grid grid-cols-3 gap-3">
          {PROPERTY_TYPES.map((type) => {
            const selected = data.title.toLowerCase().includes(type.value) || (type.value === "apartment");
            return (
              <button
                key={type.value}
                type="button"
                className={[
                  "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200",
                  selected
                    ? "border-brand/40 bg-accent-soft/15 shadow-sm shadow-brand/8"
                    : "border-line/60 bg-warm-base hover:border-brand/25 hover:bg-accent-soft/8",
                ].join(" ")}
              >
                <span className="text-2xl">{type.icon}</span>
                <span className={`text-xs font-semibold ${selected ? "text-brand" : "text-secondary"}`}>
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted">
          Listing Title <span className="text-danger normal-case font-normal">*</span>
        </label>
        <input
          className={INPUT}
          value={data.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="e.g. Luxurious Sea-View Penthouse in Marina"
          maxLength={120}
        />
        <div className="mt-1.5 flex justify-end">
          <span className="text-[11px] text-muted">{data.title.length} / 120</span>
        </div>

        {/* Description */}
        <label className="mb-2 mt-5 block text-xs font-semibold uppercase tracking-widest text-muted">
          Description
        </label>
        <textarea
          className="w-full rounded-2xl border border-line/80 bg-surface px-4 py-3 text-sm text-primary shadow-sm outline-none resize-none placeholder:text-muted focus:border-brand/45 focus:ring-4 focus:ring-brand/20 transition-all"
          rows={5}
          value={data.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Describe what makes this property special — location highlights, interior style, unique amenities..."
          maxLength={2000}
        />
        <div className="mt-1.5 flex justify-end">
          <span className="text-[11px] text-muted">{data.description.length} / 2000</span>
        </div>
      </div>

      {/* City + Area */}
      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Location</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-secondary">
              City <span className="text-danger">*</span>
            </label>
            <input
              className={INPUT}
              value={data.city}
              onChange={(e) => patch({ city: e.target.value })}
              placeholder="Dubai"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-secondary">
              Neighbourhood / Area
            </label>
            <input
              className={INPUT}
              value={data.area}
              onChange={(e) => patch({ area: e.target.value })}
              placeholder="e.g. JBR, Downtown, Marina"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
