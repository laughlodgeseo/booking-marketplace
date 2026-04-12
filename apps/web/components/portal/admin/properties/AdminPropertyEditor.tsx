"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type {
  AdminAmenitiesCatalogResponse,
  AdminMediaItem,
  AdminPropertyDetail,
  AdminPropertyUpdateInput,
} from "@/lib/api/portal/admin";
import {
  deleteAdminPropertyDocument,
  downloadAdminPropertyDocument,
  getAdminAmenitiesCatalog,
  publishAdminProperty,
  unpublishAdminProperty,
  updateAdminProperty,
  updateAdminPropertyAmenities,
  viewAdminPropertyDocument,
} from "@/lib/api/portal/admin";
import { AdminPropertyMediaManager } from "@/components/portal/admin/properties/AdminPropertyMediaManager";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SelectableTile } from "@/components/portal/ui/SelectableTile";
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_VALUES,
  normalizePropertyType,
  type PropertyType,
} from "@/lib/types/property-type";

const PropertyLocationPicker = dynamic(() => import("@/components/maps/PropertyLocationPicker"), {
  ssr: false,
});

type TabKey = "basics" | "location" | "amenities" | "photos" | "documents" | "review";

type PropertyDocument = {
  id: string;
  type: string;
  originalName: string | null;
  mimeType: string | null;
  createdAt: string;
  downloadUrl?: string;
  viewUrl?: string;
};

type PropertyAmenity = {
  amenity: {
    id: string;
    name: string;
    group?: { id: string; name: string } | null;
  };
};

type EditableAdminProperty = AdminPropertyDetail & {
  id: string;
  status?: string;
  vendor?: { id: string; email: string; fullName: string | null } | null;
  createdByAdminId?: string | null;
  updatedAt?: string;

  title?: string;
  slug?: string;
  propertyType?: PropertyType;
  description?: string | null;

  city?: string;
  area?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;

  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;

  basePrice?: number;
  cleaningFee?: number | null;
  currency?: string;
  minNights?: number | null;
  maxNights?: number | null;

  media?: AdminMediaItem[];
  documents?: PropertyDocument[];
  amenities?: PropertyAmenity[];
};

type AmenitiesGroup = AdminAmenitiesCatalogResponse["amenitiesGrouped"][number];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function toProperty(input: AdminPropertyDetail): EditableAdminProperty {
  return input as EditableAdminProperty;
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function propertyTranslation(
  property: EditableAdminProperty,
  locale: "en" | "ar"
): {
  title?: string;
  description?: string | null;
  areaLabel?: string | null;
  tagline?: string | null;
} | null {
  const rows = Array.isArray(property.translations) ? property.translations : [];
  const hit = rows.find((row) => row && typeof row === "object" && row.locale === locale);
  return hit ?? null;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function safeFilename(document: PropertyDocument): string {
  const explicit = (document.originalName ?? "").trim();
  if (explicit.length > 0) return explicit;
  const ext =
    document.mimeType === "application/pdf"
      ? ".pdf"
      : document.mimeType?.startsWith("image/")
        ? ".jpg"
        : "";
  return `${document.type.toLowerCase()}_${document.id}${ext}`;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function AdminPropertyEditor(props: {
  initial: AdminPropertyDetail;
  onRefresh: () => Promise<AdminPropertyDetail>;
}) {
  const [tab, setTab] = useState<TabKey>("basics");
  const [property, setProperty] = useState<EditableAdminProperty>(toProperty(props.initial));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [amenitiesCatalog, setAmenitiesCatalog] = useState<AmenitiesGroup[]>([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);

  const [preview, setPreview] = useState<{ url: string; mime: string } | null>(null);

  const [basics, setBasics] = useState({
    propertyType: normalizePropertyType(property.propertyType),
    title: property.title ?? "",
    slug: property.slug ?? "",
    description: property.description ?? "",
    titleAr: propertyTranslation(property, "ar")?.title ?? "",
    descriptionAr: propertyTranslation(property, "ar")?.description ?? "",
    areaAr: propertyTranslation(property, "ar")?.areaLabel ?? "",
    maxGuests: String(property.maxGuests ?? 1),
    bedrooms: String(property.bedrooms ?? 0),
    bathrooms: String(property.bathrooms ?? 0),
    basePrice: String(property.basePrice ?? 0),
    cleaningFee: String(property.cleaningFee ?? 0),
    currency: property.currency ?? "AED",
    minNights: String(property.minNights ?? 1),
    maxNights: property.maxNights == null ? "" : String(property.maxNights),
  });

  const [location, setLocation] = useState({
    city: property.city ?? "",
    area: property.area ?? "",
    address: property.address ?? "",
    lat: property.lat == null ? "" : String(property.lat),
    lng: property.lng == null ? "" : String(property.lng),
  });

  useEffect(() => {
    setProperty(toProperty(props.initial));
  }, [props.initial]);

  useEffect(() => {
    const ar = propertyTranslation(property, "ar");
    setBasics({
      propertyType: normalizePropertyType(property.propertyType),
      title: property.title ?? "",
      slug: property.slug ?? "",
      description: property.description ?? "",
      titleAr: ar?.title ?? "",
      descriptionAr: ar?.description ?? "",
      areaAr: ar?.areaLabel ?? "",
      maxGuests: String(property.maxGuests ?? 1),
      bedrooms: String(property.bedrooms ?? 0),
      bathrooms: String(property.bathrooms ?? 0),
      basePrice: String(property.basePrice ?? 0),
      cleaningFee: String(property.cleaningFee ?? 0),
      currency: property.currency ?? "AED",
      minNights: String(property.minNights ?? 1),
      maxNights: property.maxNights == null ? "" : String(property.maxNights),
    });
  }, [property]);

  useEffect(() => {
    setLocation({
      city: property.city ?? "",
      area: property.area ?? "",
      address: property.address ?? "",
      lat: property.lat == null ? "" : String(property.lat),
      lng: property.lng == null ? "" : String(property.lng),
    });
  }, [property.address, property.area, property.city, property.lat, property.lng]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const documents = useMemo<PropertyDocument[]>(() => {
    return Array.isArray(property.documents) ? property.documents : [];
  }, [property.documents]);

  const selectedAmenityIds = useMemo(() => {
    const rows = Array.isArray(property.amenities) ? property.amenities : [];
    return rows.map((item) => item.amenity.id);
  }, [property.amenities]);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "basics", label: "Basics" },
    { key: "location", label: "Location" },
    { key: "amenities", label: "Amenities" },
    { key: "photos", label: "Photos" },
    { key: "documents", label: "Documents" },
    { key: "review", label: "Review & Publish" },
  ];

  async function hardRefresh() {
    setBusy("Refreshing...");
    setError(null);
    try {
      const latest = await props.onRefresh();
      setProperty(toProperty(latest));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh property.");
    } finally {
      setBusy(null);
    }
  }

  async function saveBasics() {
    const payload: AdminPropertyUpdateInput = {
      propertyType: normalizePropertyType(basics.propertyType),
      title: basics.title.trim(),
      slug: basics.slug.trim(),
      description: basics.description.trim() || null,
      maxGuests: toNumber(basics.maxGuests, property.maxGuests ?? 1),
      bedrooms: toNumber(basics.bedrooms, property.bedrooms ?? 0),
      bathrooms: toNumber(basics.bathrooms, property.bathrooms ?? 0),
      basePrice: toNumber(basics.basePrice, property.basePrice ?? 0),
      cleaningFee: toOptionalNumber(basics.cleaningFee),
      currency: basics.currency.trim() || "AED",
      minNights: toOptionalNumber(basics.minNights),
      maxNights: toOptionalNumber(basics.maxNights),
      translations: {
        en: {
          title: basics.title.trim(),
          description: basics.description.trim() || null,
          areaLabel: location.area.trim() || null,
        },
        ar: {
          title: basics.titleAr.trim() || undefined,
          description: basics.descriptionAr.trim() || null,
          areaLabel: basics.areaAr.trim() || null,
        },
      },
    };

    setBusy("Saving basics...");
    setError(null);
    setNotice(null);
    try {
      const updated = await updateAdminProperty(property.id, payload);
      setProperty(toProperty(updated));
      setNotice("Basics saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save basics.");
    } finally {
      setBusy(null);
    }
  }

  async function saveLocation() {
    const lat = toOptionalNumber(location.lat);
    const lng = toOptionalNumber(location.lng);
    if (lat === null || lng === null) {
      setError("Latitude and longitude are required.");
      return;
    }

    const payload: AdminPropertyUpdateInput = {
      city: location.city.trim(),
      area: location.area.trim() || null,
      address: location.address.trim() || null,
      lat,
      lng,
    };

    setBusy("Saving location...");
    setError(null);
    setNotice(null);
    try {
      const updated = await updateAdminProperty(property.id, payload);
      setProperty(toProperty(updated));
      setNotice("Location saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save location.");
    } finally {
      setBusy(null);
    }
  }

  async function ensureAmenitiesCatalog() {
    if (amenitiesCatalog.length > 0) return;
    setAmenitiesLoading(true);
    setError(null);
    try {
      const catalog = await getAdminAmenitiesCatalog();
      setAmenitiesCatalog(catalog.amenitiesGrouped ?? []);
    } catch (catalogError) {
      setError(
        catalogError instanceof Error
          ? catalogError.message
          : "Failed to load amenities catalog."
      );
    } finally {
      setAmenitiesLoading(false);
    }
  }

  async function toggleAmenity(amenityId: string) {
    const nextIds = selectedAmenityIds.includes(amenityId)
      ? selectedAmenityIds.filter((id) => id !== amenityId)
      : [...selectedAmenityIds, amenityId];

    setBusy("Saving amenities...");
    setError(null);
    setNotice(null);
    try {
      const updated = await updateAdminPropertyAmenities(property.id, nextIds);
      setProperty(toProperty(updated));
      setNotice("Amenities updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update amenities.");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("Publishing...");
    setError(null);
    setNotice(null);
    try {
      const updated = await publishAdminProperty(property.id);
      setProperty(toProperty(updated));
      setNotice("Property published.");
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Failed to publish property.");
    } finally {
      setBusy(null);
    }
  }

  async function unpublish() {
    setBusy("Unpublishing...");
    setError(null);
    setNotice(null);
    try {
      const updated = await unpublishAdminProperty(property.id);
      setProperty(toProperty(updated));
      setNotice("Property unpublished.");
    } catch (unpublishError) {
      setError(
        unpublishError instanceof Error
          ? unpublishError.message
          : "Failed to unpublish property."
      );
    } finally {
      setBusy(null);
    }
  }

  async function downloadDocument(document: PropertyDocument) {
    setBusy("Downloading document...");
    setError(null);
    try {
      const blob = await downloadAdminPropertyDocument(property.id, document.id);
      triggerBlobDownload(blob, safeFilename(document));
    } catch (downloadError) {
      setError(
        downloadError instanceof Error ? downloadError.message : "Failed to download document."
      );
    } finally {
      setBusy(null);
    }
  }

  async function viewDocument(document: PropertyDocument) {
    setBusy("Loading preview...");
    setError(null);
    try {
      const blob = await viewAdminPropertyDocument(property.id, document.id);
      const url = URL.createObjectURL(blob);
      const mime = blob.type || document.mimeType || "application/octet-stream";
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return { url, mime };
      });
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : "Failed to load preview.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteDocument(document: PropertyDocument) {
    const confirmed = window.confirm("Delete this document?");
    if (!confirmed) return;

    setBusy("Deleting document...");
    setError(null);
    setNotice(null);
    try {
      await deleteAdminPropertyDocument(property.id, document.id);
      const nextDocs = documents.filter((item) => item.id !== document.id);
      setProperty((current) => ({ ...current, documents: nextDocs }));
      setNotice("Document deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete document.");
    } finally {
      setBusy(null);
    }
  }

  const locationLat = toOptionalNumber(location.lat);
  const locationLng = toOptionalNumber(location.lng);
  const canSaveLocation =
    location.city.trim().length > 0 &&
    locationLat !== null &&
    locationLng !== null;

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
      {notice ? (
        <div className="rounded-2xl border border-line/80 bg-warm-base p-3 text-sm text-secondary">{notice}</div>
      ) : null}

      <section className="portal-card rounded-2xl bg-surface/90 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">{property.title || "Untitled property"}</h2>
            <div className="mt-1 text-sm text-secondary">ID: <span className="font-mono break-all">{property.id}</span></div>
            <div className="mt-2 flex items-center gap-2">
              <StatusPill status={property.status ?? "UNKNOWN"}>{property.status ?? "UNKNOWN"}</StatusPill>
              <StatusPill tone={property.createdByAdminId ? "success" : "neutral"}>
                {property.createdByAdminId ? "Admin-owned" : "Vendor-owned"}
              </StatusPill>
              <StatusPill tone="neutral" className="bg-accent-soft/45">
                {PROPERTY_TYPE_LABELS[normalizePropertyType(property.propertyType)]}
              </StatusPill>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void hardRefresh()}
            disabled={busy !== null}
            className={cn(
              "rounded-xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt",
              busy ? "opacity-60" : ""
            )}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                if (item.key === "amenities") void ensureAmenitiesCatalog();
              }}
              className={cn(
                "inline-flex min-w-0 max-w-full items-center rounded-full px-4 py-2 text-sm font-semibold transition",
                tab === item.key
                  ? "bg-brand text-accent-text shadow-[0_10px_26px_rgba(79,70,229,0.28)]"
                  : "bg-surface/88 text-primary ring-1 ring-line/28 hover:bg-accent-soft/22"
              )}
            >
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </section>

      {tab === "basics" ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="text-base font-semibold text-primary">Basics</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Property type">
              <select
                value={normalizePropertyType(basics.propertyType)}
                onChange={(event) =>
                  setBasics((current) => ({
                    ...current,
                    propertyType: normalizePropertyType(event.target.value as PropertyType),
                  }))
                }
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm font-medium text-primary"
                disabled={busy !== null}
              >
                {PROPERTY_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {PROPERTY_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input
                value={basics.title}
                onChange={(event) => setBasics((current) => ({ ...current, title: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Slug">
              <input
                value={basics.slug}
                onChange={(event) => setBasics((current) => ({ ...current, slug: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Arabic title">
              <input
                value={basics.titleAr}
                onChange={(event) => setBasics((current) => ({ ...current, titleAr: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
                dir="rtl"
              />
            </Field>
            <Field label="Arabic area">
              <input
                value={basics.areaAr}
                onChange={(event) => setBasics((current) => ({ ...current, areaAr: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
                dir="rtl"
              />
            </Field>
            <Field label="Max guests">
              <input
                value={basics.maxGuests}
                onChange={(event) => setBasics((current) => ({ ...current, maxGuests: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Bedrooms">
              <input
                value={basics.bedrooms}
                onChange={(event) => setBasics((current) => ({ ...current, bedrooms: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Bathrooms">
              <input
                value={basics.bathrooms}
                onChange={(event) => setBasics((current) => ({ ...current, bathrooms: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Base price">
              <input
                value={basics.basePrice}
                onChange={(event) => setBasics((current) => ({ ...current, basePrice: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Cleaning fee">
              <input
                value={basics.cleaningFee}
                onChange={(event) => setBasics((current) => ({ ...current, cleaningFee: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Currency">
              <input
                value={basics.currency}
                onChange={(event) => setBasics((current) => ({ ...current, currency: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Min nights">
              <input
                value={basics.minNights}
                onChange={(event) => setBasics((current) => ({ ...current, minNights: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Max nights">
              <input
                value={basics.maxNights}
                onChange={(event) => setBasics((current) => ({ ...current, maxNights: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Owner" className="sm:col-span-2">
              <div className="rounded-xl border border-line/80 bg-warm-base px-3 py-2 text-sm text-secondary">
                {property.vendor?.fullName || property.vendor?.email || property.vendor?.id || "Admin-owned"}
              </div>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                rows={6}
                value={basics.description}
                onChange={(event) => setBasics((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Arabic description" className="sm:col-span-2">
              <textarea
                rows={6}
                value={basics.descriptionAr}
                onChange={(event) => setBasics((current) => ({ ...current, descriptionAr: event.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-primary"
                disabled={busy !== null}
                dir="rtl"
              />
            </Field>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void saveBasics()}
              disabled={busy !== null}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
            >
              Save basics
            </button>
          </div>
        </section>
      ) : null}

      {tab === "location" ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="text-base font-semibold text-primary">Location</h3>
          <p className="mt-1 text-sm text-secondary">Drop a pin to set location and address.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <input
                value={location.city}
                onChange={(event) => setLocation((current) => ({ ...current, city: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Area">
              <input
                value={location.area}
                onChange={(event) => setLocation((current) => ({ ...current, area: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input
                value={location.address}
                onChange={(event) => setLocation((current) => ({ ...current, address: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Latitude">
              <input
                value={location.lat}
                onChange={(event) => setLocation((current) => ({ ...current, lat: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
            <Field label="Longitude">
              <input
                value={location.lng}
                onChange={(event) => setLocation((current) => ({ ...current, lng: event.target.value }))}
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-primary"
                disabled={busy !== null}
              />
            </Field>
          </div>

          <div className="mt-4">
            <PropertyLocationPicker
              value={
                locationLat !== null && locationLng !== null
                  ? {
                      lat: locationLat,
                      lng: locationLng,
                      address: location.address || undefined,
                    }
                  : undefined
              }
              onChange={(next) =>
                setLocation((current) => ({
                  ...current,
                  lat: String(next.lat),
                  lng: String(next.lng),
                  address: next.address ?? current.address,
                }))
              }
              disabled={busy !== null}
            />
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => void saveLocation()}
              disabled={busy !== null || !canSaveLocation}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
            >
              Save location
            </button>
          </div>
        </section>
      ) : null}

      {tab === "amenities" ? (
        <section className="portal-card rounded-2xl bg-surface/90 p-5">
          <h3 className="text-base font-semibold text-primary">Amenities</h3>
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full bg-accent-soft/40 px-3 py-1 text-xs font-semibold text-brand">
              Selected: {selectedAmenityIds.length}
            </span>
          </div>
          {amenitiesLoading ? (
            <div className="mt-3 text-sm text-secondary">Loading amenities...</div>
          ) : amenitiesCatalog.length === 0 ? (
            <div className="mt-3 text-sm text-secondary">No amenity catalog available.</div>
          ) : (
            <div className="mt-4 space-y-4">
              {amenitiesCatalog.map((group) => (
                <div key={group.group?.id ?? "ungrouped"} className="portal-card rounded-2xl bg-warm-alt/72 p-4">
                  <div className="text-sm font-semibold text-primary">{group.group?.name ?? "Other"}</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.amenities.map((amenity) => {
                      const selected = selectedAmenityIds.includes(amenity.id);
                      return (
                        <SelectableTile
                          key={amenity.id}
                          label={amenity.name}
                          selected={selected}
                          onClick={() => void toggleAmenity(amenity.id)}
                          disabled={busy !== null}
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
        <AdminPropertyMediaManager
          propertyId={property.id}
          initialMedia={Array.isArray(property.media) ? property.media : []}
          onChange={(next) => setProperty((current) => ({ ...current, media: next }))}
        />
      ) : null}

      {tab === "documents" ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="text-base font-semibold text-primary">Documents</h3>
          {documents.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
              No documents uploaded.
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {documents.map((document) => (
                <article key={document.id} className="rounded-2xl border border-line/70 bg-warm-base p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-primary">
                        {document.originalName || document.type}
                      </div>
                      <div className="mt-1 text-xs text-secondary">
                        {document.type} · {document.mimeType || "unknown"} · {fmtDate(document.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void viewDocument(document)}
                        disabled={busy !== null}
                        className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadDocument(document)}
                        disabled={busy !== null}
                        className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDocument(document)}
                        disabled={busy !== null}
                        className="rounded-xl border border-danger/30 bg-danger/12 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/12 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-line/70 bg-warm-base p-4">
            <div className="text-sm font-semibold text-primary">Document preview</div>
            {!preview ? (
              <div className="mt-2 text-sm text-secondary">Click View to preview a document.</div>
            ) : preview.mime.startsWith("image/") ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-line/70 bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt="Document preview" className="max-h-[520px] w-full object-contain" />
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-line/70 bg-surface">
                <iframe src={preview.url} title="Document preview" className="h-[520px] w-full" />
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "review" ? (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h3 className="text-base font-semibold text-primary">Review & publish</h3>
          <p className="mt-1 text-sm text-secondary">
            Admin can edit all listing content, but ownership remains locked.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Status" value={property.status ?? "UNKNOWN"} />
            <Info label="Owner" value={property.vendor?.fullName || property.vendor?.email || "Admin-owned"} />
            <Info label="City" value={property.city || "-"} />
            <Info label="Updated" value={fmtDate(property.updatedAt)} />
          </div>

          {property.status === "APPROVED_PENDING_ACTIVATION_PAYMENT" ? (
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/12 p-3 text-sm text-warning">
              Vendor activation payment is pending. Publishing is blocked until payment is confirmed.
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy !== null || property.status === "PUBLISHED"}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
            >
              Publish listing
            </button>
            <button
              type="button"
              onClick={() => void unpublish()}
              disabled={busy !== null || property.status !== "PUBLISHED"}
              className="rounded-xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
            >
              Unpublish listing
            </button>
          </div>
        </section>
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

function Info(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
      <div className="text-xs font-semibold text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-primary break-words">{props.value}</div>
    </div>
  );
}
