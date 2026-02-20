"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { MediaCategory, PropertyMedia } from "@/lib/types/property";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";
import {
  uploadVendorPropertyMedia,
  updateVendorPropertyMediaCategory,
  reorderVendorPropertyMedia,
} from "@/lib/api/portal/vendor";

const REQUIRED: Array<{ key: MediaCategory; title: string; hint: string }> = [
  { key: "LIVING_ROOM", title: "Living room", hint: "Upload 1–3 best wide shots." },
  { key: "BEDROOM", title: "Bedroom", hint: "Show bed, wardrobe, and overall layout." },
  { key: "BATHROOM", title: "Bathroom", hint: "Show shower/tub + sink area clearly." },
  { key: "KITCHEN", title: "Kitchen", hint: "Show cooking area + appliances." },
];

function labelForCategory(c: MediaCategory): string {
  switch (c) {
    case "LIVING_ROOM":
      return "Living";
    case "BEDROOM":
      return "Bedroom";
    case "BATHROOM":
      return "Bathroom";
    case "KITCHEN":
      return "Kitchen";
    case "COVER":
      return "Cover";
    default:
      return c.replace(/_/g, " ").toLowerCase();
  }
}

function isRequiredCategory(c: MediaCategory): boolean {
  return REQUIRED.some((x) => x.key === c);
}

export function VendorPropertyMediaCard(props: {
  propertyId: string;
  media: PropertyMedia[];
  onChanged?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const m = new Map<MediaCategory, PropertyMedia[]>();
    for (const it of [...props.media].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const key = it.category ?? "OTHER";
      const arr = m.get(key) ?? [];
      arr.push(it);
      m.set(key, arr);
    }
    return m;
  }, [props.media]);

  const presentRequired = useMemo(() => {
    const set = new Set<MediaCategory>();
    for (const x of props.media) {
      if (isRequiredCategory(x.category)) set.add(x.category);
    }
    return set;
  }, [props.media]);

  async function uploadToCategory(category: MediaCategory, files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setBusy(true);

    try {
      // Upload sequentially (simple + stable)
      for (const file of Array.from(files)) {
        const created = await uploadVendorPropertyMedia(props.propertyId, file);
        // Backend uploads as OTHER, so we immediately tag it to the section user chose
        if (created.category !== category) {
          await updateVendorPropertyMediaCategory(props.propertyId, created.id, category);
        }
      }
      props.onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeCategory(mediaId: string, category: MediaCategory) {
    setErr(null);
    setBusy(true);
    try {
      await updateVendorPropertyMediaCategory(props.propertyId, mediaId, category);
      props.onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update category");
    } finally {
      setBusy(false);
    }
  }

  async function move(mediaId: string, dir: -1 | 1) {
    setErr(null);
    const ordered = [...props.media].sort((a, b) => a.sortOrder - b.sortOrder).map((x) => x.id);
    const idx = ordered.indexOf(mediaId);
    if (idx === -1) return;

    const to = idx + dir;
    if (to < 0 || to >= ordered.length) return;

    const next = [...ordered];
    const tmp = next[idx];
    next[idx] = next[to];
    next[to] = tmp;

    setBusy(true);
    try {
      await reorderVendorPropertyMedia(props.propertyId, next);
      props.onChanged?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to reorder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-surface p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-primary">Photos (by room)</div>
          <div className="mt-1 text-sm text-secondary">
            Upload photos into the correct section. We auto-tag images to match backend review rules.
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {REQUIRED.map((r) => {
              const ok = presentRequired.has(r.key);
              return (
                <span
                  key={r.key}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1",
                    ok ? "bg-success/12 text-success ring-success/30" : "bg-warning/12 text-warning ring-warning/30",
                  ].join(" ")}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  {r.title}
                  <span className="opacity-70">{ok ? "ok" : "missing"}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted">Total photos</div>
          <div className="mt-1 text-2xl font-semibold text-primary">{props.media.length}</div>
          <div className="mt-1 text-xs text-muted">{busy ? "Working…" : " "}</div>
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger whitespace-pre-wrap">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {REQUIRED.map((sec) => (
          <RoomSection
            key={sec.key}
            title={sec.title}
            hint={sec.hint}
            busy={busy}
            items={byCategory.get(sec.key) ?? []}
            onUpload={(files) => void uploadToCategory(sec.key, files)}
            onMove={(id, dir) => void move(id, dir)}
            onChangeCategory={(id, category) => void changeCategory(id, category)}
          />
        ))}

        <RoomSection
          title="Other"
          hint="Optional: building, view, balcony, etc."
          busy={busy}
          items={byCategory.get("OTHER") ?? []}
          onUpload={(files) => void uploadToCategory("OTHER", files)}
          onMove={(id, dir) => void move(id, dir)}
          onChangeCategory={(id, category) => void changeCategory(id, category)}
        />
      </div>

      <div className="rounded-xl border bg-warm-alt px-4 py-3 text-sm text-secondary">
        Backend review rule reminder: minimum 4 photos + must include Living + Bedroom + Bathroom + Kitchen.
      </div>
    </div>
  );
}

function RoomSection(props: {
  title: string;
  hint: string;
  items: PropertyMedia[];
  busy: boolean;
  onUpload: (files: FileList | null) => void;
  onMove: (mediaId: string, dir: -1 | 1) => void;
  onChangeCategory: (mediaId: string, category: MediaCategory) => void;
}) {
  return (
    <div className="rounded-2xl border bg-surface overflow-hidden">
      <div className="border-b bg-warm-alt px-5 py-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-primary">{props.title}</div>
            <div className="mt-1 text-xs text-secondary">{props.hint}</div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={props.busy}
              onChange={(e) => props.onUpload(e.currentTarget.files)}
            />
            Upload
          </label>
        </div>
      </div>

      {props.items.length === 0 ? (
        <div className="p-5 text-sm text-secondary">No photos yet.</div>
      ) : (
        <div className="p-5 grid grid-cols-2 gap-3">
          {props.items.map((m) => (
            <div key={m.id} className="rounded-xl border bg-surface overflow-hidden">
              <div className="relative aspect-[4/3] bg-warm-alt">
                <Image
                  src={resolveMediaUrl(m.url)}
                  alt={m.alt ?? props.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-1 text-[11px] font-semibold text-primary">
                  {labelForCategory(m.category)}
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-secondary">Order: {m.sortOrder}</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={props.busy}
                      className="rounded-lg border bg-surface px-2 py-1 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                      onClick={() => props.onMove(m.id, -1)}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={props.busy}
                      className="rounded-lg border bg-surface px-2 py-1 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                      onClick={() => props.onMove(m.id, 1)}
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </div>

                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold text-secondary">Category</span>
                  <select
                    disabled={props.busy}
                    value={m.category}
                    onChange={(e) => props.onChangeCategory(m.id, e.target.value as MediaCategory)}
                    className="w-full rounded-xl border bg-surface px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
                  >
                    <option value="LIVING_ROOM">Living room</option>
                    <option value="BEDROOM">Bedroom</option>
                    <option value="BATHROOM">Bathroom</option>
                    <option value="KITCHEN">Kitchen</option>
                    <option value="DINING">Dining</option>
                    <option value="BALCONY">Balcony</option>
                    <option value="BUILDING">Building</option>
                    <option value="VIEW">View</option>
                    <option value="AMENITIES">Amenities</option>
                    <option value="OTHER">Other</option>
                    <option value="COVER">Cover</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
