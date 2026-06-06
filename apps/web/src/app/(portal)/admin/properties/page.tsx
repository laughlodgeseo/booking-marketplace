"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, RefreshCw, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { DataTable, type Column } from "@/components/portal/ui/DataTable";
import { SkeletonTable } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  portalActionPrimary,
  portalActionSecondary,
  portalIconButton,
  portalRowPrimary,
  portalRowSecondary,
} from "@/components/portal/ui/portal-actions";
import { getAdminProperties, type AdminListResponse } from "@/lib/api/portal/admin";

type AdminPropertyRow = AdminListResponse["items"][number];

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      items: AdminPropertyRow[];
      page: number;
      pageSize: number;
      total: number;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function getString(value: unknown, key: string): string | null {
  const row = asRecord(value);
  if (!row) return null;
  const field = row[key];
  return typeof field === "string" ? field : null;
}

function safeInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getId(row: unknown): string { return getString(row, "id") ?? ""; }
function getTitle(row: unknown): string { return getString(row, "title") ?? "Untitled"; }
function getStatus(row: unknown): string { return getString(row, "status") ?? "UNKNOWN"; }
function getLocation(row: unknown): string {
  const city = getString(row, "city");
  const area = getString(row, "area");
  return [area, city].filter(Boolean).join(", ") || "—";
}
function getOwner(row: unknown): string {
  const vendorName = getString(row, "vendorName");
  const vendorEmail = getString(row, "vendorEmail");
  const vendorId = getString(row, "vendorId");
  const createdByAdminId = getString(row, "createdByAdminId");
  if (createdByAdminId) return "Admin-owned";
  return vendorName || vendorEmail || vendorId || "Vendor-owned";
}
function getOwnerEmail(row: unknown): string {
  return getString(row, "vendorEmail") ?? "";
}
function getSource(row: unknown): "ADMIN" | "VENDOR" {
  return getString(row, "createdByAdminId") ? "ADMIN" : "VENDOR";
}
function getUpdated(row: unknown): string {
  return getString(row, "updatedAt") ?? getString(row, "createdAt") ?? "-";
}

function formatDate(value: string): string {
  if (!value || value === "-") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminPropertiesPage() {
  const router = useRouter();

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState<"ALL" | "ADMIN" | "VENDOR">("ALL");

  async function load(nextPage?: number) {
    const targetPage = nextPage ?? page;
    setState({ kind: "loading" });
    try {
      const response = await getAdminProperties({ page: targetPage, pageSize });
      setState({
        kind: "ready",
        items: Array.isArray(response.items) ? response.items : [],
        page: safeInt(response.page, targetPage),
        pageSize: safeInt(response.pageSize, pageSize),
        total: safeInt(response.total, 0),
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load properties",
      });
    }
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const statusOptions = useMemo(() => {
    if (state.kind !== "ready") return [];
    return Array.from(new Set(state.items.map((item) => getStatus(item)))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [state]);

  const filteredRows = useMemo(() => {
    if (state.kind !== "ready") return [];
    const needle = q.trim().toLowerCase();
    return state.items.filter((row) => {
      if (status !== "ALL" && getStatus(row) !== status) return false;
      if (source !== "ALL" && getSource(row) !== source) return false;
      if (!needle) return true;
      return JSON.stringify(row).toLowerCase().includes(needle);
    });
  }, [q, source, state, status]);

  const columns = useMemo<Array<Column<AdminPropertyRow>>>(() => [
    {
      key: "property",
      header: "Property",
      className: "col-span-3",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-primary">{getTitle(row)}</div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-muted/70">{getId(row)}</div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      className: "col-span-2",
      render: (row) => <span className="text-xs text-secondary">{getLocation(row)}</span>,
    },
    {
      key: "owner",
      header: "Owner",
      className: "col-span-2",
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-primary">{getOwner(row)}</div>
          <div className="mt-0.5 truncate text-[10px] text-muted">{getOwnerEmail(row)}</div>
          <div className="mt-0.5">
            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${getSource(row) === "ADMIN" ? "bg-slate-100 text-slate-600" : "bg-brand/10 text-brand"}`}>
              {getSource(row)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "col-span-2",
      render: (row) => <StatusPill status={getStatus(row)}>{prettyStatus(getStatus(row))}</StatusPill>,
    },
    {
      key: "updated",
      header: "Updated",
      className: "col-span-1",
      render: (row) => <span className="text-[11px] text-muted">{formatDate(getUpdated(row))}</span>,
    },
  ], []);

  const canPrev = state.kind === "ready" ? state.page > 1 : false;
  const canNext = state.kind === "ready" ? state.page * state.pageSize < state.total : false;

  return (
    <PortalShell
      role="admin"
      title="Properties"
      subtitle="Manage all marketplace property listings"
      right={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void load(page)}
            className={portalActionSecondary}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Link href="/admin/properties/new" className={portalActionPrimary}>
            <Plus className="h-4 w-4" /> Create property
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Command bar */}
        <div className="portal-command-bar bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)/0.98),rgb(var(--color-accent-rgb)/0.045))] shadow-[0_12px_30px_rgba(33,39,53,0.08)]">
          <div className="relative min-w-0 flex-1" style={{ minWidth: "180px" }}>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, city, owner..."
              className="h-10 w-full rounded-xl bg-white pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-slate-200/80 placeholder:text-muted focus:bg-white focus:ring-2 focus:ring-brand/25 transition-all"
            />
          </div>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value as "ALL" | "ADMIN" | "VENDOR")}
            className="portal-select"
          >
            <option value="ALL">All owners</option>
            <option value="ADMIN">Admin-owned</option>
            <option value="VENDOR">Vendor-owned</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="portal-select"
          >
            <option value="ALL">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{prettyStatus(option)}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void load(page)}
            className={`${portalIconButton} h-10 w-10 shrink-0`}
            title="Refresh"
            aria-label="Refresh properties"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <div className="ml-auto rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-secondary ring-1 ring-slate-200/80">
            {state.kind === "ready" ? `${filteredRows.length} of ${state.total} properties` : "Loading…"}
          </div>
        </div>

        {/* Table or loading/error */}
        {state.kind === "loading" ? (
          <SkeletonTable rows={8} />
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5 text-sm text-danger">
            <div className="font-semibold">Could not load properties</div>
            <div className="mt-1">{state.message}</div>
            <button
              type="button"
              onClick={() => void load(page)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : (
          <>
            <DataTable<AdminPropertyRow>
              title="Property list"
              subtitle={
                <>
                  <span className="font-semibold text-primary">{filteredRows.length}</span>
                  {" of "}
                  <span className="font-semibold text-primary">{state.total}</span>
                  {" results"}
                </>
              }
              rows={filteredRows}
              columns={columns}
              compact
              onRowClick={(row) => {
                const id = getId(row);
                if (!id) return;
                router.push(`/admin/properties/${encodeURIComponent(id)}`);
              }}
              rowActions={(row) => {
                const id = getId(row);
                if (!id) return null;
                return (
                  <>
                    <Link
                      href={`/admin/properties/${encodeURIComponent(id)}`}
                      className={portalRowPrimary}
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/properties/${encodeURIComponent(id)}/edit`}
                      className={portalRowSecondary}
                    >
                      Edit
                    </Link>
                  </>
                );
              }}
              mobileSecondaryFields={[
                { label: "Location", render: (row) => getLocation(row) },
                { label: "Owner", render: (row) => getOwner(row) },
                { label: "Status", render: (row) => <StatusPill status={getStatus(row)}>{prettyStatus(getStatus(row))}</StatusPill> },
                { label: "Updated", render: (row) => formatDate(getUpdated(row)) },
              ]}
            />

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/92 px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
              <div className="text-xs text-muted">
                Page {state.page} · {state.total} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((v) => Math.max(1, v - 1))}
                  disabled={!canPrev}
                  className={portalRowSecondary}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((v) => v + 1)}
                  disabled={!canNext}
                  className={portalRowSecondary}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
