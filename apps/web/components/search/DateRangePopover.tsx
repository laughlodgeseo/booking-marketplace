"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

type DateRangePopoverProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  variant?: "single" | "double";
  monthsCount?: 1 | 2;
  children: ReactNode;
};

type PopoverRect = {
  top: number;
  left: number;
  width: number;
};

function computeDesktopRect(months: 1 | 2): PopoverRect {
  if (typeof window === "undefined") return { top: 88, left: 12, width: months === 2 ? 812 : 438 };

  const preferred = months === 2 ? 812 : 438;
  const min = months === 2 ? 748 : 382;
  const estimatedHeight = months === 2 ? 560 : 500;
  const margin = 12;
  const viewportMax = window.innerWidth - 24;
  let width = Math.min(preferred, viewportMax);
  if (width < min) width = viewportMax;

  const left = Math.max(margin, Math.round((window.innerWidth - width) / 2));
  const top = Math.max(margin, Math.round((window.innerHeight - estimatedHeight) / 2));

  return { top, left, width };
}

export default function DateRangePopover(props: DateRangePopoverProps) {
  const { open, anchorRef, onClose, variant, monthsCount, children } = props;
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [desktopRect, setDesktopRect] = useState<PopoverRect | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const requestedMonths = monthsCount ?? (variant === "double" ? 2 : 1);
  const resolvedViewportWidth = viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : null);
  const isMobile = resolvedViewportWidth !== null ? resolvedViewportWidth < 768 : false;
  const isTwoMonths = requestedMonths === 2 && !isMobile;
  const fallbackRect =
    typeof window === "undefined"
      ? { top: 88, left: 12, width: requestedMonths === 2 ? 812 : 438 }
      : computeDesktopRect(requestedMonths);
  const resolvedDesktopRect = desktopRect ?? fallbackRect;
  const desktopStyle: CSSProperties | undefined = isMobile
    ? undefined
    : {
        top: resolvedDesktopRect.top,
        left: resolvedDesktopRect.left,
        width: resolvedDesktopRect.width,
      };

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const onViewportChange = () => {
      const nextWidth = window.innerWidth;
      setViewportWidth(nextWidth);
      if (nextWidth < 768) {
        setDesktopRect(null);
        return;
      }
      setDesktopRect(computeDesktopRect(requestedMonths));
    };
    onViewportChange();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("orientationchange", onViewportChange);

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("orientationchange", onViewportChange);
    };
  }, [open, requestedMonths]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const insideTrigger = Boolean(anchorRef.current?.contains(target));
      const insidePopover = Boolean(popoverRef.current?.contains(target));
      if (!insideTrigger && !insidePopover) {
        onClose();
      }
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [anchorRef, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Close date picker"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/18 backdrop-blur-[1px]"
      />
      <div
        ref={popoverRef}
        className={[
          "fixed border border-indigo-100/90 bg-white shadow-[0_28px_72px_rgba(15,23,42,0.24)]",
          isMobile
            ? "inset-x-3 bottom-3 top-auto max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[1.75rem] p-3 pb-4"
            : `inline-block max-h-[calc(100dvh-24px)] max-w-[calc(100vw-24px)] overflow-y-auto rounded-[1.75rem] ${
                isTwoMonths ? "p-4 md:p-5" : "p-4"
              }`,
        ].join(" ")}
        style={desktopStyle}
      >
        {isMobile ? <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200" /> : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
