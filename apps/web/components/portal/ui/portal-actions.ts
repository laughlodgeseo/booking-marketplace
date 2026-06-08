export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// ── Full-size action buttons (modal footers, form submits, page CTAs) ─────────

export const portalActionPrimary =
  "portal-action-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";

export const portalActionSecondary =
  "portal-action-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";

export const portalActionGhost =
  "portal-action-ghost inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";

export const portalActionSuccess =
  "portal-action-success inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";

export const portalActionWarning =
  "portal-action-warning inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition";

export const portalActionDanger =
  "portal-action-danger inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

// ── Table / card row action buttons (compact, inline) ─────────────────────────

export const portalRowPrimary =
  "portal-row-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

export const portalRowSecondary =
  "portal-row-secondary inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

export const portalRowSuccess =
  "portal-row-success inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

export const portalRowWarning =
  "portal-row-warning inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

export const portalRowDanger =
  "portal-row-danger inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition";

// ── Icon-only button ──────────────────────────────────────────────────────────

export const portalIconButton =
  "portal-icon-button inline-flex items-center justify-center rounded-xl transition";
