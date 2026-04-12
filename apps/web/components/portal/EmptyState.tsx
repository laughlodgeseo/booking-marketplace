import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-line/70 bg-surface shadow-sm p-8">
      <div className="text-base font-semibold text-primary">{title}</div>
      <div className="mt-2 text-sm text-secondary">{description}</div>

      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
