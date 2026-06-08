/**
 * Dashboard formatting utilities.
 * Converts raw backend data (labels, values) into human-readable display strings.
 */

/** Format AED minor (cents → display). Compact for large values. */
export function formatCurrencyMinor(minor: number | null | undefined, compact = false): string {
  const amount = (minor ?? 0) / 100;
  if (compact && amount >= 1_000_000) {
    return `AED ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (compact && amount >= 10_000) {
    return `AED ${(amount / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a plain count. Compact for large values. */
export function formatCount(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("en");
}

/**
 * Convert a backend period label into a human-readable string.
 *
 * Handles:
 *   "2026-W24"  → "Jun 10–16"  (ISO week → date range)
 *   "2026-06"   → "Jun 2026"   (year-month)
 *   "2026-06-09"→ "9 Jun"      (full date)
 *   Anything else → trimmed as-is
 */
export function formatPeriodLabel(raw: string, bucket?: string): string {
  if (!raw) return raw;

  // ISO week: YYYY-Www
  const weekMatch = raw.match(/^(\d{4})-W(\d{1,2})$/);
  if (weekMatch) {
    const year = parseInt(weekMatch[1], 10);
    const week = parseInt(weekMatch[2], 10);
    const range = isoWeekToDateRange(year, week);
    return range ?? `Wk ${week}`;
  }

  // Year-month: YYYY-MM
  const monthMatch = raw.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const date = new Date(parseInt(monthMatch[1], 10), parseInt(monthMatch[2], 10) - 1, 1);
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }

  // Full date: YYYY-MM-DD
  const dateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const date = new Date(parseInt(dateMatch[1], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[3], 10));
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  return raw;
}

/**
 * Shorten a period label for use in charts where space is limited.
 * "Jun 2026" → "Jun", "Jun 10–16" → "Jun 10"
 */
export function shortenPeriodLabel(raw: string, bucket?: string): string {
  const full = formatPeriodLabel(raw, bucket);

  // "Jun 2026" → "Jun"
  const monthYear = full.match(/^([A-Z][a-z]+) \d{4}$/);
  if (monthYear) return monthYear[1];

  // "Jun 10–16" → "Jun 10"
  const weekRange = full.match(/^([A-Z][a-z]+ \d+)–\d+$/);
  if (weekRange) return weekRange[1];

  // "9 Jun" → "9"
  const dayMonth = full.match(/^(\d+) [A-Z][a-z]+$/);
  if (dayMonth) return dayMonth[1];

  return full;
}

/** Convert ISO week number to a human "MMM D–D" date range string. */
function isoWeekToDateRange(year: number, week: number): string | null {
  try {
    // ISO week 1 is the week containing the first Thursday of the year.
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7; // Mon=1, Sun=7
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - (dayOfWeek - 1));

    const start = new Date(startOfWeek1);
    start.setDate(start.getDate() + (week - 1) * 7);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = start.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-GB", { day: "numeric" });
    return `${startStr}–${endStr}`;
  } catch {
    return null;
  }
}

/** Convert a backend status key to a human-readable label. */
export function formatStatusLabel(key: string): string {
  const OVERRIDES: Record<string, string> = {
    PENDING_PAYMENT: "Pending payment",
    REQUIRES_ACTION: "Requires action",
    PROPERTY_APPROVED_ACTIVATION_REQUIRED: "Activation required",
    CAPTURED: "Captured",
    REFUNDED: "Refunded",
    PROCESSING: "Processing",
    FAILED: "Failed",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    CONFIRMED: "Confirmed",
    PENDING: "Pending",
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In progress",
    DONE: "Done",
    OPEN: "Open",
    PAID: "Paid",
    UNPAID: "Unpaid",
    WAIVED: "Waived",
  };
  return OVERRIDES[key] ?? key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
