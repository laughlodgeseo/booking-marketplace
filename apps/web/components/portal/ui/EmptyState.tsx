import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { PortalCard } from "@/components/portal/ui/PortalCard";

export function EmptyState(props: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <PortalCard className="p-10 text-center" tone="muted">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-surface/90 text-brand ring-1 ring-brand/18">
        {props.icon ?? <Inbox className="h-6 w-6 text-secondary" />}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-primary">
        {props.title}
      </h3>

      {props.description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-secondary">
          {props.description}
        </p>
      ) : null}

      {props.action ? (
        <div className="mt-6 flex justify-center">
          {props.action}
        </div>
      ) : null}
    </PortalCard>
  );
}
