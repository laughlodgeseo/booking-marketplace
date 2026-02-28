import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { cookies } from "next/headers";
import HeroSplit from "@/components/tourm/home/HeroSplit";
import UnifiedSearchBar from "@/components/search/UnifiedSearchBar";
import type { AreaChip } from "@/components/tourm/home/sections/AreasSlider";
import { fetchFeaturedStays } from "@/lib/api/publicSearch";
import { parseSupportedCurrency } from "@/lib/currency/currency";
import type { AppLocale } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import SofaLottieDeferred from "@/components/tourm/home/sections/SofaLottieDeferred";

const FeaturedSpotlight = dynamic(() => import("@/components/tourm/home/sections/FeaturedSpotlight"));
const AreasSlider = dynamic(() => import("@/components/tourm/home/sections/AreasSlider"));
const PartnerDistributionStrip = dynamic(() => import("@/components/tourm/home/sections/PartnerDistributionStrip"));
const WhyChooseUs = dynamic(() => import("@/components/tourm/home/sections/WhyChooseUs"));
const OwnerCta = dynamic(() => import("@/components/tourm/home/sections/OwnerCta"));
const TrustOperationsSection = dynamic(() => import("@/components/tourm/home/sections/TrustOperationsSection"));
const HowItWorks = dynamic(() => import("@/components/tourm/home/sections/HowItWorks"));
const ServicesPreview = dynamic(() => import("@/components/tourm/home/sections/ServicesPreview"));
const FaqSection = dynamic(() => import("@/components/tourm/home/sections/FaqSection"));

const HOME_COPY = {
  en: {
    featured: {
      title: "Featured stays with live availability",
      subtitle:
        "Every featured stay is synced in real time, so prices and availability stay accurate from search to checkout.",
      errorTitle: "Featured stays could not load right now.",
      errorBody: "You can still browse all listings.",
      browse: "Browse stays",
    },
    hero: {
      titleTop: "Where every Dubai stay",
      titleEmphasis: "feels professionally hosted.",
      subtitle:
        "Fast booking, clear pricing, and hotel-style hosting with real 24/7 support.",
      primaryCtaLabel: "Explore stays",
      secondaryCtaLabel: "List your property",
    },
    areas: {
      title: "Browse Dubai's top neighborhoods",
      subtitle:
        "Start with popular areas, then filter by dates, budget, amenities, and map to find the right stay faster.",
    },
    why: {
      titleA: "Hotel-grade operations,",
      titleB: "home-style comfort",
      subtitle:
        "We run homes like a boutique hotel with verified availability, clear totals, and local support.",
      reasons: [
        {
          title: "Live availability & instant holds",
          desc: "Dates are checked against live calendars. A timed hold protects your selected dates.",
        },
        {
          title: "Transparent totals",
          desc: "See nightly rate, fees, and taxes clearly so totals stay consistent at checkout.",
        },
        {
          title: "Operator-managed quality",
          desc: "Cleaning, linen, inspections, and restocks are scheduled automatically after confirmation.",
        },
        {
          title: "Clear policy rules",
          desc: "Cancellations and refunds follow clear rules with consistent outcomes.",
        },
      ],
      stats: [
        { label: "Inventory safety", value: "Protected" },
        { label: "Ops automation", value: "Built-in" },
        { label: "Pricing clarity", value: "Clear" },
        { label: "Support", value: "24/7" },
      ],
    },
    assurance: {
      eyebrow: "Booking Assurance",
      title: "Reliable inventory control for every reservation",
      body:
        "Our system checks live availability, places secure reservation holds, and applies policy rules so quotes and confirmations stay accurate.",
      cta: "Explore available stays",
    },
    how: {
      title: "How booking works from search to check-out",
      subtitle:
        "Each step uses live checks and clear policies to keep your reservation accurate and safe.",
      steps: [
        {
          step: "1",
          title: "Search and match",
          desc: "Search by location, dates, guests, and amenities. We show only bookable stays.",
        },
        {
          step: "2",
          title: "Real-time quote",
          desc: "Nightly rates, fees, and taxes are calculated on the server for a clear quote.",
        },
        {
          step: "3",
          title: "Safe reservation hold",
          desc: "A timed hold secures the dates during checkout and prevents double booking.",
        },
        {
          step: "4",
          title: "Details and policy check",
          desc: "Guest details and policy terms are checked before booking is finalized.",
        },
        {
          step: "5",
          title: "Payment and confirmation",
          desc: "Verified payment events confirm your booking and update calendar status.",
        },
        {
          step: "6",
          title: "Pre-arrival prep",
          desc: "Cleaning, linen, inspection, and access-prep tasks are created automatically.",
        },
        {
          step: "7",
          title: "In-stay support",
          desc: "Support and maintenance requests are routed to the right team with clear tracking.",
        },
        {
          step: "8",
          title: "Checkout and quality review",
          desc: "Post-stay checks and guest feedback are used to keep service quality high.",
        },
      ],
    },
    services: {
      title: "Services built for consistent guest readiness",
      subtitle:
        "Each service is linked to booking stages and quality controls to keep execution consistent.",
      items: [
        {
          title: "Cleaning workflow",
          desc: "Turnover tasks are auto-created from booking events.",
          note: "Includes assignment and completion tracking.",
        },
        {
          title: "Quality inspection",
          desc: "Standard checklists verify unit readiness before guest arrival.",
          note: "Issues are escalated instantly.",
        },
        {
          title: "Linen management",
          desc: "Linen cycles are planned around turnover windows.",
          note: "Inventory sync helps prevent shortages.",
        },
        {
          title: "Restock control",
          desc: "Essentials are replenished based on occupancy and stay duration.",
          note: "Low-stock alerts trigger early resupply tasks.",
        },
      ],
    },
    owner: {
      title: "Turn your property into a premium, revenue-ready stay.",
      subtitle:
        "Our owner program combines smart pricing, compliance support, and full operations with clear standards.",
      bullets: [
        "Full-service and hybrid models to match your strategy",
        "Dynamic pricing and channel distribution",
        "Automated turnover tasks: cleaning, inspection, linen, and restock",
        "Policy-based booking and cancellation flow",
        "Owner reporting focused on operations and revenue",
      ],
    },
    faq: {
      title: "Answers before you book",
      subtitle:
        "Simple answers on availability, pricing, booking, and support.",
      items: [
        {
          q: "Is availability real-time?",
          a: "Yes. Search and quote both use the same live inventory logic.",
        },
        {
          q: "Do you show total price breakdowns?",
          a: "Yes. Nightly rates and fees are calculated server-side and shown clearly.",
        },
        {
          q: "How do reservations avoid double-booking?",
          a: "We use timed holds and overlap protection to prevent double booking.",
        },
        {
          q: "What happens after a booking is confirmed?",
          a: "Preparation tasks are created automatically so the stay is ready on time.",
        },
        {
          q: "Can I cancel my booking?",
          a: "Yes. Cancellations follow policy windows and backend refund rules.",
        },
        {
          q: "Do you support owners with full management?",
          a: "Yes. We offer both managed and semi-managed owner programs.",
        },
        {
          q: "Is payment confirmation done on the frontend?",
          a: "No. Confirmation is backend-driven after verified payment events.",
        },
        {
          q: "Can I contact support?",
          a: "Yes. Contact us any time for booking help or owner onboarding.",
        },
      ],
    },
    areasList: [
      { title: "Dubai Marina", q: "Dubai Marina", hint: "Walkable • Waterfront", imageUrl: "/areas/dubai-marina.webp" },
      { title: "Downtown Dubai", q: "Downtown Dubai", hint: "Burj Khalifa • Dubai Mall", imageUrl: "/areas/downtown-dubai.webp" },
      { title: "Palm Jumeirah", q: "Palm Jumeirah", hint: "Beach • Resort vibe", imageUrl: "/areas/palm-jumeirah.webp" },
      { title: "JBR", q: "JBR", hint: "Beachfront • Dining", imageUrl: "/areas/jbr.webp" },
      { title: "Business Bay", q: "Business Bay", hint: "Central • Canal", imageUrl: "/areas/business-bay.webp" },
      { title: "Bluewaters Island", q: "Bluewaters Island", hint: "Ain Dubai • Sea views", imageUrl: "/areas/bluewaters-island.webp" },
      { title: "Dubai Creek Harbour", q: "Dubai Creek Harbour", hint: "Creekfront • Skyline", imageUrl: "/areas/dubai-creek-harbour.webp" },
      { title: "DIFC", q: "DIFC", hint: "Financial core • Fine dining", imageUrl: "/areas/difc.webp" },
      { title: "City Walk", q: "City Walk", hint: "Lifestyle district • Dining", imageUrl: "/areas/city-walk.webp" },
    ],
  },
  ar: {
    featured: {
      title: "اختيارات مميزة بتوافر حي وقابل للحجز",
      subtitle:
        "كل إقامة مميزة متزامنة مباشرة مع محرك البحث والحجوزات لدينا، لذلك تبقى الأسعار والتوافر دقيقة من الاكتشاف حتى إتمام الحجز.",
      errorTitle: "تعذر تحميل الإقامات المميزة حالياً.",
      errorBody: "يمكنك متابعة تصفح جميع الإقامات.",
      browse: "تصفح الإقامات",
    },
    hero: {
      titleTop: "حيث تتحول كل إقامة في دبي",
      titleEmphasis: "إلى تجربة استضافة احترافية.",
      subtitle:
        "تأكيد فوري، تسعير واضح، واستضافة بمعايير فندقية مدعومة بفريق كونسيرج حقيقي على مدار الساعة.",
      primaryCtaLabel: "استكشف الإقامات",
      secondaryCtaLabel: "أدرج عقارك",
    },
    areas: {
      title: "اكتشف أبرز أحياء دبي",
      subtitle:
        "ابدأ من المناطق الأعلى طلباً، ثم ضيق النتائج حسب التواريخ والميزانية والمرافق وعرض الخريطة للوصول للإقامة الأنسب بسرعة.",
    },
    why: {
      titleA: "تشغيل بمعايير فندقية،",
      titleB: "وراحة البيت",
      subtitle:
        "ندير الوحدات كسلسلة ضيافة بوتيكية مع توافر موثّق وإجماليات واضحة ودعم ميداني يحافظ على سلاسة الإقامة.",
      reasons: [
        {
          title: "توافر مباشر وحجوزات مؤقتة فورية",
          desc: "يتم التحقق من التواريخ عبر تقاويم حية. وعند الحجز المؤقت نقفل التوافر زمنياً لمنع التداخل.",
        },
        {
          title: "إجماليات شفافة",
          desc: "تفاصيل واضحة في كل خطوة تشمل السعر الليلي والرسوم والضرائب، حتى يبقى الإجمالي ثابتاً عند الدفع.",
        },
        {
          title: "جودة تشغيلية مُدارة",
          desc: "تنظيف وبياضات وفحوصات وإعادة تزويد بمعايير فندقية تُجدول تلقائياً بعد تأكيد الحجز.",
        },
        {
          title: "تغييرات مدفوعة بالسياسات",
          desc: "الإلغاء والاسترداد يخضعان لقواعد واضحة بنتائج متسقة للضيوف والمُلّاك.",
        },
      ],
      stats: [
        { label: "سلامة المخزون", value: "محمي" },
        { label: "أتمتة العمليات", value: "مضمّنة" },
        { label: "وضوح التسعير", value: "شفاف" },
        { label: "الدعم", value: "متواصل" },
      ],
    },
    assurance: {
      eyebrow: "ضمان الحجز",
      title: "تكامل مخزون بمستوى مؤسسي لكل حجز",
      body:
        "تنسيق الحجز لدينا يتحقق من التوافر المباشر، ويطبق حجوزات مؤقتة ذرّية، ويفرض انتقالات دفع متوافقة مع السياسات، لضمان دقة الأسعار والتأكيدات من البداية حتى الدفع.",
      cta: "استكشف المخزون الموثّق",
    },
    how: {
      title: "تدفق حجز مؤسسي من الاكتشاف حتى ما بعد الإقامة",
      subtitle:
        "كل مرحلة محكومة بفحوصات مخزون مباشرة وتحقق سياسات وأتمتة تشغيلية، لضمان دقة الحجز وجهوزيته التنفيذية على نطاق واسع.",
      steps: [
        {
          step: "1",
          title: "التقاط الطلب ومطابقة المخزون",
          desc: "يبحث الضيوف حسب الموقع والتواريخ والسعة والمرافق بينما يعرض النظام فقط المخزون المتاح فعلياً للحجز.",
        },
        {
          step: "2",
          title: "تسعير فوري ذكي",
          desc: "يتم احتساب الأسعار الليلية والرسوم والضرائب والقيود على الخادم لإنتاج عرض سعر متوافق مع السياسات.",
        },
        {
          step: "3",
          title: "التحكم في الحجز المؤقت",
          desc: "حجز مؤقت محدد زمنياً يحجز المخزون أثناء الدفع ويمنع تعارضات السباق أو التخصيص المزدوج.",
        },
        {
          step: "4",
          title: "التحقق من الهوية والسياسات",
          desc: "يتم التحقق من بيانات الضيف وسياسات الإقامة وشروط الإلغاء قبل اعتماد الحجز.",
        },
        {
          step: "5",
          title: "تفويض الدفع واعتماد الحجز",
          desc: "أحداث الدفع الموثقة تُفعّل تأكيد الحجز الذري وتحديث حالة التقويم بشكل متزامن.",
        },
        {
          step: "6",
          title: "إطلاق عمليات ما قبل الوصول",
          desc: "تُنشأ تلقائياً مهام التنظيف والبياضات والفحص وتجهيز الوصول ضمن طابور العمليات.",
        },
        {
          step: "7",
          title: "متابعة الخدمة أثناء الإقامة",
          desc: "طلبات الدعم والتصعيدات الفنية تُوجّه إلى فرق مسؤولة مع رؤية واضحة للحالة.",
        },
        {
          step: "8",
          title: "تسوية المغادرة وحلقة الجودة",
          desc: "يتم تسجيل فحوصات ما بعد الإقامة والملاحظات وتقييم الضيف لتحسين معايير التنفيذ باستمرار.",
        },
      ],
    },
    services: {
      title: "خدمات تشغيلية تضمن جاهزية ثابتة للضيف",
      subtitle:
        "كل خدمة مرتبطة بحالات الحجز وطوابير الفرق وضوابط الجودة لضمان تنفيذ قابل للتنبؤ على نطاق واسع.",
      items: [
        {
          title: "تنسيق التنظيف",
          desc: "تُنشأ مهام تبديل الوحدات تلقائياً من أحداث الحجز وتُوجّه حسب أولوية الوصول.",
          note: "تشمل توزيع الفرق وتتبع الإنجاز.",
        },
        {
          title: "فحص الجودة",
          desc: "قوائم تحقق موحّدة تضمن جاهزية الوحدة قبل إرسال تفاصيل الوصول للضيف.",
          note: "أي ملاحظة تُصعّد فوراً للفريق المسؤول.",
        },
        {
          title: "لوجستيات البياضات",
          desc: "تُخطط دورات البياضات حول نوافذ التبديل للحفاظ على مستوى عرض ثابت.",
          note: "مزامنة المخزون تمنع النقص المفاجئ.",
        },
        {
          title: "التحكم في إعادة التزويد",
          desc: "تُعاد تعبئة المستلزمات الأساسية بناءً على أنماط الإشغال وتوقع مدة الإقامة.",
          note: "تنبيهات المخزون المنخفض تطلق مهام التوريد مبكراً.",
        },
      ],
    },
    owner: {
      title: "حوّل عقارك إلى أصل إيرادي مُدار باحتراف.",
      subtitle:
        "برنامج المُلّاك يجمع بين استراتيجية التسعير وضوابط الامتثال وتشغيل الضيافة الكامل بمعايير خدمة قابلة للقياس.",
      bullets: [
        "نماذج تشغيل كاملة أو هجينة متوافقة مع استراتيجية الأصل",
        "تسعير ديناميكي وتوزيع قنوات وتحسين الإشغال",
        "سير عمل تبديل مؤتمت: تنظيف، فحص، بياضات، وإعادة تزويد",
        "حجز وإلغاء ومسارات مالية خاضعة للسياسات وقابلة للتدقيق",
        "تقارير للمُلّاك تركز على الأداء التشغيلي والإيرادي",
      ],
    },
    faq: {
      title: "إجابات واضحة قبل الحجز",
      subtitle:
        "وضوح سريع حول المخزون والتسعير والتأكيدات والعمليات دون مفاجآت.",
      items: [
        {
          q: "هل التوافر مباشر؟",
          a: "نعم. البحث وعرض السعر يتحققان من نفس منطق المخزون الذي يدير الحجوزات المؤقتة والحجوزات النهائية.",
        },
        {
          q: "هل تعرضون تفصيل السعر الإجمالي؟",
          a: "نعم، نعتمد الشفافية. الأسعار الليلية والرسوم تُحسب على الخادم وتُعرض بوضوح.",
        },
        {
          q: "كيف تمنعون الحجز المزدوج؟",
          a: "نستخدم حجوزات مؤقتة قصيرة وحماية التداخل حتى لا يستطيع ضيفان حجز نفس التواريخ معاً.",
        },
        {
          q: "ماذا يحدث بعد تأكيد الحجز؟",
          a: "تُنشأ مهام التشغيل (تنظيف، فحص، بياضات، إعادة تزويد) تلقائياً لتجهيز الإقامة حسب المعيار.",
        },
        {
          q: "هل يمكنني إلغاء حجزي؟",
          a: "الإلغاء يعتمد على نوافذ السياسة مع تطبيق الغرامات والاسترداد عبر قواعد الخادم.",
        },
        {
          q: "هل تدعمون المُلّاك بإدارة كاملة؟",
          a: "نعم، نوفر برامج إدارة كاملة وشبه مُدارة مع تدفقات تشغيل حقيقية.",
        },
        {
          q: "هل يتم تأكيد الدفع من الواجهة؟",
          a: "لا. التأكيد يتم من الخادم بناءً على أحداث دفع موثقة (Webhook).",
        },
        {
          q: "هل أستطيع التواصل مع الدعم؟",
          a: "بالتأكيد، يمكنك التواصل عبر صفحة الاتصال لمساعدة الحجز أو انضمام المُلّاك.",
        },
      ],
    },
    areasList: [
      { title: "دبي مارينا", q: "Dubai Marina", hint: "مشي سهل • واجهة بحرية", imageUrl: "/areas/dubai-marina.webp" },
      { title: "وسط مدينة دبي", q: "Downtown Dubai", hint: "برج خليفة • دبي مول", imageUrl: "/areas/downtown-dubai.webp" },
      { title: "نخلة جميرا", q: "Palm Jumeirah", hint: "شاطئ • أجواء منتجعية", imageUrl: "/areas/palm-jumeirah.webp" },
      { title: "جميرا بيتش ريزيدنس", q: "JBR", hint: "واجهة بحرية • مطاعم", imageUrl: "/areas/jbr.webp" },
      { title: "الخليج التجاري", q: "Business Bay", hint: "موقع مركزي • قناة", imageUrl: "/areas/business-bay.webp" },
      { title: "جزيرة بلوواترز", q: "Bluewaters Island", hint: "عين دبي • إطلالات بحرية", imageUrl: "/areas/bluewaters-island.webp" },
      { title: "خور دبي هاربر", q: "Dubai Creek Harbour", hint: "واجهة خور • أفق المدينة", imageUrl: "/areas/dubai-creek-harbour.webp" },
      { title: "مركز دبي المالي العالمي", q: "DIFC", hint: "قلب مالي • مطاعم راقية", imageUrl: "/areas/difc.webp" },
      { title: "سيتي ووك", q: "City Walk", hint: "وجهة حياة • مطاعم", imageUrl: "/areas/city-walk.webp" },
    ],
  },
} as const;

type HomeCopy = (typeof HOME_COPY)[AppLocale];

function FeaturedSpotlightFallback() {
  return (
    <section className="relative w-full py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="premium-card premium-card-tinted rounded-[32px] p-6">
          <div className="h-5 w-56 animate-pulse rounded-lg bg-[rgb(var(--color-bg-rgb)/0.82)]" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-[rgb(var(--color-bg-rgb)/0.78)]" />
          <div className="mt-2 h-4 w-4/5 animate-pulse rounded-lg bg-[rgb(var(--color-bg-rgb)/0.78)]" />
        </div>
      </div>
    </section>
  );
}

async function HomeFeaturedSection(props: {
  copy: HomeCopy["featured"];
  locale: AppLocale;
  currency: string;
}) {
  const featured = await fetchFeaturedStays(
    { pageSize: 10, sort: "recommended" },
    { locale: props.locale, currency: props.currency },
  );

  if (featured.ok) {
    return (
      <FeaturedSpotlight
        title={props.copy.title}
        subtitle={props.copy.subtitle}
        items={featured.items}
      />
    );
  }

  return (
    <section className="relative w-full py-16 sm:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="premium-card premium-card-tinted rounded-[32px] p-6">
          <p className="text-sm font-extrabold text-primary">{props.copy.errorTitle}</p>
          <p className="mt-2 text-sm text-secondary/75">
            {props.copy.errorBody} <span className="text-secondary/60">({featured.message})</span>
          </p>

          <div className="mt-4">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-extrabold text-primary shadow-sm transition hover:bg-accent-soft/55"
            >
              {props.copy.browse}
              <span aria-hidden className="text-secondary/60">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const locale = await getRequestLocale();
  const copy = HOME_COPY[locale];
  const cookieStore = await cookies();
  const currency = parseSupportedCurrency(cookieStore.get("currency")?.value);

  const areas: AreaChip[] = copy.areasList.map((area) => ({
    title: area.title,
    q: area.q,
    hint: area.hint,
    imageUrl: area.imageUrl,
  }));

  return (
    <main className="relative overflow-x-hidden bg-transparent">
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[980px] bg-[radial-gradient(110%_80%_at_10%_0%,rgba(99,102,241,0.16),transparent_58%),radial-gradient(100%_70%_at_92%_14%,rgba(56,189,248,0.10),transparent_58%),linear-gradient(180deg,rgba(244,238,227,0.96)_0%,rgba(244,238,227,0.78)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[430px] h-[580px] bg-[linear-gradient(180deg,rgba(244,238,227,0)_0%,rgba(244,238,227,0.78)_26%,rgba(244,238,227,0.92)_100%)]"
        />

        <div className="relative z-10">
          <HeroSplit
            titleTop={copy.hero.titleTop}
            titleEmphasis={copy.hero.titleEmphasis}
            subtitle={copy.hero.subtitle}
            heroImageUrl="/images/home/hero-main.webp"
            primaryCtaHref="/properties"
            primaryCtaLabel={copy.hero.primaryCtaLabel}
            secondaryCtaHref="/owners"
            secondaryCtaLabel={copy.hero.secondaryCtaLabel}
          />

          <div className="relative bg-transparent">
            <div className="relative z-50 -mt-5 pb-1 md:-mt-7 md:pb-2">
              <UnifiedSearchBar variant="home" />
            </div>

            <TrustOperationsSection />
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <Suspense fallback={<FeaturedSpotlightFallback />}>
          <HomeFeaturedSection copy={copy.featured} locale={locale} currency={currency} />
        </Suspense>
      </div>

      <div className="bg-transparent">
        <AreasSlider
          title={copy.areas.title}
          subtitle={copy.areas.subtitle}
          areas={areas}
        />
      </div>

      <div className="bg-transparent">
        <PartnerDistributionStrip />
      </div>

      <div className="bg-transparent">
        <WhyChooseUs
          title={
            <>
              {copy.why.titleA} <span className="whitespace-nowrap">{copy.why.titleB}</span>
            </>
          }
          subtitle={copy.why.subtitle}
          reasons={[...copy.why.reasons]}
          stats={[...copy.why.stats]}
          images={{
            a: "/images/home/why-a.webp",
            b: "/images/home/why-b.webp",
            c: "/images/home/dubai-skyline.webp",
            d: "/auth-scene/interior-suite.webp",
          }}
        />
      </div>

      <section className="relative my-4 overflow-hidden py-16 sm:my-6 sm:py-20 lg:py-24">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(135deg,#edf0ff_0%,#c7d2fe_48%,#d8e7ff_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-58">
          <SofaLottieDeferred className="scale-[1.04]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_26%,rgba(99,102,241,0.28),transparent_52%),radial-gradient(circle_at_82%_72%,rgba(79,70,229,0.36),transparent_48%)]" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[44%] bg-[linear-gradient(115deg,rgba(79,70,229,0.22)_0%,rgba(99,102,241,0.08)_46%,transparent_100%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(255,255,255,0.24),transparent_48%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/16 via-transparent to-indigo-200/28" />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-[30px] border border-indigo-100/95 bg-white/60 px-6 py-7 shadow-[0_18px_42px_rgba(99,102,241,0.2)] backdrop-blur-[1px] sm:px-8 sm:py-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-700">{copy.assurance.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-indigo-950 sm:text-3xl">
                  {copy.assurance.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-indigo-900/85 sm:text-base">
                  {copy.assurance.body}
                </p>
              </div>
              <Link
                href="/properties"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(79,70,229,0.34)] ring-1 ring-indigo-200/85 transition hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                {copy.assurance.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <HowItWorks
          title={copy.how.title}
          subtitle={copy.how.subtitle}
          steps={copy.how.steps}
        />
      </div>

      <div className="bg-transparent">
        <ServicesPreview
          title={copy.services.title}
          subtitle={copy.services.subtitle}
          services={copy.services.items}
        />
      </div>

      <div className="bg-transparent">
        <OwnerCta
          title={copy.owner.title}
          subtitle={copy.owner.subtitle}
          bullets={copy.owner.bullets}
          imageUrl="/images/owners/hero-src/support_luxury_interior.webp"
        />
      </div>

      <div className="bg-transparent">
        <FaqSection
          title={copy.faq.title}
          subtitle={copy.faq.subtitle}
          faqs={copy.faq.items}
        />
      </div>

      <div className="h-10 sm:h-16" />
    </main>
  );
}
