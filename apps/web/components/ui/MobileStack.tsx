import type { ReactNode } from "react";

type MobileStackProps = {
  className?: string;
  children: ReactNode;
};

function joinClassNames(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function MobileStack({ className, children }: MobileStackProps) {
  return <div className={joinClassNames("flex flex-col gap-4 lg:flex-row lg:gap-6", className)}>{children}</div>;
}
