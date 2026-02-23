"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Linkedin,
} from "lucide-react";

type FooterLink = { href: string; label: string };

const COL_STAYS: FooterLink[] = [
  { href: "/properties?city=Dubai", label: "Dubai stays" },
  { href: "/properties?q=Downtown", label: "Downtown" },
  { href: "/properties?q=Marina", label: "Dubai Marina" },
  { href: "/properties?q=JBR", label: "JBR" },
];

const COL_COMPANY: FooterLink[] = [
  { href: "/services", label: "Services" },
  { href: "/owners", label: "For Owners" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
];

const COL_LEGAL: FooterLink[] = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/cancellation", label: "Cancellation Policy" },
  { href: "/refunds", label: "Refund Policy" },
];

function FooterCol(props: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-2 lg:justify-start">
        <span className="h-px w-5 bg-white/55" />
        <div className="text-sm font-semibold text-white">{props.title}</div>
      </div>
      <ul className="mt-4 space-y-2">
        {props.links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex items-center gap-1 text-sm text-white/82 transition hover:text-white"
            >
              {l.label}
              <ArrowUpRight className="h-4 w-4 text-white/76" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="site-footer" className="relative overflow-hidden bg-[#4F46E5] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-28 h-[500px] w-[500px] rounded-full bg-white/16 blur-3xl" />
        <div className="absolute -right-36 top-24 h-[520px] w-[520px] rounded-full bg-white/12 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.08)_0%,rgba(248,250,252,0.02)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="border-b border-white/20 pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <Link href="/" className="inline-flex flex-col items-center">
              <div className="relative h-24 w-[380px] max-w-[94vw] overflow-hidden rounded-2xl border border-white/55 bg-white p-2 shadow-[0_16px_38px_rgba(11,15,25,0.22)]">
                <Image
                  src="/brand/logo.svg"
                  alt="Laugh & Lodge"
                  fill
                  className="object-contain p-1"
                  priority={false}
                />
              </div>
            </Link>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/88">
              Operator-grade short-term rentals in Dubai. Verified availability,
              transparent pricing, and professionally managed stays — aligned with
              our backend booking engine (no stale inventory).
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-sm text-white/86">
              <div className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-white/90" />
                <a href="mailto:Info@rentpropertyuae.com" className="transition hover:text-white">
                  Info@rentpropertyuae.com
                </a>
              </div>
              <span className="hidden h-1 w-1 rounded-full bg-white/68 sm:inline-block" />
              <div className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-white/90" />
                <a href="mailto:Booking@rentpropertyuae.com" className="transition hover:text-white">
                  Booking@rentpropertyuae.com
                </a>
              </div>
              <span className="hidden h-1 w-1 rounded-full bg-white/68 sm:inline-block" />
              <div className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-white/90" />
                <a href="tel:+971502348756" className="transition hover:text-white">
                  +971 50 234 8756
                </a>
              </div>
              <span className="hidden h-1 w-1 rounded-full bg-white/68 sm:inline-block" />
              <div className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/90" />
                <span>United Arab Emirates</span>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-center gap-2">
              {[
                { Icon: Instagram, href: "#", label: "Instagram" },
                {
                  Icon: Facebook,
                  href: "https://www.facebook.com/share/1AUcwAKBcX/",
                  label: "Facebook",
                },
                { Icon: Linkedin, href: "#", label: "LinkedIn" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/30 bg-white/12 text-white transition hover:bg-white/24"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-10 text-center sm:grid-cols-2 lg:grid-cols-3 lg:text-left">
          <FooterCol title="Stays" links={COL_STAYS} />
          <FooterCol title="Company" links={COL_COMPANY} />
          <FooterCol title="Legal" links={COL_LEGAL} />
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-white/84">
            © {year} Laugh &amp; Lodge Vocation Homes Rental LLC. All rights reserved.
          </div>

          <motion.a
            href="#top"
            className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/12 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Back to top
            <ArrowUpRight className="ml-2 h-4 w-4 opacity-80" />
          </motion.a>
        </div>
      </div>
    </footer>
  );
}
