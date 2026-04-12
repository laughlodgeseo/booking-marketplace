"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PropertyWizard } from "@/components/property-wizard/PropertyWizard";
import { getVendorPropertyDraft, type VendorPropertyDetail } from "@/lib/api/portal/vendor";

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; property: VendorPropertyDetail };

export default function VendorPropertyEditPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = (params?.propertyId ?? "").trim();

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!propertyId) return;

    let alive = true;
    async function load() {
      try {
        const p = await getVendorPropertyDraft(propertyId);
        if (!alive) return;
        setState({ kind: "ready", property: p });
      } catch (err) {
        if (!alive) return;
        const msg = err instanceof Error ? err.message : "Failed to load property.";
        setState({ kind: "error", message: msg });
      }
    }
    void load();
    return () => { alive = false; };
  }, [propertyId, reloadTick]);

  if (!propertyId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-rgb))] p-6">
        <div className="max-w-md rounded-2xl border border-danger/25 bg-danger/10 p-8 text-center shadow-sm">
          <div className="mb-3 text-2xl text-danger">!</div>
          <div className="mb-2 text-base font-semibold text-primary">Could not load property</div>
          <p className="text-sm text-secondary">Missing property id in route.</p>
        </div>
      </div>
    );
  }

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-rgb))]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
          <p className="text-sm text-secondary">Loading property…</p>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg-rgb))] p-6">
        <div className="max-w-md rounded-2xl border border-danger/25 bg-danger/10 p-8 text-center shadow-sm">
          <div className="mb-3 text-2xl text-danger">!</div>
          <div className="mb-2 text-base font-semibold text-primary">Could not load property</div>
          <p className="text-sm text-secondary">{state.message}</p>
          <button
            onClick={() => {
              setState({ kind: "loading" });
              setReloadTick((value) => value + 1);
            }}
            className="mt-5 rounded-xl border border-line/70 bg-surface px-4 py-2 text-sm font-semibold text-primary transition hover:bg-warm-alt"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <RequireAuth>
      <PropertyWizard initialProperty={state.property} />
    </RequireAuth>
  );
}
