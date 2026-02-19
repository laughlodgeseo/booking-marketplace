import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About | Laugh & Lodge",
  description:
    "Learn how Laugh & Lodge Vacation Homes Rental LLC delivers operator-grade short-stay experiences for guests and owners in Dubai and UAE.",
};

type Pillar = {
  title: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const pillars: ReadonlyArray<Pillar> = [
  {
    title: "Operational excellence",
    desc: "Service delivery is driven by clear workflows, readiness checks, and escalation logic.",
    Icon: BadgeCheck,
  },
  {
    title: "Owner transparency",
    desc: "Programs are built around clear responsibilities, commercial clarity, and reporting discipline.",
    Icon: Building2,
  },
  {
    title: "Guest consistency",
    desc: "We focus on reliable stay quality across booking, check-in, support, and checkout.",
    Icon: Users,
  },
  {
    title: "Compliance mindset",
    desc: "Operating practices are aligned with local short-stay expectations and responsible hosting standards.",
    Icon: ShieldCheck,
  },
  {
    title: "Market intelligence",
    desc: "Pricing and positioning are shaped by seasonality, demand signals, and location context.",
    Icon: Sparkles,
  },
  {
    title: "Dubai-rooted execution",
    desc: "Built for the pace and expectations of the Dubai short-stay market with UAE expansion readiness.",
    Icon: MapPin,
  },
];

export default function AboutPage() {
  return (
    <main className="indigo-no-gold min-h-screen bg-transparent">
      <section className="relative overflow-hidden py-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(248,250,252,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/24 bg-gradient-to-br from-[#4F46E5] to-[#4338CA] px-4 pb-12 pt-12 text-white shadow-[0_26px_70px_rgba(11,15,25,0.30)] sm:px-6 sm:pt-14">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/72">About</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Operator-grade hospitality for guests and property owners
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-white/84 sm:text-base">
              Laugh &amp; Lodge Vacation Homes Rental LLC is built on a simple principle: short-stay success
              requires both strong demand and disciplined operations. We combine platform controls with execution
              standards to deliver dependable outcomes.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/properties"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-indigo-900 shadow-[0_12px_28px_rgba(11,15,25,0.24)] transition hover:bg-indigo-50"
              >
                Explore stays <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/owners"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/60 bg-transparent px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Owner programs <ArrowRight className="ml-2 h-4 w-4 text-white/74" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-transparent py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">How we operate</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              Built to perform in a fast-moving short-stay market
            </h2>
            <p className="mt-2 text-sm text-secondary/82 sm:text-base">
              We focus on repeatable execution standards, transparent owner communication, and policy-safe booking operations.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-2xl border border-indigo-100/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_24px_48px_rgba(15,23,42,0.12)]"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-indigo-200/80 bg-indigo-50 text-indigo-600">
                  <pillar.Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-base font-semibold text-primary">{pillar.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-secondary/82">{pillar.desc}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-indigo-100/90 bg-white/88 p-6 shadow-[0_16px_36px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-sm font-semibold text-primary">Company details</p>
            <div className="mt-4 grid gap-4 text-sm text-secondary/82 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/60">Registered name</p>
                <p className="mt-1 font-semibold text-primary">Laugh &amp; Lodge Vacation Homes Rental LLC</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/60">Jurisdiction</p>
                <p className="mt-1 font-semibold text-primary">United Arab Emirates</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/60">General email</p>
                <p className="mt-1 font-semibold text-primary">Info@rentpropertyuae.com</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/60">Booking support</p>
                <p className="mt-1 font-semibold text-primary">Booking@rentpropertyuae.com</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link href="/privacy" className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500">
                Privacy policy
              </Link>
              <Link href="/terms" className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500">
                Terms and conditions
              </Link>
              <Link href="/contact" className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:decoration-indigo-500">
                Contact team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
