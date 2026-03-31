"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { getUserOverview } from "@/lib/api/portal/user";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatCard } from "@/components/portal/StatCard";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getUserOverview>> };

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
        <div className="premium-card premium-card-tinted rounded-2xl p-6">
          <div className="text-sm font-semibold text-primary">{tPortal("accountOverview.errors.title")}</div>
          <div className="mt-2 text-sm text-secondary">{state.message}</div>
        </div>
      );
    }

    const { kpis } = state.data;
    const compliance = state.data.documentCompliance;

    return (
      <div className="space-y-6">
        <div className="premium-card premium-card-dark rounded-2xl p-6">
          <div className="text-sm text-muted">{tPortal("accountOverview.welcome")}</div>
          <div className="mt-1 text-xl font-semibold text-primary">
            {user?.email ?? tPortal("accountOverview.accountLabel")}
          </div>
          <div className="mt-2 text-sm text-secondary">
            {tPortal("accountOverview.emailVerification")}:{" "}
            <span className="font-medium">
              {user?.isEmailVerified
                ? tPortal("accountOverview.verified")
                : tPortal("accountOverview.notVerified")}
            </span>
          </div>
        </div>

        {compliance?.requiresUpload ? (
          <div className="rounded-2xl border border-warning/35 bg-warning/12 p-4">
            <div className="text-sm font-semibold text-primary">
              {tPortal("accountOverview.documentsRequired")}
            </div>
            <div className="mt-1 text-sm text-secondary">
              {tPortal("accountOverview.missing")}: {compliance.missingTypes.join(", ")}
              {compliance.urgent ? ` (${tPortal("accountOverview.urgent48h")})` : ""}
            </div>
            <Link
              href="/account/documents"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
            >
              {tPortal("accountOverview.uploadNow")}
            </Link>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label={tPortal("accountOverview.kpi.bookingsUpcoming")} value={kpis.bookingsUpcoming} variant="dark" />
          <StatCard label={tPortal("accountOverview.kpi.bookingsTotal")} value={kpis.bookingsTotal} variant="tinted" />
          <StatCard label={tPortal("accountOverview.kpi.refundsTotal")} value={kpis.refundsTotal} variant="tinted" />
        </div>

        <div className="premium-card premium-card-tinted rounded-2xl p-6">
          <div className="text-sm font-semibold text-primary">{tPortal("accountOverview.becomeHostTitle")}</div>
          <div className="mt-2 text-sm text-secondary">
            {tPortal("accountOverview.becomeHostDescription")}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/owners"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt"
            >
              {tPortal("accountOverview.learnHosting")}
            </Link>

            <Link
              href="/vendor/onboarding"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
            >
              {tPortal("accountOverview.listProperty")}
            </Link>
          </div>
        </div>
      </div>
    );
  }, [state, tPortal, user?.email, user?.isEmailVerified]);

  return (
    <PortalShell
      role="customer"
      title={tPortal("accountOverview.title")}
      subtitle={tPortal("accountOverview.subtitle")}
    >
      <div className="space-y-6">{content}</div>
    </PortalShell>
  );
}
