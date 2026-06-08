"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, MessageSquare, ReceiptText, Upload, WalletCards } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { cancelBooking, refetchPropertyAvailability } from "@/lib/api/bookings";
import { useAuth } from "@/lib/auth/auth-context";
import {
  formatBookingStatusForCustomer,
  formatMinutesFromMidnight,
  formatPaymentStatusForCustomer,
} from "@/lib/customerDisplay";
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

function formatGuestCount(adults: number, children: number): string {
  const parts = [`${adults} adult${adults === 1 ? "" : "s"}`];
  if (children > 0) parts.push(`${children} child${children === 1 ? "" : "ren"}`);
  return parts.join(", ");
}

function formatCancellation(policy: UserBookingDetailResponse["property"]["cancellationPolicy"]): string {
  if (!policy?.isActive) return "Cancellation policy applies";
  if (policy.freeCancelBeforeHours > 0) {
    return `Free cancellation until ${policy.freeCancelBeforeHours} hours before check-in`;
  }
  return "Cancellation policy applies";
}

function getTimelineDate(data: UserBookingDetailResponse, keys: string[]): string {
  const hit = data.timeline.find((item) => {
    const key = `${item.key} ${item.label}`.toLowerCase();
    return keys.some((needle) => key.includes(needle));
  });
  return hit?.at ?? data.updatedAt ?? data.createdAt;
}

function getCustomerProgress(data: UserBookingDetailResponse): Array<{ label: string; at: string }> {
  const rows: Array<{ label: string; at: string }> = [
    { label: "Booking created", at: data.createdAt },
  ];

  if (data.payment) {
    rows.push({
      label: formatPaymentStatusForCustomer(data.payment.status),
      at: data.payment.updatedAt ?? data.payment.createdAt,
    });
  }

  if (data.status === "CONFIRMED" || data.status === "COMPLETED") {
    rows.push({
      label: "Booking confirmed",
      at: getTimelineDate(data, ["confirm"]),
    });
  }

  return rows;
}

export default function AccountBookingDetailPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = typeof params?.bookingId === "string" ? params.bookingId : "";
  const router = useRouter();

  const { status: authStatus } = useAuth();

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [docError, setDocError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  const canCancel =
    state.kind === "ready" &&
    (state.data.status === "PENDING_PAYMENT" || state.data.status === "PENDING");

  async function cancelCurrentBooking() {
    if (state.kind !== "ready" || !canCancel || cancelBusy) return;

    const confirmed = window.confirm("Cancel this unpaid booking and release your reserved dates?");
    if (!confirmed) return;

    setCancelBusy(true);
    setCancelError(null);

    try {
      await cancelBooking({
        bookingId: state.data.id,
        reason: "GUEST_REQUEST",
      });

      try {
        await refetchPropertyAvailability({
          propertyId: state.data.property.id,
          from: state.data.checkIn.slice(0, 10),
          to: state.data.checkOut.slice(0, 10),
        });
      } catch {
        // Non-blocking. Availability always refreshes on next page load.
      }

      router.refresh();
      router.replace("/account/bookings?toast=booking_cancelled");
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Failed to cancel booking");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <PortalShell
      role="customer"
      title="Booking details"
      subtitle="Your stay dates, payment summary, documents, and support options"
      right={(
        <Link
          href="/account/bookings"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
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
          <section className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="relative aspect-[4/3] w-full bg-[#faf8f5] sm:aspect-[16/7]">
              {heroImage ? (
                <OptimizedImage
                  src={heroImage}
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

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {formatBookingStatusForCustomer(state.data.status)}
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatMoney(state.data.totalAmount, state.data.currency)} paid
                </span>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {state.data.nights} nights
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{state.data.property.title}</h2>
              <div className="mt-1 text-sm text-slate-600">
                {[state.data.property.area, state.data.property.city].filter(Boolean).join(", ")}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-[#faf8f5] p-3">
                  <div className="text-xs font-semibold text-slate-500">Check-in</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{formatDate(state.data.checkIn)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[#faf8f5] p-3">
                  <div className="text-xs font-semibold text-slate-500">Check-out</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{formatDate(state.data.checkOut)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[#faf8f5] p-3">
                  <div className="text-xs font-semibold text-slate-500">Guests</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">{formatGuestCount(state.data.adults, state.data.children)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-[#faf8f5] p-3">
                  <div className="text-xs font-semibold text-slate-500">Bedrooms / Bathrooms</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950">
                    {state.data.property.bedrooms} / {state.data.property.bathrooms}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm xl:col-span-1">
              <div className="text-base font-semibold text-slate-950">Booking progress</div>
              <div className="mt-4 space-y-3">
                {getCustomerProgress(state.data).map((item) => (
                  <div key={`${item.label}-${item.at}`} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{formatDateTime(item.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="text-base font-semibold text-slate-950">Stay details</div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <PolicyRow
                  label="Check-in"
                  value={
                    state.data.property.checkInFromMin !== null && state.data.property.checkInToMax !== null
                      ? `${formatMinutesFromMidnight(state.data.property.checkInFromMin)} – ${formatMinutesFromMidnight(state.data.property.checkInToMax)}`
                      : "Not available"
                  }
                />
                <PolicyRow
                  label="Check-out"
                  value={
                    state.data.property.checkOutMin !== null
                      ? `By ${formatMinutesFromMidnight(state.data.property.checkOutMin)}`
                      : "Not available"
                  }
                />
                <PolicyRow
                  label="Minimum stay"
                  value={`${state.data.property.minNights} night${state.data.property.minNights === 1 ? "" : "s"}`}
                />
                <PolicyRow
                  label="Maximum stay"
                  value={
                    state.data.property.maxNights
                      ? `${state.data.property.maxNights} night${state.data.property.maxNights === 1 ? "" : "s"}`
                      : "Not available"
                  }
                />
                <PolicyRow label="Cancellation" value={formatCancellation(state.data.property.cancellationPolicy)} />
                <PolicyRow label="Booking type" value={state.data.property.isInstantBook ? "Instant booking" : "Request booking"} />
              </div>

              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <WalletCards className="h-4 w-4 text-indigo-700" />
                  Payment summary
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <PaymentSummaryRow
                    label="Status"
                    value={formatPaymentStatusForCustomer(state.data.payment?.status ?? state.data.status)}
                  />
                  <PaymentSummaryRow
                    label="Total paid"
                    value={formatMoney(state.data.totalAmount, state.data.currency)}
                  />
                  <PaymentSummaryRow label="Payment method" value={state.data.payment ? "Card" : "Not available"} />
                  <PaymentSummaryRow
                    label="Receipt"
                    value={state.data.status === "CONFIRMED" || state.data.status === "COMPLETED" ? "Available after confirmation" : "Available when confirmed"}
                  />
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <FileText className="h-4 w-4 text-indigo-700" />
              Guest documents
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Passport required before check-in. Upload your passport from the Documents page so the host team can verify your stay.
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {state.data.documents.requiredTypes.map((type) => (
                <span key={`required-${type}`} className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {labelDocType(type)} required
                </span>
              ))}
              {state.data.documents.missingTypes.map((type) => (
                <span key={`missing-${type}`} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Action needed: {labelDocType(type)} still required
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
                <div className="rounded-2xl border border-dashed border-amber-200 bg-[#fff8eb] p-4 text-sm text-amber-900">
                  Passport still required before check-in.
                </div>
              ) : (
                state.data.documents.items.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#faf8f5] p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">
                        {doc.originalName ?? `Document ${doc.id.slice(0, 8)}`}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {labelDocType(doc.type)} · {formatDateTime(doc.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void downloadDocument(doc)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Download
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/account/documents"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Upload className="h-4 w-4" />
                Upload document
              </Link>
              <Link
                href="/account/documents"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                View documents
              </Link>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <MessageSquare className="h-4 w-4 text-indigo-700" />
                  Need help with this booking?
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Message the Laugh &amp; Lodge team if you need help with check-in, documents, or booking changes.
                </p>
              </div>
              <Link
                href="/account/messages"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Open inbox
              </Link>
            </div>

            <div className="mt-3 space-y-2">
              {state.data.messages.threads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-[#faf8f5] p-4 text-sm text-slate-600">
                  No support thread has been started yet.
                </div>
              ) : (
                state.data.messages.threads.map((thread) => (
                  <div key={thread.id} className="rounded-2xl border border-slate-200 bg-[#faf8f5] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-950">
                        {thread.subject || "Support conversation"}
                      </div>
                      {thread.unreadCount > 0 ? (
                        <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-accent-text">
                          {thread.unreadCount} new
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {thread.lastMessagePreview || "No message preview"}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{thread.admin.fullName || thread.admin.email}</span>
                      <span>{thread.lastMessageAt ? formatDateTime(thread.lastMessageAt) : "-"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href="/account/bookings"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to bookings
            </Link>
            <Link
              href={`/properties/${state.data.property.slug}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <ReceiptText className="h-4 w-4" />
              View property
            </Link>
            <Link
              href="/account/messages"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <MessageSquare className="h-4 w-4" />
              Open inbox
            </Link>
            {canCancel ? (
              <button
                type="button"
                onClick={() => void cancelCurrentBooking()}
                disabled={cancelBusy}
                className="inline-flex items-center gap-1 rounded-2xl border border-danger/60 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger shadow-sm hover:bg-danger/15 disabled:opacity-60"
              >
                {cancelBusy ? "Cancelling..." : "Cancel booking"}
              </button>
            ) : null}
          </div>
          {cancelError ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              {cancelError}
            </div>
          ) : null}
        </div>
      )}
    </PortalShell>
  );
}

function PolicyRow(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#faf8f5] p-3">
      <div className="text-xs font-semibold text-slate-500">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{props.value}</div>
    </div>
  );
}

function PaymentSummaryRow(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{props.value}</div>
    </div>
  );
}
