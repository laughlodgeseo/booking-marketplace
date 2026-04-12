import type { HTMLAttributes, ReactNode } from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Card(props: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  const { className, interactive = false, children, ...rest } = props;

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-line/60 bg-surface shadow-sm transition-all duration-200 ease-in-out",
        interactive ? "hover:-translate-y-1 hover:shadow-md" : "",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader(props: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const { className, children, ...rest } = props;

  return (
    <div className={cn("min-w-0 border-b border-line/60 px-4 py-3", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardContent(props: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const { className, children, ...rest } = props;

  return (
    <div className={cn("min-w-0 px-4 py-4", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter(props: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const { className, children, ...rest } = props;

  return (
    <div
      className={cn("min-w-0 border-t border-line/60 px-4 py-3", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
