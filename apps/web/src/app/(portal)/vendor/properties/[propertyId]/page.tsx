"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";

import { getVendorPropertyDraft, type VendorPropertyDetail } from "@/lib/api/portal/vendor";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: VendorPropertyDetail };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatMoneyMinor(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

function isApprovedPendingActivationPayment(status: string): boolean {
  return status === "APPROVED_PENDING_ACTIVATION_PAYMENT" || status === "APPROVED_PENDING_PAYMENT";
}

export default function VendorPropertyHubPage() {
  const router = useRouter();
  const params = useParams<{ propertyId: string }>();
  const propertyId = typeof params?.propertyId === "string" ? params.propertyId : "";

  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!propertyId) return;
      setState({ kind: "loading" });
      try {
        const data = await getVendorPropertyDraft(propertyId);
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to load property",
        });
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [propertyId]);

  const coverUrl = useMemo(() => {
    if (state.kind !== "ready") return null;
    const url = state.data.media[0]?.url ?? null;
    return url ? resolveMediaUrl(url) : null;
  }, [state]);

  const showPaymentCTA =
    state.kind === "ready" &&
    isApprovedPendingActivationPayment(state.data.status) &&
    state.data.activationPaymentStatus !== "PAID";

  return (
    <PortalShell
      role="vendor"
      title="Property Hub"
      subtitle="Central access to editor, calendar, bookings, ops tasks, and documents"
      right={(
        <Link
          href="/vendor/properties"
          className="rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
        >
          Back to properties
        </Link>
      )}
    >
      {state.kind === "loading" ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-48" />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
          {state.message}
        </div>
      ) : (
        <div className="space-y-5">
          <section className="overflow-hidden rounded-3xl border border-line/70 bg-surface shadow-sm">
            <div className="aspect-[16/8] bg-bg-2">
              {coverUrl ? (
                <OptimizedImage
                  src={coverUrl}
                  alt={state.data.title}
                  fill
                  className="h-full w-full object-cover"
                  sizes="100vw"
                />
              ) : null}
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">{state.data.title}</h2>
                  <div className="mt-1 text-sm text-secondary">
                    {[state.data.area, state.data.city].filter(Boolean).join(", ")}
                  </div>
                </div>
                <StatusPill status={state.data.status}>{state.data.status}</StatusPill>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Price from" value={`${state.data.basePrice} ${state.data.currency}`} />
                <Info label="Guests" value={String(state.data.maxGuests)} />
                <Info label="Bedrooms" value={String(state.data.bedrooms)} />
                <Info label="Updated" value={formatDate(state.data.updatedAt)} />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
            <div className="text-sm font-semibold text-primary">Actions</div>
            {showPaymentCTA ? (
              <div className="mt-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
                <h3 className="text-sm font-semibold text-primary">Activate Your Property</h3>
                <p className="mt-1 text-xs text-secondary">
                  Your property has been approved. Complete payment to go live.
                </p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  Amount:{" "}
                  {typeof state.data.activationFee === "number"
                    ? formatMoneyMinor(state.data.activationFee, state.data.activationFeeCurrency)
                    : `- ${state.data.activationFeeCurrency}`}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/vendor/properties/${encodeURIComponent(state.data.id)}/activation`)
                  }
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-brand px-3.5 text-xs font-semibold text-accent-text hover:bg-brand-hover"
                >
                  Pay &amp; Activate
                </button>
              </div>
            ) : null}

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <HubLink href={`/vendor/properties/${encodeURIComponent(state.data.id)}/edit`} title="Editor" desc="Update listing details, media, amenities, and review submission." />
              <HubLink href={`/vendor/properties/${encodeURIComponent(state.data.id)}/preview`} title="Preview" desc="Open the shared preview renderer used by admin and vendor." />
              <HubLink href={`/vendor/calendar?propertyId=${encodeURIComponent(state.data.id)}`} title="Calendar" desc="View availability and submit block-date requests." />
              <HubLink href="/vendor/bookings" title="Bookings" desc="See bookings for this property in the bookings workspace." />
              <HubLink href="/vendor/ops-tasks" title="Ops tasks" desc="Track operations task workload and schedule." />
              <HubLink href="/vendor/maintenance" title="Maintenance" desc="View maintenance requests tied to your properties." />
              <HubLink href="/vendor/work-orders" title="Work orders" desc="Review work order execution state and notes." />
            </div>
          </section>

          <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
            <div className="text-sm font-semibold text-primary">Documents</div>
            {state.data.documents.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                No property documents uploaded yet.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {state.data.documents.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-line/70 bg-warm-base p-3">
                    <div className="text-sm font-semibold text-primary">{doc.originalName || doc.type}</div>
                    <div className="mt-1 text-xs text-secondary">{doc.type} · {formatDate(doc.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </PortalShell>
  );
}

function HubLink(props: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={props.href}
      className="rounded-2xl border border-line/70 bg-warm-base p-4 transition hover:bg-accent-soft/45"
    >
      <div className="text-sm font-semibold text-primary">{props.title}</div>
      <div className="mt-1 text-xs text-secondary">{props.desc}</div>
    </Link>
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
