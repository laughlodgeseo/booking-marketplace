"use client";

import { ToggleLeft, ToggleRight, Zap } from "lucide-react";
import type { StepProps } from "../types";

const INPUT = "h-11 w-full rounded-2xl border border-line/80 bg-surface px-4 text-sm text-primary shadow-sm outline-none placeholder:text-muted focus:border-brand/45 focus:ring-4 focus:ring-brand/20 transition-all";

const CURRENCIES = [
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
];

function PriceInput({
  label, hint, currency, value, onChange,
}: {
  label: string; hint?: string; currency: string; value: number; onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-secondary">
        {label}
        {hint && <span className="ml-2 normal-case font-normal text-muted">{hint}</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-muted">
          {currency}
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n) && n >= 0) onChange(n);
          }}
          className={`${INPUT} pl-14`}
          placeholder="0"
        />
      </div>
    </div>
  );
}

function NightInput({
  label, hint, value, min, nullable, onChange,
}: {
  label: string; hint?: string; value: number | null; min?: number; nullable?: boolean;
  onChange: (n: number | null) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-secondary">
        {label}
        {hint && <span className="ml-2 normal-case font-normal text-muted">{hint}</span>}
      </label>
      <input
        type="number"
        inputMode="numeric"
        min={min ?? 1}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (nullable && raw === "") { onChange(null); return; }
          const n = Number(raw);
          if (!Number.isNaN(n) && n >= (min ?? 1)) onChange(n);
        }}
        className={INPUT}
        placeholder={nullable ? "No limit" : "1"}
      />
    </div>
  );
}

export function StepPricing({ data, patch }: StepProps) {
  const totalExample = data.basePrice * 3 + data.cleaningFee;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Set your pricing</h2>
        <p className="mt-1 text-sm text-secondary">
          Price in your preferred currency — guests always see the total before booking.
        </p>
      </div>

      {/* Currency + prices */}
      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">Rates</div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-secondary">Currency</label>
          <select value={data.currency} onChange={(e) => patch({ currency: e.target.value as "AED" | "USD" | "EUR" | "GBP" })} className={INPUT}>
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PriceInput label="Nightly rate" hint="required" currency={data.currency} value={data.basePrice} onChange={(n) => patch({ basePrice: n })} />
          <PriceInput label="Cleaning fee" hint="one-time per booking" currency={data.currency} value={data.cleaningFee} onChange={(n) => patch({ cleaningFee: n })} />
        </div>
      </div>

      {/* Price preview */}
      <div className="rounded-3xl border border-brand/20 bg-[linear-gradient(135deg,rgba(248,242,232,0.9),rgba(240,232,219,0.7))] px-6 py-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
          Example — 3-night stay
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-secondary">
            <span>{data.currency} {data.basePrice.toLocaleString()} / night × 3</span>
            <span>{data.currency} {(data.basePrice * 3).toLocaleString()}</span>
          </div>
          {data.cleaningFee > 0 && (
            <div className="flex justify-between text-secondary">
              <span>Cleaning fee</span>
              <span>{data.currency} {data.cleaningFee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-line/40 pt-3 font-bold text-primary">
            <span>Total (excl. taxes)</span>
            <span>{data.currency} {totalExample.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Stay length */}
      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm space-y-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">Stay length</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NightInput label="Minimum nights" value={data.minNights} min={1} onChange={(n) => patch({ minNights: n ?? 1 })} />
          <NightInput label="Maximum nights" hint="optional" value={data.maxNights} nullable min={data.minNights} onChange={(n) => patch({ maxNights: n })} />
        </div>
      </div>

      {/* Instant book */}
      <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Booking type</div>
        <button
          type="button"
          onClick={() => patch({ isInstantBook: !data.isInstantBook })}
          className={[
            "flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200",
            data.isInstantBook
              ? "border-success/30 bg-success/8"
              : "border-line/60 bg-warm-base hover:bg-warm-alt",
          ].join(" ")}
        >
          <div className={["flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", data.isInstantBook ? "bg-success/15 text-success" : "bg-warm-alt text-muted"].join(" ")}>
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className={`font-semibold text-sm ${data.isInstantBook ? "text-success" : "text-secondary"}`}>
              Instant Book
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {data.isInstantBook
                ? "Guests book immediately without waiting for your approval."
                : "You review and approve each booking request manually."}
            </div>
          </div>
          <div className="shrink-0">
            {data.isInstantBook
              ? <ToggleRight className="h-7 w-7 text-success" />
              : <ToggleLeft className="h-7 w-7 text-muted" />}
          </div>
        </button>
      </div>
    </div>
  );
}
