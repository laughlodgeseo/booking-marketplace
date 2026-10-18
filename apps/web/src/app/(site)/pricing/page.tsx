import PageDepth from "@/components/inside-story/PageDepth";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";
import { PageHeading, NextRoute } from "@/components/inside-story/Editorial";
import { SceneImage } from "@/components/inside-story/Motion";
export const metadata: Metadata = {
  title: "Clear pricing",
  description:
    "Understand nightly rates, stay fees, taxes, cancellation policies and owner management arrangements.",
};
export default async function PricingPage() {
  const ar = (await getRequestLocale()) === "ar";
  const rows = ar
    ? [
        [
          "السعر يبدأ بإقامتك.",
          "تعتمد الأسعار الليلية على العقار والتواريخ وعدد الضيوف. ابحث بتواريخك للحصول على عرض سعر خاص بإقامتك.",
        ],
        [
          "اعرف تفاصيل الإجمالي.",
          "عندما يتوفر عرض سعر، راجع السعر الليلي والرسوم والضرائب وأي تأمين واجب قبل الدفع. راجع ملخص الحجز لمعرفة المبالغ المطبقة.",
        ],
        [
          "راجع السياسة قبل الحجز.",
          "تخضع الإلغاءات والاستردادات للسياسة المطبقة على حجزك. اقرأ الشروط وتفاصيل الإلغاء قبل تأكيد إقامتك.",
        ],
        [
          "للملاك: اتفاق يناسب عقارك.",
          "يعتمد نطاق الإدارة والرسوم على العقار والخدمات المتفق عليها. تواصل معنا لمناقشة متطلباتك والحصول على تفاصيل مكتوبة.",
        ],
      ]
    : [
        [
          "It starts with your stay.",
          "Nightly rates depend on the home, your dates and your guest count. Search with your travel details for a quote specific to your stay.",
        ],
        [
          "See what makes up the total.",
          "When a quote is available, review the nightly amount, applicable fees, taxes and any required deposit before payment. Your booking summary explains the amounts that apply.",
        ],
        [
          "Know the policy before you book.",
          "Cancellations and refunds follow the policy applicable to your reservation. Read the terms and cancellation details before confirming your stay.",
        ],
        [
          "For owners, a considered arrangement.",
          "Management scope and fees depend on your property and the agreed services. Speak with our team about your requirements and receive the details in writing.",
        ],
      ];
  return (
    <>
      <PageHeading
        context={ar ? "الأسعار" : "Pricing, with clarity"}
        title={
          ar
            ? "راحة تبدأ بوضوح التفاصيل."
            : "The right stay. The whole picture."
        }
        intro={
          ar
            ? "لا نحتاج إلى أرقام افتراضية. إليك ما يجب معرفته عن تكلفة إقامتك الفعلية."
            : "A good decision starts with understanding the details. Here’s what goes into the cost of your stay."
        }
      />
      <div className="story-price-layout">
        <SceneImage
          src="/images/home/why-b.webp"
          alt={ar ? "مساحة معيشة مضيئة" : "Sunlit living and dining space"}
          sizes="(max-width:700px) 90vw, 40vw"
        />
        <div className="story-price-list">
          {rows.map(([title, body], i) => (
            <section key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
              {i === 2 && (
                <Link className="story-link" href="/cancellation">
                  {ar ? "سياسة الإلغاء" : "Read the cancellation policy"}
                  <ArrowUpRight size={18} />
                </Link>
              )}
              {i === 3 && (
                <Link className="story-link" href="/contact?topic=owners">
                  {ar ? "تحدث عن عقارك" : "Discuss your property"}
                  <ArrowUpRight size={18} />
                </Link>
              )}
            </section>
          ))}
        </div>
      </div>
      <PageDepth page="pricing" ar={ar} />
      <NextRoute
        title={ar ? "اختر تواريخك. ابحث عن مساحتك." : "Your dates. Your place."}
        label={ar ? "ابحث عن إقامة" : "Search for a stay"}
        href="/properties"
      />
    </>
  );
}
