import { ShieldCheck } from "lucide-react";
import { siteCompliance } from "@/lib/site-compliance";
import type { AppLocale } from "@/lib/i18n/config";

const LABELS: Record<AppLocale, {
  heading: string;
  dtcm: string;
  brn: string;
  office: string;
}> = {
  en: {
    heading: "Licensed Dubai Holiday Homes Operator",
    dtcm: "DTCM Permit",
    brn: "Business Registration No",
    office: "Registered Office",
  },
  ar: {
    heading: "مشغّل إقامات قصيرة معتمد في دبي",
    dtcm: "تصريح DTCM",
    brn: "رقم السجل التجاري",
    office: "المكتب المسجل",
  },
};

type Props = {
  variant: "footer" | "card";
  locale?: AppLocale;
};

export function BusinessComplianceBlock({ variant, locale = "en" }: Props) {
  const t = LABELS[locale];

  if (variant === "footer") {
    return (
      <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:text-left">
        <span className="inline-flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-violet-300 sm:justify-start">
          <ShieldCheck className="h-3 w-3 shrink-0 text-violet-400/70" />
          DTCM Holiday Homes Permit:&nbsp;
          <span className="font-semibold">{siteCompliance.dtcmPermit}</span>
        </span>
        <span className="hidden text-[10px] text-violet-400/40 sm:inline" aria-hidden>·</span>
        <span className="text-[11px] leading-relaxed text-violet-300">
          Business Registration No:&nbsp;
          <span className="font-semibold">{siteCompliance.businessRegistrationNumber}</span>
        </span>
        <span className="hidden text-[10px] text-violet-400/40 sm:inline" aria-hidden>·</span>
        <span className="text-[11px] leading-relaxed text-violet-300">
          Registered Office:&nbsp;
          <span className="font-semibold">{siteCompliance.registeredOffice}</span>
        </span>
      </div>
    );
  }

  return (
    <article className="site-surface-card rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <span className="site-icon-plate h-11 w-11 shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-primary">{t.heading}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/60">
                {t.dtcm}
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {siteCompliance.dtcmPermit}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/60">
                {t.brn}
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {siteCompliance.businessRegistrationNumber}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/60">
                {t.office}
              </p>
              <p className="mt-1 text-sm font-semibold text-primary">
                {siteCompliance.registeredOffice}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
