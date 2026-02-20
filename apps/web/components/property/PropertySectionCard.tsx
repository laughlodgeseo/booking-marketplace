"use client";

import type { ReactNode } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type Props = {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
};

export default function PropertySectionCard({
  children,
  className,
  as = "section",
}: Props) {
  const Tag = as;

  return (
    <Tag
      className={cn(
        "premium-card premium-card-tinted rounded-2xl border border-white/70 p-5 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
