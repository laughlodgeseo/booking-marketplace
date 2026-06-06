"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Plus,
  Search,
} from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import NetworkErrorState from "@/components/ui/NetworkErrorState";
import { PropertyIllustration } from "@/components/portal/ui/PortalIllustration";
import {
  portalActionPrimary,
  portalRowPrimary,
  portalRowSecondary,
} from "@/components/portal/ui/portal-actions";

import { getVendorProperties, type VendorPropertyListItem } from "@/lib/api/portal/vendor";
import { formatCurrency } from "@/lib/utils/currency";

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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isApprovedPendingActivationPayment(status: string): boolean {
  return status === "APPROVED_PENDING_ACTIVATION_PAYMENT" || status === "APPROVED_PENDING_PAYMENT";
}

/* Map status to a left-border accent color */
function statusAccent(status: string): string {
  const s = status.toUpperCase();
  if (s.includes("PUBLISHED") || s.includes("ACTIVE")) return "bg-success";
  if (s.includes("UNDER_REVIEW") || s.includes("REVIEW") || s.includes("PENDING")) return "bg-warning";
  if (s.includes("CHANGES_REQUESTED")) return "bg-orange-400";
  if (s.includes("DRAFT")) return "bg-neutral-300";
  if (s.includes("REJECTED") || s.includes("CANCELLED")) return "bg-danger";
  if (s.includes("APPROVED")) return "bg-success";
  return "bg-brand/50";
}

/* Status label prettifier */
function prettyStatus(status: string): string {
  return status.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function PropertyCard(props: {
  property: VendorPropertyListItem;
  onNavigate: (href: string) => void;
}) {
  const { property } = props;
  const encodedId = encodeURIComponent(property.id);
  const editHref = `/vendor/properties/${encodedId}/edit`;
  const previewHref = `/vendor/properties/${encodedId}/preview`;
  const activationHref = `/vendor/properties/${encodedId}/activation`;
  const showContinueEditing = property.status === "DRAFT" || property.status === "CHANGES_REQUESTED";
  const showPaymentCTA =
    isApprovedPendingActivationPayment(property.status) &&
    property.activationPaymentStatus !== "PAID";

  return (
    <article className="portal-record-card group cursor-pointer" onClick={() => props.onNavigate(editHref)}>
      {/* Status color accent bar */}
      <div className={`portal-record-card-status-bar ${statusAccent(property.status)}`} />

      <div className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Property identity */}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-primary">{property.title}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted">
                  {[property.area, property.city].filter(Boolean).join(", ")}
                </div>
              </div>
            </div>
          </div>

          {/* Status pill */}
          <div className="flex shrink-0 items-center gap-2">
            <StatusPill status={property.status}>{prettyStatus(property.status)}</StatusPill>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <CalendarDays className="h-3 w-3" />
            Updated {formatDate(property.updatedAt || property.createdAt)}
          </div>
          {property.priceFrom ? (
            <div className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
              From AED {property.priceFrom} / night
            </div>
          ) : null}
          {property.slug ? (
            <div className="font-mono text-[10px] text-muted/50">{property.slug}</div>
          ) : null}
        </div>

        {/* Activation payment CTA */}
        {showPaymentCTA ? (
          <div
            className="mt-4 rounded-xl border border-warning/30 bg-warning/8 p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-primary">Activate Your Property</div>
                <div className="mt-0.5 text-[11px] text-secondary">
                  Approved — complete payment to go live.
                </div>
                {typeof property.activationFee === "number" ? (
                  <div className="mt-1 text-xs font-bold text-primary">
                    {formatCurrency(property.activationFee, property.activationFeeCurrency)}
                  </div>
                ) : null}
              </div>
              <Link
                href={activationHref}
                onClick={(e) => e.stopPropagation()}
                className={portalRowPrimary}
              >
                Pay &amp; Activate <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={editHref}
            onClick={(e) => e.stopPropagation()}
            className={portalRowPrimary}
          >
            {showContinueEditing ? "Continue editing" : "Edit listing"}
          </Link>
          <Link
            href={previewHref}
            onClick={(e) => e.stopPropagation()}
            className={portalRowSecondary}
          >
            Preview
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyProperties() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 bg-surface/60 px-6 py-12 text-center">
      <PropertyIllustration className="opacity-90" />
      <div className="mt-4 text-sm font-semibold text-primary">No properties yet</div>
      <div className="mt-1.5 max-w-xs text-xs leading-relaxed text-secondary">
        Create your first listing to start reaching guests on the Laugh &amp; Lodge marketplace.
      </div>
      <Link
        href="/vendor/properties/new"
        className={`mt-5 ${portalActionPrimary}`}
      >
        <Plus className="h-4 w-4" /> Create first property
      </Link>
    </div>
  );
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
        const response = await getVendorProperties({ page, pageSize: 12 });
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
    <PortalShell
      role="vendor"
      title="My Properties"
      subtitle="Manage listings, pricing, and availability"
      right={
        <Link
          href="/vendor/properties/new"
          className={portalActionPrimary}
        >
          <Plus className="h-4 w-4" /> New property
        </Link>
      }
    >
      {state.kind === "loading" ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
          <SkeletonBlock className="h-28" />
        </div>
      ) : state.kind === "error" ? (
        <NetworkErrorState
          title="We're having trouble loading this"
          message={state.message}
          retryLabel="Retry properties"
          onRetry={() => setReloadNonce((v) => v + 1)}
        />
      ) : (
        <div className="space-y-4">
          {/* Command bar */}
          <div className="portal-command-bar">
            <div className="relative min-w-0 flex-1" style={{ minWidth: "160px" }}>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, city, area..."
                className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="portal-select"
            >
              <option value="ALL">All statuses</option>
              {(derived?.statuses ?? []).map((s) => (
                <option key={s} value={s}>{prettyStatus(s)}</option>
              ))}
            </select>

            <div className="ml-auto text-[11px] text-muted">
              {state.total} {state.total === 1 ? "property" : "properties"}
            </div>
          </div>

          {/* Property cards */}
          {derived?.filtered.length === 0 ? (
            query || statusFilter !== "ALL" ? (
              <div className="rounded-2xl border border-dashed border-line/60 bg-surface/60 p-6 text-center">
                <div className="text-sm font-semibold text-primary">No properties match</div>
                <div className="mt-1 text-xs text-muted">Try adjusting your search or filter.</div>
                <button
                  type="button"
                  onClick={() => { setQuery(""); setStatusFilter("ALL"); }}
                  className="mt-3 text-xs font-semibold text-brand hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <EmptyProperties />
            )
          ) : (
            <div className="grid gap-3">
              {derived?.filtered.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onNavigate={(href) => router.push(href)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {(derived?.totalPages ?? 1) > 1 ? (
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted">
                Page {state.page} of {derived?.totalPages ?? 1} · {state.total} total
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={state.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={portalRowSecondary}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={state.page >= (derived?.totalPages ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className={portalRowSecondary}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </PortalShell>
  );
}
