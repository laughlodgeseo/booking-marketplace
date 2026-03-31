"use client";

import { useMemo, useRef, useState } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import type { VendorPropertyDetail, VendorPropertyMedia } from "@/lib/api/portal/vendor";
import {
  deleteVendorPropertyMedia,
  registerVendorPropertyMedia,
  reorderVendorPropertyMedia,
  updateVendorPropertyMediaCategory,
  uploadVendorPropertyMedia,
} from "@/lib/api/portal/vendor";
import {
  getCloudinaryUploadParams,
  uploadFileToCloudinary,
} from "@/lib/cloudinary";
import type { MediaCategory } from "@/lib/types/property";

const REQUIRED_BLOCKS: Array<{ key: MediaCategory; title: string; help: string }> = [
  { key: "LIVING_ROOM", title: "Living room", help: "Required category" },
  { key: "BEDROOM", title: "Bedroom", help: "Required category" },
  { key: "BATHROOM", title: "Bathroom", help: "Required category" },
  { key: "KITCHEN", title: "Kitchen", help: "Required category" },
];

const ALL_CATEGORIES: MediaCategory[] = [
  "COVER",
  "LIVING_ROOM",
  "BEDROOM",
  "BATHROOM",
  "KITCHEN",
  "DINING",
  "BALCONY",
  "AMENITIES",
  "BUILDING",
  "VIEW",
  "OTHER",
];

type Props = {
  property: VendorPropertyDetail;
  onChanged: (next: VendorPropertyDetail) => void;
};

function sortByOrder(a: VendorPropertyMedia, b: VendorPropertyMedia) {
  return a.sortOrder - b.sortOrder;
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isMediaCategory(v: string): v is MediaCategory {
  return (ALL_CATEGORIES as readonly string[]).includes(v);
}

function labelCategory(c: MediaCategory): string {
  // Make enums look human without changing backend truth
  return c
    .toLowerCase()
    .split("_")
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeIncomingCategory(v: string): MediaCategory {
  // Defensive: if backend ever sends an unknown category, we render as OTHER (never crash)
  const cleaned = (v ?? "").trim().toUpperCase();
  return isMediaCategory(cleaned) ? (cleaned as MediaCategory) : "OTHER";
}

export function MediaManager({ property, onChanged }: Props) {
  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [otherCategory, setOtherCategory] = useState<MediaCategory>("OTHER");

  // key -> input element
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const media = useMemo(() => [...(property.media ?? [])].sort(sortByOrder), [property.media]);

  const grouped = useMemo(() => {
    const map = new Map<MediaCategory, VendorPropertyMedia[]>();
    for (const m of media) {
      const k = normalizeIncomingCategory(m.category);
      const arr = map.get(k) ?? [];
      arr.push(m);
      map.set(k, arr);
    }
    return map;
  }, [media]);

  function clearInput(key: string) {
    const el = inputsRef.current[key];
    if (el) el.value = "";
  }

  async function uploadAndTag(files: FileList | null, category: MediaCategory) {
    if (!files || files.length === 0) return;

    setError(null);
    setUploadProgress(null);
    setBusy(`Uploading to ${category}...`);

    try {
      // Fetch direct-upload params once for the batch
      const params = await getCloudinaryUploadParams(property.id, "vendor");

      const created: VendorPropertyMedia[] = [];
      const fileArray = Array.from(files);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setBusy(`Uploading ${i + 1} / ${fileArray.length}...`);
        setUploadProgress(0);

        let item: VendorPropertyMedia;

        if (params.mode === "cloudinary") {
          // Direct browser → Cloudinary upload (no server timeout risk)
          const url = await uploadFileToCloudinary(file, params, (pct) =>
            setUploadProgress(pct),
          );
          item = await registerVendorPropertyMedia(property.id, url);
        } else {
          // Cloudinary not configured → fall back to server-side upload
          item = await uploadVendorPropertyMedia(property.id, file);
        }

        created.push(item);
        setUploadProgress(null);
      }

      // Tag each uploaded item with the requested category
      const tagged: VendorPropertyMedia[] = [];
      for (const item of created) {
        const updated = await updateVendorPropertyMediaCategory(property.id, item.id, category);
        tagged.push(updated);
      }

      // Merge into local state
      const createdIds = new Set(created.map((x) => x.id));
      const nextMedia = [
        ...(property.media ?? []).filter((m) => !createdIds.has(m.id)),
        ...tagged,
      ];

      onChanged({ ...property, media: nextMedia });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
      setUploadProgress(null);
    }
  }

  async function setCategory(mediaId: string, category: MediaCategory) {
    setError(null);
    setBusy("Updating category...");

    try {
      const updated = await updateVendorPropertyMediaCategory(property.id, mediaId, category);
      onChanged({
        ...property,
        media: (property.media ?? []).map((m) => (m.id === updated.id ? updated : m)),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function move(mediaId: string, dir: -1 | 1) {
    const ordered = [...media];
    const idx = ordered.findIndex((m) => m.id === mediaId);
    if (idx < 0) return;

    const j = idx + dir;
    if (j < 0 || j >= ordered.length) return;

    const tmp = ordered[idx];
    ordered[idx] = ordered[j];
    ordered[j] = tmp;

    const ids = ordered.map((m) => m.id);

    setError(null);
    setBusy("Reordering...");

    try {
      const rows = await reorderVendorPropertyMedia(property.id, ids);
      onChanged({ ...property, media: rows });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed");
    } finally {
      setBusy(null);
    }
  }

  async function removeMedia(mediaId: string) {
    const confirmed = window.confirm("Delete this photo? This action cannot be undone.");
    if (!confirmed) return;

    setError(null);
    setBusy("Deleting photo...");

    try {
      const rows = await deleteVendorPropertyMedia(property.id, mediaId);
      onChanged({ ...property, media: rows });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  function viewMedia(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function downloadMedia(url: string, filename: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function UploadBlock(props: {
    category: MediaCategory;
    title: string;
    help: string;
    accent?: "required" | "optional";
  }) {
    const count = grouped.get(props.category)?.length ?? 0;

    return (
      <div className="rounded-2xl border border-line/80 bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-primary">{props.title}</div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                  props.accent === "required"
                    ? "bg-warning/12 text-warning ring-warning/30"
                    : "bg-warm-alt text-secondary ring-line"
                )}
              >
                {props.help}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted">{count} uploaded</div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={(el) => {
                inputsRef.current[props.category] = el;
              }}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id={`upload-${props.category}`}
              onChange={(e) => {
                const files = e.target.files;
                void uploadAndTag(files, props.category);
                clearInput(props.category);
              }}
            />
            <label
              htmlFor={`upload-${props.category}`}
              className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
            >
              Upload
            </label>
          </div>
        </div>
      </div>
    );
  }

  const otherCategoryOptions = useMemo(() => {
    const requiredSet = new Set<MediaCategory>(["LIVING_ROOM", "BEDROOM", "BATHROOM", "KITCHEN"]);
    return ALL_CATEGORIES.filter((c) => !requiredSet.has(c));
  }, []);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-line/80 bg-surface p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-primary">Photos</h3>
            <p className="mt-1 text-sm text-secondary">
              Upload photos in the correct sections. Required categories:
              <span className="font-medium"> LIVING_ROOM, BEDROOM, BATHROOM, KITCHEN</span>.
              Optional categories are available for balcony, view, building, amenities, etc.
            </p>
          </div>
        </div>

        {busy ? (
          <div className="mt-4 space-y-2 rounded-xl border border-line/80 bg-warm-base p-3">
            <div className="text-sm text-secondary">{busy}</div>
            {uploadProgress !== null ? (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/40">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </div>

      {/* Required upload blocks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {REQUIRED_BLOCKS.map((b) => (
          <UploadBlock key={b.key} category={b.key} title={b.title} help={b.help} accent="required" />
        ))}

        {/* Other uploader with selectable category */}
        <div className="rounded-2xl border border-line/80 bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-primary">Other photos</div>
                <span className="rounded-full bg-warm-alt px-2.5 py-1 text-xs font-semibold text-secondary ring-1 ring-line">
                  Optional
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">Upload cover, balcony, view, amenities, building, etc.</div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={otherCategory}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isMediaCategory(v)) setOtherCategory(v);
                }}
                className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary"
              >
                {otherCategoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {labelCategory(c)}
                  </option>
                ))}
              </select>

              <input
                ref={(el) => {
                  inputsRef.current["OTHER_UPLOADER"] = el;
                }}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="upload-other"
                onChange={(e) => {
                  const files = e.target.files;
                  void uploadAndTag(files, otherCategory);
                  clearInput("OTHER_UPLOADER");
                }}
              />
              <label
                htmlFor="upload-other"
                className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
              >
                Upload
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery grid */}
      <div className="rounded-2xl border border-line/80 bg-surface p-5 shadow-sm">
        <div className="text-sm font-semibold text-primary">All photos</div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m, idx) => {
            const safeCategory = normalizeIncomingCategory(m.category);

            return (
              <div key={m.id} className="overflow-hidden rounded-2xl border border-line/80 bg-surface">
                <div className="relative aspect-[4/3] w-full bg-warm-base">
                  <OptimizedImage
                    src={m.url}
                    alt={m.alt ?? `Photo ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute left-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                    #{m.sortOrder}
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
                    {safeCategory}
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="text-xs font-semibold text-secondary">Change category</div>

                  <select
                    value={safeCategory}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (isMediaCategory(v)) void setCategory(m.id, v);
                    }}
                    className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary"
                    disabled={busy !== null}
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {labelCategory(c)}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void move(m.id, -1)}
                      disabled={busy !== null || m.sortOrder === 0}
                      className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-50"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(m.id, 1)}
                      disabled={busy !== null || idx === media.length - 1}
                      className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-50"
                    >
                      Down
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => viewMedia(m.url)}
                      className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm font-semibold text-primary hover:bg-warm-alt"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadMedia(m.url, `property-${property.id}-${m.id}.jpg`)}
                      className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm font-semibold text-primary hover:bg-warm-alt"
                    >
                      Download
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void removeMedia(m.id)}
                    disabled={busy !== null}
                    className="w-full rounded-xl border border-danger/30 bg-danger/12 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/12 disabled:opacity-50"
                  >
                    Delete photo
                  </button>

                  <p className="text-xs text-muted">
                    Tip: set your best image as <span className="font-medium">Cover</span>.
                  </p>
                </div>
              </div>
            );
          })}

          {media.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line/80 bg-warm-base p-6 text-sm text-secondary">
              No photos yet. Upload at least 4 images and tag the required room categories.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
