import { Clock, ShieldCheck, Receipt, Info, BadgeCheck, CircleHelp } from "lucide-react";
import { useLocale } from "next-intl";
import PropertySectionCard from "@/components/property/PropertySectionCard";
import { normalizeLocale } from "@/lib/i18n/config";

export type ThingsToKnowBlock = {
  title: string;
  icon: "CHECKIN" | "SECURITY" | "FEES" | "POLICIES" | "SUPPORT";
  lines: string[];
};

export type ThingsToKnowSectionProps = {
  title?: string;
  blocks: ThingsToKnowBlock[];
};

function IconFor(kind: ThingsToKnowBlock["icon"]) {
  const cls = "h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90";
  if (kind === "CHECKIN") return <Clock className={cls} />;
  if (kind === "SECURITY") return <ShieldCheck className={cls} />;
  if (kind === "FEES") return <Receipt className={cls} />;
  if (kind === "SUPPORT") return <BadgeCheck className={cls} />;
  return <Info className={cls} />;
}

export default function ThingsToKnowSection({
  title = "Things to know",
  blocks,
}: ThingsToKnowSectionProps) {
  const locale = normalizeLocale(useLocale());
  const isAr = locale === "ar";
  const resolvedTitle = title === "Things to know" && isAr ? "معلومات مهمة" : title;
  if (!blocks.length) return null;

  return (
    <PropertySectionCard>
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/82 shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/75">
          <CircleHelp className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-primary">{resolvedTitle}</div>
          <p className="text-xs text-secondary">
            {isAr
              ? "تفاصيل الوصول وملاحظات الإلغاء وسياق السلامة."
              : "Check-in details, cancellation notes, and safety context."}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5 md:hidden">
        {blocks.map((b, idx) => (
          <details
            key={`${b.title}-${idx}`}
            className="overflow-hidden rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.78)] p-4 shadow-[0_8px_18px_rgba(11,15,25,0.08)] ring-1 ring-white/72"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-semibold text-primary">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/82 ring-1 ring-white/72">
                {IconFor(b.icon)}
              </span>
              <span>{b.title}</span>
            </summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-secondary">
              {b.lines.map((line, i) => (
                <li key={`${line}-${i}`}>{line}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <div className="mt-4 hidden gap-3 md:grid md:grid-cols-3">
        {blocks.map((b, idx) => (
          <div
            key={`${b.title}-${idx}`}
            className="rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.78)] p-4 shadow-[0_8px_18px_rgba(11,15,25,0.08)] ring-1 ring-white/72"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/82 ring-1 ring-white/72">
                {IconFor(b.icon)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-primary">{b.title}</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-secondary">
                  {b.lines.map((line, i) => (
                    <li key={`${line}-${i}`}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PropertySectionCard>
  );
}
