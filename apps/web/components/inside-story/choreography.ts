"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect, type RefObject } from "react";
gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };
export function useSceneMotion(
  ref: RefObject<HTMLElement | null>,
  setup: (match: gsap.MatchMedia) => void,
) {
  useLayoutEffect(() => {
    if (!ref.current) return;
    const match = gsap.matchMedia();
    const context = gsap.context(() => setup(match), ref);
    const images = Array.from(ref.current.querySelectorAll("img"));
    const refresh = () => ScrollTrigger.refresh();
    images.forEach((image) => {
      if (!image.complete)
        image.addEventListener("load", refresh, { once: true });
    });
    document.fonts.ready.then(() => {
      if (ref.current) ScrollTrigger.refresh();
    });
    return () => {
      images.forEach((image) => image.removeEventListener("load", refresh));
      match.revert();
      context.revert();
    };
  }, [ref, setup]);
}
