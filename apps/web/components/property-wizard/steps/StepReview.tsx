"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  submitVendorPropertyForReview,
  publishVendorProperty,
  type VendorPropertyDetail,
} from "@/lib/api/portal/vendor";
import type { StepProps } from "../types";

type SubmitState =
  | { kind: "idle" }
  | { kind: "busy"; action: "review" | "publish" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function ReviewRow({ label, value, warn }: { label: string; value: string | null | undefined; warn?: boolean }) {
  const missing = !value || value.trim() === "";
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line/30 last:border-0">
      <span className="text-xs font-semibold text-muted shrink-0 w-28">{label}</span>
      <span className={`text-sm text-right ${missing || warn ? "text-warning" : "text-secondary"}`}>
        {missing ? "Not set" : value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line/50 bg-surface px-5 py-4 shadow-sm">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">{title}</div>
      {children}
    </div>
  );
}

export function StepReview({ data, property, onPropertyUpdated }: StepProps) {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const canSubmitForReview = property && property.status === "DRAFT" && data.lat !== null && data.lng !== null && (property.media?.length ?? 0) >= 1;
  const canPublish = property && property.status === "APPROVED";

  async function submitForReview() {
    if (!property) return;
    setState({ kind: "busy", action: "review" });
    try {
      const updated = await submitVendorPropertyForReview(property.id);
      onPropertyUpdated(updated);
      setState({ kind: "success", message: "Submitted for review! Our team will check your listing within 24-48 hours." });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Submission failed" });
    }
  }

  async function publish() {
    if (!property) return;
    setState({ kind: "busy", action: "publish" });
    try {
      const updated = await publishVendorProperty(property.id);
      onPropertyUpdated(updated);
      setState({ kind: "success", message: "Your property is now live and visible to guests!" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Publish failed" });
    }
  }

  const statusColor =
    property?.status === "PUBLISHED" ? "border-success/30 bg-success/10 text-success" :
    property?.status === "APPROVED"  ? "border-brand/30 bg-accent-soft/15 text-brand" :
    property?.status === "UNDER_REVIEW" ? "border-warning/30 bg-warning/10 text-warning" :
    (property?.status === "REJECTED" || property?.status === "CHANGES_REQUESTED") ? "border-danger/30 bg-danger/10 text-danger" :
    "border-line/50 bg-warm-base text-muted";

  const photoCount = property?.media?.length ?? 0;
  const amenityCount = data.selectedAmenityIds.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Review & Publish</h2>
        <p className="mt-1 text-sm text-secondary">Double-check your listing before submitting for admin review.</p>
      </div>

      {property && (
        <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${statusColor}`}>
          <span className="h-2 w-2 rounded-full bg-current" />
          {property.status.replace(/_/g, " ")}
        </div>
      )}

      <Section title="Listing basics">
        <ReviewRow label="Title" value={data.title} />
        <ReviewRow label="Description" value={data.description ? `${data.description.slice(0, 60)}…` : null} />
        <ReviewRow label="City" value={data.city} />
        <ReviewRow label="Area" value={data.area || "—"} />
      </Section>

      <Section title="Location">
        <ReviewRow label="Map pin" value={data.lat && data.lng ? `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}` : null} warn={!data.lat || !data.lng} />
        <ReviewRow label="Address" value={data.address || "—"} />
      </Section>

      <Section title="Property details">
        <ReviewRow label="Bedrooms" value={String(data.bedrooms)} />
        <ReviewRow label="Bathrooms" value={String(data.bathrooms)} />
        <ReviewRow label="Max guests" value={String(data.maxGuests)} />
      </Section>

      <Section title="Amenities">
        <div className="py-2.5 text-sm">
          {amenityCount > 0 ? <span className="text-secondary">{amenityCount} amenities selected</span> : <span className="text-warning">No amenities selected</span>}
        </div>
      </Section>

      <Section title="Pricing">
        <ReviewRow label="Nightly" value={`${data.currency} ${data.basePrice.toLocaleString()}`} />
        <ReviewRow label="Cleaning" value={`${data.currency} ${data.cleaningFee.toLocaleString()}`} />
        <ReviewRow label="Min nights" value={String(data.minNights)} />
        <ReviewRow label="Max nights" value={data.maxNights ? String(data.maxNights) : "No limit"} />
        <ReviewRow label="Instant book" value={data.isInstantBook ? "Yes" : "No"} />
      </Section>

      <Section title="Photos">
        <div className="py-2.5 text-sm">
          {photoCount > 0
            ? <span className="text-secondary">{photoCount} photo{photoCount !== 1 ? "s" : ""} uploaded</span>
            : <span className="text-warning">No photos uploaded — at least 1 is required</span>}
        </div>
      </Section>

      {/* Feedback */}
      {state.kind === "success" && (
        <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p className="text-sm text-success">{state.message}</p>
        </div>
      )}
      {state.kind === "error" && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <p className="text-sm text-danger">{state.message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {property?.status === "DRAFT" && (
          <button
            type="button"
            disabled={!canSubmitForReview || state.kind === "busy"}
            onClick={() => void submitForReview()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-accent-text shadow-sm hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {state.kind === "busy" && state.action === "review"
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              : <>🚀 Submit for Review</>}
          </button>
        )}

        {property?.status === "APPROVED" && (
          <button
            type="button"
            disabled={!canPublish || state.kind === "busy"}
            onClick={() => void publish()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-success px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {state.kind === "busy" && state.action === "publish"
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>
              : <>🌐 Publish Listing</>}
          </button>
        )}

        {!canSubmitForReview && property?.status === "DRAFT" && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <div className="font-semibold mb-1">Before you can submit:</div>
            <ul className="space-y-1 text-warning/80 text-xs">
              {!data.lat || !data.lng ? <li>• Set a location pin on the map</li> : null}
              {photoCount < 1 ? <li>• Upload at least 1 photo</li> : null}
            </ul>
          </div>
        )}

        {property?.status === "UNDER_REVIEW" && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Your listing is under review. Our team will get back to you within 24-48 hours.
          </div>
        )}

        {property?.status === "PUBLISHED" && (
          <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            🎉 Your property is live and visible to guests.
          </div>
        )}
      </div>
    </div>
  );
}
