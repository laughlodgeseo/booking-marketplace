"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import type { AppLocale } from "@/lib/i18n/config";

type PricingBreakdownCopy = {
  sectionEyebrow: string;
  sectionTitle: string;
  sectionBody: string;
  includeTitle: string;
  includeItems: string[];
  cancellationPolicy: string;
  refundPolicy: string;
  sampleQuoteTitle: string;
  sampleQuoteNote: string;
  lineLabels: {
    cleaning: string;
    serviceFee: string;
    tourismFee: string;
    vat: string;
  };
  estimatedTotal: string;
  baseLabel: string;
  policyNote: string;
  askDetails: string;
};

const COPY: Record<AppLocale, PricingBreakdownCopy> = {
  en: {
    sectionEyebrow: "Breakdown",
    sectionTitle: "Sample quote before payment",
    sectionBody:
      "This sample shows how totals are displayed. Final values depend on dates, property rules, and policy terms.",
    includeTitle: "What we show before checkout",
    includeItems: [
      "Per-night total for selected dates",
      "Service and preparation components",
      "Policy notes before payment",
      "Final payable total with clear line items",
    ],
    cancellationPolicy: "Cancellation policy",
    refundPolicy: "Refund policy",
    sampleQuoteTitle: "Sample quote",
    sampleQuoteNote: "Example only. Real totals are generated server-side from booking and policy data.",
    lineLabels: {
      cleaning: "Cleaning and turnover",
      serviceFee: "Service fee",
      tourismFee: "Tourism fee (if applicable)",
      vat: "VAT (if applicable)",
    },
    estimatedTotal: "Estimated total",
    baseLabel: "Base",
    policyNote: "Policy windows can change payable and refundable amounts based on cancellation timing.",
    askDetails: "Ask about pricing details",
  },
  ar: {
    sectionEyebrow: "تفصيل الأسعار",
    sectionTitle: "نموذج عرض سعر توضيحي قبل تأكيد الدفع",
    sectionBody:
      "يوضح هذا المثال طريقة عرض الإجماليات. القيم النهائية تعتمد دائماً على التواريخ المختارة وقواعد العقار وعناصر السياسة المطبقة.",
    includeTitle: "ما الذي نعرضه قبل إتمام الحجز",
    includeItems: [
      "إجمالي لكل ليلة متوافق مع تواريخ الإقامة المختارة",
      "مكونات الخدمة والتجهيز المطبقة",
      "ملاحظات مرتبطة بالسياسة قبل تفويض الدفع",
      "إجمالي نهائي قابل للدفع مع بنود واضحة",
    ],
    cancellationPolicy: "سياسة الإلغاء",
    refundPolicy: "سياسة الاسترداد",
    sampleQuoteTitle: "عرض سعر توضيحي",
    sampleQuoteNote: "للتوضيح فقط. الإجماليات الفعلية تُنشأ على الخادم وفق بيانات الحجز والسياسات.",
    lineLabels: {
      cleaning: "التنظيف وتجهيز التحويل",
      serviceFee: "رسوم الخدمة",
      tourismFee: "رسوم سياحية (عند الانطباق)",
      vat: "ضريبة القيمة المضافة (عند الانطباق)",
    },
    estimatedTotal: "الإجمالي التقديري",
    baseLabel: "العملة الأساسية",
    policyNote: "قد تغيّر نوافذ السياسة المبالغ المستحقة أو القابلة للاسترداد بحسب توقيت الإلغاء.",
    askDetails: "اسأل عن تفاصيل التسعير",
  },
};

function Row(props: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className={["text-sm", props.muted ? "text-secondary/70" : "text-secondary/82"].join(" ")}>{props.label}</div>
      <div className="text-sm font-semibold text-primary">{props.value}</div>
    </div>
  );
}

export default function PricingBreakdown(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const { currency, formatFromAed, formatBaseAed } = useCurrency();

  const nights = 4;
  const nightly = 525;
  const cleaning = 180;
  const serviceFee = 95;
  const tourismDirham = 40;
  const vat = 16;

  const subtotal = nights * nightly + cleaning + serviceFee + tourismDirham;
  const total = subtotal + vat;
  const nightsLabel = `${nights} ${props.locale === "ar" ? "ليالٍ" : "nights"} x ${formatFromAed(nightly, { maximumFractionDigits: 0 })}`;
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-100 rotate-180" : "h-4 w-4 text-indigo-100";

  return (
    <section id="pricing-breakdown" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.sectionEyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.sectionTitle}</h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.sectionBody}</p>

            <div className="site-surface-card rounded-2xl p-6">
              <p className="text-sm font-semibold text-primary">{copy.includeTitle}</p>
              <ul className="mt-4 space-y-2">
                {copy.includeItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-secondary/84">
                    <span className="site-icon-plate mt-0.5 h-5 w-5 shrink-0 rounded-lg">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
                <Link
                  href="/cancellation"
                  className="underline decoration-indigo-300 underline-offset-4 text-indigo-700 hover:decoration-indigo-500"
                >
                  {copy.cancellationPolicy}
                </Link>
                <Link
                  href="/refunds"
                  className="underline decoration-indigo-300 underline-offset-4 text-indigo-700 hover:decoration-indigo-500"
                >
                  {copy.refundPolicy}
                </Link>
              </div>
            </div>
          </div>

          <div className="site-surface-card rounded-[2rem] p-6 sm:p-8">
            <p className="text-sm font-semibold text-primary">{copy.sampleQuoteTitle}</p>
            <p className="mt-2 text-xs text-secondary/65">{copy.sampleQuoteNote}</p>

            <div className="mt-6 divide-y divide-line/50">
              <Row label={nightsLabel} value={formatFromAed(nights * nightly, { maximumFractionDigits: 0 })} />
              <Row label={copy.lineLabels.cleaning} value={formatFromAed(cleaning, { maximumFractionDigits: 0 })} />
              <Row label={copy.lineLabels.serviceFee} value={formatFromAed(serviceFee, { maximumFractionDigits: 0 })} />
              <Row label={copy.lineLabels.tourismFee} value={formatFromAed(tourismDirham, { maximumFractionDigits: 0 })} muted />
              <Row label={copy.lineLabels.vat} value={formatFromAed(vat, { maximumFractionDigits: 0 })} muted />
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-indigo-200/80 bg-indigo-50/72 p-5">
              <div className="text-sm text-secondary/74">{copy.estimatedTotal}</div>
              <div className="text-lg font-semibold text-primary">{formatFromAed(total, { maximumFractionDigits: 0 })}</div>
            </div>

            {currency !== "AED" ? (
              <div className="mt-2 text-right text-xs text-secondary/65">
                {copy.baseLabel}: {formatBaseAed(total)}
              </div>
            ) : null}

            <p className="mt-4 text-xs text-secondary/62">{copy.policyNote}</p>

            <Link
              href="/contact"
              className="site-cta-primary mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
            >
              {copy.askDetails}
              <ArrowRight className={arrowClass} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
