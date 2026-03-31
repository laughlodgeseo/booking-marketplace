"use client";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const shimmer = "bg-[linear-gradient(90deg,rgba(226,218,203,0.55),rgba(245,239,228,0.78),rgba(226,218,203,0.55))] bg-[length:220%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]";

export function PropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl overflow-hidden ring-1 ring-line/30 bg-surface/90", className)}>
      {/* Image placeholder */}
      <div className={cn("h-48 w-full", shimmer)} />
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className={cn("h-4 w-3/4 rounded-full", shimmer)} />
        <div className={cn("h-3 w-1/2 rounded-full", shimmer)} />
        <div className="flex items-center justify-between pt-2">
          <div className={cn("h-5 w-20 rounded-full", shimmer)} />
          <div className={cn("h-3 w-16 rounded-full", shimmer)} />
        </div>
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BookingPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="space-y-3">
        <div className={cn("h-8 w-64 rounded-lg", shimmer)} />
        <div className={cn("h-4 w-96 rounded-full", shimmer)} />
      </div>
      {/* Property summary card */}
      <div className="rounded-2xl ring-1 ring-line/30 bg-surface/90 p-6">
        <div className="flex gap-4">
          <div className={cn("h-24 w-32 rounded-xl shrink-0", shimmer)} />
          <div className="flex-1 space-y-3">
            <div className={cn("h-5 w-3/4 rounded-full", shimmer)} />
            <div className={cn("h-4 w-1/2 rounded-full", shimmer)} />
            <div className={cn("h-4 w-1/3 rounded-full", shimmer)} />
          </div>
        </div>
      </div>
      {/* Pricing breakdown */}
      <div className="rounded-2xl ring-1 ring-line/30 bg-surface/90 p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className={cn("h-4 w-32 rounded-full", shimmer)} />
            <div className={cn("h-4 w-16 rounded-full", shimmer)} />
          </div>
        ))}
        <div className="border-t border-line/50 pt-4 flex justify-between">
          <div className={cn("h-5 w-24 rounded-full", shimmer)} />
          <div className={cn("h-5 w-20 rounded-full", shimmer)} />
        </div>
      </div>
      {/* CTA */}
      <div className={cn("h-12 w-full rounded-2xl", shimmer)} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl ring-1 ring-line/30 bg-surface/90 p-4 space-y-3">
            <div className={cn("h-3 w-20 rounded-full", shimmer)} />
            <div className={cn("h-8 w-16 rounded-lg", shimmer)} />
            <div className={cn("h-3 w-24 rounded-full", shimmer)} />
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div className={cn("h-64 w-full rounded-2xl", shimmer)} />
      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn("h-16 w-full rounded-2xl", shimmer)} />
        ))}
      </div>
    </div>
  );
}

export function MessageThreadSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
          <div className={cn("rounded-2xl px-4 py-3", shimmer, i % 2 === 0 ? "w-3/5" : "w-2/5", "h-12")} />
        </div>
      ))}
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="rounded-2xl ring-1 ring-line/30 bg-surface/90 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-full shrink-0", shimmer)} />
        <div className="space-y-2 flex-1">
          <div className={cn("h-4 w-32 rounded-full", shimmer)} />
          <div className={cn("h-3 w-20 rounded-full", shimmer)} />
        </div>
        <div className={cn("h-6 w-14 rounded-full", shimmer)} />
      </div>
      <div className={cn("h-4 w-full rounded-full", shimmer)} />
      <div className={cn("h-4 w-3/4 rounded-full", shimmer)} />
    </div>
  );
}
