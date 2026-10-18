"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, type RefObject } from "react";
gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };
let refreshFrame = 0;
function refreshScenes() {
  if (refreshFrame) return;
  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = 0;
    ScrollTrigger.refresh();
  });
}
export function useSceneMotion(
  ref: RefObject<HTMLElement | null>,
  setup: (match: gsap.MatchMedia) => void,
) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    const match = gsap.matchMedia();
    const context = gsap.context(() => setup(match), ref);
    // Lazy fill-images already have fixed frames. Refreshing on every one of
    // their loads needlessly interrupts a running scroll sequence.
    const images = Array.from(ref.current.querySelectorAll("img")).filter(
      (image) => image.loading !== "lazy",
    );
    const refresh = refreshScenes;
    images.forEach((image) => {
      if (!image.complete)
        image.addEventListener("load", refresh, { once: true });
    });
    document.fonts.ready.then(() => {
      if (ref.current) refreshScenes();
    });
    return () => {
      images.forEach((image) => image.removeEventListener("load", refresh));
      match.revert();
      context.revert();
    };
  }, [ref, setup]);
}
