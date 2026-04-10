"use client";

import dynamic from "next/dynamic";
import type { AdminPropertyDetail, AdminMediaItem } from "@/lib/api/portal/admin";

const AdminPropertyMediaManager = dynamic(
  () =>
    import("@/components/portal/admin/properties/AdminPropertyMediaManager").then(
      (m) => m.AdminPropertyMediaManager
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-warm-alt animate-pulse" />
        ))}
      </div>
    ),
  }
);

const REQUIRED_CATEGORIES = [
  { key: "COVER",       label: "Cover photo",  icon: "🖼️" },
  { key: "LIVING_ROOM", label: "Living room",  icon: "🛋️" },
  { key: "BEDROOM",     label: "Bedroom",      icon: "🛏️" },
  { key: "BATHROOM",    label: "Bathroom",     icon: "🚿" },
  { key: "KITCHEN",     label: "Kitchen",      icon: "🍳" },
];

function RequirementRow({ icon, label, met }: { icon: string; label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={["flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        met ? "bg-success/15 text-success" : "border border-line/60 bg-surface text-muted"].join(" ")}>
        {met ? "✓" : "○"}
      </div>
      <span className={`text-sm ${met ? "text-secondary" : "text-muted"}`}>
        <span className="mr-1.5">{icon}</span>{label}
      </span>
    </div>
  );
}

type Props = {
  property: AdminPropertyDetail | null;
  onMediaChanged: (media: AdminMediaItem[]) => void;
};

export function AdminStepImages({ property, onMediaChanged }: Props) {
  if (!property) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-primary">Add photos</h2>
          <p className="mt-1 text-sm text-secondary">Photos are uploaded after the property is created.</p>
        </div>
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
          ⚠ Complete the earlier steps first — the image manager will appear here once your listing is created.
        </div>
      </div>
    );
  }

  const rawMedia = Array.isArray(property.media)
    ? (property.media as AdminMediaItem[])
    : [];

  const uploadedCategories = new Set<string>(rawMedia.map((m) => m.category as string));
  const totalPhotos = rawMedia.length;
  const allRequirementsMet = REQUIRED_CATEGORIES.every((r) => uploadedCategories.has(r.key));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Add photos</h2>
        <p className="mt-1 text-sm text-secondary">
          Upload high-quality photos for each room. Cover + 4 room categories are required.
        </p>
      </div>

      {/* Checklist */}
      <div className="rounded-3xl border border-line/50 bg-surface px-5 py-4 shadow-sm">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Required photos — {totalPhotos} uploaded
        </div>
        <div className="space-y-2.5">
          {REQUIRED_CATEGORIES.map((r) => (
            <RequirementRow key={r.key} icon={r.icon} label={r.label} met={uploadedCategories.has(r.key)} />
          ))}
        </div>
        {allRequirementsMet && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm text-success">
            <span>✓</span>
            <span>All required categories covered</span>
          </div>
        )}
      </div>

      {/* Media manager */}
      <div className="rounded-3xl border border-line/50 overflow-hidden shadow-sm">
        <AdminPropertyMediaManager
          propertyId={property.id}
          initialMedia={rawMedia}
          onChange={onMediaChanged}
        />
      </div>
    </div>
  );
}
