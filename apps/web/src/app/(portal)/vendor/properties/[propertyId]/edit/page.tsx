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

  useEffect(() => {
    if (!propertyId) {
      setState({ kind: "error", message: "Missing property id in route." });
      return;
    }

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
  }, [propertyId]);

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0F19" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          <p className="text-sm text-white/40">Loading property…</p>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0B0F19" }}>
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-8 max-w-md text-center">
          <div className="text-2xl mb-3">⚠</div>
          <div className="text-base font-semibold text-white mb-2">Could not load property</div>
          <p className="text-sm text-white/50">{state.message}</p>
          <button
            onClick={() => setState({ kind: "loading" })}
            className="mt-5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 transition"
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
