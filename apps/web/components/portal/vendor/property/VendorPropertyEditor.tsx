"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type {
  AmenitiesCatalogResponse,
  UpdateVendorPropertyLocationInput,
  VendorPropertyDeletionRequest,
  VendorPropertyDetail,
  VendorPropertyDraftInput,
  VendorPropertyUnpublishRequest,
} from "@/lib/api/portal/vendor";
import {
  getVendorPropertyDeletionRequest,
  getVendorPropertyUnpublishRequest,
  getAmenitiesCatalog,
  publishVendorProperty,
  requestVendorPropertyUnpublish,
  requestVendorPropertyDeletion,
  submitVendorPropertyForReview,
  updateVendorPropertyAmenities,
  updateVendorPropertyDraft,
  updateVendorPropertyLocation,
  getVendorPropertyDraft,
} from "@/lib/api/portal/vendor";

import { MediaManager } from "@/components/portal/vendor/property/MediaManager";
import { DocumentManager } from "@/components/portal/vendor/property/DocumentManager";
import { ReviewChecklistCard, computeGates } from "@/components/portal/vendor/property/ReviewChecklistCard";
import { SelectableTile } from "@/components/portal/ui/SelectableTile";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";

const PortalMapPicker = dynamic(
  () => import("@/components/portal/maps/PortalMapPicker").then((mod) => mod.PortalMapPicker),
  {
    ssr: false,
    loading: () => <PortalLoadingCard kind="mapPicker" />,
  },
);

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type TabKey = "basics" | "location" | "amenities" | "photos" | "documents" | "review";

function toDraftInput(p: VendorPropertyDetail): VendorPropertyDraftInput {
  const translationEn = p.translations?.find((row) => row.locale === "en");
  const translationAr = p.translations?.find((row) => row.locale === "ar");

  return {
    title: p.title ?? "",
    slug: p.slug ?? "",
    description: p.description ?? "",
    city: p.city ?? "",
    area: p.area ?? null,
    address: p.address ?? null,
    maxGuests: p.maxGuests ?? 1,
    bedrooms: p.bedrooms ?? 0,
    bathrooms: p.bathrooms ?? 0,
    basePrice: p.basePrice ?? 0,
    cleaningFee: p.cleaningFee ?? 0,
    currency: p.currency ?? "AED",
    minNights: p.minNights ?? 1,
    maxNights: p.maxNights ?? null,
    checkInFromMin: p.checkInFromMin ?? null,
    checkInToMax: p.checkInToMax ?? null,
    checkOutMin: p.checkOutMin ?? null,
    isInstantBook: Boolean(p.isInstantBook),
    translations: {
      en: {
        title: translationEn?.title ?? p.title ?? "",
        description: translationEn?.description ?? p.description ?? "",
        areaLabel: translationEn?.areaLabel ?? p.area ?? "",
        tagline: translationEn?.tagline ?? "",
      },
      ar: {
        title: translationAr?.title ?? "",
        description: translationAr?.description ?? "",
        areaLabel: translationAr?.areaLabel ?? "",
        tagline: translationAr?.tagline ?? "",
      },
    },
  };
}

export default function VendorPropertyEditor(props: {
  initial: VendorPropertyDetail;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<TabKey>("basics");
  const [property, setProperty] = useState<VendorPropertyDetail>(props.initial);

  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);

  const [amenitiesCatalog, setAmenitiesCatalog] = useState<AmenitiesCatalogResponse | null>(null);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<VendorPropertyDeletionRequest | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [unpublishRequest, setUnpublishRequest] = useState<VendorPropertyUnpublishRequest | null>(null);
  const [unpublishReason, setUnpublishReason] = useState("");

  // keep local state in sync if parent refreshes
  useEffect(() => {
    setProperty(props.initial);
  }, [props.initial]);

  useEffect(() => {
    let alive = true;

    async function loadDeletionRequest() {
      try {
        const request = await getVendorPropertyDeletionRequest(property.id);
        if (!alive) return;
        setDeletionRequest(request);
      } catch {
        if (!alive) return;
        setDeletionRequest(null);
      }
    }

    async function loadUnpublishRequest() {
      try {
        const request = await getVendorPropertyUnpublishRequest(property.id);
        if (!alive) return;
        setUnpublishRequest(request);
      } catch {
        if (!alive) return;
        setUnpublishRequest(null);
      }
    }

    void loadDeletionRequest();
    void loadUnpublishRequest();
    return () => {
      alive = false;
    };
  }, [property.id]);

  const draft = useMemo(() => toDraftInput(property), [property]);

  const selectedAmenityIds = useMemo(
    () =>
      (Array.isArray(property.amenities) ? property.amenities : []).map(
        (a) => a.amenity.id
      ),
    [property.amenities]
  );

  const readiness = useMemo(() => {
    const { gates } = computeGates({ ...property, media: Array.isArray(property.media) ? property.media : [], documents: Array.isArray(property.documents) ? property.documents : [], amenities: Array.isArray(property.amenities) ? property.amenities : [] });
    const allOk = gates.every((g) => g.ok);
    return { allOk, gates };
  }, [property]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "basics", label: "Basics" },
    { key: "location", label: "Location" },
    { key: "amenities", label: "Amenities" },
    { key: "photos", label: "Photos" },
    { key: "documents", label: "Documents" },
    { key: "review", label: "Review & Publish" },
  ];

  async function hardRefreshFromServer() {
    const latest = await getVendorPropertyDraft(property.id);
    setProperty(latest);
  }

  async function saveBasics(next: VendorPropertyDraftInput) {
    setError(null);
    setBusy("Saving basics...");
    try {
      const updated = await updateVendorPropertyDraft(property.id, next);
      setProperty(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save basics");
    } finally {
      setBusy(null);
    }
  }

  async function saveLocation(next: UpdateVendorPropertyLocationInput) {
    setError(null);
    setBusy("Saving location...");
    try {
      const updated = await updateVendorPropertyLocation(property.id, next);
      setProperty(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save location");
    } finally {
      setBusy(null);
    }
  }

  async function ensureAmenitiesCatalog() {
    if (amenitiesCatalog) return;
    setAmenitiesLoading(true);
    setError(null);
    try {
      const cat = await getAmenitiesCatalog();
      setAmenitiesCatalog(cat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load amenities catalog");
    } finally {
      setAmenitiesLoading(false);
    }
  }

  async function toggleAmenity(id: string) {
    const nextIds = selectedAmenityIds.includes(id)
      ? selectedAmenityIds.filter((x) => x !== id)
      : [...selectedAmenityIds, id];

    setError(null);
    setBusy("Saving amenities...");
    try {
      const updated = await updateVendorPropertyAmenities(property.id, nextIds);
      setProperty(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save amenities");
    } finally {
      setBusy(null);
    }
  }

  async function submitForReview() {
    setError(null);
    setBusy("Submitting for review...");
    try {
      const updated = await submitVendorPropertyForReview(property.id);
      setProperty(updated);
      await props.onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setError(null);
    setBusy("Publishing...");
    try {
      const updated = await publishVendorProperty(property.id);
      setProperty(updated);
      await props.onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  async function submitUnpublishRequest() {
    setError(null);
    setBusy("Submitting unpublish request...");
    try {
      const created = await requestVendorPropertyUnpublish(
        property.id,
        unpublishReason,
      );
      setUnpublishRequest(created);
      setUnpublishReason("");
      await props.onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unpublish request failed");
    } finally {
      setBusy(null);
    }
  }

  async function submitDeletionRequest() {
    setError(null);
    setBusy("Submitting deletion request...");
    try {
      const created = await requestVendorPropertyDeletion(property.id, deletionReason);
      setDeletionRequest(created);
      setDeletionReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {busy ? (
        <div className="rounded-2xl border border-line bg-warm-alt p-3 text-sm text-secondary">{busy}</div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      <div className="portal-card rounded-2xl bg-surface/90 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-primary">{property.title || "Untitled property"}</div>
            <div className="mt-1 text-sm text-secondary">
              ID: <span className="font-mono">{property.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void hardRefreshFromServer()}
              disabled={busy !== null}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-line",
                busy ? "bg-surface text-muted" : "bg-surface text-primary hover:bg-warm-alt"
              )}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                if (t.key === "amenities") void ensureAmenitiesCatalog();
              }}
              className={cn(
                "inline-flex min-w-0 max-w-full items-center rounded-full px-4 py-2 text-sm font-semibold transition",
                tab === t.key
                  ? "bg-brand text-accent-text shadow-[0_10px_26px_rgba(79,70,229,0.24)]"
                  : "bg-surface/88 text-primary ring-1 ring-line/28 hover:bg-accent-soft/22"
              )}
            >
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "basics" ? (
        <BasicsPanel
          key={`${property.id}:${property.updatedAt}`}
          value={draft}
          disabled={busy !== null}
          onSave={saveBasics}
        />
      ) : null}

      {tab === "location" ? (
        <LocationPanel
          key={`${property.id}:${property.city ?? ""}:${property.area ?? ""}:${property.address ?? ""}:${property.lat ?? ""}:${property.lng ?? ""}`}
          value={{
            city: property.city ?? "",
            area: property.area ?? null,
            address: property.address ?? null,
            lat: property.lat,
            lng: property.lng,
          }}
          disabled={busy !== null}
          onSave={saveLocation}
        />
      ) : null}

      {tab === "amenities" ? (
        <section className="portal-card rounded-2xl bg-surface/90 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-primary">Amenities</h3>
              <p className="mt-1 text-sm text-secondary">Select what your property offers.</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-accent-soft/40 px-3 py-1 text-xs font-semibold text-brand">
              Selected: {selectedAmenityIds.length}
            </span>
          </div>

          {amenitiesLoading ? (
            <div className="mt-4 text-sm text-secondary">Loading amenities…</div>
          ) : !amenitiesCatalog ? (
            <div className="mt-4 text-sm text-secondary">Open this tab to load catalog.</div>
          ) : (
            <div className="mt-5 space-y-5">
              {amenitiesCatalog.amenitiesGrouped.map((g) => (
                <div key={g.group.id} className="portal-card rounded-2xl bg-warm-alt/72 p-4">
                  <div className="text-sm font-semibold text-primary">{g.group.name}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {g.amenities.map((a) => {
                      const checked = selectedAmenityIds.includes(a.id);
                      return (
                        <SelectableTile
                          key={a.id}
                          label={a.name}
                          selected={checked}
                          disabled={busy !== null}
                          onClick={() => void toggleAmenity(a.id)}
                          className="min-h-[44px]"
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "photos" ? (
        <MediaManager
          property={property}
          onChanged={(next) => setProperty(next)}
        />
      ) : null}

      {tab === "documents" ? (
        <DocumentManager
          property={property}
          onChanged={(next) => setProperty(next)}
        />
      ) : null}

      {tab === "review" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ReviewChecklistCard property={property} />

            <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-primary">Actions</h3>
                  <p className="mt-1 text-sm text-secondary">
                    Submit once gates pass. Publish only after admin approval.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  disabled={busy !== null || !readiness.allOk}
                  onClick={() => void submitForReview()}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold",
                    busy !== null || !readiness.allOk
                      ? "bg-warm-alt text-muted"
                      : "bg-brand text-accent-text hover:bg-brand-hover"
                  )}
                >
                  Submit for review
                </button>

                <button
                  type="button"
                  disabled={busy !== null || property.status !== "APPROVED"}
                  onClick={() => void publish()}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-line",
                    busy !== null || property.status !== "APPROVED"
                      ? "bg-surface text-muted"
                      : "bg-surface text-primary hover:bg-warm-alt"
                  )}
                >
                  Publish
                </button>

                <button
                  type="button"
                  disabled={busy !== null || property.status !== "PUBLISHED"}
                  onClick={() => void submitUnpublishRequest()}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-line",
                    busy !== null || property.status !== "PUBLISHED"
                      ? "bg-surface text-muted"
                      : "bg-surface text-primary hover:bg-warm-alt"
                  )}
                >
                  Request unpublish
                </button>
              </div>

              {property.status === "APPROVED_PENDING_ACTIVATION_PAYMENT" ? (
                <div className="mt-4 rounded-xl border border-warning/30 bg-warning/12 p-3 text-sm text-warning">
                  Activation payment is required before publishing.
                  <div className="mt-2">
                    <Link
                      href={`/vendor/properties/${encodeURIComponent(property.id)}/activation`}
                      className="inline-flex rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                    >
                      Open activation payment
                    </Link>
                  </div>
                </div>
              ) : null}

              {!readiness.allOk ? (
                <div className="mt-4 rounded-xl border border-warning/30 bg-warning/12 p-3 text-sm text-warning">
                  Your listing is not ready yet. Complete the checklist above before submitting.
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-warning/30 bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-primary">Unpublish request</h3>
                  <p className="mt-1 text-sm text-secondary">
                    Published listings require admin approval before they can be unpublished.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {unpublishRequest ? (
                  <div className="rounded-xl border border-line/80 bg-warm-base p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-primary">Request status</span>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          unpublishRequest.status === "APPROVED"
                            ? "bg-success/12 text-success"
                            : unpublishRequest.status === "REJECTED"
                              ? "bg-danger/12 text-danger"
                              : "bg-warning/12 text-warning",
                        )}
                      >
                        {unpublishRequest.status}
                      </span>
                    </div>
                    {unpublishRequest.reason ? (
                      <div className="mt-2 text-sm text-secondary">
                        Reason: {unpublishRequest.reason}
                      </div>
                    ) : null}
                    {unpublishRequest.adminNotes ? (
                      <div className="mt-2 text-sm text-secondary">
                        Admin note: {unpublishRequest.adminNotes}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!unpublishRequest ||
                unpublishRequest.status === "REJECTED" ||
                unpublishRequest.status === "APPROVED" ? (
                  <div className="space-y-3 rounded-xl border border-line/80 p-4">
                    <textarea
                      value={unpublishReason}
                      onChange={(e) => setUnpublishReason(e.target.value)}
                      rows={3}
                      placeholder="Optional reason for unpublish request..."
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
                      disabled={busy !== null || property.status !== "PUBLISHED"}
                    />
                    <button
                      type="button"
                      disabled={busy !== null || property.status !== "PUBLISHED"}
                      onClick={() => void submitUnpublishRequest()}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-semibold",
                        busy !== null || property.status !== "PUBLISHED"
                          ? "bg-warm-alt text-muted"
                          : "bg-warning text-inverted hover:bg-warning",
                      )}
                    >
                      Submit unpublish request
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-danger/30 bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-primary">Deletion request</h3>
                  <p className="mt-1 text-sm text-secondary">
                    Vendors cannot delete listings instantly. Submit a request and wait for admin approval.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {deletionRequest ? (
                  <div className="rounded-xl border border-line/80 bg-warm-base p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-primary">Request status</span>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          deletionRequest.status === "APPROVED"
                            ? "bg-success/12 text-success"
                            : deletionRequest.status === "REJECTED"
                            ? "bg-danger/12 text-danger"
                            : "bg-warning/12 text-warning",
                        )}
                      >
                        {deletionRequest.status}
                      </span>
                    </div>
                    {deletionRequest.reason ? (
                      <div className="mt-2 text-sm text-secondary">
                        Reason: {deletionRequest.reason}
                      </div>
                    ) : null}
                    {deletionRequest.adminNotes ? (
                      <div className="mt-2 text-sm text-secondary">
                        Admin note: {deletionRequest.adminNotes}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!deletionRequest || deletionRequest.status === "REJECTED" ? (
                  <div className="space-y-3 rounded-xl border border-line/80 p-4">
                    <textarea
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      rows={3}
                      placeholder="Optional reason for deletion request..."
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
                      disabled={busy !== null}
                    />
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void submitDeletionRequest()}
                      className={cn(
                        "rounded-xl px-4 py-2 text-sm font-semibold",
                        busy !== null
                          ? "bg-warm-alt text-muted"
                          : "bg-danger text-inverted hover:bg-danger",
                      )}
                    >
                      Request deletion approval
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Status</div>
              <div className="mt-2 text-sm text-secondary">{property.status}</div>
              <div className="mt-3 text-xs text-muted">
                Flow: DRAFT → UNDER_REVIEW → APPROVED → PUBLISHED
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function Field(props: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", props.className)}>
      <div className="mb-1 text-xs font-semibold text-secondary">{props.label}</div>
      {props.children}
    </label>
  );
}

function BasicsPanel(props: {
  value: VendorPropertyDraftInput;
  disabled: boolean;
  onSave: (next: VendorPropertyDraftInput) => Promise<void>;
}) {
  const [v, setV] = useState<VendorPropertyDraftInput>(props.value);
  const ar = v.translations?.ar ?? {};

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-primary">Basics</h3>
          <p className="mt-1 text-sm text-secondary">Core listing info used in search and detail pages.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title">
          <input
            value={v.title}
            onChange={(e) => setV((p) => ({ ...p, title: e.target.value }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
          />
        </Field>

        <Field label="Slug">
          <input
            value={v.slug ?? ""}
            onChange={(e) => setV((p) => ({ ...p, slug: e.target.value }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
          />
        </Field>

        <Field label="City">
          <input
            value={v.city}
            onChange={(e) => setV((p) => ({ ...p, city: e.target.value }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
          />
        </Field>

        <Field label="Area">
          <input
            value={v.area ?? ""}
            onChange={(e) => setV((p) => ({ ...p, area: e.target.value || null }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
          />
        </Field>

        <Field label="Arabic title">
          <input
            value={ar.title ?? ""}
            onChange={(e) =>
              setV((p) => ({
                ...p,
                translations: {
                  ...(p.translations ?? {}),
                  ar: {
                    ...(p.translations?.ar ?? {}),
                    title: e.target.value,
                  },
                },
              }))
            }
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
            dir="rtl"
          />
        </Field>

        <Field label="Arabic area">
          <input
            value={ar.areaLabel ?? ""}
            onChange={(e) =>
              setV((p) => ({
                ...p,
                translations: {
                  ...(p.translations ?? {}),
                  ar: {
                    ...(p.translations?.ar ?? {}),
                    areaLabel: e.target.value,
                  },
                },
              }))
            }
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
            dir="rtl"
          />
        </Field>

        <Field label="Max guests">
          <input
            type="number"
            value={v.maxGuests ?? 1}
            onChange={(e) => setV((p) => ({ ...p, maxGuests: Number(e.target.value || 1) }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            min={1}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Bedrooms">
          <input
            type="number"
            value={v.bedrooms ?? 0}
            onChange={(e) => setV((p) => ({ ...p, bedrooms: Number(e.target.value || 0) }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            min={0}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Bathrooms">
          <input
            type="number"
            value={v.bathrooms ?? 0}
            onChange={(e) => setV((p) => ({ ...p, bathrooms: Number(e.target.value || 0) }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            min={0}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Base price (minor units)">
          <input
            type="number"
            value={v.basePrice}
            onChange={(e) => setV((p) => ({ ...p, basePrice: Number(e.target.value || 0) }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            min={0}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Cleaning fee (minor units)">
          <input
            type="number"
            value={v.cleaningFee ?? 0}
            onChange={(e) => setV((p) => ({ ...p, cleaningFee: Number(e.target.value || 0) }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            min={0}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Currency">
          <input
            value={v.currency ?? "AED"}
            onChange={(e) => setV((p) => ({ ...p, currency: e.target.value || "AED" }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
          />
        </Field>

        <Field label="Min nights">
          <input
            type="number"
            value={v.minNights ?? 1}
            onChange={(e) => setV((p) => ({ ...p, minNights: Number(e.target.value || 1) }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            min={1}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Max nights (optional)">
          <input
            type="number"
            value={v.maxNights ?? ""}
            onChange={(e) => setV((p) => ({ ...p, maxNights: e.target.value ? Number(e.target.value) : null }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            min={1}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Description" className="sm:col-span-2">
          <textarea
            value={v.description ?? ""}
            onChange={(e) => setV((p) => ({ ...p, description: e.target.value }))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            rows={6}
            disabled={props.disabled}
          />
        </Field>

        <Field label="Arabic description" className="sm:col-span-2">
          <textarea
            value={ar.description ?? ""}
            onChange={(e) =>
              setV((p) => ({
                ...p,
                translations: {
                  ...(p.translations ?? {}),
                  ar: {
                    ...(p.translations?.ar ?? {}),
                    description: e.target.value,
                  },
                },
              }))
            }
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            rows={6}
            disabled={props.disabled}
            dir="rtl"
          />
        </Field>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={() =>
            void props.onSave({
              ...v,
              translations: {
                ...(v.translations ?? {}),
                en: {
                  ...(v.translations?.en ?? {}),
                  title: v.title,
                  description: v.description ?? null,
                  areaLabel: v.area ?? null,
                },
              },
            })
          }
          disabled={props.disabled}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-semibold",
            props.disabled ? "bg-warm-alt text-muted" : "bg-brand text-accent-text hover:bg-brand-hover"
          )}
        >
          Save basics
        </button>
      </div>
    </section>
  );
}

function LocationPanel(props: {
  value: { city: string; area: string | null; address: string | null; lat: number | null; lng: number | null };
  disabled: boolean;
  onSave: (next: UpdateVendorPropertyLocationInput) => Promise<void>;
}) {
  const [city, setCity] = useState(props.value.city);
  const [area, setArea] = useState(props.value.area ?? "");
  const [address, setAddress] = useState(props.value.address ?? "");
  const [lat, setLat] = useState(String(props.value.lat ?? ""));
  const [lng, setLng] = useState(String(props.value.lng ?? ""));

  // Use NaN for empty strings so that 0 is never treated as a valid coordinate
  const latNum = lat.trim() !== "" ? Number(lat) : NaN;
  const lngNum = lng.trim() !== "" ? Number(lng) : NaN;
  const canSave = city.trim().length > 0 && Number.isFinite(latNum) && Number.isFinite(lngNum);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-primary">Location</h3>
          <p className="mt-1 text-sm text-secondary">Drop a pin on the map to set exact location.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="City">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
          />
        </Field>

        <Field label="Area">
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
          />
        </Field>

        <Field label="Address" className="sm:col-span-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
          />
        </Field>

        <Field label="Latitude">
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
            placeholder="25.2048"
          />
        </Field>

        <Field label="Longitude">
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
            disabled={props.disabled}
            placeholder="55.2708"
          />
        </Field>
      </div>

      <div className="mt-4">
        <PortalMapPicker
          value={{
            lat: Number.isFinite(latNum) ? latNum : null,
            lng: Number.isFinite(lngNum) ? lngNum : null,
            address: address.trim().length ? address.trim() : null,
          }}
          onChange={(next) => {
            setLat(String(next.lat));
            setLng(String(next.lng));
            if (next.address) setAddress(next.address);
          }}
          disabled={props.disabled}
        />
      </div>

      <div className="mt-5">
        <button
          type="button"
          disabled={props.disabled || !canSave}
          onClick={() =>
            void props.onSave({
              city: city.trim(),
              area: area.trim().length ? area.trim() : null,
              address: address.trim().length ? address.trim() : null,
              lat: latNum,
              lng: lngNum,
            })
          }
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-semibold",
            props.disabled || !canSave ? "bg-warm-alt text-muted" : "bg-brand text-accent-text hover:bg-brand-hover"
          )}
        >
          Save location
        </button>
      </div>
    </section>
  );
}
