"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import {
  getVendorReviews,
  submitHostResponse,
  type VendorReviewItem,
  type VendorReviewsResponse,
} from "@/lib/api/portal/reviews";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: VendorReviewsResponse };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-amber-500 text-amber-500" : "fill-none text-warm-alt stroke-current"}`}
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
      <span className="ml-1">{rating}/5</span>
    </span>
  );
}

function ReviewCard({
  review,
  onResponseSubmitted,
  t,
}: {
  review: VendorReviewItem;
  onResponseSubmitted: (reviewId: string, text: string, respondedAt: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [replying, setReplying] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!responseText.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitHostResponse(review.id, responseText);
      onResponseSubmitted(review.id, result.hostResponseText, result.hostResponseAt);
      setReplying(false);
      setResponseText("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t("errors.submitResponse"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line/40 bg-warm-base/95 p-5 shadow-sm ring-1 ring-line/10 lg:bg-surface">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary">
            {review.customer.fullName || t("guest")}
          </p>
          <p className="text-xs text-secondary">
            {t("on")}{" "}
            <span className="font-medium text-primary">{review.property.title}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StarRating rating={review.rating} />
          <span className="text-xs text-secondary">{formatDate(review.createdAt)}</span>
        </div>
      </div>

      {/* Review content */}
      <div className="mt-3 space-y-1">
        {review.title && (
          <h4 className="text-sm font-semibold text-primary">{review.title}</h4>
        )}
        {review.comment && (
          <p className="text-sm leading-relaxed text-secondary">{review.comment}</p>
        )}
      </div>

      {/* Host response (if exists) */}
      {review.hostResponseText && (
        <div className="mt-4 rounded-2xl bg-brand/8 px-4 py-3">
          <p className="text-xs font-semibold text-brand">{t("hostResponse")}</p>
          <p className="mt-1 text-sm leading-relaxed text-primary">
            {review.hostResponseText}
          </p>
          {review.hostResponseAt && (
            <p className="mt-1 text-xs text-secondary">
              {t("responded", { date: formatDate(review.hostResponseAt) })}
            </p>
          )}
        </div>
      )}

      {/* Reply button / form */}
      {!review.hostResponseText && !replying && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="inline-flex h-10 items-center rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm hover:bg-accent-soft/22 lg:bg-surface"
          >
            {t("replyAsHost")}
          </button>
        </div>
      )}

      {!review.hostResponseText && replying && (
        <div className="mt-4 space-y-3">
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value.slice(0, 500))}
            placeholder={t("placeholder")}
            rows={3}
            maxLength={500}
            className="w-full rounded-2xl border border-line/50 bg-warm-base/95 px-4 py-3 text-sm text-primary outline-none focus:border-brand/45 focus:ring-4 focus:ring-brand/20 lg:bg-surface"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">{responseText.length}/500</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplying(false);
                  setResponseText("");
                  setSubmitError(null);
                }}
                disabled={submitting}
                className="inline-flex h-10 items-center rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-secondary shadow-sm hover:bg-accent-soft/22 disabled:opacity-50 lg:bg-surface"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !responseText.trim()}
                className="inline-flex h-10 items-center rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 disabled:opacity-50"
              >
                {submitting ? t("submitting") : t("submit")}
              </button>
            </div>
          </div>
          {submitError && (
            <p className="text-xs text-danger">{submitError}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VendorReviewsPage() {
  const t = useTranslations("portal.vendorReviews");
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;

    async function load() {
      setState({ kind: "loading" });
      try {
        const data = await getVendorReviews({ page, pageSize: 20 });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : t("errors.load"),
        });
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [page, t]);

  function handleResponseSubmitted(reviewId: string, text: string, respondedAt: string) {
    setState((prev) => {
      if (prev.kind !== "ready") return prev;
      return {
        kind: "ready",
        data: {
          ...prev.data,
          items: prev.data.items.map((item) =>
            item.id === reviewId
              ? { ...item, hostResponseText: text, hostResponseAt: respondedAt }
              : item
          ),
        },
      };
    });
  }

  const totalPages =
    state.kind === "ready"
      ? Math.max(1, Math.ceil(state.data.total / state.data.pageSize))
      : 1;

  return (
    <PortalShell role="vendor" title={t("title")} subtitle={t("subtitle")}>
      <ErrorBoundary>
      {state.kind === "loading" ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
          {state.message}
        </div>
      ) : state.data.items.length === 0 ? (
        <div className="rounded-3xl border border-line/40 bg-warm-base/95 p-8 text-center shadow-sm lg:bg-surface">
          <p className="text-sm font-semibold text-primary">{t("noReviews")}</p>
          <p className="mt-1 text-xs text-secondary">
            {t("noReviewsHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-4">
            {state.data.items.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onResponseSubmitted={handleResponseSubmitted}
                t={t}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-secondary">
              {t("pageOf", { page: state.data.page, totalPages })}
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                disabled={state.data.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-11 flex-1 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm disabled:opacity-50 sm:flex-none lg:bg-surface"
              >
                {t("prev")}
              </button>

              <button
                type="button"
                disabled={state.data.page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="h-11 flex-1 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm disabled:opacity-50 sm:flex-none lg:bg-surface"
              >
                {t("next")}
              </button>
            </div>
          </div>
        </div>
      )}
      </ErrorBoundary>
    </PortalShell>
  );
}
