"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type Size = "sm" | "md" | "lg" | "xl";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function sizeClass(size: Size): string {
  if (size === "sm") return "lg:max-w-md";
  if (size === "md") return "lg:max-w-xl";
  if (size === "lg") return "lg:max-w-3xl";
  return "lg:max-w-5xl";
}

export function Modal(props: {
  open: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  size?: Size;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!props.open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label="Close modal"
        onClick={props.onClose}
        className="absolute inset-0 bg-dark-1/44 backdrop-blur-sm"
      />
      <div className="absolute inset-0 flex items-end justify-center lg:items-center lg:p-4">
        <div
          className={cn(
            "w-full overflow-hidden bg-[linear-gradient(180deg,rgba(246,240,230,0.98),rgba(241,233,220,0.95))] shadow-2xl ring-1 ring-line/22",
            "max-h-[94vh] rounded-t-[30px] border-t border-line/24",
            "lg:max-h-[90vh] lg:rounded-3xl lg:border lg:border-line/32 lg:bg-surface",
            sizeClass(props.size ?? "md"),
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="sticky top-0 z-10 border-b border-line/26 bg-warm-base/95 px-4 pb-3 pt-[calc(0.9rem+env(safe-area-inset-top))] sm:px-5 lg:border-line/35 lg:bg-warm-base/74 lg:px-5 lg:py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {props.title ? (
                  <div className="truncate text-sm font-semibold text-primary">{props.title}</div>
                ) : null}
                {props.subtitle ? (
                  <div className="mt-1 text-xs text-secondary">{props.subtitle}</div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={props.onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-base/95 text-primary ring-1 ring-line/28 shadow-sm transition hover:bg-accent-soft/22 lg:h-10 lg:w-10 lg:bg-surface lg:hover:bg-warm-alt"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-secondary" />
              </button>
            </div>
          </div>

          <div className="overflow-auto px-4 py-4 sm:px-5 sm:py-5">{props.children}</div>

          {props.footer ? (
            <div className="sticky bottom-0 border-t border-line/35 bg-warm-base/96 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 lg:border-line/50 lg:bg-surface lg:px-5 lg:py-4 lg:pb-4">
              {props.footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
