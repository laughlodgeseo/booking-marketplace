"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, ReceiptText } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { useAuth } from "@/lib/auth/auth-context";
import {
  downloadUserBookingDocument,
  getUserBookingDetail,
  type BookingDocumentType,
  type UserBookingDetailResponse,
} from "@/lib/api/portal/user";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: UserBookingDetailResponse };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amount: number, currency: string | null | undefined): string {
  const normalizedCurrency = (currency ?? "").trim().toUpperCase() || "AED";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCurrency === "AED" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toLocaleString()}`;
  }
}

function labelDocType(type: BookingDocumentType): string {
  if (type === "PASSPORT") return "Passport";
  if (type === "EMIRATES_ID") return "Emirates ID";
  if (type === "VISA") return "Visa";
  if (type === "ARRIVAL_FORM") return "Arrival Form";
  return "Other";
}

export default function AccountBookingDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = typeof params?.bookingId === "string" ? params.bookingId : "";

  const { status: authStatus } = useAuth();

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [docError, setDocError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!bookingId || authStatus === "loading") return;
      setState({ kind: "loading" });
      try {
        const data = await getUserBookingDetail(bookingId);
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to load booking detail",
        });
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [authStatus, bookingId]);

  const heroImage = useMemo(() => {
    if (state.kind !== "ready") return null;
    return state.data.property.coverUrl ?? state.data.property.media[0]?.url ?? null;
  }, [state]);

  async function downloadDocument(doc: UserBookingDetailResponse["documents"]["items"][number]) {
    setDocError(null);
    try {
      const blob = await downloadUserBookingDocument(doc.bookingId, doc.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.originalName || `booking-document-${doc.id}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDocError(error instanceof Error ? error.message : "Failed to download document");
    }
  }

  return (
    <PortalShell
      role="customer"
      title="Booking Detail"
      subtitle="Full timeline, policies, documents, and support context"
      right={(
        <Link
          href="/account/bookings"
          className="rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
        >
          Back to bookings
        </Link>
      )}
    >
      {state.kind === "loading" ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-[240px]" />
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-32" />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-3xl border border-danger/30 bg-danger/10 p-6">
          <div className="text-sm font-semibold text-danger">Booking detail unavailable</div>
          <div className="mt-1 text-sm text-danger">{state.message}</div>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-line/70 bg-surface shadow-sm">
            <div className="relative aspect-[16/10] w-full bg-warm-base sm:aspect-[21/9]">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={state.data.property.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-secondary">
                  Property image unavailable
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={state.data.status}>{state.data.status}</StatusPill>
                <span className="rounded-full bg-warm-alt px-3 py-1 text-xs font-semibold text-secondary">
                  Total: {formatMoney(state.data.totalAmount, state.data.currency)}
                </span>
                <span className="rounded-full bg-warm-alt px-3 py-1 text-xs font-semibold text-secondary">
                  {state.data.nights} nights
                </span>
              </div>

              <h2 className="mt-3 text-xl font-semibold text-primary">{state.data.property.title}</h2>
              <div className="mt-1 text-sm text-secondary">
                {[state.data.property.area, state.data.property.city].filter(Boolean).join(", ")}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
                  <div className="text-xs font-semibold text-muted">Check-in</div>
                  <div className="mt-1 text-sm font-semibold text-primary">{formatDate(state.data.checkIn)}</div>
                </div>
                <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
                  <div className="text-xs font-semibold text-muted">Check-out</div>
                  <div className="mt-1 text-sm font-semibold text-primary">{formatDate(state.data.checkOut)}</div>
                </div>
                <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
                  <div className="text-xs font-semibold text-muted">Guests</div>
                  <div className="mt-1 text-sm font-semibold text-primary">
                    {state.data.adults} adults, {state.data.children} children
                  </div>
                </div>
                <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
                  <div className="text-xs font-semibold text-muted">Bedrooms / Bathrooms</div>
                  <div className="mt-1 text-sm font-semibold text-primary">
                    {state.data.property.bedrooms} / {state.data.property.bathrooms}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Booking timeline</div>
              <div className="mt-3 space-y-2">
                {state.data.timeline.map((item) => (
                  <div
                    key={`${item.key}-${item.at}`}
                    className="rounded-2xl border border-line/70 bg-warm-base p-3"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</div>
                    <div className="mt-1 text-sm text-primary">{formatDateTime(item.at)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Policy snapshot</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <PolicyRow label="Min nights" value={String(state.data.property.minNights)} />
                <PolicyRow label="Max nights" value={state.data.property.maxNights ? String(state.data.property.maxNights) : "-"} />
                <PolicyRow
                  label="Check-in window"
                  value={
                    state.data.property.checkInFromMin !== null && state.data.property.checkInToMax !== null
                      ? `${state.data.property.checkInFromMin}:00 - ${state.data.property.checkInToMax}:00`
                      : "-"
                  }
                />
                <PolicyRow
                  label="Check-out after"
                  value={state.data.property.checkOutMin !== null ? `${state.data.property.checkOutMin}:00` : "-"}
                />
                <PolicyRow label="Instant book" value={state.data.property.isInstantBook ? "Yes" : "No"} />
                <PolicyRow
                  label="Free cancel before"
                  value={
                    state.data.property.cancellationPolicy
                      ? `${state.data.property.cancellationPolicy.freeCancelBeforeHours}h`
                      : "-"
                  }
                />
              </div>

              {state.data.payment ? (
                <div className="mt-4 rounded-2xl border border-line/70 bg-warm-base p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Payment</div>
                  <div className="mt-1 text-sm font-semibold text-primary">
                    {state.data.payment.provider} · {state.data.payment.status}
                  </div>
                  <div className="mt-1 text-sm text-secondary">
                    {formatMoney(state.data.payment.amount, state.data.payment.currency)}
                  </div>

                  <div className="mt-3 space-y-2">
                    {state.data.payment.events.map((event) => (
                      <div key={event.id} className="rounded-xl border border-line/60 bg-surface p-2.5">
                        <div className="text-xs font-semibold text-primary">{event.label}</div>
                        <div className="text-xs text-secondary">{formatDateTime(event.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
            <div className="text-sm font-semibold text-primary">Guest documents</div>
            <div className="mt-1 text-xs text-secondary">
              Required for compliance before check-in. Missing documents are highlighted below.
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {state.data.documents.requiredTypes.map((type) => (
                <span key={`required-${type}`} className="rounded-full bg-warm-alt px-3 py-1 text-xs font-semibold text-secondary">
                  Required: {labelDocType(type)}
                </span>
              ))}
              {state.data.documents.missingTypes.map((type) => (
                <span key={`missing-${type}`} className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                  Missing: {labelDocType(type)}
                </span>
              ))}
            </div>

            {docError ? (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                {docError}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {state.data.documents.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No documents uploaded yet.
                </div>
              ) : (
                state.data.documents.items.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/70 bg-warm-base p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-primary">
                        {doc.originalName ?? `Document ${doc.id.slice(0, 8)}`}
                      </div>
                      <div className="mt-1 text-xs text-secondary">
                        {labelDocType(doc.type)} · {formatDateTime(doc.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void downloadDocument(doc)}
                      className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                    >
                      Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <MessageSquare className="h-4 w-4" />
                Messages
              </div>
              <Link
                href="/account/messages"
                className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
              >
                Open inbox
              </Link>
            </div>

            <div className="mt-3 space-y-2">
              {state.data.messages.threads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No support thread yet for this account.
                </div>
              ) : (
                state.data.messages.threads.map((thread) => (
                  <div key={thread.id} className="rounded-2xl border border-line/70 bg-warm-base p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-primary">
                        {thread.subject || "Support conversation"}
                      </div>
                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-accent-text">
                          {thread.unreadCount} new
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-secondary">
                      {thread.lastMessagePreview || "No message preview"}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                      <span>{thread.admin.fullName || thread.admin.email}</span>
                      <span>{thread.lastMessageAt ? formatDateTime(thread.lastMessageAt) : "-"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/properties/${state.data.property.slug}`}
              className="inline-flex items-center gap-1 rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
            >
              <ReceiptText className="h-4 w-4" />
              View property page
            </Link>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

function PolicyRow(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/70 bg-warm-base p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-primary">{props.value}</div>
    </div>
  );
}
