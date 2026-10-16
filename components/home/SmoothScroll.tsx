"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { setLenis } from "./homeStore";

/** Eased wheel scrolling for the Home story; off for readers who ask for reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // nested scrolling keeps panels and lists scrolling on their own; anchor links glide instead of jumping
    const lenis = new Lenis({ autoRaf: true, lerp: 0.11, allowNestedScroll: true, anchors: true });
    setLenis(lenis);
    return () => {
      setLenis(null);
      lenis.destroy();
    };
  }, []);
  return null;
}
