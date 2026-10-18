import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/server";
import { siteCompliance } from "@/lib/site-compliance";
import ContactForm from "@/components/tourm/contact/ContactForm";
import ContactFaq from "@/components/tourm/contact/ContactFaq";
import { PageHeading } from "@/components/inside-story/Editorial";
import { SceneImage } from "@/components/inside-story/Motion";
export const metadata: Metadata = {
  title: "Let’s talk",
  description:
    "Talk to Laugh & Lodge about your Dubai stay or property. Contact our booking and owner support team.",
};
export default async function ContactPage() {
  const locale = await getRequestLocale();
  const ar = locale === "ar";
  return (
    <>
      <PageHeading
        context={ar ? "تواصل معنا" : "A conversation starts here"}
        title={ar ? "أخبرنا بما تفكر فيه." : "What brings you to Dubai?"}
        intro={
          ar
            ? "إقامة قادمة أو فصل جديد لعقارك. يسعدنا أن نسمع منك."
            : "A few days away, a longer stay, or a new chapter for your property. We’d love to hear what you have in mind."
        }
      />
      <section className="story-contact-lead">
        <SceneImage
          src="/images/home/interior-suite.webp"
          alt={
            ar
              ? "مساحة للجلوس والحديث"
              : "A place to sit and start a conversation"
          }
          sizes="(max-width:700px) 90vw, 45vw"
        />
        <div className="story-contact-address">
          <h2>{ar ? "نحن هنا." : "Let’s make a connection."}</h2>
          <a className="story-link" href="mailto:Booking@rentpropertyuae.com">
            Booking@rentpropertyuae.com
          </a>
          <a href="tel:+971502348756">+971 50 234 8756</a>
          <p>{siteCompliance.registeredOffice}</p>
          <p>
            {ar ? "للاستفسارات العامة:" : "For general enquiries:"}
            <br />
            <a href="mailto:Info@rentpropertyuae.com">
              Info@rentpropertyuae.com
            </a>
          </p>
        </div>
      </section>
      <ContactForm locale={locale} />
      <ContactFaq locale={locale} />
    </>
  );
}
