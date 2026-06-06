"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  FileText,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getUserOverview } from "@/lib/api/portal/user";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatCard } from "@/components/portal/StatCard";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getUserOverview>> };

function QuickAction(props: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: number;
}) {
  return (
    <Link href={props.href} className="portal-quick-action group">
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand/16">
          {props.icon}
        </div>
        {props.badge !== undefined && props.badge > 0 ? (
          <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
            {props.badge > 99 ? "99+" : props.badge}
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-primary">{props.label}</div>
        <div className="mt-0.5 text-[11px] leading-tight text-muted">{props.description}</div>
      </div>
    </Link>
  );
}

export default function AccountOverviewPage() {
  const tPortal = useTranslations("portal");
  const { status, user } = useAuth();
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;

    async function run() {
      if (status === "loading") return;

      setState({ kind: "loading" });
      try {
        const data = await getUserOverview();
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (err) {
        if (!alive) return;
        const message = err instanceof Error ? err.message : tPortal("accountOverview.errors.load");
        setState({ kind: "error", message });
      }
    }

    void run();
    return () => {
      alive = false;
    };
  }, [status, tPortal]);

  const content = useMemo(() => {
    if (state.kind === "loading") {
      return <DashboardSkeleton />;
    }

    if (state.kind === "error") {
      return (
        <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5">
          <div className="text-sm font-semibold text-primary">{tPortal("accountOverview.errors.title")}</div>
          <div className="mt-1 text-sm text-secondary">{state.message}</div>
          <button
            type="button"
            onClick={() => setState({ kind: "loading" })}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      );
    }

    const { kpis } = state.data;
    const compliance = state.data.documentCompliance;
    const firstName = user?.firstName?.trim() || user?.fullName?.split(" ")[0]?.trim() || null;

    return (
      <div className="space-y-5">
        {/* Welcome hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 p-5 sm:p-6">
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -top-6 left-1/3 h-24 w-24 rounded-full bg-white/8 blur-2xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/90">
              <Sparkles className="h-3 w-3" />
              {tPortal("accountOverview.welcome")}
            </div>

            <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
              {firstName ? `${tPortal("welcomeBack", { name: firstName })}` : tPortal("defaultWelcome")}
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-white/76">
              {tPortal("accountOverview.subtitle")}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/account/bookings"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/16 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/22 transition"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {tPortal("accountOverview.kpi.bookingsUpcoming")}
              </Link>
              <Link
                href="/account/documents"
                className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-transparent px-4 py-2 text-sm font-semibold text-white/84 hover:bg-white/10 transition"
              >
                Documents
              </Link>
            </div>
          </div>
        </div>

        {/* Document compliance alert */}
        {compliance?.requiresUpload ? (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning/16 text-warning">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-primary">
                {tPortal("accountOverview.documentsRequired")}
              </div>
              <div className="mt-0.5 text-xs text-secondary">
                {tPortal("accountOverview.missing")}: {compliance.missingTypes.join(", ")}
                {compliance.urgent ? ` — ${tPortal("accountOverview.urgent48h")}` : ""}
              </div>
            </div>
            <Link
              href="/account/documents"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover transition"
            >
              {tPortal("accountOverview.uploadNow")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : null}

        {/* KPI stat cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label={tPortal("accountOverview.kpi.bookingsUpcoming")}
            value={kpis.bookingsUpcoming}
            icon={<CalendarDays className="h-4 w-4" />}
            variant="dark"
          />
          <StatCard
            label={tPortal("accountOverview.kpi.bookingsTotal")}
            value={kpis.bookingsTotal}
            icon={<BookOpen className="h-4 w-4" />}
            variant="tinted"
          />
          <StatCard
            label={tPortal("accountOverview.kpi.refundsTotal")}
            value={kpis.refundsTotal}
            icon={<RefreshCw className="h-4 w-4" />}
            variant="tinted"
          />
        </div>

        {/* Quick actions */}
        <div>
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Quick access
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/account/bookings"
              icon={<CalendarDays className="h-4 w-4" />}
              label="My Bookings"
              description="View upcoming & past stays"
              badge={kpis.bookingsUpcoming}
            />
            <QuickAction
              href="/account/messages"
              icon={<MessageCircle className="h-4 w-4" />}
              label="Messages"
              description="Chat with support or hosts"
            />
            <QuickAction
              href="/account/documents"
              icon={<FileText className="h-4 w-4" />}
              label="Documents"
              description="Upload required ID & permits"
            />
            <QuickAction
              href="/account/notifications"
              icon={<Bell className="h-4 w-4" />}
              label="Notifications"
              description="Stay up to date on activity"
            />
          </div>
        </div>

        {/* Become a host — only for pure CUSTOMER users */}
        {user?.role !== "VENDOR" ? (
          <div className="overflow-hidden rounded-2xl border border-line/50 bg-gradient-to-br from-brand/6 to-surface p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-primary">
                  {tPortal("accountOverview.becomeHostTitle")}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-secondary">
                  {tPortal("accountOverview.becomeHostDescription")}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="/vendor/onboarding"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover transition"
                  >
                    {tPortal("accountOverview.listProperty")} <ArrowRight className="h-3 w-3" />
                  </Link>
                  <Link
                    href="/owners"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line/60 bg-surface px-4 py-2 text-xs font-semibold text-primary hover:bg-warm-alt transition"
                  >
                    {tPortal("accountOverview.learnHosting")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }, [state, tPortal, user?.firstName, user?.fullName, user?.role]);

  return (
    <PortalShell
      role="customer"
      title={tPortal("accountOverview.title")}
      subtitle={tPortal("accountOverview.subtitle")}
    >
      {content}
    </PortalShell>
  );
}
