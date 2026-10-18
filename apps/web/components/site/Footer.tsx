"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { useLocale } from "next-intl";
import { siteCompliance } from "@/lib/site-compliance";
import Image from "next/image";
import { useRef, useCallback } from "react";
import { gsap, useSceneMotion } from "@/components/inside-story/choreography";
export default function Footer() {
  const ar = useLocale() === "ar";
  const root = useRef<HTMLElement>(null);
  useSceneMotion(
    root,
    useCallback((mm) => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: ".v3-footer-invitation",
            start: "top 90%",
            end: "bottom 45%",
            scrub: 0.65,
          },
        });
        timeline
          .fromTo(
            ".v3-footer-door",
            { clipPath: "inset(48% 0% 48% 0%)", rotation: -7 },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              rotation: 0,
              ease: "power2.inOut",
              duration: 1,
            },
            0,
          )
          .fromTo(
            ".v3-footer-door img",
            { scale: 1.4 },
            { scale: 1, duration: 1.2, ease: "none" },
            0,
          )
          .from(
            ".v3-finale-word",
            {
              yPercent: 110,
              rotation: 4,
              stagger: 0.08,
              duration: 0.8,
              ease: "power3.out",
            },
            0.12,
          );
      });
    }, []),
  );
  return (
    <footer ref={root} className="story-footer" id="site-footer">
      <div className="v3-footer-invitation">
        <Link
          href="/properties"
          className="v3-footer-door"
          aria-label={
            ar ? "استكشف الإقامات" : "Open the door to your next stay"
          }
        >
          <Image
            src="/images/home/interior-suite.webp"
            alt=""
            fill
            sizes="(max-width:759px) 26vw, 13vw"
            className="object-cover"
          />
          <span className="v3-door-shutter" aria-hidden />
          <ArrowUpRight size={22} aria-hidden />
        </Link>
        <p
          className="story-finale"
          aria-label={ar ? "تفضل بالدخول." : "COME ON IN."}
        >
          {(ar ? ["تفضل", "بالدخول."] : ["COME", "ON", "IN."]).map((word) => (
            <span className="v3-finale-mask" key={word}>
              <span className="v3-finale-word" aria-hidden>
                {word}
              </span>
            </span>
          ))}
        </p>
      </div>
      <div className="story-footer-intro">
        <Link href="/properties" className="story-link">
          {ar ? "استكشف الإقامات" : "Find your stay"}
          <ArrowUpRight size={20} />
        </Link>
      </div>
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
        <p className="v3-studio-credit" dir="ltr">
          By <span>Valtum Studio</span>
        </p>
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
