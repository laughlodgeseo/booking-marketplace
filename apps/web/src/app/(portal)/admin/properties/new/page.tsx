"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SelectableTile } from "@/components/portal/ui/SelectableTile";
import { PortalLoadingCard } from "@/components/portal/ui/PortalLoadingCard";
import { AdminPropertyMediaManager } from "@/components/portal/admin/properties/AdminPropertyMediaManager";

import {
  createAdminProperty,
  getAdminPropertyDetail,
  getAdminAmenitiesCatalog,
  getAdminVendors,
  updateAdminPropertyMediaCategory,
  updateAdminPropertyAmenities,
  uploadAdminPropertyMedia,
  type AdminPropertyCreateInput,
  type AdminPropertyDetail,
  type MediaCategory,
} from "@/lib/api/portal/admin";

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

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Slug is still editable, but MUST be resilient:
 * - Arabic / Unicode titles can slugify to ""
 * - user can leave slug empty
 * We always generate a safe fallback to keep create+upload unblocked.
 */
function buildSafeSlug(title: string, slug: string): string {
  const direct = slugify(slug);
  if (direct) return direct;

  const fromTitle = slugify(title);
  if (fromTitle) return fromTitle;

  return `admin-property-${Date.now()}`;
}

function toInt(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toFloat(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

type AmenitiesGroup =
  Awaited<ReturnType<typeof getAdminAmenitiesCatalog>>["amenitiesGrouped"][number];
type AdminVendorOption = { id: string; label: string };

const ADMIN_MEDIA_CATEGORIES: MediaCategory[] = [
  "LIVING_ROOM",
  "BEDROOM",
  "BATHROOM",
  "KITCHEN",
  "COVER",
  "DINING",
  "ENTRY",
  "HALLWAY",
  "STUDY",
  "LAUNDRY",
  "BALCONY",
  "TERRACE",
  "VIEW",
  "EXTERIOR",
  "BUILDING",
  "NEIGHBORHOOD",
  "POOL",
  "GYM",
  "PARKING",
  "AMENITY",
  "FLOOR_PLAN",
  "OTHER",
];

const REQUIRED_UPLOAD_BLOCKS: Array<{
  key: MediaCategory;
  title: string;
  help: string;
}> = [
  { key: "LIVING_ROOM", title: "Living room", help: "Required category" },
  { key: "BEDROOM", title: "Bedroom", help: "Required category" },
  { key: "BATHROOM", title: "Bathroom", help: "Required category" },
  { key: "KITCHEN", title: "Kitchen", help: "Required category" },
];

const REQUIRED_UPLOAD_SET = new Set<MediaCategory>([
  "LIVING_ROOM",
  "BEDROOM",
  "BATHROOM",
  "KITCHEN",
]);

function isMediaCategory(value: string): value is MediaCategory {
  return (ADMIN_MEDIA_CATEGORIES as string[]).includes(value);
}

function categoryLabel(category: MediaCategory): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminPropertyCreatePage() {
  const inputClass =
    "h-11 w-full rounded-2xl border border-line/80 bg-surface px-4 text-sm text-primary shadow-sm outline-none placeholder:text-muted focus:border-brand/45 focus:ring-4 focus:ring-brand/20";

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<AdminPropertyDetail | null>(null);
  const quickUploadInputRefs = useRef<
    Record<string, HTMLInputElement | null>
  >({});

  const [amenitiesGroups, setAmenitiesGroups] = useState<AmenitiesGroup[]>([]);
  const [vendorOptions, setVendorOptions] = useState<AdminVendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsError, setVendorsError] = useState<string | null>(null);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [quickUploadOtherCategory, setQuickUploadOtherCategory] =
    useState<MediaCategory>("COVER");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",

    city: "Dubai",
    area: "",
    address: "",
    lat: "",
    lng: "",

    maxGuests: "2",
    bedrooms: "1",
    bathrooms: "1",

    basePrice: "25000",
    cleaningFee: "0",
    currency: "AED",

    minNights: "1",
    maxNights: "",

    vendorId: "",
    publishNow: true,
  });

  useEffect(() => {
    let alive = true;

    async function loadAmenities() {
      try {
        const catalog = await getAdminAmenitiesCatalog();
        if (!alive) return;
        setAmenitiesGroups(catalog.amenitiesGrouped ?? []);
      } catch {
        // keep UI usable even if catalog load fails
      }
    }

    async function loadVendors() {
      setVendorsLoading(true);
      setVendorsError(null);
      try {
        const data = await getAdminVendors({ page: 1, pageSize: 200 });
        if (!alive) return;
        const items = Array.isArray(data.items) ? data.items : [];
        const normalized = items
          .map((item) => {
            const row = item as Record<string, unknown>;
            const id = typeof row.id === "string" ? row.id : "";
            if (!id) return null;
            const fullName =
              typeof row.fullName === "string" ? row.fullName : "";
            const email = typeof row.email === "string" ? row.email : "";
            const display = fullName || email || id;
            return { id, label: email ? `${display} (${email})` : display };
          })
          .filter((option): option is AdminVendorOption => option !== null)
          .sort((a, b) => a.label.localeCompare(b.label));
        setVendorOptions(normalized);
      } catch (e) {
        if (!alive) return;
        setVendorsError(e instanceof Error ? e.message : "Failed to load vendors");
      } finally {
        if (!alive) return;
        setVendorsLoading(false);
      }
    }

    void loadAmenities();
    void loadVendors();
    return () => {
      alive = false;
    };
  }, []);

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function toggleAmenity(id: string) {
    setSelectedAmenityIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  // NOTE: slug is NOT required for gating; we generate a safe slug fallback.
  const canCreateProperty = useMemo(() => {
    if (!form.title.trim()) return false;
    if (toInt(form.maxGuests) === null) return false;
    if (toInt(form.bedrooms) === null) return false;
    if (toInt(form.bathrooms) === null) return false;
    if (toFloat(form.basePrice) === null) return false;
    return true;
  }, [form]);

  const canSubmit = useMemo(() => {
    if (busy) return false;
    if (property) return false;
    return canCreateProperty;
  }, [busy, property, canCreateProperty]);

  function buildCreatePayload(): AdminPropertyCreateInput {
    return {
      title: form.title.trim(),
      slug: buildSafeSlug(form.title, form.slug),
      description: form.description.trim() || null,

      city: form.city.trim(),
      area: form.area.trim() || null,
      address: form.address.trim() || null,
      lat: toFloat(form.lat),
      lng: toFloat(form.lng),

      maxGuests: toInt(form.maxGuests) ?? 1,
      bedrooms: toInt(form.bedrooms) ?? 0,
      bathrooms: toInt(form.bathrooms) ?? 0,

      basePrice: toFloat(form.basePrice) ?? 0,
      cleaningFee: toFloat(form.cleaningFee),
      currency: form.currency.trim() || "AED",

      minNights: toInt(form.minNights),
      maxNights: toInt(form.maxNights),

      vendorId: form.vendorId.trim() || null,
      publishNow: form.publishNow,
    };
  }

  async function createPropertyRecord(): Promise<AdminPropertyDetail> {
    const created = await createAdminProperty(buildCreatePayload());
    if (selectedAmenityIds.length === 0) {
      return created;
    }
    return updateAdminPropertyAmenities(created.id, selectedAmenityIds);
  }

  async function saveAmenities(propertyId: string) {
    setError(null);
    setBusy("Saving amenities...");

    try {
      const updated = await updateAdminPropertyAmenities(
        propertyId,
        selectedAmenityIds
      );
      setProperty(updated);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save amenities"
      );
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setError(null);
    setBusy("Creating property...");
    try {
      const created = await createPropertyRecord();
      setProperty(created);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Create failed");
    } finally {
      setBusy(null);
    }
  }

  function clearQuickUploadInput(inputKey: string) {
    const element = quickUploadInputRefs.current[inputKey];
    if (element) element.value = "";
  }

  async function quickUpload(
    files: FileList | null,
    category: MediaCategory,
    inputKey: string
  ) {
    if (!files || files.length === 0) return;
    setError(null);

    if (!property && !canCreateProperty) {
      setError(
        "Fill required property fields first (name, guests, rooms, bathrooms, and base price)."
      );
      clearQuickUploadInput(inputKey);
      return;
    }

    let target = property;
    try {
      if (!target) {
        setBusy("Creating property...");
        target = await createPropertyRecord();
      }

      setBusy("Uploading photos...");
      for (const file of Array.from(files)) {
        const createdMedia = await uploadAdminPropertyMedia(target.id, file);
        await updateAdminPropertyMediaCategory(
          target.id,
          createdMedia.id,
          category
        );
      }

      const refreshed = await getAdminPropertyDetail(target.id);
      setProperty(refreshed);
    } catch (uploadError) {
      console.error(uploadError);
      setError(
        uploadError instanceof Error ? uploadError.message : "Photo upload failed"
      );
    } finally {
      setBusy(null);
      clearQuickUploadInput(inputKey);
    }
  }

  return (
    <PortalShell
      role="admin"
      title="Create Property"
      subtitle="Admin-owned listing flow with immediate publish control"
      right={
        <Link
          href="/admin/properties"
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-brand/25 bg-accent-soft/28 px-4 text-sm font-semibold text-brand shadow-sm hover:bg-accent-soft/40"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to properties
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <StatusPill tone="success">Admin owned</StatusPill>
          <StatusPill tone={property ? "success" : "warning"}>
            {property ? "Created" : "Draft setup"}
          </StatusPill>
          <StatusPill tone={form.publishNow ? "success" : "neutral"}>
            {form.publishNow ? "Publish immediately" : "Save approved"}
          </StatusPill>
        </div>

        {busy ? (
          <div className="flex items-center gap-2 rounded-2xl border border-line/80 bg-warm-base p-4 text-sm text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            {busy}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/12 p-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {!property ? (
          <>
            <section className="rounded-3xl border border-line/50 bg-surface p-6 shadow-sm">
              <div className="text-sm font-semibold text-primary">
                Property basics
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Property name" required>
                  <input
                    value={form.title}
                    onChange={(event) => {
                      update("title", event.target.value);
                      if (!form.slug) update("slug", slugify(event.target.value));
                    }}
                    className={inputClass}
                    placeholder="e.g., Marina View Residence"
                  />
                </Field>

                <Field label="Slug">
                  <input
                    value={form.slug}
                    onChange={(event) =>
                      update("slug", slugify(event.target.value))
                    }
                    className={`${inputClass} font-mono`}
                    placeholder="marina-view-residence"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Description">
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        update("description", event.target.value)
                      }
                      className="min-h-[100px] w-full rounded-2xl border border-line/80 bg-surface px-4 py-3 text-sm text-primary outline-none focus:border-brand/45 focus:ring-4 focus:ring-brand/20"
                      placeholder="Describe the stay, design style, and highlights"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-line/50 bg-surface p-6 shadow-sm">
              <div className="text-sm font-semibold text-primary">
                Location & map pin
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="City" required>
                  <input
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    className={inputClass}
                    placeholder="Dubai"
                  />
                </Field>

                <Field label="Area">
                  <input
                    value={form.area}
                    onChange={(event) => update("area", event.target.value)}
                    className={inputClass}
                    placeholder="e.g., JBR"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Address">
                    <input
                      value={form.address}
                      onChange={(event) => update("address", event.target.value)}
                      className={inputClass}
                      placeholder="Building, street, tower"
                    />
                  </Field>
                </div>

                <Field label="Latitude">
                  <input
                    value={form.lat}
                    onChange={(event) => update("lat", event.target.value)}
                    className={inputClass}
                    placeholder="25.2048"
                  />
                </Field>

                <Field label="Longitude">
                  <input
                    value={form.lng}
                    onChange={(event) => update("lng", event.target.value)}
                    className={inputClass}
                    placeholder="55.2708"
                  />
                </Field>

                <div className="md:col-span-2">
                  <PortalMapPicker
                    value={{
                      lat: toFloat(form.lat),
                      lng: toFloat(form.lng),
                      address: form.address || null,
                    }}
                    onChange={(next) => {
                      update("lat", String(next.lat));
                      update("lng", String(next.lng));
                      if (next.address) update("address", next.address);
                    }}
                    disabled={busy !== null}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-line/50 bg-surface p-6 shadow-sm">
              <div className="text-sm font-semibold text-primary">
                Capacity & pricing
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Max guests" required>
                  <input
                    value={form.maxGuests}
                    onChange={(event) => update("maxGuests", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Bedrooms" required>
                  <input
                    value={form.bedrooms}
                    onChange={(event) => update("bedrooms", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Bathrooms" required>
                  <input
                    value={form.bathrooms}
                    onChange={(event) => update("bathrooms", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Base price" required>
                  <input
                    value={form.basePrice}
                    onChange={(event) => update("basePrice", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Cleaning fee">
                  <input
                    value={form.cleaningFee}
                    onChange={(event) =>
                      update("cleaningFee", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Currency">
                  <input
                    value={form.currency}
                    onChange={(event) => update("currency", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Min nights">
                  <input
                    value={form.minNights}
                    onChange={(event) => update("minNights", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Max nights">
                  <input
                    value={form.maxNights}
                    onChange={(event) => update("maxNights", event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-3xl border border-brand/20 bg-[linear-gradient(180deg,rgba(248,242,232,0.94),rgba(240,233,220,0.72))] p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-primary">
                    Amenities
                  </div>
                  <div className="mt-1 text-sm text-secondary">
                    Uses the same catalog as vendor listings.
                  </div>
                </div>
                <div className="inline-flex items-center rounded-full bg-accent-soft/42 px-3 py-1 text-xs font-semibold text-brand">
                  Selected: {selectedAmenityIds.length}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {amenitiesGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line/80 bg-warm-base p-4 text-sm text-secondary">
                    Amenity catalog is unavailable right now. You can still
                    create the property and add amenities later.
                  </div>
                ) : (
                  amenitiesGroups.map((group) => (
                    <div
                      key={group.group?.id ?? "ungrouped"}
                      className="rounded-2xl border border-brand/16 bg-surface/80 p-4"
                    >
                      <div className="text-sm font-semibold text-primary">
                        {group.group?.name ?? "Other"}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.amenities.map((amenity) => {
                          const selected = selectedAmenityIds.includes(amenity.id);
                          return (
                            <SelectableTile
                              key={amenity.id}
                              label={amenity.name}
                              selected={selected}
                              onClick={() => toggleAmenity(amenity.id)}
                              className="min-h-[44px]"
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-line/50 bg-surface p-6 shadow-sm">
              <div className="text-sm font-semibold text-primary">
                Ownership & publishing
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Vendor owner">
                  {vendorsLoading ? (
                    <div className="h-11 w-full animate-pulse rounded-2xl border border-line/80 bg-warm-alt" />
                  ) : vendorsError ? (
                    <div className="rounded-2xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
                      {vendorsError}
                    </div>
                  ) : (
                    <select
                      value={form.vendorId}
                      onChange={(event) => update("vendorId", event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Admin-owned listing (default)</option>
                      {vendorOptions.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.label}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <div className="flex items-end">
                  <label className="flex items-start gap-3 rounded-2xl border border-line/80 bg-warm-base p-4">
                    <input
                      type="checkbox"
                      checked={form.publishNow}
                      onChange={(event) => update("publishNow", event.target.checked)}
                      className="mt-1 h-4 w-4 accent-brand"
                    />
                    <div>
                      <div className="text-sm font-semibold text-primary">
                        Publish immediately after create
                      </div>
                      <div className="mt-1 text-xs text-secondary">
                        Disable this to save as `APPROVED` and publish later from the editor.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-brand/14 bg-surface p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-primary">Photos</div>
                  <div className="mt-1 text-sm text-secondary">
                    Vendor-style category upload blocks. If the property does not exist yet,
                    first upload will create it using current form values.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {REQUIRED_UPLOAD_BLOCKS.map((block) => (
                  <div
                    key={block.key}
                    className="rounded-2xl border border-line/80 bg-surface p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-primary">
                            {block.title}
                          </div>
                          <span className="rounded-full bg-warning/12 px-2.5 py-1 text-xs font-semibold text-warning ring-1 ring-warning/30">
                            {block.help}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          Upload one or more photos.
                        </div>
                      </div>

                      <input
                        ref={(element) => {
                          quickUploadInputRefs.current[`REQUIRED_${block.key}`] =
                            element;
                        }}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        id={`admin-new-property-upload-${block.key}`}
                        onChange={(event) =>
                          void quickUpload(
                            event.target.files,
                            block.key,
                            `REQUIRED_${block.key}`
                          )
                        }
                        disabled={busy !== null}
                      />
                      <label
                        htmlFor={`admin-new-property-upload-${block.key}`}
                        className={cn(
                          "cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-inverted",
                          busy ? "bg-accent-soft" : "bg-brand hover:bg-brand-hover"
                        )}
                      >
                        Upload
                      </label>
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-line/80 bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-primary">
                          Other photos
                        </div>
                        <span className="rounded-full bg-warm-alt px-2.5 py-1 text-xs font-semibold text-secondary ring-1 ring-line">
                          Optional
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        Upload cover, view, balcony, building, and neighborhood photos.
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={quickUploadOtherCategory}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (isMediaCategory(value)) setQuickUploadOtherCategory(value);
                        }}
                        className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary"
                        disabled={busy !== null}
                      >
                        {ADMIN_MEDIA_CATEGORIES.filter(
                          (category) => !REQUIRED_UPLOAD_SET.has(category)
                        ).map((category) => (
                          <option key={category} value={category}>
                            {categoryLabel(category)}
                          </option>
                        ))}
                      </select>

                      <input
                        ref={(element) => {
                          quickUploadInputRefs.current.OTHER = element;
                        }}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        id="admin-new-property-upload-other"
                        onChange={(event) =>
                          void quickUpload(event.target.files, quickUploadOtherCategory, "OTHER")
                        }
                        disabled={busy !== null}
                      />
                      <label
                        htmlFor="admin-new-property-upload-other"
                        className={cn(
                          "cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-inverted",
                          busy ? "bg-accent-soft" : "bg-brand hover:bg-brand-hover"
                        )}
                      >
                        Upload
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-brand/18 bg-surface p-6 shadow-sm">
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!canSubmit}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-inverted shadow-sm",
                    canSubmit ? "bg-brand hover:opacity-95" : "bg-accent-soft"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Create property
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-line/50 bg-surface p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-primary">
                    Property created
                  </div>
                  <div className="mt-1 text-sm text-secondary">
                    Continue with media and amenities to finalize listing quality.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusPill tone="success">
                    {String(property.status ?? "APPROVED")}
                  </StatusPill>
                  <Link
                    href="/admin/properties"
                    className="inline-flex rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
                  >
                    Done
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-brand/18 bg-[linear-gradient(180deg,rgba(248,242,232,0.94),rgba(240,233,220,0.70))] p-6 shadow-sm">
              <div className="mb-4 text-sm font-semibold text-primary">
                Amenities
              </div>
              <div className="space-y-4">
                {amenitiesGroups.map((group) => (
                  <div
                    key={group.group?.id ?? "ungrouped"}
                    className="rounded-2xl border border-brand/16 bg-surface/80 p-4"
                  >
                    <div className="text-sm font-semibold text-primary">
                      {group.group?.name ?? "Other"}
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.amenities.map((amenity) => {
                        const selected = selectedAmenityIds.includes(amenity.id);
                        return (
                          <SelectableTile
                            key={amenity.id}
                            label={amenity.name}
                            selected={selected}
                            onClick={() => toggleAmenity(amenity.id)}
                            className="min-h-[44px]"
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void saveAmenities(property.id)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-brand px-5 text-sm font-semibold text-accent-text shadow-sm hover:bg-brand-hover"
                >
                  <Save className="h-4 w-4" />
                  Save amenities
                </button>
              </div>
            </section>

            <AdminPropertyMediaManager
              propertyId={property.id}
              initialMedia={Array.isArray(property.media) ? property.media : []}
            />
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function Field(props: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-secondary">
        {props.label}
        {props.required ? " *" : ""}
      </div>
      {props.children}
    </label>
  );
}
