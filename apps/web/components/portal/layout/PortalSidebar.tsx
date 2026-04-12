"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PortalNavItem } from "@/components/portal/layout/portal-navigation";
import { groupNav } from "@/components/portal/layout/portal-navigation";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function PortalSidebar(props: {
  title: string;
  subtitle?: string;
  nav: PortalNavItem[];
  userEmail: string | null;
  userName?: string | null;
  footerHint?: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const tPortal = useTranslations("portal");
  const grouped = groupNav(props.nav);

  return (
    <aside className={cn("hidden overflow-x-hidden lg:block lg:w-[300px] lg:shrink-0", props.className)}>
      <div className="sticky top-[90px] overflow-hidden rounded-3xl bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(242,240,255,0.97)_56%,rgba(236,234,255,0.95)_100%)] shadow-[0_18px_52px_rgba(79,70,229,0.16)] ring-1 ring-white/60">
        {/* subtle inner highlight so it feels “built” */}
        <div className="pointer-events-none absolute inset-0 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.68)]" />

        <div className="px-4 pt-4">
          <div className="rounded-3xl bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(240,238,255,0.78)_100%)] p-4 shadow-[0_12px_34px_rgba(79,70,229,0.12)] ring-1 ring-white/65">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold tracking-wide text-primary/62">
                  {tPortal("navigation")}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-sm font-semibold text-primary">{props.title}</div>
                  <ChevronRight className="h-4 w-4 text-primary/38" />
                </div>

                {props.subtitle ? (
                  <div className="mt-1 text-xs leading-relaxed text-primary/62">{props.subtitle}</div>
                ) : null}
              </div>

              <div className="mt-0.5 inline-flex h-8 items-center rounded-2xl bg-brand/14 px-3 text-[11px] font-semibold text-brand ring-1 ring-brand/24">
                Live
              </div>
            </div>

            <div className="portal-divider mt-4" />
          </div>
        </div>

        <div className="px-4 pb-4 pt-4">
          <div className="space-y-5">
            {grouped.map((group) => (
              <div key={group.group} className="pt-1">
                <div className="px-2 text-[11px] font-semibold tracking-wide text-primary/58">
                  {group.group.toUpperCase()}
                </div>
                <div className="portal-divider mt-2" />

                <div className="mt-3 grid gap-2.5">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group relative flex w-full min-w-0 items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold",
                          "bg-surface/88 ring-1 ring-brand/14 shadow-[0_8px_20px_rgba(79,70,229,0.08)] transition",
                          "hover:translate-y-[-1px] hover:bg-accent-soft/26 hover:ring-brand/26 hover:shadow-[0_12px_26px_rgba(79,70,229,0.12)] active:translate-y-0",
                          active
                            ? "bg-brand text-accent-text shadow-[0_14px_34px_rgba(79,70,229,0.30)] ring-brand/45"
                            : "text-primary/78"
                        )}
                      >
                        {active ? (
                          <span className="pointer-events-none absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent-text/88" />
                        ) : null}

                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
                              "bg-accent-soft/28 text-brand",
                              "group-hover:bg-accent-soft/40 group-hover:text-brand",
                              active ? "bg-accent-text/18 text-accent-text" : ""
                            )}
                          >
                            {item.icon ?? <ChevronRight className="h-4 w-4" />}
                          </span>

                          <span className={cn("truncate", active ? "text-accent-text" : "text-primary/78 group-hover:text-primary")}>
                            {item.label}
                          </span>
                        </span>

                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition",
                            active ? "text-accent-text/75" : "text-primary/28 group-hover:text-primary/50"
                          )}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,238,255,0.78))] p-4 shadow-[0_14px_36px_rgba(79,70,229,0.12)] ring-1 ring-white/65">
            <div className="text-xs font-semibold text-primary/60">{tPortal("signedIn")}</div>
            <div className="mt-1 text-sm font-semibold text-primary">
              {props.userName?.trim() || tPortal("defaultWelcome")}
            </div>
            <div className="mt-1 text-xs text-secondary">{props.userEmail || "—"}</div>
            <div className="mt-1 text-xs leading-relaxed text-primary/62">
              {props.footerHint ?? tPortal("footerHint")}
            </div>
            <div className="portal-divider mt-4" />
            <div className="mt-3 text-[11px] font-semibold text-brand">
              {tPortal("premiumConsole")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
