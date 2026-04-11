"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  getVendorPropertyChanges,
  submitVendorPropertyForReview,
  resubmitVendorPropertyForReview,
  publishVendorProperty,
  type PropertyDiffChange,
} from "@/lib/api/portal/vendor";
import { propertyTypeLabel } from "@/lib/types/property-type";
import type { StepProps } from "../types";

type SubmitState =
  | { kind: "idle" }
  | { kind: "busy"; action: "review" | "resubmit" | "publish" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function humanizeField(path: string): string {
  if (!path || path === "(root)") return "Listing";
  return path
    .replace(/\[(\d+)\]/g, " [$1]")
    .replace(/\./g, " > ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

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
  const [changes, setChanges] = useState<PropertyDiffChange[]>([]);
  const [changesLoading, setChangesLoading] = useState(false);
  const [changesError, setChangesError] = useState<string | null>(null);

  useEffect(() => {
    if (!property?.id) {
      setChanges([]);
      setChangesError(null);
      return;
    }

    let active = true;
    setChangesLoading(true);
    setChangesError(null);

    void getVendorPropertyChanges(property.id)
      .then((res) => {
        if (!active) return;
        setChanges(Array.isArray(res.changes) ? res.changes : []);
      })
      .catch((e) => {
        if (!active) return;
        setChangesError(e instanceof Error ? e.message : "Failed to load change summary.");
      })
      .finally(() => {
        if (!active) return;
        setChangesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [property?.id, property?.updatedAt, property?.status]);

  const canSubmitForReview =
    property &&
    (property.status === "DRAFT" || property.status === "CHANGES_REQUESTED") &&
    data.lat !== null &&
    data.lng !== null &&
    (property.media?.length ?? 0) >= 4;
  const canPublish = property && property.status === "APPROVED";

  async function submitForReview() {
    if (!property) return;
    const isResubmit = property.status === "CHANGES_REQUESTED";
    setState({ kind: "busy", action: isResubmit ? "resubmit" : "review" });
    try {
      const updated = isResubmit
        ? await resubmitVendorPropertyForReview(property.id)
        : await submitVendorPropertyForReview(property.id);
      onPropertyUpdated(updated);
      setState({
        kind: "success",
        message: isResubmit
          ? "Resubmitted for review. Admin will verify your updated listing."
          : "Submitted for review! Our team will check your listing within 24-48 hours.",
      });
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
    property?.status === "CHANGES_REQUESTED" ? "border-warning/30 bg-warning/10 text-warning" :
    property?.status === "REJECTED" ? "border-danger/30 bg-danger/10 text-danger" :
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

      {property?.status === "CHANGES_REQUESTED" ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Admin requested changes. Please update your listing and resubmit for review.
        </div>
      ) : null}

      <Section title="Listing basics">
        <ReviewRow label="Type" value={propertyTypeLabel(data.propertyType)} />
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
            : <span className="text-warning">No photos uploaded — at least 4 are required</span>}
        </div>
      </Section>

      <Section title="Changes Since Last Review">
        {changesLoading ? (
          <div className="py-2.5 text-sm text-secondary">Loading change summary…</div>
        ) : changesError ? (
          <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger">
            {changesError}
          </div>
        ) : changes.length === 0 ? (
          <div className="py-2.5 text-sm text-secondary">No tracked changes since the last review checkpoint.</div>
        ) : (
          <div className="space-y-2">
            {changes.map((change, idx) => (
              <div key={`${change.field}-${idx}`} className="rounded-xl border border-line/60 bg-warm-base px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">{humanizeField(change.field)}</div>
                <div className="mt-1 text-sm text-secondary">
                  <span className="font-semibold text-danger">{formatChangeValue(change.before)}</span>
                  <span className="mx-2 text-muted">→</span>
                  <span className="font-semibold text-success">{formatChangeValue(change.after)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
        {(property?.status === "DRAFT" || property?.status === "CHANGES_REQUESTED") && (
          <button
            type="button"
            disabled={!canSubmitForReview || state.kind === "busy"}
            onClick={() => void submitForReview()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-accent-text shadow-sm hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {state.kind === "busy" && (state.action === "review" || state.action === "resubmit")
              ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {property.status === "CHANGES_REQUESTED" ? "Resubmitting…" : "Submitting…"}
                </>
              )
              : <>{property?.status === "CHANGES_REQUESTED" ? "🔁 Resubmit for Review" : "🚀 Submit for Review"}</>}
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

        {!canSubmitForReview &&
          (property?.status === "DRAFT" || property?.status === "CHANGES_REQUESTED") && (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <div className="font-semibold mb-1">Before you can submit:</div>
            <ul className="space-y-1 text-warning/80 text-xs">
              {!data.lat || !data.lng ? <li>• Set a location pin on the map</li> : null}
              {photoCount < 4 ? <li>• Upload at least 4 photos</li> : null}
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
