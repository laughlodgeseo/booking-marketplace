import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { PortalCard } from "@/components/portal/ui/PortalCard";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export type CardListItem = {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
};

export function CardList(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  items: CardListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <PortalCard padding="none" className="overflow-hidden">
      <div className="bg-warm-alt/65 px-4 py-4 sm:px-5">
        <SectionHeader title={props.title} subtitle={props.subtitle} />
      </div>

      {props.items.length === 0 ? (
        <div className="p-6 sm:p-8">
          <div className="rounded-2xl border border-line/60 bg-warm-alt/75 p-6 text-center">
            <div className="text-sm font-semibold text-primary">{props.emptyTitle ?? "No records"}</div>
            <div className="mt-1 text-sm text-secondary">
              {props.emptyDescription ?? "There are no items to display right now."}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-4 sm:p-5">
          {props.items.map((item) => (
            <div
              key={item.id}
              role={item.onClick ? "button" : undefined}
              tabIndex={item.onClick ? 0 : undefined}
              onClick={() => item.onClick?.()}
              onKeyDown={(event) => {
                if (!item.onClick) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  item.onClick();
                }
              }}
              className={cn(
                "rounded-2xl border border-line/55 bg-warm-base/94 p-4 shadow-sm transition lg:bg-warm-alt/66",
                item.onClick ? "cursor-pointer hover:bg-accent-soft/24 hover:-translate-y-0.5" : "cursor-default",
              )}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary">{item.title}</div>
                    {item.subtitle ? <div className="mt-1 text-sm text-secondary">{item.subtitle}</div> : null}
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    {item.status}
                    {item.actions ? (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="flex flex-wrap items-center gap-2"
                      >
                        {item.actions}
                      </div>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted" />
                    )}
                  </div>
                </div>

                {item.meta ? <div className="text-sm text-secondary">{item.meta}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalCard>
  );
}
