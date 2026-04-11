"use client";

import type { PropertyPreviewData } from "@/lib/api/properties";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function locationLine(property: PropertyPreviewData): string {
  return [property.location.address, property.location.area, property.location.city]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(", ");
}

export function PropertyPreview(props: {
  property: PropertyPreviewData;
  isPreview?: boolean;
}) {
  const { property } = props;

  const primaryImage = property.images[0] ?? null;
  const gallery = property.images.slice(1, 5);
  const locationText = locationLine(property);
  const hasCoords = property.location.lat !== null && property.location.lng !== null;
  const mapHref = hasCoords
    ? `https://www.google.com/maps?q=${property.location.lat},${property.location.lng}`
    : null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-primary">{property.title}</h2>
            <div className="mt-1 text-sm text-secondary">{locationText || "Location not set"}</div>
            {props.isPreview ? (
              <div className="mt-2 inline-flex rounded-full bg-accent-soft/45 px-3 py-1 text-xs font-semibold text-brand">
                Preview mode
              </div>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Status</div>
            <div className="mt-1 rounded-full bg-warm-alt px-3 py-1 text-xs font-semibold text-primary">
              {property.status}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Price" value={`${property.currency} ${property.price.toLocaleString()}`} />
          <Info label="Guests" value={String(property.maxGuests)} />
          <Info label="Bedrooms" value={String(property.bedrooms)} />
          <Info label="Bathrooms" value={String(property.bathrooms)} />
          <Info label="Min nights" value={String(property.minNights)} />
          <Info label="Max nights" value={property.maxNights === null ? "No limit" : String(property.maxNights)} />
          <Info label="Host" value={property.host.name} />
          <Info label="Updated" value={formatDate(property.updatedAt)} />
        </div>
      </section>

      <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
        <div className="text-sm font-semibold text-primary">Gallery</div>
        {primaryImage ? (
          <div className="mt-3 space-y-3">
            <div className="overflow-hidden rounded-2xl border border-line/70 bg-warm-base">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolveMediaUrl(primaryImage)}
                alt={property.title}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
            {gallery.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {gallery.map((image, index) => (
                  <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-line/70 bg-warm-base">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveMediaUrl(image)}
                      alt={`${property.title} ${index + 2}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
            No images uploaded.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
        <div className="text-sm font-semibold text-primary">Description</div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-secondary">
          {property.description?.trim() || "No description provided yet."}
        </p>
      </section>

      <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
        <div className="text-sm font-semibold text-primary">Amenities</div>
        {property.amenities.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
            No amenities selected.
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {property.amenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-full border border-line/70 bg-warm-base px-3 py-1.5 text-xs font-semibold text-primary"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
        <div className="text-sm font-semibold text-primary">Location</div>
        <div className="mt-2 text-sm text-secondary">{locationText || "Location details are missing."}</div>
        {hasCoords ? (
          <div className="mt-2 text-xs text-muted">
            Coordinates: {property.location.lat}, {property.location.lng}
          </div>
        ) : null}
        {mapHref ? (
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
          >
            Open map
          </a>
        ) : null}
      </section>
    </div>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
      <div className="text-xs font-semibold text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-primary">{props.value}</div>
    </div>
  );
}
