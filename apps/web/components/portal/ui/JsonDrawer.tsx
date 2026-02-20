"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Copy, X } from "lucide-react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function toPrettyJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function JsonDrawer(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  json?: unknown;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const pretty = useMemo(() => toPrettyJson(props.json), [props.json]);

  useEffect(() => {
    if (!props.open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [props.open]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyJson() {
    if (!pretty) return;
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close details drawer"
        onClick={props.onClose}
        className="absolute inset-0 bg-dark-1/46 backdrop-blur-sm"
      />

      <aside
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[92vh] max-h-[95vh] flex-col overflow-hidden rounded-t-[30px] border-t border-line/40 bg-warm-base/98 shadow-[0_-24px_60px_rgba(33,39,53,0.26)]",
          "lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:max-h-none lg:w-[560px] lg:rounded-none lg:rounded-l-[30px] lg:border-l lg:border-t-0",
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 border-b border-line/35 bg-warm-base/98 px-4 pb-3 pt-[calc(0.9rem+env(safe-area-inset-top))] sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-primary">{props.title}</div>
              {props.subtitle ? (
                <div className="mt-1 text-xs leading-relaxed text-secondary">{props.subtitle}</div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {pretty ? (
                <button
                  type="button"
                  onClick={() => {
                    void copyJson();
                  }}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-line/40 bg-warm-base/95 px-3 text-xs font-semibold text-primary shadow-sm hover:bg-accent-soft/22"
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  Copy JSON
                </button>
              ) : null}
              <button
                type="button"
                onClick={props.onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line/40 bg-warm-base/95 text-primary shadow-sm hover:bg-accent-soft/22"
                aria-label="Close details drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4 sm:px-5 sm:py-5">
          {props.children ? (
            props.children
          ) : pretty ? (
            <pre className="whitespace-pre-wrap break-words rounded-2xl border border-line/35 bg-warm-alt/64 p-4 font-mono text-xs text-primary sm:text-sm">
              {pretty}
            </pre>
          ) : (
            <div className="rounded-2xl border border-line/35 bg-warm-alt/64 p-4 text-sm text-secondary">
              No details available.
            </div>
          )}
        </div>

        {props.footer ? (
          <div className="sticky bottom-0 border-t border-line/35 bg-warm-base/98 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5">
            {props.footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
