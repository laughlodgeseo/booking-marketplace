"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  approveAdminProperty,
  rejectAdminProperty,
  requestChangesAdminProperty,
} from "@/lib/api/admin/reviewQueue";
import { getAdminPortalPropertyDetail } from "@/lib/api/portal/admin";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Record<string, unknown> };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function getString(value: unknown, key: string): string | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const field = rec[key];
  return typeof field === "string" ? field : null;
}

function getNumber(value: unknown, key: string): number | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const field = rec[key];
  return typeof field === "number" && Number.isFinite(field) ? field : null;
}

function getArray(value: unknown, key: string): unknown[] {
  const rec = asRecord(value);
  if (!rec) return [];
  const field = rec[key];
  return Array.isArray(field) ? field : [];
}

export default function AdminReviewQueueDetailPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = typeof params?.propertyId === "string" ? params.propertyId : "";

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) {
      setState({ kind: "error", message: "Invalid property id." });
      return;
    }

    setState({ kind: "loading" });
    try {
      const data = await getAdminPortalPropertyDetail(propertyId);
      setState({ kind: "ready", data });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Failed to load property",
      });
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const media = useMemo(() => {
    if (state.kind !== "ready") return [] as Array<Record<string, unknown>>;
    return getArray(state.data, "media")
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null);
  }, [state]);

  const documents = useMemo(() => {
    if (state.kind !== "ready") return [] as Array<Record<string, unknown>>;
    return getArray(state.data, "documents")
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null);
  }, [state]);

  async function runApprove() {
    if (!propertyId) return;
    setError(null);
    setBusy("Approving...");
    try {
      await approveAdminProperty(propertyId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function runReject() {
    if (!propertyId) return;
    setError(null);
    setBusy("Rejecting...");
    try {
      await rejectAdminProperty(propertyId, note.trim() || undefined);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  async function runRequestChanges() {
    if (!propertyId) return;
    setError(null);
    setBusy("Requesting changes...");
    try {
      await requestChangesAdminProperty(propertyId, note.trim() || undefined);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request changes failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell
      role="admin"
      title="Review Queue Detail"
      subtitle="Property review decision page"
      right={
        <Link
          href="/admin/review-queue"
          className="rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
        >
          Back to review queue
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          <Link href="/admin" className="hover:text-primary">Portal Home</Link>
          <span className="mx-2">/</span>
          <Link href="/admin/review-queue" className="hover:text-primary">Review Queue</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">Detail</span>
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-48" />
            <SkeletonBlock className="h-48" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">{state.message}</div>
        ) : (
          <>
            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">{getString(state.data, "title") ?? "Untitled property"}</h2>
                  <div className="mt-1 text-xs text-secondary">
                    {[getString(state.data, "area"), getString(state.data, "city")].filter(Boolean).join(", ") || "Location unavailable"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted">Property ID: {getString(state.data, "id") ?? propertyId}</div>
                </div>
                <StatusPill status={getString(state.data, "status") ?? "UNKNOWN"}>
                  {getString(state.data, "status") ?? "UNKNOWN"}
                </StatusPill>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Info label="Base price" value={String(getNumber(state.data, "basePrice") ?? "-")} />
                <Info label="Currency" value={getString(state.data, "currency") ?? "-"} />
                <Info label="Bedrooms" value={String(getNumber(state.data, "bedrooms") ?? "-")} />
                <Info label="Bathrooms" value={String(getNumber(state.data, "bathrooms") ?? "-")} />
              </div>

              <div className="mt-4 rounded-2xl border border-line/70 bg-warm-base p-4">
                <div className="text-xs font-semibold text-muted">Review note</div>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Optional admin note for reject/request-changes"
                  className="mt-2 w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void runApprove()}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:opacity-95 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void runRequestChanges()}
                    className="rounded-xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void runReject()}
                    className="rounded-xl border border-danger/40 bg-danger/12 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/18 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
                {busy ? <div className="mt-3 text-xs font-semibold text-secondary">{busy}</div> : null}
                {error ? (
                  <div className="mt-3 rounded-xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger">{error}</div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Images</div>
              {media.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">No media uploaded.</div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {media.map((item, index) => {
                    const id = getString(item, "id") ?? `media-${index}`;
                    const url = getString(item, "url");
                    return (
                      <div key={id} className="overflow-hidden rounded-2xl border border-line/70 bg-warm-base">
                        <div className="aspect-[4/3] w-full bg-bg-2">
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolveMediaUrl(url)} alt={getString(item, "alt") ?? "Property media"} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="p-3 text-xs text-secondary">{getString(item, "category") ?? "OTHER"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Documents</div>
              {documents.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">No documents uploaded.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {documents.map((doc, index) => {
                    const id = getString(doc, "id") ?? `doc-${index}`;
                    const url = getString(doc, "downloadUrl");
                    return (
                      <div key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/70 bg-warm-base p-3">
                        <div>
                          <div className="text-sm font-semibold text-primary">{getString(doc, "type") ?? "OTHER"}</div>
                          <div className="text-xs text-secondary">{getString(doc, "originalName") ?? id}</div>
                        </div>
                        {url ? (
                          <a
                            href={url}
                            className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                          >
                            Download
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-warm-base p-4">
      <div className="text-xs font-semibold text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-primary">{props.value}</div>
    </div>
  );
}
