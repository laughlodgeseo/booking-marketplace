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
      <div className="sticky top-[90px] overflow-hidden rounded-3xl bg-white shadow-sm">
        {/* subtle inner highlight so it feels “built” */}
        <div className="pointer-events-none absolute inset-0 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.68)]" />

        <div className="px-4 pt-4">
          <div className="rounded-3xl bg-white p-4">
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

              <div className="mt-0.5 inline-flex h-8 items-center rounded-xl bg-brand/10 px-3 text-[11px] font-semibold text-brand">
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
                          "group relative flex w-full min-w-0 items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                          "hover:bg-neutral-100",
                          active
                            ? "bg-brand/10 text-brand"
                            : "text-primary/78"
                        )}
                      >
                        {active ? (
                          <span className="pointer-events-none absolute left-0 top-0 bottom-0 w-1 rounded-r bg-brand" />
                        ) : null}

                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
                              "bg-accent-soft/18 text-brand",
                              "group-hover:bg-accent-soft/30 group-hover:text-brand",
                              active ? "bg-brand/12 text-brand" : ""
                            )}
                          >
                            {item.icon ?? <ChevronRight className="h-4 w-4" />}
                          </span>

                          <span className={cn("truncate", active ? "text-brand" : "text-primary/78 group-hover:text-primary")}>
                            {item.label}
                          </span>
                        </span>

                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition",
                            active ? "text-brand/75" : "text-primary/28 group-hover:text-primary/50"
                          )}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-neutral-100 p-4">
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
