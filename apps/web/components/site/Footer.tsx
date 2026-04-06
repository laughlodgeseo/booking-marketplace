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

const SOCIALS = [
  { Icon: Instagram, href: "https://instagram.com",                       label: "Instagram" },
  { Icon: Facebook,  href: "https://www.facebook.com/share/1AUcwAKBcX/", label: "Facebook"  },
  { Icon: Linkedin,  href: "https://linkedin.com",                        label: "LinkedIn"  },
];

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="text-center lg:text-left">
      <div className="flex items-center justify-center gap-2 lg:justify-start">
        <span className="h-px w-6 bg-violet-300/50" />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
          {title}
        </p>
      </div>
      <ul className="mt-4 space-y-[11px]">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex items-center gap-1 text-[13.5px] text-violet-100 transition-colors hover:text-white"
            >
              {l.label}
              <ArrowUpRight className="h-3.5 w-3.5 text-violet-300" />
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
    <footer
      id="site-footer"
      className="relative overflow-hidden bg-[#4F46E5] text-white [border-top:1px_solid_rgba(255,255,255,0.18)]"
    >
      {/* Layered ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-52 -top-40 h-[600px] w-[600px] rounded-full bg-white/9 blur-3xl" />
        <div className="absolute -right-52 bottom-0 h-[550px] w-[550px] rounded-full bg-white/[0.07] blur-3xl" />
        <div className="absolute left-1/2 -top-8 h-60 w-225 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-8 pt-12 sm:px-6 lg:px-8">

        {/* ── Brand (centered) ──────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center">

          {/* Logo */}
          <Link href="/" className="group">
            <div
              className="relative h-[92px] w-[360px] max-w-[84vw] overflow-hidden rounded-2xl border border-white/30 bg-white p-2
                          shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_16px_48px_rgba(11,15,25,0.36),inset_0_1px_0_rgba(255,255,255,0.9)]
                          transition duration-300
                          group-hover:border-white/48
                          group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_22px_56px_rgba(11,15,25,0.44),inset_0_1px_0_rgba(255,255,255,0.9)]"
            >
              <Image
                src="/brand/logo.svg"
                alt="Laugh & Lodge"
                fill
                className="object-contain p-1.5"
                priority={false}
              />
            </div>
          </Link>

          {/* Tagline */}
          <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-violet-100">
            Operator-grade short-term rentals in Dubai —
            verified availability, transparent pricing, professionally managed.
          </p>

          {/* Contact — Gmail compose links open directly in Gmail */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-[13px] text-violet-100">
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=Info@rentpropertyuae.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-violet-200" />
              Info@rentpropertyuae.com
            </a>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=Booking@rentpropertyuae.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-violet-200" />
              Booking@rentpropertyuae.com
            </a>
            <a
              href="tel:+971502348756"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-violet-200" />
              +971 50 234 8756
            </a>
            <span className="inline-flex items-center gap-1.5 text-violet-200">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-300" />
              United Arab Emirates
            </span>
          </div>

          {/* Social — pill buttons with icon + label */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {SOCIALS.map(({ Icon, href, label }) => (
              <motion.a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/22
                           bg-linear-to-b from-white/13 to-white/[0.07]
                           px-4 py-2.5 text-[12.5px] font-medium text-violet-50
                           shadow-[0_1px_0_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.12)]
                           transition-all hover:border-white/40 hover:from-white/20 hover:to-white/12 hover:text-white"
              >
                <Icon className="h-[15px] w-[15px] shrink-0 text-violet-200" />
                {label}
              </motion.a>
            ))}
          </div>
        </div>

        {/* ── Gradient "Explore" divider ────────────────────────────── */}
        <div className="relative my-9 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-violet-300/40" />
          <span className="text-[9px] font-bold uppercase tracking-[0.26em] text-violet-300">
            Explore
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-violet-300/40" />
        </div>

        {/* ── Nav columns ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3 lg:gap-10">
          <FooterCol title="Stays"   links={COL_STAYS} />
          <FooterCol title="Company" links={COL_COMPANY} />
          <div className="col-span-2 border-t border-violet-400/30 pt-7 lg:col-span-1 lg:border-0 lg:pt-0">
            <FooterCol title="Legal" links={COL_LEGAL} />
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────────────── */}
        <div className="mt-9 border-t border-violet-400/25 pt-5">
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-between">

            {/* Copyright */}
            <p className="order-3 text-center text-[11.5px] text-violet-300 lg:order-1 lg:text-left">
              © {year} Laugh &amp; Lodge Vocation Homes Rental LLC. All rights reserved.
            </p>

            {/* Compliance + payment logos */}
            <div className="order-1 flex items-center gap-2.5 lg:order-2">
              <span className="mr-0.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-violet-300">
                Verified by
              </span>

              <div className="rounded-lg bg-white px-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
                <Image
                  src="/pci-dss.png"
                  alt="PCI DSS Certified"
                  width={100}
                  height={38}
                  unoptimized
                  className="h-9 w-auto object-contain"
                />
              </div>

              <span className="h-6 w-px bg-violet-300/40" />

              <div className="rounded-lg bg-white px-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
                <Image
                  src="/Visa_Inc.-Logo.wine.svg"
                  alt="Visa"
                  width={72}
                  height={32}
                  unoptimized
                  className="h-7.5 w-auto object-contain"
                />
              </div>

              <div className="rounded-lg bg-white px-3.5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
                <Image
                  src="/Mastercard-logo.svg"
                  alt="Mastercard"
                  width={62}
                  height={38}
                  unoptimized
                  className="h-9 w-auto object-contain"
                />
              </div>
            </div>

            {/* Back to top */}
            <motion.a
              href="#top"
              className="order-2 inline-flex items-center gap-1.5 rounded-xl border border-white/18 bg-white/[0.08]
                         px-4 py-2 text-[12px] font-semibold text-violet-100
                         transition-colors hover:border-white/30 hover:bg-white/16 hover:text-white lg:order-3"
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Back to top
              <ArrowUpRight className="h-3.5 w-3.5 text-violet-300" />
            </motion.a>

          </div>
        </div>

      </div>
    </footer>
  );
}
