import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ContactHero from "@/components/tourm/contact/ContactHero";
import ContactCards from "@/components/tourm/contact/ContactCards";
import ContactForm from "@/components/tourm/contact/ContactForm";
import ContactMapEmbed from "@/components/tourm/contact/ContactMapEmbed";
import ContactFaq from "@/components/tourm/contact/ContactFaq";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Contact Us | Laugh & Lodge",
  description:
    "Contact Laugh & Lodge Vacation Homes Rental LLC for guest bookings, owner onboarding, and operations support in Dubai and UAE.",
};

const COPY = {
  en: {
    jumpTo: "Jump to",
    jumpLinks: [
      { label: "Contacts", href: "#contact-channels" },
      { label: "Send message", href: "#contact-form" },
      { label: "Coverage", href: "#contact-coverage" },
      { label: "FAQ", href: "#contact-faq" },
    ],
    vendorSignup: "Vendor sign up",
    ownerPrograms: "Owner programs",
  },
  ar: {
    jumpTo: "انتقل إلى",
    jumpLinks: [
      { label: "قنوات التواصل", href: "#contact-channels" },
      { label: "إرسال رسالة", href: "#contact-form" },
      { label: "نطاق التغطية", href: "#contact-coverage" },
      { label: "الأسئلة الشائعة", href: "#contact-faq" },
    ],
    vendorSignup: "تسجيل مورّد",
    ownerPrograms: "برامج الملاك",
  },
} as const;

export default async function ContactPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const arrowClass = locale === "ar" ? "h-3.5 w-3.5 text-white/90 rotate-180" : "h-3.5 w-3.5 text-white/90";

  return (
    <main className="indigo-no-gold min-h-screen bg-transparent">
      <ContactHero locale={locale} />

      <section className="border-y border-indigo-100/80 bg-white/72 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">{copy.jumpTo}</p>
              {copy.jumpLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-11 items-center rounded-full border border-indigo-200/80 bg-indigo-50/75 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/signup?role=vendor"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-indigo-300/80 bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                {copy.vendorSignup} <ArrowRight className={arrowClass} />
              </Link>
              <Link
                href="/owners"
                className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
              >
                {copy.ownerPrograms}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <ContactCards locale={locale} />
      </div>
      <div className="bg-transparent">
        <ContactForm locale={locale} />
      </div>
      <div className="bg-transparent">
        <ContactMapEmbed locale={locale} />
      </div>
      <div className="bg-transparent">
        <ContactFaq locale={locale} />
      </div>
      <div className="h-10 sm:h-16" />
    </main>
  );
}
