"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Users, CalendarDays, MapPin } from "lucide-react";
import { isValidIsoRange } from "@/lib/date-range";

type SearchDraft = {
  q: string;
  guests: number;
  checkIn: string;
  checkOut: string;
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function FloatingSearchBar(props: { defaultQ?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SearchDraft>({
    q: props.defaultQ ?? "",
    guests: 2,
    checkIn: todayISO(),
    checkOut: "",
  });

  const canSearch = useMemo(() => {
    if (!draft.checkIn) return false;
    // allow search without checkOut (backend can ignore) but prefer it
    if (draft.checkOut && !isValidIsoRange(draft.checkIn, draft.checkOut)) return false;
    return draft.guests >= 1 && draft.guests <= 16;
  }, [draft.checkIn, draft.checkOut, draft.guests]);

  function pushSearch() {
    const p = new URLSearchParams();
    if (draft.q.trim().length > 0) p.set("q", draft.q.trim());
    p.set("guests", String(draft.guests));
    if (draft.checkIn) p.set("checkIn", draft.checkIn);
    if (isValidIsoRange(draft.checkIn, draft.checkOut)) p.set("checkOut", draft.checkOut);
    router.push(`/properties?${p.toString()}`);
  }

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8"
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
    >
      <div className="rounded-2xl border border-line bg-surface/85 p-3 shadow-lg backdrop-blur-md">
        <div className="grid gap-2 md:grid-cols-[1.4fr_0.9fr_0.9fr_0.7fr_0.6fr] md:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
            <MapPin className="h-4 w-4 text-muted" />
            <input
              value={draft.q}
              onChange={(e) => setDraft((s) => ({ ...s, q: e.target.value }))}
              placeholder="Area, community, or landmark"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="Search location"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
            <CalendarDays className="h-4 w-4 text-muted" />
            <input
              type="date"
              value={draft.checkIn}
              onChange={(e) => setDraft((s) => ({ ...s, checkIn: e.target.value }))}
              className="w-full bg-transparent text-sm outline-none"
              aria-label="Check-in date"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
            <CalendarDays className="h-4 w-4 text-muted" />
            <input
              type="date"
              value={draft.checkOut}
              onChange={(e) => setDraft((s) => ({ ...s, checkOut: e.target.value }))}
              className="w-full bg-transparent text-sm outline-none"
              aria-label="Check-out date"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
            <Users className="h-4 w-4 text-muted" />
            <input
              type="number"
              min={1}
              max={16}
              value={draft.guests}
              onChange={(e) => setDraft((s) => ({ ...s, guests: Number(e.target.value) }))}
              className="w-full bg-transparent text-sm outline-none"
              aria-label="Guests"
            />
          </div>

          <button
            type="button"
            onClick={pushSearch}
            disabled={!canSearch}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-accent-text shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </button>
        </div>
      </div>
    </motion.div>
  );
}
