"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { PortalAvailabilityCalendar } from "@/components/portal/calendar/PortalAvailabilityCalendar";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  deleteAdminPropertyDocument,
  deleteAdminPropertyMedia,
  downloadAdminPropertyDocument,
  getAdminCalendar,
  getAdminPortalPropertyDetail,
  viewAdminPropertyDocument,
} from "@/lib/api/portal/admin";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";

type AdminPropertyDetail = {
  id: string;
  title: string;
  status: string;
  city: string | null;
  area: string | null;
  currency: string;
  basePrice: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  createdByAdminId: string | null;
  vendor?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  media: Array<{
    id: string;
    url: string;
    alt: string | null;
    sortOrder: number;
    category: string;
  }>;
  documents: Array<{
    id: string;
    type: string;
    originalName: string | null;
    mimeType: string | null;
    createdAt: string;
    downloadUrl: string;
    viewUrl?: string;
  }>;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminPropertyDetail };

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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

function mediaFilename(item: AdminPropertyDetail["media"][number], index: number): string {
  const ext = item.url.split("?")[0]?.split(".").pop()?.trim();
  const suffix = ext && ext.length <= 8 ? `.${ext}` : ".jpg";
  return `property-media-${String(index + 1).padStart(2, "0")}${suffix}`;
}

export default function AdminPropertyDetailPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = typeof params?.propertyId === "string" ? params.propertyId : "";

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) {
      setState({ kind: "error", message: "Missing property id." });
      return;
    }

    setState({ kind: "loading" });
    try {
      const data = (await getAdminPortalPropertyDetail(propertyId)) as AdminPropertyDetail;
      setState({ kind: "ready", data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load property detail",
      });
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const media = useMemo(() => {
    if (state.kind !== "ready") return [];
    return [...(state.data.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [state]);

  async function removeMedia(mediaId: string) {
    const confirmed = window.confirm("Delete this image?");
    if (!confirmed) return;

    setBusy("Deleting image...");
    setMessage(null);
    try {
      await deleteAdminPropertyMedia(propertyId, mediaId, { overrideReadiness: true });
      await load();
      setMessage("Image deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete image.");
    } finally {
      setBusy(null);
    }
  }

  async function removeDocument(documentId: string) {
    const confirmed = window.confirm("Delete this document?");
    if (!confirmed) return;

    setBusy("Deleting document...");
    setMessage(null);
    try {
      await deleteAdminPropertyDocument(propertyId, documentId);
      await load();
      setMessage("Document deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete document.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadDocument(documentId: string, fallbackName: string) {
    setBusy("Downloading document...");
    setMessage(null);
    try {
      const blob = await downloadAdminPropertyDocument(propertyId, documentId);
      triggerBlobDownload(blob, fallbackName);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to download document.");
    } finally {
      setBusy(null);
    }
  }

  async function viewDocument(documentId: string) {
    setBusy("Opening document...");
    setMessage(null);
    try {
      const blob = await viewAdminPropertyDocument(propertyId, documentId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        URL.revokeObjectURL(url);
        setMessage("Popup blocked by browser. Allow popups to preview documents.");
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to open document.");
    } finally {
      setBusy(null);
    }
  }

  function viewMedia(url: string) {
    window.open(resolveMediaUrl(url), "_blank", "noopener,noreferrer");
  }

  function downloadMedia(item: AdminPropertyDetail["media"][number], index: number) {
    const anchor = document.createElement("a");
    anchor.href = resolveMediaUrl(item.url);
    anchor.download = mediaFilename(item, index);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function downloadAllImages() {
    if (media.length === 0) return;
    for (const [index, item] of media.entries()) {
      downloadMedia(item, index);
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
  }

  return (
    <PortalShell
      role="admin"
      title="Property Detail"
      subtitle="Gallery quality, documents, and operational controls"
      right={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/properties/${encodeURIComponent(propertyId)}/edit`}
            className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text shadow-sm hover:bg-brand-hover"
          >
            Edit property
          </Link>
          <Link
            href="/admin/properties"
            className="rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
          >
            Back to properties
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          <Link href="/admin" className="hover:text-primary">Portal Home</Link>
          <span className="mx-2">/</span>
          <Link href="/admin/properties" className="hover:text-primary">Properties</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">Detail</span>
        </div>

        {busy ? (
          <div className="rounded-2xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{busy}</div>
        ) : null}
        {message ? (
          <div className="rounded-2xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">{message}</div>
        ) : null}

        {state.kind === "loading" ? (
          <div className="space-y-4">
            <SkeletonBlock className="h-36" />
            <SkeletonBlock className="h-64" />
            <SkeletonBlock className="h-64" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">{state.message}</div>
        ) : (
          <>
            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">{state.data.title}</h2>
                  <div className="mt-1 text-sm text-secondary">
                    {[state.data.area, state.data.city].filter(Boolean).join(", ") || "Location not set"}
                  </div>
                </div>
                <StatusPill status={state.data.status}>{state.data.status}</StatusPill>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Info label="Base price" value={`${state.data.basePrice} ${state.data.currency}`} />
                <Info label="Guests" value={String(state.data.maxGuests)} />
                <Info label="Bedrooms" value={String(state.data.bedrooms)} />
                <Info label="Bathrooms" value={String(state.data.bathrooms)} />
                <Info label="Vendor" value={state.data.vendor?.fullName || state.data.vendor?.email || "-"} />
                <Info label="Ownership" value={state.data.createdByAdminId ? "Admin-owned" : "Vendor-owned"} />
                <Info label="Created" value={fmtDate(state.data.createdAt)} />
                <Info label="Updated" value={fmtDate(state.data.updatedAt)} />
              </div>
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-primary">Image gallery</div>
                <button
                  type="button"
                  onClick={() => void downloadAllImages()}
                  disabled={media.length === 0}
                  className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                >
                  Download all images
                </button>
              </div>

              {media.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No images uploaded.
                </div>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {media.map((item, index) => (
                    <article key={item.id} className="overflow-hidden rounded-2xl border border-line/70 bg-warm-base">
                      <div className="aspect-[4/3] w-full bg-bg-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveMediaUrl(item.url)}
                          alt={item.alt || "Property image"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="text-xs text-secondary">
                          {item.category} · order {item.sortOrder}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => viewMedia(item.url)}
                            className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadMedia(item, index)}
                            className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeMedia(item.id)}
                            className="rounded-xl border border-danger/30 bg-danger/12 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/12"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Calendar</div>
              <div className="mt-3">
                <PortalAvailabilityCalendar
                  role="admin"
                  loadData={async ({ from, to }) =>
                    getAdminCalendar({ from, to, propertyId })
                  }
                />
              </div>
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Property documents</div>
              {state.data.documents.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No documents uploaded.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {state.data.documents.map((doc) => {
                    const fallbackName = doc.originalName || `${doc.type}-${doc.id}.pdf`;
                    return (
                      <article key={doc.id} className="rounded-2xl border border-line/70 bg-warm-base p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-primary">{doc.originalName || doc.type}</div>
                            <div className="mt-1 text-xs text-secondary">
                              {doc.type} · {doc.mimeType || "unknown"} · {fmtDate(doc.createdAt)}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void viewDocument(doc.id)}
                              className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => void downloadDocument(doc.id, fallbackName)}
                              className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeDocument(doc.id)}
                              className="rounded-xl border border-danger/30 bg-danger/12 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/12"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
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
    <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
      <div className="text-xs font-semibold text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-primary break-words">{props.value}</div>
    </div>
  );
}
