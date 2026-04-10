"use client";

import dynamic from "next/dynamic";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";
import type { StepProps } from "../types";

const PortalMapPicker = dynamic(
  () => import("@/components/portal/maps/PortalMapPicker").then((m) => m.PortalMapPicker),
  { ssr: false, loading: () => <PortalLoadingCard kind="mapPicker" /> },
);

const INPUT = "h-11 w-full rounded-2xl border border-line/80 bg-surface px-4 text-sm text-primary shadow-sm outline-none placeholder:text-muted focus:border-brand/45 focus:ring-4 focus:ring-brand/20 transition-all";

export function StepLocation({ data, patch }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Where is your property?</h2>
        <p className="mt-1 text-sm text-secondary">
          Drop a pin on the map — guests see an approximate area until they book.
        </p>
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-3xl border border-line/50 shadow-sm">
        <PortalMapPicker
          value={{ lat: data.lat, lng: data.lng }}
          onChange={(next) => patch({ lat: next.lat, lng: next.lng })}
          className="h-72 w-full"
        />
      </div>

      {/* Pin status */}
      {data.lat && data.lng ? (
        <div className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <span>📍</span>
          <span>Pin set — {data.lat.toFixed(5)}, {data.lng.toFixed(5)}</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          ⚠ Click the map to drop a pin. A location pin is required before you can submit for review.
        </div>
      )}

      {/* Fields */}
      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Address details</div>
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
              Area / Neighbourhood
            </label>
            <input
              className={INPUT}
              value={data.area}
              onChange={(e) => patch({ area: e.target.value })}
              placeholder="e.g. JBR, Marina, Downtown"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold text-secondary">
            Street Address{" "}
            <span className="normal-case font-normal text-muted">(private — guests won't see this)</span>
          </label>
          <input
            className={INPUT}
            value={data.address}
            onChange={(e) => patch({ address: e.target.value })}
            placeholder="Building name, tower, street…"
          />
        </div>
      </div>
    </div>
  );
}
