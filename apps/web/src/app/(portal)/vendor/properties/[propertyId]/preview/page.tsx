"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { PropertyPreview } from "@/components/property/PropertyPreview";

import {
  getPropertyPreviewById,
  type PropertyPreviewData,
} from "@/lib/api/properties";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: PropertyPreviewData };

export default function VendorPropertyPreviewPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = typeof params?.propertyId === "string" ? params.propertyId : "";

  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!propertyId) {
        setState({ kind: "error", message: "Missing property id." });
        return;
      }

      setState({ kind: "loading" });
      try {
        const data = await getPropertyPreviewById(propertyId);
        if (!alive) return;
        console.log("PROPERTY DATA:", data);
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to load property preview",
        });
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [propertyId]);

  return (
    <PortalShell
      role="vendor"
      title="Property Preview"
      subtitle="Review exactly what will render before publishing"
      right={
        <Link
          href={`/vendor/properties/${encodeURIComponent(propertyId)}`}
          className="rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
        >
          Back to property hub
        </Link>
      }
    >
      {state.kind === "loading" ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-64" />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
          {state.message}
        </div>
      ) : (
        <PropertyPreview property={state.data} isPreview />
      )}
    </PortalShell>
  );
}
