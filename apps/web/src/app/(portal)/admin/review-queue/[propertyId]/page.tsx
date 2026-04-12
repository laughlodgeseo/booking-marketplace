"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  approveAdminPropertyWithActivationFee,
  getAdminPropertyChanges,
  type AdminPropertyChange,
  type AdminPropertyChangesResponse,
  rejectAdminProperty,
  requestChangesAdminProperty,
  updateAdminPropertyActivationFee,
} from "@/lib/api/admin/reviewQueue";
import {
  downloadAdminPropertyDocument,
  getAdminPortalPropertyDetail,
  viewAdminPropertyDocument,
} from "@/lib/api/portal/admin";
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

function statusLabel(raw: string | null | undefined): string {
  const base = (raw ?? "UNKNOWN").trim().toUpperCase();
  return base.replaceAll("_", " ");
}

function humanizeField(path: string): string {
  if (!path || path === "(root)") return "Listing";
  return path
    .replace(/\[(\d+)\]/g, " [$1]")
    .replace(/\./g, " > ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function AdminReviewQueueDetailPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = typeof params?.propertyId === "string" ? params.propertyId : "";

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [changesState, setChangesState] = useState<{
    loading: boolean;
    data: AdminPropertyChangesResponse | null;
    error: string | null;
  }>({
    loading: true,
    data: null,
    error: null,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [activationFeeMajor, setActivationFeeMajor] = useState("50.00");
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) {
      setState({ kind: "error", message: "Invalid property id." });
      return;
    }

    setState({ kind: "loading" });
    setChangesState({ loading: true, data: null, error: null });
    try {
      const [data, changes] = await Promise.all([
        getAdminPortalPropertyDetail(propertyId),
        getAdminPropertyChanges(propertyId),
      ]);
      setState({ kind: "ready", data });
      setChangesState({ loading: false, data: changes, error: null });
      const existingFeeMinor = getNumber(data, "activationFee");
      if (existingFeeMinor && existingFeeMinor > 0) {
        setActivationFeeMajor((existingFeeMinor / 100).toFixed(2));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load property";
      setState({
        kind: "error",
        message,
      });
      setChangesState({ loading: false, data: null, error: message });
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

  const changes = useMemo(() => {
    if (!changesState.data?.changes) return [] as AdminPropertyChange[];
    return changesState.data.changes;
  }, [changesState.data]);

  const changedFields = useMemo(() => {
    return new Set(changes.map((change) => String(change.field)));
  }, [changes]);

  const timelineItems = useMemo(() => {
    const items = changesState.data?.reviewHistory ?? [];
    return [...items].sort((a, b) => {
      const aa = Date.parse(a.createdAt);
      const bb = Date.parse(b.createdAt);
      if (Number.isNaN(aa) || Number.isNaN(bb)) return 0;
      return aa - bb;
    });
  }, [changesState.data]);

  function isChanged(field: string): boolean {
    if (changedFields.has(field)) return true;
    for (const changed of changedFields) {
      if (
        changed.startsWith(`${field}.`) ||
        changed.startsWith(`${field}[`) ||
        changed.includes(`.${field}.`) ||
        changed.includes(`.${field}[`)
      ) {
        return true;
      }
    }
    return false;
  }

  async function runApprove() {
    if (!propertyId) return;
    setError(null);
    setActionMessage(null);
    setBusy("Approving...");
    try {
      const parsedMajor = Number(activationFeeMajor);
      if (!Number.isFinite(parsedMajor) || parsedMajor <= 0) {
        throw new Error("Activation fee must be a positive amount.");
      }
      const activationFee = Math.round(parsedMajor * 100);
      if (!Number.isInteger(activationFee) || activationFee <= 0) {
        throw new Error("Activation fee must be a valid amount.");
      }

      await approveAdminPropertyWithActivationFee(propertyId, {
        activationFee,
        activationFeeCurrency: "AED",
        notes: note.trim() || undefined,
      });
      setActionMessage("Property approved with AED activation fee.");
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
    setActionMessage(null);
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
    setActionMessage(null);
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

  async function runUpdateActivationFee() {
    if (!propertyId || state.kind !== "ready") return;
    setError(null);
    setActionMessage(null);
    setBusy("Updating activation fee...");

    try {
      const parsedMajor = Number(activationFeeMajor);
      if (!Number.isFinite(parsedMajor) || parsedMajor <= 0) {
        throw new Error("Activation fee must be a positive amount.");
      }
      const activationFee = Math.round(parsedMajor * 100);
      if (!Number.isInteger(activationFee) || activationFee <= 0) {
        throw new Error("Activation fee must be a valid amount.");
      }

      await updateAdminPropertyActivationFee(propertyId, {
        activationFee,
        activationFeeCurrency: "AED",
      });
      setActionMessage("Activation fee updated. New vendor payment session will use this amount.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update activation fee failed");
    } finally {
      setBusy(null);
    }
  }

  async function downloadDocument(documentId: string, fallbackName: string) {
    if (!propertyId) return;
    setError(null);
    setActionMessage(null);
    setBusy("Downloading document...");
    try {
      const blob = await downloadAdminPropertyDocument(propertyId, documentId);
      triggerBlobDownload(blob, fallbackName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download document.");
    } finally {
      setBusy(null);
    }
  }

  async function viewDocument(documentId: string) {
    if (!propertyId) return;
    setError(null);
    setActionMessage(null);
    setBusy("Opening document...");
    try {
      const blob = await viewAdminPropertyDocument(propertyId, documentId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        URL.revokeObjectURL(url);
        throw new Error("Popup blocked by browser. Allow popups to preview documents.");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to view document.");
    } finally {
      setBusy(null);
    }
  }

  const currentStatus = state.kind === "ready" ? getString(state.data, "status") ?? "UNKNOWN" : "UNKNOWN";
  const canUpdateActivationFee =
    currentStatus === "APPROVED_PENDING_ACTIVATION_PAYMENT" || currentStatus === "APPROVED_PENDING_PAYMENT";

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
                  <h2
                    className={[
                      "inline-block rounded-lg px-2 py-1 text-lg font-semibold text-primary",
                      isChanged("title") ? "border border-warning/40 bg-warning/12" : "",
                    ].join(" ")}
                  >
                    {getString(state.data, "title") ?? "Untitled property"}
                  </h2>
                  <div
                    className={[
                      "mt-1 rounded-md px-2 py-1 text-xs text-secondary",
                      isChanged("city") || isChanged("area") ? "border border-warning/40 bg-warning/12" : "",
                    ].join(" ")}
                  >
                    {[getString(state.data, "area"), getString(state.data, "city")].filter(Boolean).join(", ") || "Location unavailable"}
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted">Property ID: {getString(state.data, "id") ?? propertyId}</div>
                </div>
                <StatusPill status={getString(state.data, "status") ?? "UNKNOWN"}>
                  {statusLabel(getString(state.data, "status") ?? "UNKNOWN")}
                </StatusPill>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Info label="Base price" value={String(getNumber(state.data, "basePrice") ?? "-")} highlighted={isChanged("basePrice")} />
                <Info label="Currency" value={getString(state.data, "currency") ?? "-"} highlighted={isChanged("currency")} />
                <Info label="Bedrooms" value={String(getNumber(state.data, "bedrooms") ?? "-")} highlighted={isChanged("bedrooms")} />
                <Info label="Bathrooms" value={String(getNumber(state.data, "bathrooms") ?? "-")} highlighted={isChanged("bathrooms")} />
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
                <div className="mt-4 text-xs font-semibold text-muted">Activation fee (AED)</div>
                <input
                  value={activationFeeMajor}
                  onChange={(event) => setActivationFeeMajor(event.target.value)}
                  inputMode="decimal"
                  placeholder="50.00"
                  className="mt-2 h-11 w-full rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary"
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
                  {canUpdateActivationFee ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void runUpdateActivationFee()}
                      className="rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-brand/15 disabled:opacity-60"
                    >
                      Update activation fee
                    </button>
                  ) : null}
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
                {actionMessage ? (
                  <div className="mt-3 rounded-xl border border-success/30 bg-success/12 p-3 text-sm text-success">
                    {actionMessage}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-line/70 bg-warm-base p-4">
                <div className="text-sm font-semibold text-primary">Changes Since Last Review</div>
                {changesState.loading ? (
                  <div className="mt-2 text-sm text-secondary">Loading change summary…</div>
                ) : changesState.error ? (
                  <div className="mt-2 rounded-xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger">
                    {changesState.error}
                  </div>
                ) : changes.length === 0 ? (
                  <div className="mt-2 text-sm text-secondary">No tracked changes found since the last review checkpoint.</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {changes.map((change, idx) => (
                      <div key={`${change.field}-${idx}`} className="rounded-xl border border-warning/30 bg-warning/10 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-warning">{humanizeField(change.field)}</div>
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
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Review Timeline</div>
              {timelineItems.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No review events yet.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {timelineItems.map((item, idx) => (
                    <div key={`${item.action}-${item.createdAt}-${idx}`} className="rounded-2xl border border-line/70 bg-warm-base p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {item.action} · {new Date(item.createdAt).toLocaleString()}
                      </div>
                      {item.note ? <div className="mt-1 text-sm text-secondary">{item.note}</div> : null}
                    </div>
                  ))}
                </div>
              )}
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
                    const documentId = getString(doc, "id");
                    const id = documentId ?? `doc-${index}`;
                    const fallbackName =
                      getString(doc, "originalName") ??
                      `${(getString(doc, "type") ?? "document").toLowerCase()}-${id}.pdf`;
                    return (
                      <div key={id} className="rounded-2xl border border-line/70 bg-warm-base p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-primary">{getString(doc, "type") ?? "OTHER"}</div>
                            <div className="truncate text-xs text-secondary">{getString(doc, "originalName") ?? id}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => documentId && void viewDocument(documentId)}
                              disabled={!documentId}
                              className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary transition-all duration-200 ease-in-out hover:bg-warm-alt active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => documentId && void downloadDocument(documentId, fallbackName)}
                              disabled={!documentId}
                              className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary transition-all duration-200 ease-in-out hover:bg-warm-alt active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Download
                            </button>
                          </div>
                        </div>
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

function Info(props: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border bg-warm-base p-4",
        props.highlighted ? "border-warning/50 bg-warning/10" : "border-line/70",
      ].join(" ")}
    >
      <div className="text-xs font-semibold text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-primary">{props.value}</div>
    </div>
  );
}
