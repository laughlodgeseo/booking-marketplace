"use client";

import { useCallback } from "react";
import { RotateCw, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
};

export default function NetworkErrorState(props: Props) {
  const router = useRouter();

  const handleRetry = useCallback(() => {
    if (props.onRetry) {
      props.onRetry();
      return;
    }
    router.refresh();
  }, [props, router]);

  return (
    <div
      className={[
        "rounded-3xl border border-line/70 bg-surface p-6 shadow-sm",
        props.className ?? "",
      ].join(" ")}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="card-icon-plate h-10 w-10">
          <WifiOff className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-primary">
            {props.title ?? "We're having trouble loading this"}
          </h3>
          <p className="mt-1 text-sm text-secondary">
            {props.message ?? "Please check your connection and retry."}
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text shadow-sm hover:bg-brand-hover"
          >
            <RotateCw className="h-4 w-4" />
            {props.retryLabel ?? "Retry"}
          </button>
        </div>
      </div>
    </div>
  );
}
