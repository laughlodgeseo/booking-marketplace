"use client";

import { useMemo, useRef, useState } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import {
  deleteAdminPropertyMedia,
  registerAdminPropertyMedia,
  reorderAdminPropertyMedia,
  updateAdminPropertyMediaCategory,
  uploadAdminPropertyMedia,
  type AdminMediaItem,
  type MediaCategory,
} from "@/lib/api/portal/admin";
import {
  getCloudinaryUploadParams,
  uploadFileToCloudinary,
} from "@/lib/cloudinary";

function cn(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

const ALL_MEDIA_CATEGORIES: MediaCategory[] = [
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

function isMediaCategory(v: string): v is MediaCategory {
  return (ALL_MEDIA_CATEGORIES as string[]).includes(v);
}

function categoryLabel(category: MediaCategory): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminPropertyMediaManager(props: {
  propertyId: string;
  initialMedia?: AdminMediaItem[];
  onChange?: (next: AdminMediaItem[]) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadBatch, setUploadBatch] = useState<{ current: number; total: number } | null>(null);
  const [otherCategory, setOtherCategory] = useState<MediaCategory>("COVER");
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const [media, setMedia] = useState<AdminMediaItem[]>(props.initialMedia ?? []);
  const sorted = useMemo(
    () => [...media].sort((a, b) => a.sortOrder - b.sortOrder),
    [media],
  );

  const grouped = useMemo(() => {
    const map = new Map<MediaCategory, AdminMediaItem[]>();
    for (const item of sorted) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return map;
  }, [sorted]);

  const optionalCategories = useMemo(
    () => ALL_MEDIA_CATEGORIES.filter((category) => !REQUIRED_UPLOAD_SET.has(category)),
    [],
  );

  function setNext(next: AdminMediaItem[]) {
    setMedia(next);
    props.onChange?.(next);
  }

  function clearInput(key: string) {
    const el = inputsRef.current[key];
    if (el) el.value = "";
  }

  async function uploadAndTag(
    files: FileList | null,
    category: MediaCategory,
    inputKey: string,
  ) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploadProgress(null);
    setUploadingFileName(null);
    setUploadBatch(null);
    setBusy(`Uploading to ${category}...`);

    try {
      const created: AdminMediaItem[] = [];
      const fileArray = Array.from(files);

      for (let i = 0; i < fileArray.length; i++) {
        const f = fileArray[i];
        setUploadBatch({ current: i + 1, total: fileArray.length });
        setUploadingFileName(f.name);
        setBusy(`Uploading ${i + 1} / ${fileArray.length}...`);
        setUploadProgress(0);

        let item: AdminMediaItem;
        const params = await getCloudinaryUploadParams(props.propertyId, "admin").catch(
          () => ({ mode: "server" } as const),
        );

        if (params.mode === "cloudinary") {
          try {
            const url = await uploadFileToCloudinary(f, params, (pct) => {
              setUploadProgress(pct);
            });
            item = await registerAdminPropertyMedia(props.propertyId, url);
          } catch {
            // Keep upload resilient when cloud credentials/presets/CDN fail.
            setBusy(`Cloud upload failed, retrying ${i + 1} / ${fileArray.length} via server...`);
            setUploadProgress(null);
            item = await uploadAdminPropertyMedia(props.propertyId, f);
          }
        } else {
          setUploadProgress(null);
          item = await uploadAdminPropertyMedia(props.propertyId, f);
        }

        created.push(item);
        setUploadProgress(null);
      }

      setBusy("Finalizing categories...");
      const tagged: AdminMediaItem[] = [];
      for (const it of created) {
        const upd = await updateAdminPropertyMediaCategory(props.propertyId, it.id, category);
        tagged.push(upd);
      }

      const createdIds = new Set(created.map((x) => x.id));
      const next = [
        ...sorted.filter((m) => !createdIds.has(m.id)),
        ...tagged,
      ].sort((a, b) => a.sortOrder - b.sortOrder);

      setNext(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      clearInput(inputKey);
      setBusy(null);
      setUploadProgress(null);
      setUploadingFileName(null);
      setUploadBatch(null);
    }
  }

  async function changeCategory(mediaId: string, category: MediaCategory) {
    setError(null);
    setBusy("Updating category...");
    try {
      const updated = await updateAdminPropertyMediaCategory(
        props.propertyId,
        mediaId,
        category,
      );
      const next = sorted.map((m) => (m.id === updated.id ? updated : m));
      setNext(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function move(mediaId: string, dir: -1 | 1) {
    const arr = [...sorted];
    const i = arr.findIndex((m) => m.id === mediaId);
    if (i < 0) return;

    const j = i + dir;
    if (j < 0 || j >= arr.length) return;

    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;

    const orderedIds = arr.map((m) => m.id);

    setError(null);
    setBusy("Saving order...");
    try {
      const rows = await reorderAdminPropertyMedia(props.propertyId, orderedIds);
      setNext(rows.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(mediaId: string) {
    const confirmed = window.confirm("Delete this image permanently?");
    if (!confirmed) return;

    setError(null);
    setBusy("Deleting image...");
    try {
      const rows = await deleteAdminPropertyMedia(props.propertyId, mediaId);
      setNext(rows.sort((a, b) => a.sortOrder - b.sortOrder));
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
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const [dragId, setDragId] = useState<string | null>(null);

  async function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;

    const arr = [...sorted];
    const from = arr.findIndex((m) => m.id === dragId);
    const to = arr.findIndex((m) => m.id === targetId);
    if (from < 0 || to < 0) return;

    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);

    const orderedIds = arr.map((m) => m.id);

    setError(null);
    setBusy("Saving order...");
    try {
      const rows = await reorderAdminPropertyMedia(props.propertyId, orderedIds);
      setNext(rows.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed");
    } finally {
      setBusy(null);
      setDragId(null);
    }
  }

  function UploadBlock(propsUpload: {
    category: MediaCategory;
    title: string;
    help: string;
    accent?: "required" | "optional";
    inputId: string;
  }) {
    const count = grouped.get(propsUpload.category)?.length ?? 0;

    return (
      <div className="rounded-2xl border border-line/80 bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-primary">{propsUpload.title}</div>
              <span
                className={[
                  "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                  propsUpload.accent === "required"
                    ? "bg-warning/12 text-warning ring-warning/30"
                    : "bg-warm-alt text-secondary ring-line",
                ].join(" ")}
              >
                {propsUpload.help}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted">{count} uploaded</div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <input
              ref={(el) => {
                inputsRef.current[propsUpload.inputId] = el;
              }}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id={propsUpload.inputId}
              onChange={(event) => {
                void uploadAndTag(event.target.files, propsUpload.category, propsUpload.inputId);
              }}
              disabled={busy !== null}
            />
            <label
              htmlFor={propsUpload.inputId}
              className={cn(
                "cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all",
                "hover:-translate-y-0.5 active:translate-y-0",
                busy
                  ? "pointer-events-none bg-accent-soft text-secondary"
                  : "bg-brand text-accent-text hover:bg-brand-hover",
              )}
            >
              Upload
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Upload overlay */}
      {busy && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-3xl bg-surface/90 backdrop-blur-sm">
          <div className="h-12 w-12 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          <div className="text-sm font-semibold text-primary">{busy}</div>
          {uploadBatch ? (
            <div className="max-w-[92%] text-center text-xs text-secondary">
              File {uploadBatch.current} of {uploadBatch.total}
              {uploadingFileName ? (
                <>
                  {" "}
                  • <span className="font-semibold text-primary break-all">{uploadingFileName}</span>
                </>
              ) : null}
            </div>
          ) : null}
          {uploadProgress !== null && (
            <div className="w-56 overflow-hidden rounded-full bg-line/40 h-1.5">
              <div
                className="h-full rounded-full bg-brand transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          {uploadProgress !== null && (
            <div className="text-xs text-muted">{uploadProgress}%</div>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-primary">Images</div>
          <div className="mt-1 text-sm text-secondary">
            Upload blocks with required categories:
            <span className="font-semibold"> LIVING_ROOM, BEDROOM, BATHROOM, KITCHEN</span>.
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger whitespace-pre-wrap">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {REQUIRED_UPLOAD_BLOCKS.map((block) => (
          <UploadBlock
            key={block.key}
            category={block.key}
            title={block.title}
            help={block.help}
            accent="required"
            inputId={`admin-create-upload-${block.key}`}
          />
        ))}

        <div className="rounded-2xl border border-line/80 bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-primary">Other photos</div>
                <span className="rounded-full bg-warm-alt px-2.5 py-1 text-xs font-semibold text-secondary ring-1 ring-line">
                  Optional
                </span>
              </div>
              <div className="mt-1 text-xs text-muted">
                Upload cover, view, building, amenities, and more.
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <select
                value={otherCategory}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isMediaCategory(value)) setOtherCategory(value);
                }}
                className="w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary sm:w-auto"
                disabled={busy !== null}
              >
                {optionalCategories.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel(category)}
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
                id="admin-create-upload-other"
                onChange={(event) => {
                  void uploadAndTag(event.target.files, otherCategory, "OTHER_UPLOADER");
                }}
                disabled={busy !== null}
              />
              <label
                htmlFor="admin-create-upload-other"
                className={cn(
                  "cursor-pointer rounded-xl px-4 py-2 text-center text-sm font-semibold shadow-sm transition-all",
                  "hover:-translate-y-0.5 active:translate-y-0",
                  busy
                    ? "pointer-events-none bg-accent-soft text-secondary"
                    : "bg-brand text-accent-text hover:bg-brand-hover",
                )}
              >
                Upload
              </label>
            </div>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line/80 bg-warm-base p-8 text-sm text-secondary">
          No images yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((m) => (
            <div
              key={m.id}
              className="overflow-hidden rounded-3xl border border-line/50 bg-surface shadow-sm"
              draggable
              onDragStart={() => setDragId(m.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void dropOn(m.id)}
              title="Drag to reorder"
            >
              <div className="relative aspect-[4/3] bg-warm-base">
                <OptimizedImage
                  src={m.url}
                  alt={m.alt ?? "Media"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                  <GripVertical className="h-3.5 w-3.5 text-secondary" />
                  #{m.sortOrder}
                </div>
                <div className="absolute right-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                  {m.category}
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="text-xs font-semibold text-secondary">Category</div>
                <select
                  value={m.category}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isMediaCategory(v)) void changeCategory(m.id, v);
                  }}
                  className="h-11 w-full rounded-2xl border border-line/80 bg-surface px-4 text-sm font-semibold text-primary shadow-sm outline-none focus:border-brand/45 focus:ring-4 focus:ring-brand/20"
                  disabled={busy !== null}
                >
                  {ALL_MEDIA_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void move(m.id, -1)}
                    disabled={busy !== null || m.sortOrder === 0}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line/80 bg-surface text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt disabled:opacity-50"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(m.id, 1)}
                    disabled={busy !== null || m.sortOrder === sorted.length - 1}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line/80 bg-surface text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt disabled:opacity-50"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Down
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => viewMedia(m.url)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-line/80 bg-surface text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadMedia(m.url, `property-${props.propertyId}-${m.id}.jpg`)
                    }
                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-line/80 bg-surface text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
                  >
                    Download
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void remove(m.id)}
                  disabled={busy !== null}
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-danger/30 bg-danger/12 text-sm font-semibold text-danger hover:bg-danger/12 disabled:opacity-50"
                >
                  Delete image
                </button>

                <div className="text-xs text-muted">
                  Tip: set at least one image as <span className="font-semibold">COVER</span>.
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
