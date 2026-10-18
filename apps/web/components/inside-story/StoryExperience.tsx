"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function StoryExperience() {
  const pathname = usePathname();
  const router = useRouter();
  const pending = useRef<{
    overlay: HTMLDivElement;
    key: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  // Touch remains native. Smoothing belongs only to editorial routes, and is
  // torn down when entering discovery, auth, payment or reduced-motion mode.
  useEffect(() => {
    if (
      !["/", "/gallery", "/services", "/owners", "/about", "/blog"].includes(
        pathname,
      )
    )
      return;
    const media = matchMedia(
      "(min-width: 1000px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let dispose: (() => void) | undefined;
    let cancelled = false;
    async function setup() {
      dispose?.();
      dispose = undefined;
      if (!media.matches) return;
      const { default: Lenis } = await import("lenis");
      if (cancelled || !media.matches) return;
      const lenis = new Lenis({
        autoRaf: true,
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false,
        anchors: true,
        prevent: (node: HTMLElement) =>
          Boolean(
            node.closest("dialog,[data-lenis-prevent],.story-district-rail"),
          ),
      });
      dispose = () => lenis.destroy();
    }
    void setup();
    media.addEventListener("change", setup);
    return () => {
      cancelled = true;
      media.removeEventListener("change", setup);
      dispose?.();
    };
  }, [pathname]);
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[data-stay-key]",
      );
      if (
        !link ||
        link.target ||
        link.origin !== location.origin ||
        link.pathname === location.pathname
      )
        return;
      const img = link.querySelector("img");
      const key = link.dataset.stayKey;
      if (!img || !img.complete || !key) return;
      const box = img.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      pending.current?.overlay.remove();
      if (pending.current) clearTimeout(pending.current.timer);
      const overlay = document.createElement("div");
      overlay.className = "story-photo-carry";
      Object.assign(overlay.style, {
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      });
      const clone = img.cloneNode() as HTMLImageElement;
      clone.removeAttribute("srcset");
      clone.removeAttribute("sizes");
      clone.src = img.currentSrc;
      clone.alt = "";
      Object.assign(clone.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      });
      overlay.appendChild(clone);
      document.body.appendChild(overlay);
      const timer = setTimeout(() => {
        overlay
          .animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 180,
            fill: "forwards",
          })
          .finished.finally(() => overlay.remove());
        if (pending.current?.overlay === overlay) pending.current = null;
      }, 1800);
      pending.current = { overlay, key, timer };
      event.preventDefault();
      router.push(link.pathname + link.search);
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [router]);
  useEffect(() => {
    const entry = pending.current;
    if (!entry) return;
    let frame = 0;
    let attempts = 0;
    function resolve() {
      if (!entry || pending.current !== entry) return;
      const target = Array.from(
        document.querySelectorAll<HTMLElement>("[data-stay-cover]"),
      ).find((el) => el.dataset.stayCover === entry.key);
      if (!target || target.getBoundingClientRect().width === 0) {
        if (attempts++ < 45) frame = requestAnimationFrame(resolve);
        return;
      }
      const box = target.getBoundingClientRect();
      clearTimeout(entry.timer);
      pending.current = null;
      const from = entry.overlay.getBoundingClientRect();
      const animation = entry.overlay.animate(
        [
          {
            left: `${from.left}px`,
            top: `${from.top}px`,
            width: `${from.width}px`,
            height: `${from.height}px`,
          },
          {
            left: `${box.left}px`,
            top: `${box.top}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          },
        ],
        {
          duration: 650,
          easing: "cubic-bezier(.22,1,.36,1)",
          fill: "forwards",
        },
      );
      animation.finished
        .then(() => {
          entry.overlay
            .animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: 140,
              fill: "forwards",
            })
            .finished.finally(() => entry.overlay.remove());
        })
        .catch(() => entry.overlay.remove());
    }
    frame = requestAnimationFrame(resolve);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current.timer);
        pending.current.overlay.remove();
        pending.current = null;
      }
    },
    [],
  );
  return null;
}
