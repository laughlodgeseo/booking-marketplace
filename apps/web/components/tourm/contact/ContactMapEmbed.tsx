import Link from "next/link";
import { ArrowRight, Building2, MapPin, PhoneCall } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type ContactMapCopy = {
  sectionEyebrow: string;
  title: string;
  body: string;
  primaryMarketTitle: string;
  primaryMarketBody: string;
  onboardingTitle: string;
  onboardingBody: string;
  quickContactTitle: string;
  quickContactBody: string;
  startVendor: string;
  ownerProgramDetails: string;
  mapBadge: string;
};

const COPY: Record<AppLocale, ContactMapCopy> = {
  en: {
    sectionEyebrow: "Coverage",
    title: "Dubai-focused operations with UAE-wide owner onboarding",
    body:
      "We support guests and owners across Dubai and selected UAE areas. Share your location and property profile so we can confirm scope quickly.",
    primaryMarketTitle: "Primary market",
    primaryMarketBody: "Dubai short-stay and holiday-home operations.",
    onboardingTitle: "Owner onboarding",
    onboardingBody: "Program evaluation for qualifying properties across UAE areas.",
    quickContactTitle: "Quick contact",
    quickContactBody: "+971 50 234 8756 | Info@rentpropertyuae.com",
    startVendor: "Start vendor onboarding",
    ownerProgramDetails: "Owner program details",
    mapBadge: "Dubai and surrounding UAE coverage based on onboarding fit.",
  },
  ar: {
    sectionEyebrow: "نطاق التغطية",
    title: "تشغيل يركز على دبي مع تسجيل ملاك على مستوى الإمارات",
    body:
      "ندعم الضيوف والملاك عبر مجتمعات دبي الرئيسية وأسواق مختارة في الإمارات. شارك موقعك وملف عقارك لنؤكد نطاق الخدمة بسرعة.",
    primaryMarketTitle: "السوق الرئيسي",
    primaryMarketBody: "تشغيل الإقامات القصيرة وبيوت العطلات في دبي.",
    onboardingTitle: "تسجيل الملاك",
    onboardingBody: "تقييم البرنامج للعقارات المؤهلة عبر مناطق الإمارات.",
    quickContactTitle: "تواصل سريع",
    quickContactBody: "+971 50 234 8756 | Info@rentpropertyuae.com",
    startVendor: "ابدأ تسجيل المورّد",
    ownerProgramDetails: "تفاصيل برنامج المالك",
    mapBadge: "تغطية دبي ومحيطها في الإمارات وفق ملاءمة التسجيل.",
  },
};

export default function ContactMapEmbed(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-100 rotate-180" : "h-4 w-4 text-indigo-100";

  return (
    <section id="contact-coverage" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="site-surface-card overflow-hidden rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="p-8 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.sectionEyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary/82 sm:text-base">{copy.body}</p>

              <div className="mt-6 space-y-3 rounded-2xl border border-indigo-100/80 bg-indigo-50/35 p-5">
                <div className="flex items-start gap-3">
                  <span className="site-icon-plate mt-0.5 h-8 w-8 rounded-lg">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-primary">{copy.primaryMarketTitle}</p>
                    <p className="mt-1 text-sm text-secondary/82">{copy.primaryMarketBody}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="site-icon-plate mt-0.5 h-8 w-8 rounded-lg">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-primary">{copy.onboardingTitle}</p>
                    <p className="mt-1 text-sm text-secondary/82">{copy.onboardingBody}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="site-icon-plate mt-0.5 h-8 w-8 rounded-lg">
                    <PhoneCall className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-primary">{copy.quickContactTitle}</p>
                    <p className="mt-1 text-sm text-secondary/82">{copy.quickContactBody}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/signup?role=vendor"
                  className="site-cta-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
                >
                  {copy.startVendor}
                  <ArrowRight className={arrowClass} />
                </Link>
                <Link
                  href="/owners"
                  className="site-cta-muted inline-flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition"
                >
                  {copy.ownerProgramDetails}
                </Link>
              </div>
            </div>

            <div className="relative min-h-[340px] overflow-hidden lg:min-h-full">
              <iframe
                title="RentPropertyUAE coverage map"
                src="https://www.google.com/maps?q=Dubai%20United%20Arab%20Emirates&output=embed"
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="absolute left-4 top-4 rounded-2xl border border-indigo-200/75 bg-[linear-gradient(180deg,rgba(248,242,232,0.95),rgba(240,233,220,0.88))] px-4 py-3 text-xs font-semibold text-primary shadow-sm backdrop-blur">
                {copy.mapBadge}
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-indigo-950/25 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
