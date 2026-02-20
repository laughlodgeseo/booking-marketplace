import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Privacy Policy | Laugh & Lodge",
  description: "Privacy policy for Laugh & Lodge Vacation Homes Rental LLC.",
};

type LegalSection = {
  title: string;
  body: ReadonlyArray<string>;
};

type PrivacyCopy = {
  legalEyebrow: string;
  title: string;
  effectiveDate: string;
  heroBody: string;
  termsAndConditions: string;
  privacyRequestContact: string;
  requestNote: string;
  contactPrivacy: string;
  readTerms: string;
  sections: ReadonlyArray<LegalSection>;
};

const COPY: Record<"en" | "ar", PrivacyCopy> = {
  en: {
    legalEyebrow: "Legal",
    title: "Privacy Policy",
    effectiveDate: "February 19, 2026",
    heroBody:
      "This policy explains how we handle personal data with security, accountability, and operational necessity in mind.",
    termsAndConditions: "Terms and Conditions",
    privacyRequestContact: "Privacy request contact",
    requestNote:
      "If you need a data-access, correction, or deletion request, please email Info@rentpropertyuae.com with your identity details and request scope.",
    contactPrivacy: "Contact for privacy requests",
    readTerms: "Read Terms and Conditions",
    sections: [
      {
        title: "1. Scope",
        body: [
          "This Privacy Policy explains how Laugh & Lodge Vacation Homes Rental LLC collects, uses, stores, and protects personal data when you use our website, booking flows, or owner onboarding channels.",
          "This policy applies to guest inquiries, reservations, account usage, and owner-related contact submissions.",
        ],
      },
      {
        title: "2. Data We Collect",
        body: [
          "We may collect identity and contact data (for example: name, email, phone), reservation data (travel dates, guest count, property reference), and communication content submitted through contact forms or support channels.",
          "Payment information is processed through relevant payment providers; we do not publish or expose full sensitive payment credentials in customer-facing systems.",
        ],
      },
      {
        title: "3. How We Use Data",
        body: [
          "Personal data is used to process bookings, manage guest and owner support, enforce platform policies, prevent fraud or misuse, and improve service quality.",
          "We may also use operational metadata to monitor system reliability, booking integrity, and support performance.",
        ],
      },
      {
        title: "4. Legal Basis and Legitimate Use",
        body: [
          "Data is processed where required for contract performance, legitimate business operations, compliance obligations, and customer support delivery.",
          "Where consent is required for a specific activity, we request consent through appropriate product or communication touchpoints.",
        ],
      },
      {
        title: "5. Data Sharing",
        body: [
          "We may share limited relevant data with service providers and partners involved in booking, payment, communication, hosting, analytics, and operational execution.",
          "We do not sell personal data as a standalone commercial product.",
        ],
      },
      {
        title: "6. Retention and Security",
        body: [
          "Data is retained only as long as required for service delivery, policy enforcement, legal obligations, and legitimate dispute or audit needs.",
          "We maintain technical and organizational safeguards designed to reduce unauthorized access, alteration, disclosure, or loss.",
        ],
      },
      {
        title: "7. Your Rights and Requests",
        body: [
          "Subject to applicable law, you may request access, correction, or deletion of personal data held by us, and you may request clarification on how your data is used.",
          "To submit a privacy request, contact us using the details in the Contact section below.",
        ],
      },
      {
        title: "8. Cookies and Tracking",
        body: [
          "We may use cookies or similar technologies for authentication, session continuity, security hardening, and service analytics.",
          "You can manage certain cookie settings through your browser controls.",
        ],
      },
    ],
  },
  ar: {
    legalEyebrow: "قانوني",
    title: "سياسة الخصوصية",
    effectiveDate: "19 فبراير 2026",
    heroBody:
      "توضح هذه السياسة كيفية تعاملنا مع البيانات الشخصية وفق متطلبات الأمان والمساءلة والاحتياج التشغيلي.",
    termsAndConditions: "الشروط والأحكام",
    privacyRequestContact: "التواصل لطلبات الخصوصية",
    requestNote:
      "إذا كنت بحاجة إلى طلب وصول أو تصحيح أو حذف بيانات، يرجى مراسلتنا على Info@rentpropertyuae.com مع بيانات التحقق ونطاق الطلب.",
    contactPrivacy: "تواصل لطلبات الخصوصية",
    readTerms: "قراءة الشروط والأحكام",
    sections: [
      {
        title: "1. النطاق",
        body: [
          "توضح هذه السياسة كيف تقوم Laugh & Lodge Vacation Homes Rental LLC بجمع البيانات الشخصية واستخدامها وتخزينها وحمايتها عند استخدام الموقع أو تدفقات الحجز أو قنوات تسجيل الملاك.",
          "تنطبق هذه السياسة على استفسارات الضيوف والحجوزات واستخدام الحسابات ونماذج التواصل المتعلقة بالملاك.",
        ],
      },
      {
        title: "2. البيانات التي نجمعها",
        body: [
          "قد نجمع بيانات الهوية والتواصل مثل الاسم والبريد والهاتف، وبيانات الحجز مثل التواريخ وعدد الضيوف ومرجع العقار، ومحتوى الرسائل المرسلة عبر النماذج أو قنوات الدعم.",
          "تتم معالجة بيانات الدفع عبر مزودي الدفع المعتمدين، ولا نقوم بنشر أو إظهار بيانات الدفع الحساسة الكاملة في الأنظمة الموجهة للعملاء.",
        ],
      },
      {
        title: "3. كيفية استخدام البيانات",
        body: [
          "تُستخدم البيانات الشخصية لمعالجة الحجوزات وإدارة دعم الضيوف والملاك وتطبيق سياسات المنصة ومنع الاحتيال أو سوء الاستخدام وتحسين جودة الخدمة.",
          "قد نستخدم أيضاً البيانات التشغيلية لمتابعة موثوقية النظام وسلامة الحجز وأداء الدعم.",
        ],
      },
      {
        title: "4. الأساس القانوني والاستخدام المشروع",
        body: [
          "تُعالج البيانات عند الحاجة لتنفيذ العقد وتشغيل الأعمال بشكل مشروع والالتزامات النظامية وتقديم الدعم.",
          "وعندما تكون الموافقة مطلوبة لنشاط محدد، نطلبها عبر نقاط المنتج أو قنوات التواصل المناسبة.",
        ],
      },
      {
        title: "5. مشاركة البيانات",
        body: [
          "قد نشارك بيانات محدودة وذات صلة مع مزودي الخدمة والشركاء المشاركين في الحجز والدفع والتواصل والاستضافة والتحليلات والتنفيذ التشغيلي.",
          "نحن لا نبيع البيانات الشخصية كمنتج تجاري مستقل.",
        ],
      },
      {
        title: "6. الاحتفاظ والأمان",
        body: [
          "يتم الاحتفاظ بالبيانات فقط للمدة اللازمة لتقديم الخدمة وتطبيق السياسات والالتزامات القانونية واحتياجات النزاعات أو التدقيق المشروعة.",
          "نطبق ضوابط تقنية وتنظيمية تهدف إلى تقليل الوصول غير المصرح أو التعديل أو الإفصاح أو الفقد.",
        ],
      },
      {
        title: "7. حقوقك وطلباتك",
        body: [
          "وفق القانون المعمول به، يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها، كما يمكنك طلب توضيح حول طريقة استخدامها.",
          "لإرسال طلب خصوصية، تواصل معنا عبر البيانات الموضحة في قسم التواصل أدناه.",
        ],
      },
      {
        title: "8. ملفات الارتباط والتتبع",
        body: [
          "قد نستخدم ملفات الارتباط أو التقنيات المشابهة للمصادقة واستمرارية الجلسة وتعزيز الأمان وتحليلات الخدمة.",
          "يمكنك إدارة بعض إعدادات ملفات الارتباط من خلال خيارات المتصفح.",
        ],
      },
    ],
  },
};

export default async function PrivacyPage() {
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
            <Link href="/terms" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
              {copy.termsAndConditions}
            </Link>
            <Link href="/contact" className="underline decoration-white/35 underline-offset-4 hover:decoration-white">
              {copy.privacyRequestContact}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="site-surface-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/58 p-4 text-sm text-indigo-900">
              <span className="site-icon-plate mt-0.5 h-8 w-8 shrink-0 rounded-lg">
                <LockKeyhole className="h-4 w-4" />
              </span>
              <span>{copy.requestNote}</span>
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
                {copy.contactPrivacy}
                <ArrowRight className={arrowClass} />
              </Link>
              <Link
                href="/terms"
                className="site-cta-muted inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
              >
                {copy.readTerms}
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
