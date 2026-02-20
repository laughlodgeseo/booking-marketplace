"use client";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/**
 * Premium skeleton:
 * - NO hard borders
 * - warm shimmer
 * - looks like a luxury placeholder, not a grey prison
 */
export function SkeletonLine(props: { w?: "sm" | "md" | "lg" | "full"; className?: string }) {
  const w =
    props.w === "sm" ? "w-24" : props.w === "md" ? "w-40" : props.w === "lg" ? "w-64" : "w-full";

  return (
    <div
      className={cn(
        "h-3 rounded-full",
        "bg-[linear-gradient(90deg,rgba(226,218,203,0.55),rgba(245,239,228,0.78),rgba(226,218,203,0.55))]",
        "bg-[length:220%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]",
        w,
        props.className
      )}
    />
  );
}

export function SkeletonBlock(props: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        "bg-[linear-gradient(90deg,rgba(226,218,203,0.55),rgba(245,239,228,0.78),rgba(226,218,203,0.55))]",
        "bg-[length:220%_100%] animate-[shimmer_1.4s_ease-in-out_infinite]",
        props.className
      )}
    />
  );
}

export function SkeletonTable(props: { rows?: number }) {
  const rows = props.rows ?? 8;

  return (
    <div className="portal-card overflow-hidden rounded-3xl bg-warm-base/95 lg:bg-surface/90">
      <div className="bg-warm-alt/66 px-4 py-4 sm:px-6">
        <SkeletonLine w="md" />
        <div className="portal-divider mt-3" />
      </div>

      <div className="px-4 pb-5 sm:px-5 sm:pb-6">
        <div className="space-y-3 lg:hidden">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line/35 bg-warm-base/95 p-4 shadow-sm">
              <SkeletonLine w="md" />
              <SkeletonLine w="full" className="mt-3" />
              <SkeletonLine w="lg" className="mt-2" />
              <div className="mt-4 flex gap-2">
                <SkeletonBlock className="h-11 w-24 rounded-2xl" />
                <SkeletonBlock className="h-11 w-28 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-surface/82 p-4">
              <div className="grid grid-cols-12 items-center gap-4">
                <div className="col-span-4">
                  <SkeletonLine w="lg" />
                </div>
                <div className="col-span-3">
                  <SkeletonLine w="md" />
                </div>
                <div className="col-span-3">
                  <SkeletonLine w="md" />
                </div>
                <div className="col-span-2">
                  <SkeletonLine w="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* keyframes (Tailwind v4 ok via arbitrary animation name) */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 220% 0%;
          }
        }
      `}</style>
    </div>
  );
}
