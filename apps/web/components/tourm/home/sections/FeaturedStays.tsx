"use client";

import Image from "next/image";
import Link from "next/link";
import type { SearchPropertyCard } from "@/lib/api/publicTypes";
import { useCurrency } from "@/lib/currency/CurrencyProvider";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function CardSkeleton() {
  return (
    <div className="group overflow-hidden rounded-[26px] border border-line-strong bg-surface shadow-card">
      <div className="relative aspect-[4/3] w-full animate-pulse bg-dark-1/5" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-dark-1/5" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-dark-1/5" />
        <div className="flex items-center gap-2 pt-1">
          <div className="h-9 w-24 animate-pulse rounded-xl bg-dark-1/5" />
          <div className="h-9 w-20 animate-pulse rounded-xl bg-dark-1/5" />
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({ item }: { item: SearchPropertyCard }) {
  const { currency, formatFromAed, formatBaseAed } = useCurrency();
  const title = item.title || "Stay";
  const metaParts = [item.area ?? null, item.city ?? null].filter(Boolean) as string[];
  const meta = metaParts.join(" • ");

  const baseNightly = item.priceFrom ?? null;
  const price = baseNightly === null ? null : formatFromAed(baseNightly);
  const baseHint =
    currency !== "AED" && baseNightly !== null ? `Base: ${formatBaseAed(baseNightly)}` : null;

  const guests = item.guests ?? null;
  const beds = item.bedrooms ?? null;
  const baths = item.bathrooms ?? null;

  const g = guests ? `${guests} guests` : null;
  const b = beds ? `${beds} bed${beds === 1 ? "" : "s"}` : null;
  const ba = baths ? `${baths} bath${baths === 1 ? "" : "s"}` : null;

  const facts = [g, b, ba].filter(Boolean).slice(0, 3) as string[];

  const img = item.coverImageUrl ?? null;

  return (
    <Link
      href={`/properties/${item.slug}`}
      className="group relative overflow-hidden rounded-[26px] border border-line-strong bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {img ? (
          <Image
            src={img}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-dark-1/5 to-dark-1/0" />
        )}

        {/* soft overlay to match Tourm cards */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/58 via-ink/18 to-transparent opacity-95" />

        {price ? (
          <div className="absolute left-4 top-4 rounded-2xl border border-line bg-brand-soft px-3 py-2 text-xs font-extrabold text-primary backdrop-blur-md">
            {price} <span className="font-normal text-secondary">/ night</span>
            {baseHint ? (
              <div className="mt-1 text-[10px] font-medium text-secondary">{baseHint}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-extrabold tracking-tight text-primary">
            {title}
          </h3>

          {item.ratingAvg ? (
            <div className="shrink-0 rounded-xl border border-line bg-warm-base px-2 py-1 text-xs font-extrabold text-primary">
              {clamp(item.ratingAvg, 0, 5).toFixed(1)}
              <span className="ml-1 font-normal text-secondary/70">
                ({item.ratingCount ?? 0})
              </span>
            </div>
          ) : null}
        </div>

        {meta ? (
          <p className="text-sm text-secondary/75">{meta}</p>
        ) : (
          <div className="h-5" />
        )}

        {facts.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {facts.map((f) => (
              <span
                key={f}
                className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-primary transition group-hover:bg-brand-soft-2"
              >
                {f}
              </span>
            ))}
          </div>
        ) : (
          <div className="h-8" />
        )}
      </div>
    </Link>
  );
}

export default function FeaturedStays({
  title,
  subtitle,
  items,
  loading,
  errorMessage,
}: {
  title: string;
  subtitle: string;
  items: SearchPropertyCard[];
  loading?: boolean;
  errorMessage?: string | null;
}) {
  const showSkeletons = Boolean(loading);

  return (
    <section className="relative w-full py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-secondary/60">
              Featured
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 text-sm text-secondary/75 sm:text-base">{subtitle}</p>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-extrabold text-primary shadow-sm transition hover:bg-warm-base"
          >
            View all stays
            <span aria-hidden className="text-secondary/60">
              →
            </span>
          </Link>
        </div>

        {errorMessage ? (
          <div className="mt-6 rounded-[22px] border border-line bg-surface/70 p-4 text-sm text-secondary/80 shadow-sm backdrop-blur">
            <span className="font-extrabold text-primary">Note:</span>{" "}
            Featured stays couldn’t load right now. You can still browse all listings.
            <span className="ml-2 text-secondary/60">
              ({errorMessage})
            </span>
          </div>
        ) : null}

        <div className="mt-10">
          {showSkeletons ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : items.length ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.slice(0, 6).map((it) => (
                <FeaturedCard key={it.id} item={it} />
              ))}
            </div>
          ) : (
            <div className="rounded-[26px] border border-line bg-surface/70 p-6 text-sm text-secondary/80 shadow-sm backdrop-blur">
              No featured stays yet — check back soon, or browse all listings.
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-dark-1/10 blur-3xl" />
      </div>
    </section>
  );
}
