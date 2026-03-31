"use client";

/**
 * Skip-to-content link for keyboard navigation accessibility.
 * Visible only on focus (Tab key).
 */
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
    >
      Skip to content
    </a>
  );
}
