"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { useLocale } from "next-intl";
import { siteCompliance } from "@/lib/site-compliance";
import Image from "next/image";
import { useRef, useCallback } from "react";
import { gsap, useSceneMotion } from "@/components/inside-story/choreography";
import { Reveal } from "@/components/inside-story/Motion";
export default function Footer() {
  const ar = useLocale() === "ar";
  const root = useRef<HTMLElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".v2-finale-image",
          { clipPath: "inset(0% 0% 0% 0%)" },
          {
            clipPath: "inset(20% 36% 20% 36%)",
            yPercent: 15,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: root.current,
              start: "top bottom",
              end: "top 10%",
              scrub: 0.7,
            },
          },
        );
        gsap.fromTo(
          ".story-finale",
          { yPercent: 35, scale: 0.85 },
          {
            yPercent: 0,
            scale: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".story-finale",
              start: "top 95%",
              end: "top 45%",
              scrub: 0.6,
            },
          },
        );
      });
    }, []),
  );
  return (
    <footer ref={root} className="story-footer" id="site-footer">
      <div className="v2-finale-image">
        <Image
          src="/images/home/interior-suite.webp"
          alt={
            ar ? "العودة إلى الداخل" : "Back to the room where the story began"
          }
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="story-footer-intro">
        <Link href="/properties" className="story-link">
          {ar ? "استكشف الإقامات" : "Find your stay"}
          <ArrowUpRight size={20} />
        </Link>
      </div>
      <Reveal>
        <p className="story-finale">{ar ? "تفضل بالدخول." : "COME ON IN."}</p>
      </Reveal>
      <div className="story-footer-detail">
        <Link href="/" className="story-wordmark">
          laugh<span>&</span>lodge.
        </Link>
        <div>
          <a href="mailto:Booking@rentpropertyuae.com">
            Booking@rentpropertyuae.com
          </a>
          <a href="tel:+971502348756">+971 50 234 8756</a>
        </div>
        <nav aria-label={ar ? "روابط التذييل" : "Footer navigation"}>
          <Link href="/about">{ar ? "قصتنا" : "Our story"}</Link>
          <Link href="/contact">{ar ? "تواصل معنا" : "Contact"}</Link>
          <Link href="/owners">{ar ? "للملاك" : "For owners"}</Link>
          <Link href="/blog">{ar ? "المجلة" : "Journal"}</Link>
        </nav>
        <a
          href="#top"
          className="story-top"
          aria-label={ar ? "العودة للأعلى" : "Back to top"}
        >
          <ArrowUp size={22} />
        </a>
      </div>
      <div className="story-footer-legal">
        <p>
          © {new Date().getFullYear()} Laugh & Lodge Vacation Homes Rental LLC
        </p>
        <nav aria-label="Legal">
          <Link href="/privacy">{ar ? "الخصوصية" : "Privacy"}</Link>
          <Link href="/terms">{ar ? "الشروط" : "Terms"}</Link>
          <Link href="/cancellation">{ar ? "الإلغاء" : "Cancellation"}</Link>
          <Link href="/refunds">{ar ? "الاسترداد" : "Refunds"}</Link>
        </nav>
      </div>
      <p className="story-compliance">
        DTCM Holiday Homes Permit: {siteCompliance.dtcmPermit} · Business
        Registration No: {siteCompliance.businessRegistrationNumber}
        <br />
        {siteCompliance.registeredOffice}
      </p>
    </footer>
  );
}
