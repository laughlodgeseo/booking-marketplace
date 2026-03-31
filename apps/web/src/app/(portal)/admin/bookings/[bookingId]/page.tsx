"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, FileText, ShieldAlert } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import {
  downloadAdminBookingDocument,
  forceCancelAdminBooking,
  getAdminBookingDetail,
  type AdminBookingDetailResponse,
  type AdminBookingDocument,
} from "@/lib/api/portal/admin";
import { resolveMediaUrl } from "@/lib/media/resolveMediaUrl";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminBookingDetailResponse };

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
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

function toneClass(tone: "neutral" | "success" | "warning" | "danger"): string {
  if (tone === "success") return "border-success/35 bg-success/10 text-success";
  if (tone === "warning") return "border-warning/35 bg-warning/12 text-warning";
  if (tone === "danger") return "border-danger/35 bg-danger/12 text-danger";
  return "border-line/70 bg-warm-base text-primary";
}

export default function AdminBookingDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = typeof params?.bookingId === "string" ? params.bookingId : "";

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [cancelNotes, setCancelNotes] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!bookingId) return;
      setState({ kind: "loading" });
      try {
        const data = await getAdminBookingDetail(bookingId);
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

    void load();
    return () => {
      alive = false;
    };
  }, [bookingId]);

  const coverUrl = useMemo(() => {
    if (state.kind !== "ready") return null;
    const raw = state.data.property.coverUrl ?? state.data.property.media[0]?.url ?? null;
    return raw ? resolveMediaUrl(raw) : null;
  }, [state]);

  async function reload() {
    if (!bookingId) return;
    try {
      const data = await getAdminBookingDetail(bookingId);
      setState({ kind: "ready", data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to reload booking detail",
      });
    }
  }

  async function downloadDocument(doc: AdminBookingDocument) {
    setDocError(null);
    try {
      const blob = await downloadAdminBookingDocument(doc.bookingId, doc.id);
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

  async function forceCancel() {
    if (state.kind !== "ready") return;
    if (!state.data.canForceCancel) return;

    const confirmed = window.confirm("Force-cancel this booking with admin override?");
    if (!confirmed) return;

    setCancelBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const result = await forceCancelAdminBooking(state.data.id, { notes: cancelNotes });
      setActionMessage(
        result.alreadyCancelled
          ? "Booking was already cancelled."
          : "Booking force-cancelled successfully."
      );
      setCancelNotes("");
      await reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Force-cancel failed");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <PortalShell
      role="admin"
      title="Booking Detail"
      subtitle="Timeline, payment events, refunds, documents, and cancellation controls"
      right={(
        <Link
          href="/admin/bookings"
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
              {coverUrl ? (
                <OptimizedImage
                  src={coverUrl}
                  alt={state.data.property.title}
                  fill
                  className="h-full w-full object-cover"
                  sizes="100vw"
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
                  Booking: {state.data.id.slice(0, 8)}
                </span>
                <span className="rounded-full bg-warm-alt px-3 py-1 text-xs font-semibold text-secondary">
                  Total: {formatMoney(state.data.totalAmount, state.data.currency)}
                </span>
              </div>

              <h2 className="mt-3 text-xl font-semibold text-primary">{state.data.property.title}</h2>
              <div className="mt-1 text-sm text-secondary">
                {[state.data.property.area, state.data.property.city].filter(Boolean).join(", ")}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoCard label="Guest" value={state.data.customer.fullName || state.data.customer.email} />
                <InfoCard label="Vendor" value={state.data.property.vendor.fullName || state.data.property.vendor.email} />
                <InfoCard label="Check-in" value={formatDate(state.data.checkIn)} />
                <InfoCard label="Check-out" value={formatDate(state.data.checkOut)} />
                <InfoCard label="Adults / Children" value={`${state.data.adults} / ${state.data.children}`} />
                <InfoCard label="Created" value={formatDateTime(state.data.createdAt)} />
                <InfoCard label="Updated" value={formatDateTime(state.data.updatedAt)} />
                <InfoCard label="Payment deadline" value={formatDateTime(state.data.expiresAt)} />
              </div>
            </div>
          </section>

          {actionMessage ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 p-3 text-sm text-success">
              {actionMessage}
            </div>
          ) : null}
          {actionError ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {actionError}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Booking + payment timeline</div>
              <div className="mt-3 space-y-2">
                {state.data.timeline.map((event) => (
                  <div
                    key={`${event.key}-${event.at}`}
                    className={`rounded-2xl border p-3 ${toneClass(event.tone)}`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide">{event.label}</div>
                    <div className="mt-1 text-sm">{formatDateTime(event.at)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Payment + refunds</div>
              {state.data.payment ? (
                <div className="mt-3 rounded-2xl border border-line/70 bg-warm-base p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Payment</div>
                  <div className="mt-1 text-sm font-semibold text-primary">
                    {state.data.payment.provider} · {state.data.payment.status}
                  </div>
                  <div className="mt-1 text-sm text-secondary">
                    {formatMoney(state.data.payment.amount, state.data.payment.currency)}
                  </div>
                  <div className="mt-2 text-xs text-muted">Ref: {state.data.payment.providerRef || "-"}</div>

                  <div className="mt-3 space-y-2">
                    {state.data.payment.events.map((event) => (
                      <div key={event.id} className="rounded-xl border border-line/70 bg-surface p-2.5">
                        <div className="text-xs font-semibold text-primary">{event.label}</div>
                        <div className="text-xs text-secondary">{formatDateTime(event.createdAt)}</div>
                        <div className="text-xs text-muted">Provider ref: {event.providerRef || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No payment record for this booking.
                </div>
              )}

              <div className="mt-4 space-y-2">
                {state.data.refunds.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                    No refund records yet.
                  </div>
                ) : (
                  state.data.refunds.map((refund) => (
                    <div key={refund.id} className="rounded-2xl border border-line/70 bg-warm-base p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusPill status={refund.status}>{refund.status}</StatusPill>
                        <div className="text-xs font-semibold text-secondary">
                          {formatMoney(refund.amount, refund.currency)}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-secondary">
                        Reason: {refund.reason} · Provider: {refund.provider}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        Created: {formatDateTime(refund.createdAt)} · Provider ref: {refund.providerRefundRef || "-"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileText className="h-4 w-4" />
              Booking documents
            </div>
            <div className="mt-1 text-xs text-secondary">
              Authenticated admin download for uploaded guest documents.
            </div>

            {docError ? (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                {docError}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {state.data.documents.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No booking documents uploaded yet.
                </div>
              ) : (
                state.data.documents.items.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/70 bg-warm-base p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-primary">
                        {doc.originalName || `Document ${doc.id.slice(0, 8)}`}
                      </div>
                      <div className="mt-1 text-xs text-secondary">
                        {doc.type} · Uploaded by {doc.uploadedByUser?.fullName || doc.uploadedByUser?.email || "-"}
                      </div>
                      <div className="text-xs text-muted">{formatDateTime(doc.createdAt)}</div>
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

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Cancellation audit</div>
              {state.data.cancellation ? (
                (() => {
                  const cancellationCurrency =
                    state.data.cancellation.displayCurrency ??
                    state.data.cancellation.currency;
                  const penaltyAmount =
                    state.data.cancellation.penaltyAmountDisplay ??
                    state.data.cancellation.penaltyAmount;
                  const refundableAmount =
                    state.data.cancellation.refundableAmountDisplay ??
                    state.data.cancellation.refundableAmount;

                  return (
                    <div className="mt-3 rounded-2xl border border-line/70 bg-warm-base p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {state.data.cancellation.actor} · {state.data.cancellation.mode}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-primary">{state.data.cancellation.reason}</div>
                      <div className="mt-1 text-xs text-secondary">
                        Cancelled at {formatDateTime(state.data.cancellation.cancelledAt)}
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <InfoCard
                          label="Penalty"
                          value={formatMoney(penaltyAmount, cancellationCurrency)}
                        />
                        <InfoCard
                          label="Refundable"
                          value={formatMoney(refundableAmount, cancellationCurrency)}
                        />
                      </div>
                      {state.data.cancellation.notes ? (
                        <div className="mt-2 rounded-xl border border-line/70 bg-surface p-2.5 text-xs text-secondary">
                          {state.data.cancellation.notes}
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No cancellation record yet.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldAlert className="h-4 w-4" />
                Force cancel
              </div>
              <div className="mt-1 text-xs text-secondary">
                Uses booking cancellation API with `ADMIN_OVERRIDE` + `HARD` mode for audit-safe cancellation.
              </div>

              {state.data.canForceCancel ? (
                <div className="mt-3 space-y-3">
                  <textarea
                    rows={4}
                    value={cancelNotes}
                    onChange={(event) => setCancelNotes(event.target.value)}
                    placeholder="Audit note (optional)"
                    className="w-full rounded-2xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-brand/45 focus:ring-4 focus:ring-brand/20"
                  />
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => void forceCancel()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-danger px-4 py-2 text-sm font-semibold text-inverted hover:bg-danger disabled:opacity-60"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {cancelBusy ? "Cancelling..." : "Force cancel booking"}
                  </button>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-success/30 bg-success/10 p-3 text-sm text-success">
                  This booking is not in a cancellable state.
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
            <div className="text-sm font-semibold text-primary">Ops tasks linked to booking</div>
            <div className="mt-3 space-y-2">
              {state.data.opsTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No ops tasks linked to this booking.
                </div>
              ) : (
                state.data.opsTasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-line/70 bg-warm-base p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-primary">{task.type}</div>
                      <StatusPill status={task.status}>{task.status}</StatusPill>
                    </div>
                    <div className="mt-1 text-xs text-secondary">
                      Scheduled: {formatDateTime(task.scheduledFor)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </PortalShell>
  );
}

function InfoCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-warm-base p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-primary">{props.value}</div>
    </div>
  );
}
