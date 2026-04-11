"use client";

import { useEffect, useState } from "react";
import type {
  PropertyDiffChange,
  VendorPropertyDetail,
} from "@/lib/api/portal/vendor";
import {
  getVendorPropertyChanges,
  resubmitVendorPropertyForReview,
  submitVendorPropertyForReview,
} from "@/lib/api/portal/vendor";

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

function humanizeField(path: string): string {
  if (!path || path === "(root)") return "Listing";
  return path
    .replace(/\[(\d+)\]/g, " [$1]")
    .replace(/\./g, " > ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export function VendorPropertySubmitSection(props: {
  property: VendorPropertyDetail;
  onSubmitted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [changes, setChanges] = useState<PropertyDiffChange[]>([]);
  const [changesLoading, setChangesLoading] = useState(false);

  const status = String(props.property.status).toUpperCase();
  const canSubmit = status === "DRAFT" || status === "CHANGES_REQUESTED";

  useEffect(() => {
    let active = true;
    setChangesLoading(true);
    setErr(null);

    void getVendorPropertyChanges(props.property.id)
      .then((res) => {
        if (!active) return;
        setChanges(Array.isArray(res.changes) ? res.changes : []);
      })
      .catch((e) => {
        if (!active) return;
        setErr(e instanceof Error ? e.message : "Failed to load changes.");
      })
      .finally(() => {
        if (!active) return;
        setChangesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [props.property.id, props.property.updatedAt, props.property.status]);

  async function submit() {
    setBusy(true);
    setErr(null);

    try {
      if (status === "CHANGES_REQUESTED") {
        await resubmitVendorPropertyForReview(props.property.id);
      } else {
        await submitVendorPropertyForReview(props.property.id);
      }
      props.onSubmitted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-surface p-6 space-y-4">
      <div>
        <div className="text-sm font-semibold text-primary">Submit for review</div>
        <div className="mt-1 text-sm text-secondary">
          Backend validates: location (lat/lng), minimum photos, required photo categories, and ownership proof.
        </div>
      </div>

      {status === "CHANGES_REQUESTED" ? (
        <div className="rounded-xl border border-warning/30 bg-warning/12 px-4 py-3 text-sm text-warning">
          Admin requested changes. Update your listing and resubmit for review.
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-sm text-secondary">
          Current status: <span className="font-semibold text-primary">{String(props.property.status)}</span>
        </div>

        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={() => void submit()}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
        >
          {busy
            ? status === "CHANGES_REQUESTED"
              ? "Resubmitting…"
              : "Submitting…"
            : status === "CHANGES_REQUESTED"
              ? "Resubmit for review"
              : "Submit to admin"}
        </button>
      </div>

      {!canSubmit ? (
        <div className="rounded-xl border bg-warm-alt px-4 py-3 text-sm text-secondary">
          Submission is only available in{" "}
          <span className="font-semibold">DRAFT</span> or{" "}
          <span className="font-semibold">CHANGES_REQUESTED</span> status.
        </div>
      ) : null}

      <div className="rounded-xl border border-line/70 bg-warm-base p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Changes since last review</div>
        {changesLoading ? (
          <div className="mt-2 text-sm text-secondary">Loading change summary…</div>
        ) : changes.length === 0 ? (
          <div className="mt-2 text-sm text-secondary">No tracked changes yet.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {changes.map((change, idx) => (
              <div
                key={`${change.field}-${idx}`}
                className="rounded-lg border border-line/70 bg-surface px-3 py-2"
              >
                <div className="text-xs font-semibold text-muted">{humanizeField(change.field)}</div>
                <div className="mt-1 text-sm text-secondary">
                  <span className="font-semibold text-danger">{formatChangeValue(change.before)}</span>
                  <span className="mx-2 text-muted">→</span>
                  <span className="font-semibold text-success">{formatChangeValue(change.after)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {err ? (
        <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger whitespace-pre-wrap">
          {err}
        </div>
      ) : null}
    </div>
  );
}
