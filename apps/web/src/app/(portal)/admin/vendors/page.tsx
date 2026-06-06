"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Search, Users } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { getAdminVendors } from "@/lib/api/portal/admin";

type AdminVendorsResponse = Awaited<ReturnType<typeof getAdminVendors>>;
type VendorRow = AdminVendorsResponse["items"][number];

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminVendorsResponse };

function pickVendorString(vendor: VendorRow, keys: ReadonlyArray<string>): string | null {
  for (const key of keys) {
    const value = vendor[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(email?: string | null) {
  if (!email) return "V";
  const left = email.split("@")[0] ?? email;
  return (left[0] ?? "V").toUpperCase();
}

export default function AdminVendorsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminVendors({ page: 1, pageSize: 100 });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load vendors" });
      }
    }
    void run();
    return () => { alive = false; };
  }, []);

  const vendors = useMemo(() => {
    if (state.kind !== "ready") return [];
    const query = q.trim().toLowerCase();
    if (!query) return state.data.items;
    return state.data.items.filter((vendor) => JSON.stringify(vendor).toLowerCase().includes(query));
  }, [state, q]);

  return (
    <PortalShell role="admin" title="Vendors" subtitle="Open each vendor profile as a full page">
      <div className="space-y-4">
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search vendor, email, company..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">{vendors.length} vendors</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => <SkeletonBlock key={idx} className="h-28" />)}
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5 text-sm text-danger">
            {state.message}
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Users className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No vendors found</div>
            <div className="mt-1 text-xs text-muted">Try adjusting your search.</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {vendors.map((vendor) => {
              const vendorId = pickVendorString(vendor, ["id"]);
              if (!vendorId) return null;

              const email = pickVendorString(vendor, ["email", "ownerEmail", "userEmail"]);
              const displayName = pickVendorString(vendor, ["displayName", "companyName", "name"]) || "Vendor";
              const status = pickVendorString(vendor, ["status"]) || "UNKNOWN";

              return (
                <Link
                  key={vendorId}
                  href={`/admin/vendors/${encodeURIComponent(vendorId)}`}
                  className="portal-record-card block"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                          {initials(email)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-primary">{displayName}</div>
                          <div className="mt-0.5 truncate text-xs text-secondary">{email ?? "—"}</div>
                        </div>
                      </div>
                      <StatusPill status={status}>{prettyStatus(status)}</StatusPill>
                    </div>
                    <div className="mt-3 grid gap-1 text-xs text-secondary">
                      <div className="inline-flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        {email ?? "No email"}
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 shrink-0" />
                        Open vendor detail page
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
