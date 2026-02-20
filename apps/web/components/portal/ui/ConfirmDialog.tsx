"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/portal/ui/Modal";

type Tone = "neutral" | "danger" | "success" | "warning";

function toneClasses(tone: Tone): { iconBg: string; iconColor: string; primaryBtn: string } {
  if (tone === "danger") {
    return {
      iconBg: "bg-danger/12",
      iconColor: "text-danger",
      primaryBtn: "bg-danger text-inverted hover:bg-danger",
    };
  }
  if (tone === "success") {
    return {
      iconBg: "bg-success/12",
      iconColor: "text-success",
      primaryBtn: "bg-success text-inverted hover:bg-success",
    };
  }
  if (tone === "warning") {
    return {
      iconBg: "bg-warning/12",
      iconColor: "text-warning",
      primaryBtn: "bg-brand text-accent-text hover:bg-brand-hover",
    };
  }
  return {
    iconBg: "bg-warm-alt",
    iconColor: "text-secondary",
    primaryBtn: "bg-brand text-accent-text hover:bg-brand-hover",
  };
}

export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  description?: ReactNode;

  tone?: Tone;

  confirmText?: string;
  cancelText?: string;

  confirmDisabled?: boolean;
  busy?: boolean;

  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const tone = props.tone ?? "neutral";
  const ui = toneClasses(tone);

  return (
    <Modal
      open={props.open}
      onClose={props.onCancel}
      title={props.title}
      subtitle="Please confirm this action."
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={props.onCancel}
            className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary shadow-sm hover:bg-accent-soft/22 lg:bg-surface"
          >
            {props.cancelText ?? "Cancel"}
          </button>
          <button
            type="button"
            disabled={props.confirmDisabled || props.busy}
            onClick={() => void props.onConfirm()}
            className={[
              "h-11 rounded-2xl px-4 text-sm font-semibold shadow-sm disabled:opacity-60",
              ui.primaryBtn,
            ].join(" ")}
          >
            {props.busy ? "Working…" : props.confirmText ?? "Confirm"}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <div className={["flex h-11 w-11 items-center justify-center rounded-2xl", ui.iconBg].join(" ")}>
          {tone === "success" ? (
            <CheckCircle2 className={["h-5 w-5", ui.iconColor].join(" ")} />
          ) : (
            <AlertTriangle className={["h-5 w-5", ui.iconColor].join(" ")} />
          )}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-primary">{props.title}</div>
          {props.description ? (
            <div className="mt-1 text-sm text-secondary">{props.description}</div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
