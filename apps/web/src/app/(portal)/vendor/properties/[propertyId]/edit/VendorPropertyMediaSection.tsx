"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { VendorPropertyMedia } from "@/lib/api/portal/vendor";
import type { MediaCategory } from "@/lib/types/property";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";
import {
  uploadVendorPropertyMedia,
  updateVendorPropertyMediaCategory,
  reorderVendorPropertyMedia,
} from "@/lib/api/portal/vendor";

type Room = "LIVING_ROOM" | "BEDROOM" | "BATHROOM" | "KITCHEN";

const ROOMS: Array<{ key: Room; title: string; subtitle: string }> = [
  { key: "LIVING_ROOM", title: "Living room photos", subtitle: "Required" },
  { key: "BEDROOM", title: "Bedroom photos", subtitle: "Required" },
  { key: "BATHROOM", title: "Bathroom photos", subtitle: "Required" },
  { key: "KITCHEN", title: "Kitchen photos", subtitle: "Required" },
];

function groupByCategory(media: VendorPropertyMedia[]): Record<string, VendorPropertyMedia[]> {
  const map: Record<string, VendorPropertyMedia[]> = {};
  for (const m of media) {
    const k = String(m.category ?? "OTHER");
    if (!map[k]) map[k] = [];
    map[k].push(m);
  }
  for (const k of Object.keys(map)) {
    map[k] = map[k].slice().sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return map;
}

export function VendorPropertyMediaSection(props: {
  propertyId: string;
  media: VendorPropertyMedia[];
  onChanged: () => void;
}) {
  const grouped = useMemo(() => groupByCategory(props.media), [props.media]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function uploadToRoom(room: Room, files: FileList | null) {
    if (!files || files.length === 0) return;
    setErr(null);
    setBusy(room);

    try {
      // Backend accepts 1 file per request — upload sequentially
      for (const file of Array.from(files)) {
        const created = await uploadVendorPropertyMedia(props.propertyId, file);
        // Uploaded media may default to OTHER; force tag to room
        if (created.category !== room) {
          await updateVendorPropertyMediaCategory(props.propertyId, created.id, room as MediaCategory);
        }
      }
      props.onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function moveMedia(mediaId: string, direction: "up" | "down") {
    setErr(null);
    setBusy(mediaId);

    try {
      // Reorder is global order across all media (backend uses sortOrder list)
      const ordered = props.media.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((m) => m.id);
      const idx = ordered.indexOf(mediaId);
      if (idx < 0) return;

      const swap = direction === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= ordered.length) return;

      const next = ordered.slice();
      const tmp = next[idx];
      next[idx] = next[swap];
      next[swap] = tmp;

      await reorderVendorPropertyMedia(props.propertyId, next);
      props.onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reorder failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-6 space-y-5">
      <div>
        <div className="text-sm font-semibold text-primary">Photos by room</div>
        <div className="mt-1 text-sm text-secondary">
          Upload images in the correct section. Backend requires at least 4 images total and all required categories.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ROOMS.map((r) => {
          const items = grouped[r.key] ?? [];
          const uploading = busy === r.key;

          return (
            <div key={r.key} className="rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-primary">{r.title}</div>
                  <div className="mt-1 text-xs text-secondary">{r.subtitle}</div>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover">
                  {uploading ? "Uploading…" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void uploadToRoom(r.key, e.target.files)}
                    disabled={uploading}
                  />
                </label>
              </div>

              {items.length === 0 ? (
                <div className="mt-4 text-sm text-secondary">No photos yet.</div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {items.map((m) => (
                    <div key={m.id} className="rounded-xl border overflow-hidden">
                      <div className="relative aspect-[4/3] bg-warm-alt">
                        <Image
                          src={resolveMediaUrl(m.url)}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="text-xs text-secondary">#{m.sortOrder}</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy === m.id}
                            onClick={() => void moveMedia(m.id, "up")}
                            className="rounded-lg border border-line/70 bg-surface px-2 py-1 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            disabled={busy === m.id}
                            onClick={() => void moveMedia(m.id, "down")}
                            className="rounded-lg border border-line/70 bg-surface px-2 py-1 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                          >
                            Down
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {err ? (
        <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger whitespace-pre-wrap">
          {err}
        </div>
      ) : null}

      <div className="rounded-xl border border-line/70 bg-warm-alt px-4 py-3 text-sm text-secondary">
        Next: Upload ownership proof → Submit for review.
      </div>
    </div>
  );
}
