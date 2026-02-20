"use client";

import { useEffect, useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { useLocale } from "next-intl";
import { getPropertyCalendarBySlug } from "@/lib/api/properties";
import { SharedAvailabilityCalendar } from "@/components/calendar/SharedAvailabilityCalendar";
import { normalizeLocale } from "@/lib/i18n/config";

type CalendarState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      days: Array<{ date: string; status: "AVAILABLE" | "BOOKED" | "HOLD" | "BLOCKED" }>;
      from: string;
      to: string;
    };

function toIsoDay(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.82)] animate-pulse",
        className ?? "",
      ].join(" ")}
    />
  );
}

export default function PublicPropertyCalendar({ slug }: { slug: string }) {
  const locale = normalizeLocale(useLocale());
  const isAr = locale === "ar";
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [state, setState] = useState<CalendarState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    async function load() {
      setState({ kind: "loading" });
      const from = toIsoDay(startOfMonth(month));
      const to = toIsoDay(addMonths(startOfMonth(month), 1));
      const res = await getPropertyCalendarBySlug(slug, { from, to });
      if (!alive) return;

      if (!res.ok) {
        setState({
          kind: "error",
          message: res.message || (isAr ? "تعذر تحميل التقويم" : "Failed to load calendar"),
        });
        return;
      }

      setState({
        kind: "ready",
        days: res.data.days ?? [],
        from: res.data.from,
        to: res.data.to,
      });
    }

    void load();
    return () => {
      alive = false;
    };
  }, [isAr, month, slug]);

  if (state.kind === "loading") {
    return (
      <section className="premium-card premium-card-tinted rounded-2xl border border-white/70 p-5 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-7 rounded-xl" />
          <SkeletonBlock className="h-[380px] rounded-2xl" />
        </div>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="premium-card premium-card-tinted rounded-2xl border border-white/70 p-5 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-6">
        <div className="rounded-2xl bg-danger/12 p-4 text-sm text-danger ring-1 ring-danger/20">
          {state.message}
        </div>
      </section>
    );
  }

  return (
    <SharedAvailabilityCalendar
      role="public"
      month={month}
      onMonthChange={setMonth}
      days={state.days}
      title={isAr ? "تقويم التوافر" : "Availability calendar"}
      subtitle={
        isAr
          ? `عرض مباشر لشهر ${month.toLocaleDateString("ar-AE", {
              month: "long",
              year: "numeric",
            })} مع تحديثات فورية للحالة.`
          : `Live view for ${format(month, "MMMM yyyy")} with real-time status updates.`
      }
      variant="publicPremium"
    />
  );
}
