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
    "bg-brand text-accent-text shadow-[0_8px_24px_rgba(79,70,229,0.28)] hover:bg-brand-hover hover:shadow-[0_12px_32px_rgba(79,70,229,0.36)] active:shadow-[0_4px_12px_rgba(79,70,229,0.24)]",
  secondary:
    "bg-surface text-primary ring-1 ring-line/40 shadow-sm hover:bg-warm-alt/40 hover:ring-line/60 active:bg-warm-alt/60",
  ghost:
    "bg-transparent text-primary hover:bg-warm-alt/30 active:bg-warm-alt/50",
  danger:
    "bg-red-600 text-white shadow-[0_8px_24px_rgba(220,38,38,0.28)] hover:bg-red-700 active:bg-red-800",
  outline:
    "bg-transparent text-brand ring-1 ring-brand/40 hover:bg-brand/8 hover:ring-brand/60 active:bg-brand/12",
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
          "inline-flex items-center justify-center font-semibold transition-all duration-200",
          "hover:translate-y-[-1px] active:translate-y-[0.5px]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2",
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
