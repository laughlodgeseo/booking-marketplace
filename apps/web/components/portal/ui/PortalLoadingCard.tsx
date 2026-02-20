"use client";

import { useTranslations } from "next-intl";

const LOADING_KEY_BY_KIND = {
  messages: "loading.messages",
  notifications: "loading.notifications",
  calendar: "loading.calendar",
  dashboard: "loading.dashboard",
  overview: "loading.overview",
  vendorLogin: "loading.vendorLogin",
  mapPicker: "loading.mapPicker",
} as const;

export type PortalLoadingKind = keyof typeof LOADING_KEY_BY_KIND;

export function PortalLoadingCard(props: { kind: PortalLoadingKind }) {
  const tPortal = useTranslations("portal");

  return (
    <div className="portal-card rounded-3xl bg-surface/90 p-6 text-sm text-secondary">
      {tPortal(LOADING_KEY_BY_KIND[props.kind])}
    </div>
  );
}
