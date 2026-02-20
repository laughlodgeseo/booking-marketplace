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
    title: "Speak to our guest and owner support teams",
    body:
      "Whether you are booking a stay, onboarding a property, or resolving an operational issue, we route requests to the right team for faster and clearer outcomes.",
    browseStays: "Browse stays",
    vendorSignup: "Vendor sign up",
    routingEyebrow: "Support routing",
    routingItems: [
      {
        title: "Guest booking support",
        detail: "Availability, quote clarity, check-in and stay-related support.",
        Icon: Plane,
      },
      {
        title: "Owner onboarding",
        detail: "Program fit, onboarding scope, and commercial alignment.",
        Icon: HousePlus,
      },
      {
        title: "Operational escalation",
        detail: "Post-booking issues handled through structured support workflows.",
        Icon: Headset,
      },
    ],
    responseSla: "Most inquiries are answered within one business day.",
  },
  ar: {
    eyebrow: "تواصل معنا",
    title: "تحدث مع فرق دعم الضيوف والملاك",
    body:
      "سواء كنت تحجز إقامة أو تبدأ تسجيل عقارك أو تعالج مشكلة تشغيلية، نقوم بتوجيه الطلب للفريق المناسب لتحقيق استجابة أسرع ونتائج أوضح.",
    browseStays: "تصفح الإقامات",
    vendorSignup: "تسجيل مورّد",
    routingEyebrow: "توجيه الدعم",
    routingItems: [
      {
        title: "دعم حجوزات الضيوف",
        detail: "مساعدة في التوافر ووضوح عرض السعر وتفاصيل الوصول والإقامة.",
        Icon: Plane,
      },
      {
        title: "تسجيل الملاك",
        detail: "تقييم ملاءمة البرنامج ونطاق التسجيل والمواءمة التجارية.",
        Icon: HousePlus,
      },
      {
        title: "تصعيد تشغيلي",
        detail: "معالجة مشكلات ما بعد الحجز عبر سير عمل دعم منظم.",
        Icon: Headset,
      },
    ],
    responseSla: "يتم الرد على معظم الاستفسارات خلال يوم عمل واحد.",
  },
};

export default function ContactHero(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];
  const arrowClass = props.locale === "ar" ? "h-4 w-4 text-indigo-700 rotate-180" : "h-4 w-4 text-indigo-700";

  return (
    <section className="relative overflow-hidden border-b border-white/24 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-14 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/74">{copy.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/84 sm:text-base">{copy.body}</p>

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
                className="rounded-xl border border-white/60 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {copy.vendorSignup}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/30 bg-white/10 p-6 shadow-[0_18px_48px_rgba(11,15,25,0.2)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/76">{copy.routingEyebrow}</p>
            <div className="mt-4 space-y-3">
              {copy.routingItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/24 bg-white/12 p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/12">
                      <item.Icon className="h-4 w-4 text-white" />
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
              <BadgeCheck className="h-3.5 w-3.5" />
              {copy.responseSla}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
