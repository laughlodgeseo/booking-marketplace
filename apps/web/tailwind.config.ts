import type { Config } from "tailwindcss";
import rtl from "tailwindcss-rtl";

export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Indigo + ink semantic color system (single source in globals.css) */
        bg: "rgb(var(--color-bg-rgb) / <alpha-value>)",
        "bg-2": "rgb(var(--color-bg-2-rgb) / <alpha-value>)",
        surface: "rgb(var(--color-surface-rgb) / <alpha-value>)",

        ink: "rgb(var(--color-ink-rgb) / <alpha-value>)",
        "ink-2": "rgb(var(--color-ink-2-rgb) / <alpha-value>)",
        "ink-3": "rgb(var(--color-ink-3-rgb) / <alpha-value>)",

        brand: "rgb(var(--color-accent-rgb) / <alpha-value>)",
        "brand-hover": "rgb(var(--color-accent-hover-rgb) / <alpha-value>)",
        "brand-soft": "rgb(var(--color-accent-rgb) / 0.14)",
        "brand-soft-2": "rgb(var(--color-accent-rgb) / 0.08)",
        gold: "rgb(var(--color-gold-rgb) / <alpha-value>)",
        "gold-soft": "rgb(var(--color-gold-rgb) / 0.20)",

        text: "rgb(var(--text-primary-rgb) / <alpha-value>)",
        "text-2": "rgb(var(--text-secondary-rgb) / <alpha-value>)",
        "text-invert": "rgb(var(--text-inverted-rgb) / <alpha-value>)",
        "text-invert-2": "rgb(var(--text-inverted-2-rgb) / <alpha-value>)",

        "accent-soft": "rgb(var(--color-accent-soft-rgb) / <alpha-value>)",
        "accent-text": "rgb(var(--color-accent-text-rgb) / <alpha-value>)",

        "warm-base": "rgb(var(--color-bg-rgb) / <alpha-value>)",
        "warm-alt": "rgb(var(--color-bg-2-rgb) / <alpha-value>)",

        "dark-1": "rgb(var(--color-ink-rgb) / <alpha-value>)",
        "dark-2": "rgb(var(--color-ink-2-rgb) / <alpha-value>)",
        "dark-3": "rgb(var(--color-ink-3-rgb) / <alpha-value>)",

        primary: "rgb(var(--text-primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--text-secondary-rgb) / <alpha-value>)",
        muted: "rgb(var(--text-muted-rgb) / <alpha-value>)",
        inverted: "rgb(var(--text-inverted-rgb) / <alpha-value>)",

        line: "rgb(var(--line-rgb) / <alpha-value>)",
        "line-strong": "rgb(var(--line-strong-rgb) / <alpha-value>)",

        success: "rgb(var(--color-success-rgb) / <alpha-value>)",
        warning: "rgb(var(--color-warning-rgb) / <alpha-value>)",
        danger: "rgb(var(--color-danger-rgb) / <alpha-value>)",
        info: "rgb(var(--color-info-rgb) / <alpha-value>)",

        "emerald-1": "rgb(var(--color-ink-rgb) / <alpha-value>)",
        "emerald-2": "rgb(var(--color-ink-2-rgb) / <alpha-value>)",
        "emerald-3": "rgb(var(--color-ink-3-rgb) / <alpha-value>)",
        ivory: "rgb(var(--color-bg-rgb) / <alpha-value>)",
        "ivory-2": "rgb(var(--color-bg-2-rgb) / <alpha-value>)",
        charcoal: "rgb(var(--text-primary-rgb) / <alpha-value>)",

        /* Backward-compatible aliases */
        sand: "rgb(var(--color-bg-rgb) / <alpha-value>)",
        stone: "rgb(var(--line-rgb) / <alpha-value>)",
        midnight: "rgb(var(--text-primary-rgb) / <alpha-value>)",
      },
      fontFamily: {
        heading: [
          "var(--font-display)",
          "var(--font-latin)",
          '"Manrope"',
          '"Avenir Next"',
          '"Segoe UI"',
          "sans-serif",
        ],
        sans: ['"Manrope"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 20px 52px rgba(11, 15, 25, 0.14)",
        soft: "0 14px 34px rgba(11, 15, 25, 0.10)",
        "brand-soft": "0 12px 30px rgba(79, 70, 229, 0.28)",
      },
    },
  },
  plugins: [rtl],
} satisfies Config;
