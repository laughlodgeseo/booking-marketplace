import type { ElementType, ReactNode } from "react";

type ClampLines = 1 | 2 | 3 | 4 | 5 | 6;

type ClampProps<T extends ElementType> = {
  as?: T;
  lines?: ClampLines;
  className?: string;
  children: ReactNode;
};

const CLAMP_CLASS_BY_LINES: Record<ClampLines, string> = {
  1: "line-clamp-1",
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
};

function joinClassNames(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Clamp<T extends ElementType = "p">({
  as,
  lines = 2,
  className,
  children,
}: ClampProps<T>) {
  const Tag = (as ?? "p") as ElementType;

  return <Tag className={joinClassNames(CLAMP_CLASS_BY_LINES[lines], className)}>{children}</Tag>;
}
