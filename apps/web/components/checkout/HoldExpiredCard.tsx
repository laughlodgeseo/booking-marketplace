"use client";

import Link from "next/link";

export function HoldExpiredCard(props: { propertyId?: string | null; propertySlug?: string | null }) {
  const href = props.propertySlug ? `/properties/${props.propertySlug}` : props.propertyId ? `/properties/${props.propertyId}` : "/properties";

  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/12 p-6">
      <div className="text-sm font-semibold text-danger">Your hold expired</div>

      <p className="mt-2 text-sm leading-6 text-danger/90">
        The payment window ended, so the hold was released and these dates are no longer reserved.
      </p>

      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-danger/90">
        <li>Go back to the listing</li>
        <li>Select dates again</li>
        <li>Create a new hold and continue checkout</li>
      </ul>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
        >
          Back to listing
        </Link>

        <Link
          href="/properties"
          className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt"
        >
          Browse stays
        </Link>
      </div>
    </div>
  );
}
