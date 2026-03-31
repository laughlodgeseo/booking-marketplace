"use client";

import { type ReactNode, type HTMLAttributes } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/**
 * Fade-in wrapper using CSS animations (no Framer Motion dependency for simple cases).
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 300,
  ...props
}: { children: ReactNode; delay?: number; duration?: number } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-fadeIn", className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: "both",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Slide-up animation wrapper.
 */
export function SlideUp({
  children,
  className,
  delay = 0,
  duration = 400,
  ...props
}: { children: ReactNode; delay?: number; duration?: number } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-slideUp", className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
        animationFillMode: "both",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Scale-in animation for modals, dropdowns.
 */
export function ScaleIn({
  children,
  className,
  delay = 0,
  ...props
}: { children: ReactNode; delay?: number } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-scaleIn", className)}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Stagger children with incremental delays.
 */
export function StaggerChildren({
  children,
  stagger = 50,
  className,
  ...props
}: { children: ReactNode[]; stagger?: number } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children.map((child, i) => (
        <FadeIn key={i} delay={i * stagger}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}
