import { OptimizedImage } from "@/components/ui/OptimizedImage";
import Link from "next/link";
import type { SearchResponse } from "@/lib/types/search";
import { WishlistHeart } from "@/components/property/WishlistHeart";

type Item = SearchResponse["items"][number];

function formatMoney(currency: string | null | undefined, amount: number | null | undefined) {
  if (amount === null || amount === undefined) return null;
  const cur = currency ?? "AED";
  return `${cur} ${amount.toLocaleString()}`;
}

export default function TourmPropertyCard({ item }: { item: Item }) {
  const img = item.coverImage?.url ?? null;
  const title = item.title ?? "Stay";
  const area = item.location?.area ?? null;
  const city = item.location?.city ?? null;
  const meta = [area, city].filter(Boolean).join(" • ");

  const guests = item.capacity?.maxGuests ?? null;
  const beds = item.capacity?.bedrooms ?? null;
  const baths = item.capacity?.bathrooms ?? null;

  const price = formatMoney(item.pricing?.currency ?? null, item.pricing?.nightly ?? null);

  return (
    <Link
      href={`/properties/${item.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-card transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {img ? (
          <OptimizedImage
            src={img}
            alt={item.coverImage?.alt ?? title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-dark-1/5 to-dark-1/0" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/58 via-ink/18 to-transparent opacity-95" />

        {price ? (
          <div className="absolute left-3 top-3 rounded-xl border border-line bg-brand-soft px-3 py-2 text-xs font-semibold text-primary backdrop-blur">
            {price} <span className="font-normal text-secondary">/ night</span>
          </div>
        ) : null}

        <div className="absolute right-3 top-3 flex items-center gap-2">
          <WishlistHeart propertyId={item.id} size={18} />
          {item.flags?.instantBook ? (
            <div className="rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs font-semibold text-primary shadow-sm">
              Instant book
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-primary">
            {title}
          </h3>
        </div>

        {meta ? <p className="text-sm text-secondary">{meta}</p> : <div className="h-5" />}

        <div className="flex flex-wrap gap-2 pt-1">
          {guests ? (
            <span className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-primary transition group-hover:bg-brand-soft-2">
              {guests} guests
            </span>
          ) : null}
          {beds ? (
            <span className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-primary transition group-hover:bg-brand-soft-2">
              {beds} beds
            </span>
          ) : null}
          {baths ? (
            <span className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-primary transition group-hover:bg-brand-soft-2">
              {baths} baths
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
