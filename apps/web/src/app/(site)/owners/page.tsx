import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, ShieldCheck, Workflow } from "lucide-react";
import OwnersHero from "@/components/tourm/owners/OwnersHero";
import OwnerBenefits from "@/components/tourm/owners/OwnerBenefits";
import OwnerPrograms from "@/components/tourm/owners/OwnerPrograms";
import OwnerProcess from "@/components/tourm/owners/OwnerProcess";
import OwnersFaq from "@/components/tourm/owners/OwnersFaq";
import OwnersCta from "@/components/tourm/owners/OwnersCta";

export const metadata: Metadata = {
  title: "For Owners | Laugh & Lodge",
  description:
    "Owner programs for Dubai and UAE short-stay assets with booking-safe operations, service standards, and performance accountability.",
};

export default function OwnersPage() {
  const jumpLinks = [
    { label: "Benefits", href: "#owner-benefits" },
    { label: "Programs", href: "#owner-programs" },
    { label: "Process", href: "#owner-process" },
    { label: "FAQ", href: "#owner-faq" },
  ] as const;

  const controlPoints = [
    {
      title: "Execution model",
      value: "SLA-backed",
      note: "Task ownership and escalation paths are explicit.",
      Icon: Workflow,
    },
    {
      title: "Risk control",
      value: "Policy-safe",
      note: "Reservation and cancellation logic stays rule-driven.",
      Icon: ShieldCheck,
    },
    {
      title: "Readiness cadence",
      value: "Turnover-first",
      note: "Arrival quality is protected with readiness checkpoints.",
      Icon: CalendarClock,
    },
    {
      title: "Portfolio fit",
      value: "1 to multi-unit",
      note: "Program depth can scale by property and ownership style.",
      Icon: Building2,
    },
  ] as const;

  return (
    <main className="indigo-no-gold relative min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-220px] top-[180px] h-[520px] w-[520px] rounded-full bg-indigo-200/42 blur-3xl" />
        <div className="absolute right-[-220px] top-[620px] h-[560px] w-[560px] rounded-full bg-indigo-300/30 blur-3xl" />
      </div>

      <OwnersHero />

      <section className="-mt-7 py-0 sm:-mt-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative z-20 rounded-3xl border border-indigo-100/90 bg-white/82 p-4 shadow-[0_20px_52px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">
                  Jump to
                </p>
                {jumpLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="inline-flex h-11 items-center rounded-full border border-indigo-200/85 bg-indigo-50/85 px-3 text-xs font-semibold text-indigo-700 transition hover:-translate-y-0.5 hover:bg-indigo-100"
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/signup?role=vendor"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-indigo-300/80 bg-indigo-600 px-3 text-xs font-semibold text-white shadow-[0_12px_26px_rgba(79,70,229,0.26)] transition hover:-translate-y-0.5 hover:bg-indigo-700"
                >
                  Vendor sign up <ArrowRight className="h-3.5 w-3.5 text-white/90" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
                >
                  Service scope
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center rounded-full border border-line/80 bg-surface px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt"
                >
                  Book consultation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-6 pt-6 sm:pb-8 sm:pt-7">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {controlPoints.map((point) => (
              <article
                key={point.title}
                className="rounded-2xl border border-indigo-100/90 bg-white/84 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/66">{point.title}</p>
                    <p className="mt-2 text-base font-semibold text-primary">{point.value}</p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-indigo-200/80 bg-indigo-50 text-indigo-600">
                    <point.Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-sm text-secondary/82">{point.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-6 sm:py-8">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-100/90 bg-white/82 px-6 py-6 shadow-[0_18px_44px_rgba(15,23,42,0.08)] sm:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary/70">Owner proposition</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                  Premium ownership experience with operational certainty
                </h2>
                <p className="mt-2 text-sm text-secondary/82 sm:text-base">
                  You get structured execution, clear accountability, and scalable delivery standards
                  designed for real guest and portfolio performance.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup?role=vendor"
                  className="inline-flex items-center gap-2 rounded-xl border border-indigo-300/80 bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Start vendor onboarding
                  <ArrowRight className="h-4 w-4 text-white/90" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-xl border border-line/80 bg-white px-4 py-3 text-sm font-semibold text-primary transition hover:bg-indigo-50"
                >
                  Review commercial model
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-transparent">
        <OwnerBenefits />
      </div>
      <div className="bg-transparent">
        <OwnerPrograms />
      </div>
      <div className="bg-transparent">
        <OwnerProcess />
      </div>
      <div className="bg-transparent">
        <OwnersFaq />
      </div>
      <div className="bg-transparent">
        <OwnersCta />
      </div>
      <div className="h-10 sm:h-16" />
    </main>
  );
}
