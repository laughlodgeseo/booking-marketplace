"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import type { StepProps } from "../types";

type CounterProps = {
  label: string;
  sub: string;
  icon: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
};

function Counter({ label, sub, icon, value, min = 0, max = 30, onChange }: CounterProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line/80 bg-surface px-5 py-4 shadow-sm transition hover:bg-warm-alt">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-sm font-semibold text-primary">{label}</div>
          <div className="text-xs text-muted">{sub}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line/60 text-secondary transition hover:border-brand/30 hover:bg-accent-soft/10 hover:text-brand disabled:opacity-30"
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-lg font-bold text-primary">{value}</span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line/60 text-secondary transition hover:border-brand/30 hover:bg-accent-soft/10 hover:text-brand disabled:opacity-30"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function StepDetails({ data, patch }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Property details</h2>
        <p className="mt-1 text-sm text-secondary">
          How many guests can stay, and what&apos;s the room configuration?
        </p>
      </div>

      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Capacity
        </div>
        <div className="space-y-3">
          <Counter
            label="Bedrooms"
            sub="Number of separate bedrooms"
            icon="🛏"
            value={data.bedrooms}
            min={0}
            max={20}
            onChange={(n) => patch({ bedrooms: n })}
          />
          <Counter
            label="Bathrooms"
            sub="Full & half bathrooms"
            icon="🚿"
            value={data.bathrooms}
            min={1}
            max={20}
            onChange={(n) => patch({ bathrooms: n })}
          />
          <Counter
            label="Max Guests"
            sub="Maximum people allowed to stay"
            icon="👥"
            value={data.maxGuests}
            min={1}
            max={50}
            onChange={(n) => patch({ maxGuests: n })}
          />
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-3xl border border-brand/20 bg-[linear-gradient(135deg,rgba(248,242,232,0.9),rgba(240,232,219,0.7))] px-6 py-5 shadow-sm">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-0.5 rounded-full bg-[linear-gradient(90deg,rgba(79,70,229,0.55),rgba(79,70,229,0.16),transparent_80%)]" />
        <div className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
          Summary
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{data.bedrooms}</div>
            <div className="text-xs text-muted mt-1">Bedroom{data.bedrooms !== 1 ? "s" : ""}</div>
          </div>
          <div className="text-secondary text-xl">·</div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{data.bathrooms}</div>
            <div className="text-xs text-muted mt-1">Bathroom{data.bathrooms !== 1 ? "s" : ""}</div>
          </div>
          <div className="text-secondary text-xl">·</div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{data.maxGuests}</div>
            <div className="text-xs text-muted mt-1">Guest{data.maxGuests !== 1 ? "s" : ""}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
