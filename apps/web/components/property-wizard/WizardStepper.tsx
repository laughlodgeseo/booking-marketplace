"use client";

import { motion } from "framer-motion";
import { CheckIcon } from "lucide-react";

type Step = { id: string; label: string; emoji: string };

type Props = {
  steps: readonly Step[];
  current: number;
  onGoTo: (index: number) => void;
};

export function WizardStepper({ steps, current, onGoTo }: Props) {
  return (
    <div className="border-b border-line/50 px-4 py-4 sm:px-0">
      {/* Mobile: compact progress bar */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="flex-1 h-1.5 rounded-full bg-line/40 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand"
            initial={false}
            animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <span className="max-w-[52vw] truncate text-xs font-semibold text-muted">
          {current + 1} / {steps.length} — {steps[current]?.label}
        </span>
      </div>

      {/* Desktop: numbered bubbles */}
      <div className="hidden lg:flex items-center gap-0">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = i < current;

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onGoTo(i)}
                className={[
                  "flex flex-col items-center gap-1.5 px-2 py-1 rounded-xl transition-all duration-200",
                  clickable ? "cursor-pointer hover:bg-warm-alt" : "cursor-default",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300",
                    active
                      ? "border-brand bg-brand text-accent-text shadow-md shadow-brand/25"
                      : done
                        ? "border-success/40 bg-success/15 text-success"
                        : "border-line/60 bg-surface text-muted",
                  ].join(" ")}
                >
                  {done ? <CheckIcon className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                </div>
                <span
                  className={[
                    "text-[10px] font-semibold uppercase tracking-wider transition-colors",
                    active ? "text-brand" : done ? "text-success" : "text-muted",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </button>

              {i < steps.length - 1 && (
                <div className="flex-1 h-px mx-1 bg-line/40 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-brand/40"
                    initial={false}
                    animate={{ width: done ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
