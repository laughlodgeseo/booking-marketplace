"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
};

/**
 * Returns the sequence of page numbers (and "…" ellipsis sentinels) to render.
 *
 * Rules:
 *  - Always show first and last page.
 *  - Always show current page ± 1.
 *  - When near the start/end, fill to show at least 3 consecutive pages there.
 *  - Collapse a single-number gap (e.g. [1, 3] → [1, 2, 3]) instead of ellipsis.
 *  - Use "…" for gaps > 1 page.
 *  - Show all pages when totalPages ≤ 7.
 */
function buildPageRange(page: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const included = new Set<number>();
  included.add(1);
  included.add(total);

  for (let p = Math.max(1, page - 1); p <= Math.min(total, page + 1); p++) {
    included.add(p);
  }

  if (page <= 3) {
    included.add(2);
    included.add(3);
  }

  if (page >= total - 2) {
    included.add(total - 1);
    included.add(total - 2);
  }

  const sorted = Array.from(included).sort((a, b) => a - b);
  const result: (number | "…")[] = [];

  for (let i = 0; i < sorted.length; i++) {
    result.push(sorted[i]);
    if (i < sorted.length - 1) {
      const gap = sorted[i + 1] - sorted[i];
      if (gap === 2) {
        // Single missing number — inline it rather than waste space on ellipsis
        result.push(sorted[i] + 1);
      } else if (gap > 2) {
        result.push("…");
      }
    }
  }

  return result;
}

export default function PropertyPagination({ page, totalPages, onGoToPage }: Props) {
  const pages = buildPageRange(page, totalPages);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav aria-label="Property pagination" className="flex justify-center py-3">
      <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200/80 bg-white/90 px-2 py-1.5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        {/* Previous */}
        <button
          type="button"
          onClick={() => canPrev && onGoToPage(page - 1)}
          disabled={!canPrev}
          aria-label="Go to previous page"
          tabIndex={canPrev ? 0 : -1}
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150",
            canPrev
              ? "cursor-pointer text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
              : "pointer-events-none cursor-default text-slate-300 opacity-40",
          ].join(" ")}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === "…" ? (
            <span
              key={`ellipsis-${i}`}
              aria-hidden="true"
              className="flex h-9 w-6 select-none items-center justify-center text-sm text-slate-400"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onGoToPage(p)}
              aria-label={`Go to page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={[
                "flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-1.5 text-sm font-medium transition-all duration-150",
                p === page
                  ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_3px_10px_rgba(99,102,241,0.40)]"
                  : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600",
              ].join(" ")}
            >
              {p}
            </button>
          ),
        )}

        {/* Next */}
        <button
          type="button"
          onClick={() => canNext && onGoToPage(page + 1)}
          disabled={!canNext}
          aria-label="Go to next page"
          tabIndex={canNext ? 0 : -1}
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150",
            canNext
              ? "cursor-pointer text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
              : "pointer-events-none cursor-default text-slate-300 opacity-40",
          ].join(" ")}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
