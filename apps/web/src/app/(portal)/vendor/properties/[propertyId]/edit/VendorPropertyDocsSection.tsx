"use client";

import { useMemo, useState } from "react";
import type { VendorPropertyDocument } from "@/lib/api/portal/vendor";
import { uploadVendorPropertyDocument } from "@/lib/api/portal/vendor";

function latestOwnership(documents: VendorPropertyDocument[]): VendorPropertyDocument | null {
  const list = documents.filter((d) => String(d.type) === "OWNERSHIP_PROOF");
  if (list.length === 0) return null;
  return list
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

export function VendorPropertyDocsSection(props: {
  propertyId: string;
  documents: VendorPropertyDocument[];
  onChanged: () => void;
}) {
  const current = useMemo(() => latestOwnership(props.documents), [props.documents]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File | null) {
    if (!file) return;
    setErr(null);
    setBusy(true);

    try {
      await uploadVendorPropertyDocument(props.propertyId, "OWNERSHIP_PROOF", file);
      props.onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-6 space-y-4">
      <div>
        <div className="text-sm font-semibold text-primary">Ownership proof</div>
        <div className="mt-1 text-sm text-secondary">
          This document is stored in cloud storage and used by admin for verification.
        </div>
      </div>

      <div className="rounded-xl border border-line/70 bg-warm-alt p-4">
        <div className="text-sm font-semibold text-primary">Current status</div>
        <div className="mt-1 text-sm text-secondary">
          {current ? (
            <>
              Uploaded: <span className="font-medium">{current.originalName ?? "document"}</span>
              <div className="mt-1 text-xs text-secondary">Uploaded at: {new Date(current.createdAt).toLocaleString()}</div>
            </>
          ) : (
            "No ownership proof uploaded yet."
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover">
          {busy ? "Uploading…" : "Upload ownership proof"}
          <input
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => void upload(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            disabled={busy}
          />
        </label>
        <div className="text-sm text-secondary">PDF or image is okay (backend validates).</div>
      </div>

      {err ? (
        <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger whitespace-pre-wrap">
          {err}
        </div>
      ) : null}
    </div>
  );
}
