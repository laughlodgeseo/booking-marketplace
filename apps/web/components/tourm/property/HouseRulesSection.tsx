import type { ComponentType } from "react";
import {
  CigaretteOff,
  Users,
  PartyPopper,
  Dog,
  IdCard,
  Volume2,
  Clock,
  Sparkles,
  CircleHelp,
  BadgeCheck,
  CircleX,
  Info,
  Scale,
} from "lucide-react";
import { useLocale } from "next-intl";
import PropertySectionCard from "@/components/property/PropertySectionCard";
import { normalizeLocale } from "@/lib/i18n/config";

export type HouseRuleKey =
  | "NO_SMOKING"
  | "NO_PARTIES"
  | "QUIET_HOURS"
  | "ID_REQUIRED"
  | "NO_PETS"
  | "MAX_GUESTS"
  | "CHECKIN_WINDOW"
  | "CHECKOUT_TIME"
  | "KEEP_CLEAN"
  | "OTHER";

export type HouseRuleItem = {
  key: HouseRuleKey | string;
  label?: string;
  detail?: string;
};

type RuleMeta = {
  key: HouseRuleKey;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

const RULES: Record<HouseRuleKey, RuleMeta> = {
  NO_SMOKING: { key: "NO_SMOKING", label: "No smoking", Icon: CigaretteOff },
  NO_PARTIES: { key: "NO_PARTIES", label: "No parties or events", Icon: PartyPopper },
  QUIET_HOURS: { key: "QUIET_HOURS", label: "Quiet hours", Icon: Volume2 },
  ID_REQUIRED: { key: "ID_REQUIRED", label: "ID required at check-in", Icon: IdCard },
  NO_PETS: { key: "NO_PETS", label: "No pets", Icon: Dog },
  MAX_GUESTS: { key: "MAX_GUESTS", label: "Max guests", Icon: Users },
  CHECKIN_WINDOW: { key: "CHECKIN_WINDOW", label: "Check-in window", Icon: Clock },
  CHECKOUT_TIME: { key: "CHECKOUT_TIME", label: "Check-out time", Icon: Clock },
  KEEP_CLEAN: { key: "KEEP_CLEAN", label: "Keep the space tidy", Icon: Sparkles },
  OTHER: { key: "OTHER", label: "House rule", Icon: CircleHelp },
};

const RULES_AR: Record<HouseRuleKey, string> = {
  NO_SMOKING: "ممنوع التدخين",
  NO_PARTIES: "ممنوع الحفلات أو الفعاليات",
  QUIET_HOURS: "ساعات الهدوء",
  ID_REQUIRED: "إثبات هوية عند الوصول",
  NO_PETS: "غير مسموح بالحيوانات الأليفة",
  MAX_GUESTS: "الحد الأقصى للضيوف",
  CHECKIN_WINDOW: "نافذة تسجيل الوصول",
  CHECKOUT_TIME: "وقت تسجيل المغادرة",
  KEEP_CLEAN: "الحفاظ على نظافة المكان",
  OTHER: "قاعدة إقامة",
};

function normalizeRuleKey(input: string): HouseRuleKey {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "_");
  return Object.prototype.hasOwnProperty.call(RULES, cleaned)
    ? (cleaned as HouseRuleKey)
    : "OTHER";
}

function metaFor(rule: HouseRuleItem) {
  const key = typeof rule.key === "string" ? normalizeRuleKey(rule.key) : "OTHER";
  const meta = RULES[key];
  const label = (rule.label ?? "").trim() || meta.label;
  const detail = (rule.detail ?? "").trim() || undefined;
  return { meta, label, detail };
}

type RuleStatus = "allowed" | "not_allowed" | "conditional";

function statusFor(rule: HouseRuleItem, label: string): RuleStatus {
  const key = String(rule.key ?? "")
    .trim()
    .toUpperCase();
  const normalizedLabel = label.trim().toLowerCase();

  if (key.startsWith("NO_") || normalizedLabel.startsWith("no ") || normalizedLabel.includes("not allowed")) {
    return "not_allowed";
  }
  if (normalizedLabel.includes("allowed")) return "allowed";
  return "conditional";
}

function statusTone(status: RuleStatus) {
  if (status === "allowed") {
    return {
      icon: BadgeCheck,
      wrap: "bg-[rgb(var(--color-success-rgb)/0.14)] text-[rgb(var(--color-success-rgb)/1)]",
    };
  }
  if (status === "not_allowed") {
    return {
      icon: CircleX,
      wrap: "bg-[rgb(var(--color-danger-rgb)/0.14)] text-[rgb(var(--color-danger-rgb)/1)]",
    };
  }
  return {
    icon: Info,
    wrap: "bg-[rgb(var(--color-warning-rgb)/0.15)] text-[rgb(var(--color-warning-rgb)/1)]",
  };
}

export type HouseRulesSectionProps = {
  title?: string;
  items: HouseRuleItem[];
};

export default function HouseRulesSection({
  title = "House rules",
  items,
}: HouseRulesSectionProps) {
  const locale = normalizeLocale(useLocale());
  const isAr = locale === "ar";
  const resolvedTitle = title === "House rules" && isAr ? "قواعد الإقامة" : title;
  if (!items.length) return null;

  return (
    <PropertySectionCard>
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/82 shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/75">
          <Scale className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-primary">{resolvedTitle}</div>
          <p className="text-xs text-secondary">
            {isAr
              ? "قواعد واضحة للحفاظ على تجربة إقامة سلسة."
              : "Clear rules to keep every stay smooth."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {items.map((r, idx) => {
          const { meta, label } = metaFor(r);
          const localizedLabel = !r.label && isAr ? RULES_AR[meta.key] : label;
          const status = statusFor(r, label);
          const tone = statusTone(status);
          const StatusIcon = tone.icon;

          return (
            <div
              key={`${String(r.key)}-${idx}`}
              className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--color-bg-rgb)/0.78)] px-3 py-2 text-xs font-semibold text-primary shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/72"
            >
              <span className={`grid h-6 w-6 place-items-center rounded-full ${tone.wrap}`}>
                <StatusIcon className="h-3.5 w-3.5" />
              </span>
              <span>{localizedLabel}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2">
        {items
          .filter((rule) => Boolean(metaFor(rule).detail))
          .map((r, idx) => {
            const { meta, label, detail } = metaFor(r);
            const Icon = meta.Icon;
            const localizedLabel = !r.label && isAr ? RULES_AR[meta.key] : label;

            return (
              <div
                key={`detail-${String(r.key)}-${idx}`}
                className="flex items-start gap-3 rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.78)] p-3 shadow-[0_8px_18px_rgba(11,15,25,0.08)] ring-1 ring-white/72"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/82 ring-1 ring-white/72">
                  <Icon className="h-[17px] w-[17px] stroke-[1.9] text-indigo-600/90" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-primary">{localizedLabel}</div>
                  <div className="mt-0.5 text-xs text-secondary">{detail}</div>
                </div>
              </div>
            );
          })}
      </div>
    </PropertySectionCard>
  );
}
