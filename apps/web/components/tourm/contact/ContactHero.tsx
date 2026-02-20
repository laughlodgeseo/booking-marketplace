import Link from "next/link";
import { ArrowRight, BadgeCheck, Headset, HousePlus, Plane } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type RoutingItem = {
  title: string;
  detail: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type ContactHeroCopy = {
  eyebrow: string;
  title: string;
  body: string;
  browseStays: string;
  vendorSignup: string;
  routingEyebrow: string;
  routingItems: RoutingItem[];
  responseSla: string;
};

const COPY: Record<AppLocale, ContactHeroCopy> = {
  en: {
    eyebrow: "Contact",
    title: "Reach guest, owner, and operations teams in one place",
    body:
      "From guest booking questions to owner onboarding and operational escalations, every inquiry is routed with clear ownership and response standards.",
    browseStays: "Browse stays",
    vendorSignup: "Start vendor onboarding",
    routingEyebrow: "Support routing",
    routingItems: [
      {
        title: "Guest booking support",
        detail: "Availability checks, quote breakdowns, and pre-arrival guidance.",
        Icon: Plane,
      },
      {
        title: "Owner onboarding",
        detail: "Program-fit review, onboarding scope, and commercial alignment.",
        Icon: HousePlus,
      },
      {
        title: "Operational escalation",
        detail: "Post-booking issues resolved through structured support workflows.",
        Icon: Headset,
      },
    ],
    responseSla: "Most inquiries receive a response within one business day.",
  },
  ar: {
    eyebrow: "تواصل معنا",
    title: "تواصل مع فرق الضيوف والملاك والعمليات من مكان واحد",
    body:
      "من استفسارات الحجز إلى تسجيل الملاك والتصعيدات التشغيلية، يتم توجيه كل طلب إلى الجهة المختصة وفق آلية واضحة للمسؤولية والاستجابة.",
    browseStays: "تصفح الإقامات",
    vendorSignup: "ابدأ تسجيل المورّد",
    routingEyebrow: "توجيه الدعم",
    routingItems: [
      {
        title: "دعم حجوزات الضيوف",
        detail: "مراجعة التوافر وتفاصيل عرض السعر وإرشادات ما قبل الوصول.",
        Icon: Plane,
      },
      {
        title: "تسجيل الملاك",
        detail: "تقييم ملاءمة البرنامج وتحديد نطاق التسجيل والمواءمة التجارية.",
        Icon: HousePlus,
      },
      {
        title: "تصعيد تشغيلي",
        detail: "معالجة مشكلات ما بعد الحجز عبر مسارات دعم تشغيلية منظمة.",
        Icon: Headset,
      },
    ],
    responseSla: "يتم الرد على معظم الاستفسارات خلال يوم عمل واحد.",
  },
};

export default function ContactHero(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 rotate-180" : "h-4 w-4";

  return (
    <section className="site-hero-shell relative overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="site-hero-grid absolute inset-0 opacity-25" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.65rem]">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/86 sm:text-base">{copy.body}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-900 shadow-[0_12px_28px_rgba(11,15,25,0.24)] transition hover:bg-indigo-50"
              >
                {copy.browseStays}
                <ArrowRight className={arrowClass} />
              </Link>
              <Link
                href="/signup?role=vendor"
                className="rounded-xl border border-white/44 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/16"
              >
                {copy.vendorSignup}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/28 bg-white/12 p-6 shadow-[0_18px_48px_rgba(11,15,25,0.2)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/76">{copy.routingEyebrow}</p>
            <div className="mt-4 space-y-3">
              {copy.routingItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/24 bg-white/12 p-4">
                  <div className="flex items-start gap-3">
                    <span className="site-icon-plate-light mt-0.5 h-8 w-8 shrink-0">
                      <item.Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/82">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/26 bg-white/10 px-3 py-2 text-xs font-semibold text-white/88">
              <BadgeCheck className="h-3.5 w-3.5 text-indigo-100" />
              {copy.responseSla}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
