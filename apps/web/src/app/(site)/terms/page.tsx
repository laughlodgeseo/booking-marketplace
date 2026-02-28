import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Terms & Conditions | Laugh & Lodge",
  description: "Simple terms and conditions for using Laugh & Lodge services.",
};

type LegalSection = {
  title: string;
  body: ReadonlyArray<string>;
};

type TermsCopy = {
  legalEyebrow: string;
  title: string;
  effectiveDate: string;
  heroBody: string;
  privacyPolicy: string;
  cancellationPolicy: string;
  note: string;
  contactSupport: string;
  reviewPrivacy: string;
  sections: ReadonlyArray<LegalSection>;
};

const COPY: Record<"en" | "ar", TermsCopy> = {
  en: {
    legalEyebrow: "Legal",
    title: "Terms & Conditions",
    effectiveDate: "February 19, 2026",
    heroBody:
      "These terms explain how guests, owners, and users interact with our website and booking services.",
    privacyPolicy: "Privacy Policy",
    cancellationPolicy: "Cancellation Policy",
    note:
      "Please read these terms with our Privacy, Cancellation, and Refund policies.",
    contactSupport: "Contact support team",
    reviewPrivacy: "Review Privacy Policy",
    sections: [
      {
        title: "1. Acceptance of Terms",
        body: [
          "By using this website, creating an account, or submitting booking requests, you agree to these Terms and Conditions.",
          "If you do not agree, you should discontinue use of the platform and associated services.",
        ],
      },
      {
        title: "2. Platform Use",
        body: [
          "You must provide accurate and current information during account creation, booking, and communication.",
          "You are responsible for maintaining account confidentiality and for activity under your credentials.",
        ],
      },
      {
        title: "3. Booking and Payment",
        body: [
          "Booking creation and confirmation are controlled through backend status logic and payment event validation.",
          "Displayed quotes and totals follow policy rules, availability status, and charges shown before payment.",
        ],
      },
      {
        title: "4. Guest Responsibilities",
        body: [
          "Guests must comply with house rules, building policies, occupancy limits, and local laws.",
          "Damage, excessive cleaning, unauthorized occupancy, or prohibited activity may result in penalties or extra charges.",
        ],
      },
      {
        title: "5. Owner and Vendor Participation",
        body: [
          "Owners or vendors using onboarding or program channels must provide accurate property and contact details.",
          "Service scope, responsibilities, and commercial terms are governed by applicable agreements.",
        ],
      },
      {
        title: "6. Cancellation and Refund Rules",
        body: [
          "Cancellation and refund outcomes are determined by booking-specific policy windows and timing.",
          "For details, see the dedicated Cancellation and Refund policy pages.",
        ],
      },
      {
        title: "7. Limitation and Service Changes",
        body: [
          "We may update, suspend, or improve platform functionality, pricing presentation, and operations as needed.",
          "Nothing in these terms limits rights that cannot be limited under applicable law.",
        ],
      },
      {
        title: "8. Governing Framework",
        body: [
          "These terms operate under applicable UAE legal and regulatory frameworks.",
          "Any formal dispute process follows applicable contractual and legal channels.",
        ],
      },
    ],
  },
  ar: {
    legalEyebrow: "قانوني",
    title: "الشروط والأحكام",
    effectiveDate: "19 فبراير 2026",
    heroBody:
      "تنظم هذه الشروط طريقة تفاعل الضيوف والملاك والمستخدمين مع موقعنا وتدفقات الحجز والعمليات الخدمية المرتبطة.",
    privacyPolicy: "سياسة الخصوصية",
    cancellationPolicy: "سياسة الإلغاء",
    note:
      "يجب قراءة هذه الشروط مع سياسات الخصوصية والإلغاء والاسترداد لدينا، حيث تشكل معاً إطار السياسات الموجّه للمستخدم.",
    contactSupport: "تواصل مع فريق الدعم",
    reviewPrivacy: "مراجعة سياسة الخصوصية",
    sections: [
      {
        title: "1. قبول الشروط",
        body: [
          "من خلال استخدام هذا الموقع أو إنشاء حساب أو إرسال طلب حجز أو التفاعل مع خدماتنا، فإنك توافق على هذه الشروط والأحكام.",
          "إذا لم توافق عليها، يجب التوقف عن استخدام المنصة والخدمات المرتبطة بها.",
        ],
      },
      {
        title: "2. استخدام المنصة",
        body: [
          "يلزم تقديم بيانات دقيقة ومحدثة عند إنشاء الحساب وعند الحجز وأثناء التواصل.",
          "أنت مسؤول عن الحفاظ على سرية الحساب وعن أي نشاط يتم عبر بيانات اعتمادك.",
        ],
      },
      {
        title: "3. الحجز والدفع",
        body: [
          "إنشاء الحجز وتأكيده يتمان وفق منطق حالات خلفي والتحقق من أحداث الدفع.",
          "عروض الأسعار والإجماليات المعروضة تخضع لقواعد السياسات وحالة التوافر والرسوم المعلنة قبل الدفع.",
        ],
      },
      {
        title: "4. مسؤوليات الضيف",
        body: [
          "يلتزم الضيوف بقواعد المنزل وسياسات المبنى وحدود الإشغال والأنظمة المحلية.",
          "قد ينتج عن الأضرار أو التنظيف المفرط أو الإشغال غير المصرح أو الأنشطة المحظورة غرامات أو رسوم إضافية حسب الحالة.",
        ],
      },
      {
        title: "5. مشاركة المالك والمورّد",
        body: [
          "على الملاك أو الموردين في قنوات التسجيل أو البرامج تقديم بيانات عقار وتواصل دقيقة.",
          "يتم ضبط نطاق الخدمة والمسؤوليات والشروط التجارية وفق الاتفاقيات المعمول بها وأطر التشغيل المعتمدة.",
        ],
      },
      {
        title: "6. قواعد الإلغاء والاسترداد",
        body: [
          "نتائج الإلغاء والاسترداد تُحدد بناءً على نافذة السياسة الخاصة بالحجز وسياق التوقيت.",
          "للتفاصيل، يرجى مراجعة صفحات سياسات الإلغاء والاسترداد المخصصة.",
        ],
      },
      {
        title: "7. حدود الخدمة والتحديثات",
        body: [
          "يجوز لنا تحديث أو تعليق أو تحسين وظائف المنصة وطريقة عرض التسعير والعمليات التشغيلية عند الحاجة.",
          "لا يحد أي نص في هذه الشروط من الحقوق التي لا يجوز تقييدها وفق القانون المعمول به.",
        ],
      },
      {
        title: "8. الإطار الحاكم",
        body: [
          "تعمل هذه الشروط ضمن الأطر القانونية والتنظيمية المعمول بها في دولة الإمارات ذات الصلة بتقديم الخدمة.",
          "أي إجراءات نزاع رسمية تخضع للمسارات التعاقدية والقانونية المعتمدة.",
        ],
      },
    ],
  },
};

export default async function TermsPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const arrowClass = locale === "ar" ? "h-4 w-4 text-indigo-100 rotate-180" : "h-4 w-4 text-indigo-100";

  return (
    <main className="indigo-no-gold min-h-screen bg-transparent">
      <section className="site-hero-shell relative overflow-hidden text-white">
        <div className="site-hero-grid absolute inset-0 opacity-25" />
        <div className="relative mx-auto max-w-5xl px-4 pb-12 pt-12 sm:px-6 sm:pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.legalEyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
          <p className="mt-3 text-sm text-white/84 sm:text-base">
            {locale === "ar" ? "تاريخ النفاذ:" : "Effective date:"} {copy.effectiveDate}. {copy.heroBody}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-white/85">
            <Link href="/privacy" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
              {copy.privacyPolicy}
            </Link>
            <Link href="/cancellation" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
              {copy.cancellationPolicy}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="site-surface-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/58 p-4 text-sm text-indigo-900">
              <span className="site-icon-plate mt-0.5 h-8 w-8 shrink-0 rounded-lg">
                <FileText className="h-4 w-4" />
              </span>
              <span>{copy.note}</span>
            </div>

            <div className="mt-6 space-y-5">
              {copy.sections.map((section) => (
                <article
                  key={section.title}
                  className="rounded-2xl border border-indigo-100/80 bg-[linear-gradient(180deg,rgba(248,242,232,0.96),rgba(240,233,220,0.72))] p-5"
                >
                  <h2 className="text-base font-semibold text-primary">{section.title}</h2>
                  <div className="mt-2 space-y-2">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-sm leading-relaxed text-secondary/84">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="site-cta-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
              >
                {copy.contactSupport}
                <ArrowRight className={arrowClass} />
              </Link>
              <Link
                href="/privacy"
                className="site-cta-muted inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
              >
                {copy.reviewPrivacy}
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
