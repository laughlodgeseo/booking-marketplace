"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import {
  listAdminPricingRules,
  createAdminPricingRule,
  updateAdminPricingRule,
  deleteAdminPricingRule,
  type AdminPricingRule,
  type AdminPricingRuleType,
} from "@/lib/api/portal/admin";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const RULE_TYPES: AdminPricingRuleType[] = ["SEASONAL", "WEEKEND", "WEEKDAY", "HOLIDAY", "CUSTOM"];

const TYPE_COLORS: Record<AdminPricingRuleType, { bg: string; text: string; dot: string }> = {
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
/*  Calendar                                                          */
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
}: {
  year: number;
  month: number;
  rules: AdminPricingRule[];
  onPrev: () => void;
  onNext: () => void;
  selStart: string | null;
  selEnd: string | null;
  onSelect: (date: string) => void;
}) {
  const total = daysInMonth(year, month);
  const offset = firstDayOfWeek(year, month);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthLabel = new Date(year, month).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const dayRuleMap = useMemo(() => {
    const map = new Map<string, AdminPricingRule>();
    const activeRules = rules
      .filter((r) => r.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (let day = 1; day <= total; day++) {
      const ds = toDateStr(new Date(year, month, day));
      for (const rule of activeRules) {
        if (ds >= rule.startDate.slice(0, 10) && ds <= rule.endDate.slice(0, 10)) {
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
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrev} className="rounded-xl p-2 hover:bg-warm-alt/40 transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base font-semibold">{monthLabel}</h3>
        <button onClick={onNext} className="rounded-xl p-2 hover:bg-warm-alt/40 transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted mb-1">
        {dayNames.map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: offset }).map((_, i) => <div key={`pad-${i}`} />)}
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
              title={rule ? `${rule.type}${rule.name ? ` - ${rule.name}` : ""}: ${
                rule.fixedPrice != null ? `Fixed ${rule.fixedPrice}` : `x${rule.priceMultiplier ?? 1}`
              }` : undefined}
            >
              <span className={cn("font-medium", colors && !selected && colors.text)}>{day}</span>
              {rule && <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", colors?.dot)} />}
            </button>
          );
        })}
      </div>

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
}: {
  rule: AdminPricingRule;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const colors = TYPE_COLORS[rule.type];

  return (
    <div className="rounded-3xl ring-1 ring-line/70 bg-surface/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", colors.bg, colors.text)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
            {rule.type}
          </span>
          {rule.priority >= 999 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              ADMIN OVERRIDE
            </span>
          )}
          {rule.name && <span className="text-sm font-medium truncate">{rule.name}</span>}
        </div>
        <p className="text-xs text-secondary">
          {formatDate(rule.startDate)} — {formatDate(rule.endDate)}
        </p>
        <p className="text-xs text-secondary mt-0.5">
          {rule.fixedPrice != null
            ? `Fixed price: ${rule.fixedPrice} AED`
            : `Multiplier: ×${rule.priceMultiplier ?? 1}`}
          {" | "}Priority: {rule.priority}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onToggle(rule.id, !rule.isActive)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            rule.isActive ? "bg-brand" : "bg-muted",
          )}
          role="switch"
          aria-checked={rule.isActive}
          aria-label="Toggle rule"
        >
          <span className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            rule.isActive ? "translate-x-5" : "translate-x-0",
          )} />
        </button>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(rule.id); setConfirmDelete(false); }}
              className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl p-1.5 hover:bg-warm-alt/40 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl p-2 hover:bg-red-50 text-muted hover:text-red-600 transition-colors"
            aria-label="Delete rule"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Rule Form                                                  */
/* ------------------------------------------------------------------ */

function CreateRuleForm({
  propertyId,
  selStart,
  selEnd,
  onCreated,
  onClose,
}: {
  propertyId: string;
  selStart: string | null;
  selEnd: string | null;
  onCreated: (rule: AdminPricingRule) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<AdminPricingRuleType>("SEASONAL");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(selStart ?? "");
  const [endDate, setEndDate] = useState(selEnd ?? selStart ?? "");
  const [priceMode, setPriceMode] = useState<"multiplier" | "fixed">("multiplier");
  const [multiplier, setMultiplier] = useState("1.5");
  const [fixedPrice, setFixedPrice] = useState("");
  const [priority, setPriority] = useState("999");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) { setError("Start and end dates are required."); return; }
    setSaving(true);
    setError(null);
    try {
      const rule = await createAdminPricingRule(propertyId, {
        type,
        name: name.trim() || undefined,
        startDate,
        endDate,
        ...(priceMode === "fixed"
          ? { fixedPrice: Number(fixedPrice) }
          : { priceMultiplier: Number(multiplier) }),
        priority: Number(priority),
      });
      onCreated(rule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl ring-1 ring-brand/40 bg-surface/90 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">New Pricing Rule</h3>
        <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-warm-alt/40 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-secondary mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AdminPricingRuleType)}
              className="w-full rounded-xl border border-line/70 bg-surface px-3 py-2 text-sm"
            >
              {RULE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer 2026"
              className="w-full rounded-xl border border-line/70 bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-secondary mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded-xl border border-line/70 bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-secondary mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full rounded-xl border border-line/70 bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-secondary mb-1">Price Mode</label>
          <div className="flex rounded-xl overflow-hidden border border-line/70">
            <button
              type="button"
              onClick={() => setPriceMode("multiplier")}
              className={cn("flex-1 py-2 text-xs font-medium transition-colors", priceMode === "multiplier" ? "bg-brand text-white" : "bg-surface hover:bg-warm-alt/40")}
            >
              Multiplier
            </button>
            <button
              type="button"
              onClick={() => setPriceMode("fixed")}
              className={cn("flex-1 py-2 text-xs font-medium transition-colors", priceMode === "fixed" ? "bg-brand text-white" : "bg-surface hover:bg-warm-alt/40")}
            >
              Fixed Price (AED)
            </button>
          </div>
        </div>

        {priceMode === "multiplier" ? (
          <div>
            <label className="block text-xs text-secondary mb-1">Multiplier (e.g. 1.5 = 150%)</label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="w-full rounded-xl border border-line/70 bg-surface px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-secondary mb-1">Fixed Price per Night (AED)</label>
            <input
              type="number"
              min="1"
              value={fixedPrice}
              onChange={(e) => setFixedPrice(e.target.value)}
              className="w-full rounded-xl border border-line/70 bg-surface px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-secondary mb-1">Priority (999 = admin override wins)</label>
          <input
            type="number"
            min="0"
            max="9999"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-xl border border-line/70 bg-surface px-3 py-2 text-sm"
          />
        </div>

        {error && <div className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60 transition-colors"
        >
          {saving ? "Creating…" : "Create Rule"}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function AdminPropertyPricingPage() {
  const params = useParams<{ propertyId: string }>();
  const propertyId = params.propertyId;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rules, setRules] = useState<AdminPricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminPricingRules(propertyId);
      setRules(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pricing rules.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { void load(); }, [load]);

  const handleSelect = useCallback((date: string) => {
    setSelStart((prev) => {
      if (!prev || selEnd) { setSelEnd(null); return date; }
      setSelEnd(date);
      return prev;
    });
  }, [selEnd]);

  const handleToggle = useCallback(async (ruleId: string, isActive: boolean) => {
    try {
      const updated = await updateAdminPricingRule(propertyId, ruleId, { isActive });
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
    } catch {
      // ignore — UI stays as-is
    }
  }, [propertyId]);

  const handleDelete = useCallback(async (ruleId: string) => {
    try {
      await deleteAdminPricingRule(propertyId, ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch {
      // ignore
    }
  }, [propertyId]);

  const handleCreated = useCallback((rule: AdminPricingRule) => {
    setRules((prev) => [...prev, rule]);
    setShowForm(false);
    setSelStart(null);
    setSelEnd(null);
  }, []);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  return (
    <PortalShell role="admin" title="Property Pricing" subtitle="Admin pricing rules override vendor rules (priority 999)">
      <div className="space-y-5">
        {/* Info banner */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          <strong>Admin authority:</strong> Rules created here use priority 999 by default and always override vendor pricing rules.
          Admins can manage pricing on any property.
        </div>

        {/* Calendar */}
        <PricingCalendar
          year={year}
          month={month}
          rules={rules}
          onPrev={prevMonth}
          onNext={nextMonth}
          selStart={selStart}
          selEnd={selEnd}
          onSelect={handleSelect}
        />

        {/* Add rule button / form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Pricing Rule
          </button>
        ) : (
          <CreateRuleForm
            propertyId={propertyId}
            selStart={selStart}
            selEnd={selEnd}
            onCreated={handleCreated}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Rules list */}
        {loading ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        ) : rules.length === 0 ? (
          <div className="rounded-3xl ring-1 ring-line/70 bg-surface/90 p-8 text-center text-secondary text-sm">
            No pricing rules. Click a date range on the calendar then add a rule.
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              {rules.length} pricing rule{rules.length !== 1 ? "s" : ""}
            </h3>
            {rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
