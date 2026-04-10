"use client";

import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { AdminPropertyDetail } from "@/lib/api/portal/admin";

type SubmitState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type Props = {
  property: AdminPropertyDetail | null;
  vendorOptions: Array<{ id: string; label: string }>;
  vendorsLoading: boolean;
  vendorId: string;
  publishNow: boolean;
  onVendorChange: (id: string) => void;
  onPublishNowChange: (v: boolean) => void;
  submitState: SubmitState;
  onSubmit: () => void;
  amenityCount: number;
};

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

const INPUT = "h-11 w-full rounded-2xl border border-line/80 bg-surface px-4 text-sm text-primary shadow-sm outline-none placeholder:text-muted focus:border-brand/45 focus:ring-4 focus:ring-brand/20 transition-all";

export function AdminStepPublish({
  property, vendorOptions, vendorsLoading, vendorId, publishNow,
  onVendorChange, onPublishNowChange, submitState, onSubmit, amenityCount,
}: Props) {
  const photoCount = Array.isArray(property?.media) ? (property.media as unknown[]).length : 0;
  const statusLabel = property ? String(property.status ?? "DRAFT") : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Ownership & Publish</h2>
        <p className="mt-1 text-sm text-secondary">
          Assign an owner and choose whether to publish immediately.
        </p>
      </div>

      {/* Ownership */}
      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">Ownership</div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-secondary">Vendor owner</label>
          {vendorsLoading ? (
            <div className="h-11 w-full rounded-2xl border border-line/80 bg-warm-alt animate-pulse" />
          ) : (
            <select value={vendorId} onChange={(e) => onVendorChange(e.target.value)} className={INPUT}>
              <option value="">Admin-owned listing (no vendor)</option>
              {vendorOptions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          )}
          <p className="mt-1.5 text-xs text-muted">Leave blank to create an admin-managed listing.</p>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-line/80 bg-warm-base p-4 cursor-pointer hover:bg-warm-alt transition">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => onPublishNowChange(e.target.checked)}
            className="mt-1 h-4 w-4 accent-brand"
          />
          <div>
            <div className="text-sm font-semibold text-primary">Publish immediately after create</div>
            <div className="mt-0.5 text-xs text-muted">
              Disable to save as APPROVED and publish later from the property editor.
            </div>
          </div>
        </label>
      </div>

      {/* Summary */}
      <div className="rounded-3xl border border-line/50 bg-surface px-5 py-4 shadow-sm">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">Summary</div>
        {property ? (
          <>
            <ReviewRow label="Amenities" value={`${amenityCount} selected`} />
            <ReviewRow label="Photos" value={`${photoCount} uploaded`} warn={photoCount === 0} />
            <ReviewRow label="Status" value={statusLabel} />
          </>
        ) : (
          <p className="text-sm text-muted">Property will be created when you click the button below.</p>
        )}
      </div>

      {/* Feedback */}
      {submitState.kind === "success" && (
        <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 px-5 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <p className="text-sm text-success">{submitState.message}</p>
        </div>
      )}
      {submitState.kind === "error" && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <p className="text-sm text-danger">{submitState.message}</p>
        </div>
      )}

      {submitState.kind !== "success" && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitState.kind === "busy"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-accent-text shadow-sm hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitState.kind === "busy"
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
            : <>{publishNow ? "🌐 Create & Publish" : "✓ Create & Save"}</>}
        </button>
      )}
    </div>
  );
}
