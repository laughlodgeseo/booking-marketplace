"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { getVendorProperties, type VendorPropertyListItem } from "@/lib/api/portal/vendor";
import {
  listPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  type PricingRule,
  type PricingRuleType,
} from "@/lib/api/portal/pricing";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RULE_TYPES: PricingRuleType[] = ["SEASONAL", "WEEKEND", "WEEKDAY", "HOLIDAY", "CUSTOM"];

const TYPE_COLORS: Record<PricingRuleType, { bg: string; text: string; dot: string }> = {
  SEASONAL: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  WEEKEND:  { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  WEEKDAY:  { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  HOLIDAY:  { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  CUSTOM:   { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
};

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Calendar component                                                */
/* ------------------------------------------------------------------ */

function PricingCalendar({
  year,
  month,
  rules,
  onPrev,
  onNext,
  selStart,
  selEnd,
  onSelect,
  t,
}: {
  year: number;
  month: number;
  rules: PricingRule[];
  onPrev: () => void;
  onNext: () => void;
  selStart: string | null;
  selEnd: string | null;
  onSelect: (date: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const total = daysInMonth(year, month);
  const offset = firstDayOfWeek(year, month);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthLabel = new Date(year, month).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  /** Build a map: "YYYY-MM-DD" -> highest-priority active rule */
  const dayRuleMap = useMemo(() => {
    const map = new Map<string, PricingRule>();
    const activeRules = rules
      .filter((r) => r.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (let day = 1; day <= total; day++) {
      const ds = toDateStr(new Date(year, month, day));
      for (const rule of activeRules) {
        if (ds >= rule.startDate && ds <= rule.endDate) {
          map.set(ds, rule);
          break;
        }
      }
    }
    return map;
  }, [rules, year, month, total]);

  function isInSelection(ds: string): boolean {
    if (!selStart) return false;
    if (!selEnd) return ds === selStart;
    const lo = selStart < selEnd ? selStart : selEnd;
    const hi = selStart < selEnd ? selEnd : selStart;
    return ds >= lo && ds <= hi;
  }

  return (
    <div className="rounded-3xl ring-1 ring-line/70 bg-surface/90 p-4 sm:p-6">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrev}
          className="rounded-xl p-2 hover:bg-warm-alt/40 transition-colors"
          aria-label={t("aria.previousMonth")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base font-semibold">{monthLabel}</h3>
        <button
          onClick={onNext}
          className="rounded-xl p-2 hover:bg-warm-alt/40 transition-colors"
          aria-label={t("aria.nextMonth")}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted mb-1">
        {dayNames.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const ds = toDateStr(new Date(year, month, day));
          const rule = dayRuleMap.get(ds);
          const selected = isInSelection(ds);
          const colors = rule ? TYPE_COLORS[rule.type] : null;

          return (
            <button
              key={ds}
              onClick={() => onSelect(ds)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl py-2 text-sm transition-colors",
                "hover:bg-warm-alt/40 cursor-pointer",
                selected && "ring-2 ring-brand/60 bg-brand/10",
                !selected && colors && colors.bg,
              )}
              title={
                rule
                  ? `${rule.type}${rule.name ? ` - ${rule.name}` : ""}: ${
                      rule.fixedPrice != null
                        ? `Fixed ${rule.fixedPrice}`
                        : `x${rule.priceMultiplier ?? 1}`
                    }`
                  : undefined
              }
            >
              <span className={cn("font-medium", colors && !selected && colors.text)}>
                {day}
              </span>
              {rule && (
                <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", colors?.dot)} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-secondary">
        {RULE_TYPES.map((rt) => (
          <span key={rt} className="flex items-center gap-1">
            <span className={cn("inline-block h-2 w-2 rounded-full", TYPE_COLORS[rt].dot)} />
            {rt.charAt(0) + rt.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rule Card                                                         */
/* ------------------------------------------------------------------ */

function RuleCard({
  rule,
  onToggle,
  onDelete,
  t,
}: {
  rule: PricingRule;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const colors = TYPE_COLORS[rule.type];

  return (
    <div className="rounded-3xl ring-1 ring-line/70 bg-surface/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", colors.bg, colors.text)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
            {rule.type}
          </span>
          {rule.name && (
            <span className="text-sm font-medium truncate">{rule.name}</span>
          )}
        </div>
        <p className="text-xs text-secondary">
          {formatDate(rule.startDate)} &mdash; {formatDate(rule.endDate)}
        </p>
        <p className="text-xs text-secondary mt-0.5">
          {rule.fixedPrice != null
            ? t("fixedPriceLabel", { price: rule.fixedPrice })
            : t("multiplierLabel", { value: rule.priceMultiplier ?? 1 })}
          {" | "}{t("priorityLabel", { value: rule.priority })}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Active toggle */}
        <button
          onClick={() => onToggle(rule.id, !rule.isActive)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            rule.isActive ? "bg-brand" : "bg-muted",
          )}
          role="switch"
          aria-checked={rule.isActive}
          aria-label={t("aria.toggleRule")}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
              rule.isActive ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onDelete(rule.id);
                setConfirmDelete(false);
              }}
              className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
            >
              {t("confirm")}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl p-1.5 hover:bg-warm-alt/40 transition-colors"
              aria-label={t("aria.cancelDelete")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl p-2 text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label={t("aria.deleteRule")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Rule Form                                                     */
/* ------------------------------------------------------------------ */

function AddRuleForm({
  onSave,
  saving,
  initialStart,
  initialEnd,
  t,
}: {
  onSave: (input: {
    type: PricingRuleType;
    name?: string;
    startDate: string;
    endDate: string;
    priceMultiplier?: number;
    fixedPrice?: number;
    priority?: number;
  }) => void;
  saving: boolean;
  initialStart: string;
  initialEnd: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [type, setType] = useState<PricingRuleType>("SEASONAL");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [priceMode, setPriceMode] = useState<"multiplier" | "fixed">("multiplier");
  const [multiplier, setMultiplier] = useState("1.5");
  const [fixedPrice, setFixedPrice] = useState("");
  const [priority, setPriority] = useState("0");

  useEffect(() => {
    setStartDate(initialStart);
  }, [initialStart]);

  useEffect(() => {
    setEndDate(initialEnd);
  }, [initialEnd]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;

    const lo = startDate < endDate ? startDate : endDate;
    const hi = startDate < endDate ? endDate : startDate;

    onSave({
      type,
      name: name.trim() || undefined,
      startDate: lo,
      endDate: hi,
      ...(priceMode === "multiplier"
        ? { priceMultiplier: parseFloat(multiplier) || 1 }
        : { fixedPrice: parseFloat(fixedPrice) || 0 }),
      priority: parseInt(priority, 10) || 0,
    });
  }

  const inputCls =
    "w-full rounded-xl ring-1 ring-line/70 bg-surface/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/60 transition-shadow";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">{t("ruleType")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PricingRuleType)}
            className={inputCls}
          >
            {RULE_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {rt.charAt(0) + rt.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">
            {t("name")} <span className="text-muted">{t("optional")}</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className={inputCls}
          />
        </div>

        {/* Start date */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">{t("startDate")}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={inputCls}
          />
        </div>

        {/* End date */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">{t("endDate")}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>

      {/* Price mode */}
      <div>
        <label className="block text-xs font-medium text-secondary mb-2">{t("priceMode")}</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="priceMode"
              value="multiplier"
              checked={priceMode === "multiplier"}
              onChange={() => setPriceMode("multiplier")}
              className="accent-brand"
            />
            {t("multiplier")}
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="priceMode"
              value="fixed"
              checked={priceMode === "fixed"}
              onChange={() => setPriceMode("fixed")}
              className="accent-brand"
            />
            {t("fixedPrice")}
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {priceMode === "multiplier" ? (
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">
              {t("multiplier")} <span className="text-muted">{t("multiplierHint")}</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className={inputCls}
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">{t("fixedPrice")}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fixedPrice}
              onChange={(e) => setFixedPrice(e.target.value)}
              className={inputCls}
            />
          </div>
        )}

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">
            {t("priority")} <span className="text-muted">{t("priorityHint")}</span>
          </label>
          <input
            type="number"
            step="1"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving || !startDate || !endDate}
          className={cn(
            "rounded-2xl px-6 py-2.5 text-sm font-semibold text-white transition-colors",
            saving
              ? "bg-brand/50 cursor-not-allowed"
              : "bg-brand hover:bg-brand-hover",
          )}
        >
          {saving ? t("saving") : t("saveRule")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; rules: PricingRule[] };

export default function VendorPricingPage() {
  const t = useTranslations("portal.vendorPricing");

  /* ---- property list ---- */
  const [properties, setProperties] = useState<VendorPropertyListItem[]>([]);
  const [propsLoading, setPropsLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");

  /* ---- pricing rules ---- */
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [saving, setSaving] = useState(false);

  /* ---- calendar ---- */
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  /* ---- selection for new rule ---- */
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);

  /* ---- form visibility ---- */
  const [showForm, setShowForm] = useState(false);

  /* ---- action error ---- */
  const [actionError, setActionError] = useState<string | null>(null);
  const actionErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showActionError(msg: string) {
    setActionError(msg);
    if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    actionErrorTimer.current = setTimeout(() => setActionError(null), 5000);
  }

  // Clean up actionError timer on unmount
  useEffect(() => {
    return () => {
      if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    };
  }, []);

  /* Load vendor properties */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getVendorProperties({ page: 1, pageSize: 200 });
        if (!alive) return;
        setProperties(data.items);
        if (data.items.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(data.items[0].id);
        }
      } catch {
        // silently fail - properties list
      } finally {
        if (alive) setPropsLoading(false);
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load pricing rules when property changes */
  const loadRules = useCallback(async (propId: string) => {
    if (!propId) return;
    setState({ kind: "loading" });
    try {
      const rules = await listPricingRules(propId);
      setState({ kind: "ready", rules });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : t("errors.load"),
      });
    }
  }, [t]);

  useEffect(() => {
    if (selectedPropertyId) {
      void loadRules(selectedPropertyId);
    } else {
      setState({ kind: "idle" });
    }
  }, [selectedPropertyId, loadRules]);

  /* Calendar nav */
  function prevMonth() {
    setCalMonth((m) => {
      if (m === 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }

  function nextMonth() {
    setCalMonth((m) => {
      if (m === 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }

  /* Day selection for range */
  function handleDaySelect(ds: string) {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(ds);
      setSelEnd(null);
    } else {
      setSelEnd(ds);
      setShowForm(true);
    }
  }

  /* CRUD handlers */
  async function handleCreate(input: Parameters<typeof createPricingRule>[1]) {
    if (!selectedPropertyId) return;
    setSaving(true);
    try {
      await createPricingRule(selectedPropertyId, input);
      setShowForm(false);
      setSelStart(null);
      setSelEnd(null);
      await loadRules(selectedPropertyId);
    } catch (err) {
      showActionError(err instanceof Error ? err.message : "Failed to create rule");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(ruleId: string, isActive: boolean) {
    if (!selectedPropertyId) return;
    try {
      await updatePricingRule(selectedPropertyId, ruleId, { isActive });
      await loadRules(selectedPropertyId);
    } catch (err) {
      showActionError(err instanceof Error ? err.message : "Failed to update rule");
    }
  }

  async function handleDelete(ruleId: string) {
    if (!selectedPropertyId) return;
    try {
      await deletePricingRule(selectedPropertyId, ruleId);
      await loadRules(selectedPropertyId);
    } catch (err) {
      showActionError(err instanceof Error ? err.message : "Failed to delete rule");
    }
  }

  const rules = state.kind === "ready" ? state.rules : [];

  return (
    <PortalShell
      role="vendor"
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <ErrorBoundary>
      <div className="space-y-6">
        {/* ---- Action error banner ---- */}
        {actionError && (
          <div className="flex items-center justify-between rounded-3xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="ml-3 shrink-0 rounded-xl p-1 hover:bg-danger/20 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ---- Property selector ---- */}
        <div className="rounded-3xl ring-1 ring-line/70 bg-surface/90 p-4 sm:p-6">
          <label className="block text-xs font-medium text-secondary mb-2">{t("selectProperty")}</label>
          {propsLoading ? (
            <SkeletonBlock className="h-10 w-full rounded-xl" />
          ) : properties.length === 0 ? (
            <p className="text-sm text-muted">{t("noProperties")}</p>
          ) : (
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full rounded-xl ring-1 ring-line/70 bg-surface/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/60 transition-shadow"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} &mdash; {p.city}{p.area ? `, ${p.area}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ---- Calendar ---- */}
        {selectedPropertyId && (
          <PricingCalendar
            year={calYear}
            month={calMonth}
            rules={rules}
            onPrev={prevMonth}
            onNext={nextMonth}
            selStart={selStart}
            selEnd={selEnd}
            onSelect={handleDaySelect}
            t={t}
          />
        )}

        {/* Selection hint */}
        {selectedPropertyId && !showForm && (
          <p className="text-xs text-muted text-center">
            {t("calendarHint")}
          </p>
        )}

        {/* ---- Add Rule ---- */}
        {selectedPropertyId && (
          <div className="rounded-3xl ring-1 ring-line/70 bg-surface/90 overflow-hidden">
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 hover:bg-warm-alt/30 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Plus className="h-4 w-4" />
                {t("addRule")}
              </span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  showForm && "rotate-90",
                )}
              />
            </button>
            {showForm && (
              <div className="border-t border-line/50 p-4 sm:p-6">
                <AddRuleForm
                  onSave={handleCreate}
                  saving={saving}
                  initialStart={selStart && selEnd ? (selStart < selEnd ? selStart : selEnd) : ""}
                  initialEnd={selStart && selEnd ? (selStart < selEnd ? selEnd : selStart) : ""}
                  t={t}
                />
              </div>
            )}
          </div>
        )}

        {/* ---- Rules List ---- */}
        {selectedPropertyId && state.kind === "loading" && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-24 w-full rounded-3xl" />
            ))}
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-3xl ring-1 ring-red-200 bg-red-50 p-4 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {state.kind === "ready" && rules.length === 0 && (
          <div className="rounded-3xl ring-1 ring-line/70 bg-surface/90 p-8 text-center">
            <p className="text-sm text-muted">
              {t("noRules")}
            </p>
          </div>
        )}

        {state.kind === "ready" && rules.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">{t("activeRules")}</h3>
            <div className="space-y-3">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      </ErrorBoundary>
    </PortalShell>
  );
}
