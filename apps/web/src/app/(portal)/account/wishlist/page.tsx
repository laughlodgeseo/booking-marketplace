"use client";

import { useEffect, useState } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import Link from "next/link";
import { Heart, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { PortalShell } from "@/components/portal/PortalShell";
import { getWishlist, removeFromWishlist, type WishlistItem } from "@/lib/api/wishlist";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: WishlistItem[]; total: number };

export default function WishlistPage() {
  const { status } = useAuth();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    getWishlist(1, 50).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setState({ kind: "ready", items: res.data.items, total: res.data.total });
      } else {
        setState({ kind: "error", message: res.message ?? "Failed to load wishlist" });
      }
    });
    return () => { cancelled = true; };
  }, [status]);

  async function handleRemove(propertyId: string) {
    setRemovingId(propertyId);
    const res = await removeFromWishlist(propertyId);
    setRemovingId(null);

    if (res.ok && state.kind === "ready") {
      setState({
        kind: "ready",
        items: state.items.filter((i) => i.propertyId !== propertyId),
        total: state.total - 1,
      });
    }
  }

  return (
    <PortalShell role="customer" title="Wishlist" subtitle="Properties you've saved">
      {state.kind === "loading" && (
        <div className="premium-card premium-card-tinted rounded-2xl p-6 text-sm text-secondary">
          Loading wishlist...
        </div>
      )}

      {state.kind === "error" && (
        <div className="premium-card premium-card-tinted rounded-2xl p-6">
          <div className="text-sm font-semibold text-primary">Error</div>
          <div className="mt-2 text-sm text-secondary">{state.message}</div>
        </div>
      )}

      {state.kind === "ready" && state.items.length === 0 && (
        <div className="premium-card premium-card-tinted rounded-2xl p-8 text-center">
          <Heart className="mx-auto h-10 w-10 text-secondary/50" />
          <div className="mt-3 text-sm font-semibold text-primary">No saved properties</div>
          <p className="mt-1 text-xs text-secondary">
            Browse properties and tap the heart icon to save your favorites.
          </p>
          <Link
            href="/properties"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-accent-text transition hover:bg-brand-hover"
          >
            Browse stays
          </Link>
        </div>
      )}

      {state.kind === "ready" && state.items.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs text-muted">
            {state.total} saved {state.total === 1 ? "property" : "properties"}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.items.map((item) => {
              const img = item.property.media[0]?.url ?? null;
              const loc = [item.property.area, item.property.city]
                .filter(Boolean)
                .join(" - ");

              return (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-transform duration-300 hover:-translate-y-1"
                >
                  <Link href={`/properties/${item.property.slug}`}>
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      {img ? (
                        <OptimizedImage
                          src={img}
                          alt={item.property.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-dark-1/5 to-dark-1/0" />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/58 via-ink/18 to-transparent opacity-95" />

                      <div className="absolute left-3 top-3 rounded-xl border border-line bg-brand-soft px-3 py-2 text-xs font-semibold text-primary backdrop-blur">
                        {item.property.currency} {item.property.basePrice.toLocaleString()}{" "}
                        <span className="font-normal text-secondary">/ night</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 p-4">
                      <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-primary">
                        {item.property.title}
                      </h3>
                      {loc && <p className="text-sm text-secondary">{loc}</p>}
                    </div>
                  </Link>

                  <button
                    onClick={() => handleRemove(item.propertyId)}
                    disabled={removingId === item.propertyId}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-rose-500 shadow-sm backdrop-blur transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    aria-label="Remove from wishlist"
                  >
                    {removingId === item.propertyId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
