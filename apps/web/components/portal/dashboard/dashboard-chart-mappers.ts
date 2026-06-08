/**
 * Chart data mapping utilities.
 * Converts raw analytics API responses into typed chart series.
 */

import { formatPeriodLabel, shortenPeriodLabel, formatStatusLabel } from "./dashboard-formatters";

export type ChartPoint = {
  label: string;
  shortLabel: string;
  value: number;
};

export type AnalyticsResponse = {
  labels?: string[];
  series?: Array<{ key: string; points: number[] }>;
  charts?: Record<string, { labels: string[]; series: Array<{ key: string; points: number[] }> }>;
  breakdowns?: Record<string, Record<string, number>>;
  bucket?: string;
};

export const CHART_PALETTE = {
  indigo: "#4f46e5",
  indigoLight: "#818cf8",
  sage: "#16a34a",
  amber: "#f59e0b",
  rose: "#dc2626",
  bronze: "#b87333",
  slate: "#64748b",
  teal: "#0d9488",
} as const;

const BREAKDOWN_COLORS: Record<string, string> = {
  CONFIRMED: "#4f46e5",
  COMPLETED: "#16a34a",
  CANCELLED: "#dc2626",
  PENDING_PAYMENT: "#f59e0b",
  PENDING: "#f59e0b",
  CAPTURED: "#4f46e5",
  REFUNDED: "#dc2626",
  REQUIRES_ACTION: "#f59e0b",
  PROCESSING: "#6b7280",
  FAILED: "#dc2626",
  DONE: "#16a34a",
  IN_PROGRESS: "#4f46e5",
  ASSIGNED: "#6366f1",
  OPEN: "#f59e0b",
  PAID: "#16a34a",
  UNPAID: "#dc2626",
};

/** Extract chart points from an analytics response for a given chart/series key. */
export function extractPoints(
  analytics: AnalyticsResponse,
  chartKey: string,
  seriesKey: string,
): ChartPoint[] {
  const chart = analytics.charts?.[chartKey];
  const labels: string[] = chart?.labels ?? analytics.labels ?? [];
  const rawPoints =
    chart?.series?.find((s) => s.key === seriesKey)?.points ??
    analytics.series?.find((s) => s.key === seriesKey)?.points ??
    [];

  return labels.map((label, i) => ({
    label: formatPeriodLabel(label, analytics.bucket),
    shortLabel: shortenPeriodLabel(label, analytics.bucket),
    value: rawPoints[i] ?? 0,
  }));
}

/** Divide all values by 100 (minor → major currency). */
export function toMajorPoints(points: ChartPoint[]): ChartPoint[] {
  return points.map((p) => ({ ...p, value: p.value / 100 }));
}

/** Format a tooltip value for currency series (expects major units already). */
export function formatTooltipCurrency(value: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Convert a breakdowns record to sorted donut/status bar entries. */
export function breakdownToSlices(breakdown: Record<string, number> | undefined): Array<{
  key: string;
  label: string;
  value: number;
  color: string;
}> {
  if (!breakdown) return [];
  return Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      key,
      label: formatStatusLabel(key),
      value,
      color: BREAKDOWN_COLORS[key] ?? CHART_PALETTE.slate,
    }));
}
