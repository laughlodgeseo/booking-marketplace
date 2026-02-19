import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, ShieldCheck } from "lucide-react";
import ServicesHero from "@/components/tourm/services/ServicesHero";
import ServiceGrid from "@/components/tourm/services/ServiceGrid";
import ServicePlans from "@/components/tourm/services/ServicePlans";
import ServicesFaq from "@/components/tourm/services/ServicesFaq";
import ServicesCta from "@/components/tourm/services/ServicesCta";

export const metadata: Metadata = {
  title: "Services | Laugh & Lodge",
  description:
    "Operator-grade hospitality services with booking-linked workflows, quality controls, and owner program support.",
};

export default function ServicesPage() {
  const jumpLinks = [
    { label: "Capabilities", href: "#capabilities" },
    { label: "Programs", href: "#programs" },
    { label: "FAQ", href: "#faq" },
    { label: "Next step", href: "#next-step" },
  ] as const;

  return (
    <main className="indigo-no-gold min-h-screen bg-transparent">
      <ServicesHero />

      <section className="border-y border-indigo-100/80 bg-white/72 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-2 text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">
                Jump to
              </p>
              {jumpLinks.map((item) => (
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
                href="/owners"
                className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
              >
                Owner programs
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
              >
                Pricing
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-full border border-indigo-300/80 bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700"
              >
                Book a consult
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <ServiceGrid />
      </div>
      <div className="bg-transparent">
        <ServicePlans />
      </div>

      <section className="py-8 sm:py-10">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-100/90 bg-white/78 p-6 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">Dubai operating context</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              Service design aligned to real short-stay market demands
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-secondary/82 sm:text-base">
              We structure workflows for high turnover frequency, guest expectation consistency, and
              property-level accountability. The goal is not activity volume, but reliable outcomes.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Operational clarity",
                  desc: "Responsibility and escalation paths are explicit for each service layer.",
                  Icon: Building2,
                },
                {
                  title: "Quality controls",
                  desc: "Readiness checks and inspection gates reduce arrival-day defects.",
                  Icon: ShieldCheck,
                },
                {
                  title: "Audit confidence",
                  desc: "Task progress and exceptions are tracked for owner visibility and review.",
                  Icon: BadgeCheck,
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-indigo-100/80 bg-indigo-50/45 p-4">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-200/80 bg-white text-indigo-600">
                    <item.Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-primary">{item.title}</p>
                  <p className="mt-1 text-sm text-secondary/82">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <ServicesFaq />
      </div>
      <div className="bg-transparent">
        <ServicesCta />
      </div>
      <div className="h-10 sm:h-16" />
    </main>
  );
}
