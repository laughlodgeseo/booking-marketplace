export const colors = {
  primary: "#FF385C",
  secondary: "#222222",
  success: "#16a34a",
  warning: "#f59e0b",
  danger: "#dc2626",
  border: "#e5e7eb",
  muted: "#6b7280",
  bg: "#ffffff",
  hover: "#f9fafb",
} as const;

export const radius = {
  xl: "12px",
  "2xl": "16px",
  "3xl": "24px",
} as const;

export const motion = {
  durationFast: "200ms",
  durationMedium: "260ms",
  easingStandard: "ease-in-out",
} as const;

export const shadows = {
  soft: "0 1px 3px rgba(0, 0, 0, 0.05)",
  card: "0 10px 24px rgba(15, 23, 42, 0.08)",
} as const;

export const designTokens = {
  colors,
  radius,
  motion,
  shadows,
} as const;

export type DesignTokens = typeof designTokens;
