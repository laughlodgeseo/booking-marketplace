"use client";

import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-brand to-brand-hover text-accent-text ring-1 ring-brand/35 shadow-[0_12px_28px_rgba(79,70,229,0.30)] hover:brightness-105 hover:shadow-[0_16px_34px_rgba(79,70,229,0.36)] active:scale-95",
  secondary:
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,236,255,0.84))] text-primary ring-1 ring-brand/18 shadow-sm hover:ring-brand/30 hover:bg-accent-soft/24 active:scale-95",
  ghost:
    "bg-transparent text-primary hover:bg-accent-soft/20 active:scale-95",
  danger:
    "bg-gradient-to-b from-danger/95 to-danger text-inverted ring-1 ring-danger/34 shadow-[0_10px_24px_rgba(220,38,38,0.28)] hover:brightness-105 active:scale-95",
  outline:
    "bg-surface/96 text-primary ring-1 ring-brand/26 hover:bg-accent-soft/18 hover:ring-brand/40 active:scale-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-xl",
  md: "h-10 px-4 text-sm gap-2 rounded-2xl",
  lg: "h-12 px-6 text-sm gap-2.5 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      children,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-in-out",
          "hover:translate-y-[-1px]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
