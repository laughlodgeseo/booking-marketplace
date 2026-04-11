"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import NetworkErrorState from "@/components/ui/NetworkErrorState";

import { getVendorProperties, type VendorPropertyListItem } from "@/lib/api/portal/vendor";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      items: VendorPropertyListItem[];
      page: number;
      pageSize: number;
      total: number;
    };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function VendorPropertiesPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let alive = true;

    async function load() {
      setState({ kind: "loading" });
      try {
        const response = await getVendorProperties({ page, pageSize: 10 });
        if (!alive) return;
        setState({
          kind: "ready",
          items: response.items,
          page: response.page,
          pageSize: response.pageSize,
          total: response.total,
        });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to load properties",
        });
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [page, reloadNonce]);

  const derived = useMemo(() => {
    if (state.kind !== "ready") return null;

    const statuses = Array.from(new Set(state.items.map((item) => item.status))).sort((a, b) => a.localeCompare(b));
    const q = query.trim().toLowerCase();

    const filtered = state.items
      .filter((item) => (statusFilter === "ALL" ? true : item.status === statusFilter))
      .filter((item) => {
        if (!q) return true;
        return [item.title, item.slug, item.city, item.area ?? ""].join(" | ").toLowerCase().includes(q);
      });

    const totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    return { filtered, statuses, totalPages };
  }, [state, query, statusFilter]);

  return (
    <PortalShell role="vendor" title="Properties" subtitle="Open each listing directly in the editor or preview hub">
      {state.kind === "loading" ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
      ) : state.kind === "error" ? (
        <NetworkErrorState
          title="We're having trouble loading this"
          message={state.message}
          retryLabel="Retry properties"
          onRetry={() => {
            setReloadNonce((value) => value + 1);
          }}
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-3xl border border-line/40 bg-warm-base/95 p-4 shadow-sm lg:border-line/50 lg:bg-surface">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, slug, city..."
                className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base text-primary outline-none focus:border-brand/45 focus:ring-4 focus:ring-brand/20 lg:bg-surface lg:text-sm"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base font-semibold text-primary lg:bg-surface lg:text-sm"
              >
                <option value="ALL">All statuses</option>
                {(derived?.statuses ?? []).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <Link
                href="/vendor/properties/new"
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-accent-text shadow-sm hover:bg-brand-hover lg:w-auto"
              >
                Create property
              </Link>
            </div>
          </div>

          {derived?.filtered.length === 0 ? (
            <div className="rounded-3xl border border-line/40 bg-warm-base/95 p-6 text-sm text-secondary lg:border-line/60 lg:bg-surface">
              No properties match your filters.
            </div>
          ) : (
            <div className="grid gap-3">
              {derived?.filtered.map((property) => {
                const encodedId = encodeURIComponent(property.id);
                const editHref = `/vendor/properties/${encodedId}/edit`;
                const previewHref = `/vendor/properties/${encodedId}`;
                const showContinueEditing =
                  property.status === "DRAFT" || property.status === "CHANGES_REQUESTED";

                return (
                  <article
                    key={property.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(editHref)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(editHref);
                      }
                    }}
                    className="cursor-pointer rounded-3xl border border-line/40 bg-warm-base/95 p-5 shadow-sm transition hover:bg-warm-alt/60 lg:border-line/60 lg:bg-surface"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="block min-w-0">
                        <div className="text-sm font-semibold text-primary">{property.title}</div>
                        <div className="mt-1 text-xs text-secondary">
                          {[property.area, property.city].filter(Boolean).join(", ")} · {property.slug}
                        </div>
                        <div className="mt-1 text-xs text-muted">Updated: {formatDate(property.updatedAt || property.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-warm-alt px-3 py-1 text-xs font-semibold text-secondary">
                          AED {property.priceFrom}
                        </span>
                        <StatusPill status={property.status}>{property.status}</StatusPill>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={editHref}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3.5 text-xs font-semibold text-accent-text hover:bg-brand-hover"
                      >
                        {showContinueEditing ? "Continue editing" : "Edit"}
                      </Link>
                      <Link
                        href={previewHref}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-line/60 bg-surface px-3.5 text-xs font-semibold text-primary hover:bg-warm-alt"
                      >
                        Preview
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-secondary">
              Page {state.page} of {derived?.totalPages ?? 1}
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                disabled={state.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-11 flex-1 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm disabled:opacity-50 sm:flex-none lg:bg-surface"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={state.page >= (derived?.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
                className="h-11 flex-1 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm disabled:opacity-50 sm:flex-none lg:bg-surface"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
