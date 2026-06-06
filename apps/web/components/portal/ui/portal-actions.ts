export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export const portalActionPrimary =
  "portal-action-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";

export const portalActionSecondary =
  "portal-action-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";

export const portalActionGhost =
  "portal-action-ghost inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";

export const portalRowPrimary =
  "portal-row-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

export const portalRowSecondary =
  "portal-row-secondary inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

export const portalActionDanger =
  "portal-action-danger inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

export const portalIconButton =
  "portal-icon-button inline-flex items-center justify-center rounded-xl transition";
