import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Building2, CheckCircle2, Mail, Phone, Users } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";

type CardLine = { label: string; value: string; href?: string };

type Card = {
  title: string;
  desc: string;
  lines: ReadonlyArray<CardLine>;
  Icon: LucideIcon;
};

type ContactCardsCopy = {
  sectionEyebrow: string;
  sectionTitle: string;
  sectionBody: string;
  routedNote: string;
  cards: Card[];
};

const COPY: Record<AppLocale, ContactCardsCopy> = {
  en: {
    sectionEyebrow: "Contact channels",
    sectionTitle: "Reach the right team without delay",
    sectionBody:
      "We separate guest, owner, and operations communication so requests are handled faster and with better context.",
    routedNote: "Routed to the appropriate operations team",
    cards: [
      {
        title: "Guest booking support",
        desc: "For reservations, quote clarifications, and stay-related assistance.",
        lines: [
          {
            label: "Email",
            value: "Booking@rentpropertyuae.com",
            href: "mailto:Booking@rentpropertyuae.com",
          },
          {
            label: "Phone",
            value: "+971 50 234 8756",
            href: "tel:+971502348756",
          },
        ],
        Icon: Users,
      },
      {
        title: "Owner onboarding",
        desc: "For listing setup, program evaluation, and owner commercial queries.",
        lines: [
          {
            label: "Email",
            value: "Info@rentpropertyuae.com",
            href: "mailto:Info@rentpropertyuae.com",
          },
          {
            label: "Vendor sign-up",
            value: "Create vendor account",
            href: "/signup?role=vendor",
          },
        ],
        Icon: Building2,
      },
      {
        title: "Company details",
        desc: "For trust, compliance checks, and formal communication references.",
        lines: [
          {
            label: "Legal name",
            value: "Laugh & Lodge Vacation Homes Rental LLC",
          },
          {
            label: "General email",
            value: "Info@rentpropertyuae.com",
            href: "mailto:Info@rentpropertyuae.com",
          },
        ],
        Icon: Mail,
      },
      {
        title: "Urgent phone channel",
        desc: "For time-sensitive booking matters during active guest journeys.",
        lines: [
          {
            label: "Direct call",
            value: "+971 50 234 8756",
            href: "tel:+971502348756",
          },
          {
            label: "WhatsApp-ready",
            value: "Use same number for quick response",
          },
        ],
        Icon: Phone,
      },
    ],
  },
  ar: {
    sectionEyebrow: "قنوات التواصل",
    sectionTitle: "تواصل مع الفريق الصحيح دون تأخير",
    sectionBody: "نفصل تواصل الضيوف والملاك والعمليات لضمان معالجة أسرع وبدقة أعلى في السياق.",
    routedNote: "يتم التوجيه إلى فريق التشغيل المختص",
    cards: [
      {
        title: "دعم حجوزات الضيوف",
        desc: "للاستفسار عن الحجوزات وتوضيح عروض الأسعار والدعم المرتبط بالإقامة.",
        lines: [
          {
            label: "البريد الإلكتروني",
            value: "Booking@rentpropertyuae.com",
            href: "mailto:Booking@rentpropertyuae.com",
          },
          {
            label: "الهاتف",
            value: "+971 50 234 8756",
            href: "tel:+971502348756",
          },
        ],
        Icon: Users,
      },
      {
        title: "تسجيل الملاك",
        desc: "لإعداد الإدراج وتقييم البرنامج والاستفسارات التجارية للمالك.",
        lines: [
          {
            label: "البريد الإلكتروني",
            value: "Info@rentpropertyuae.com",
            href: "mailto:Info@rentpropertyuae.com",
          },
          {
            label: "تسجيل مورّد",
            value: "إنشاء حساب مورّد",
            href: "/signup?role=vendor",
          },
        ],
        Icon: Building2,
      },
      {
        title: "بيانات الشركة",
        desc: "لأغراض الثقة والتحقق والمرجعية الرسمية في المراسلات.",
        lines: [
          {
            label: "الاسم القانوني",
            value: "Laugh & Lodge Vacation Homes Rental LLC",
          },
          {
            label: "البريد العام",
            value: "Info@rentpropertyuae.com",
            href: "mailto:Info@rentpropertyuae.com",
          },
        ],
        Icon: Mail,
      },
      {
        title: "قناة هاتف عاجلة",
        desc: "للحالات الحساسة زمنياً خلال الرحلة الفعلية للضيف.",
        lines: [
          {
            label: "اتصال مباشر",
            value: "+971 50 234 8756",
            href: "tel:+971502348756",
          },
          {
            label: "متاح عبر واتساب",
            value: "استخدم الرقم نفسه للاستجابة السريعة",
          },
        ],
        Icon: Phone,
      },
    ],
  },
};

function CardItem(props: { card: Card; routedNote: string }) {
  return (
    <article className="rounded-2xl border border-indigo-100/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-primary">{props.card.title}</p>
          <p className="mt-2 text-sm text-secondary/82">{props.card.desc}</p>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-[0.95rem] border border-indigo-200/80 bg-indigo-50/85 text-indigo-600">
          <props.card.Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {props.card.lines.map((line) => (
          <div key={line.label} className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/60">{line.label}</p>
            {line.href ? (
              <Link href={line.href} className="text-sm font-semibold text-primary transition hover:text-indigo-700">
                {line.value}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-primary">{line.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-indigo-200/75 bg-indigo-50/72 px-3 py-2 text-xs font-semibold text-indigo-900">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {props.routedNote}
        </span>
      </div>
    </article>
  );
}

export default function ContactCards(props: { locale: AppLocale }) {
  const copy = COPY[props.locale];

  return (
    <section id="contact-channels" className="relative w-full scroll-mt-24 py-14 sm:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">{copy.sectionEyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">{copy.sectionTitle}</h2>
          <p className="mt-2 text-sm text-secondary/82 sm:text-base">{copy.sectionBody}</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {copy.cards.map((card) => (
            <CardItem key={card.title} card={card} routedNote={copy.routedNote} />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-1/3 h-72 w-72 -translate-y-1/2 rounded-full bg-indigo-200/70 blur-3xl" />
      </div>
    </section>
  );
}
