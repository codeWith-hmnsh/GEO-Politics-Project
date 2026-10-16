import type Lenis from "lenis";
import { create } from "zustand";

/** Home scroll story: which chapter is on screen (-1 = the globe hero). */
export const useHomeStory = create<{ chapter: number; setChapter: (i: number) => void }>((set) => ({
  chapter: -1,
  setChapter: (chapter) => set({ chapter }),
}));

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis: Lenis | null = null;
/** The smooth scroller, while Home has one (see SmoothScroll). */
export const setLenis = (l: Lenis | null) => {
  lenis = l;
};

/** Scroll the page to `y`, gliding through the smooth scroller when there is one. */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: reduced() ? "auto" : "smooth" });
}

/**
 * Scroll back up to the globe, then run `after` once the page has settled at the top
 * (so the chapter reset on the way up cannot undo what `after` opens).
 */
export function backToGlobe(after?: () => void) {
  if (window.scrollY < 2) {
    after?.();
    return;
  }
  scrollToY(0);
  if (!after) return;
  const t0 = performance.now();
  const wait = () => {
    if (window.scrollY < 2 || performance.now() - t0 > 4000) setTimeout(after, 300);
    else requestAnimationFrame(wait);
  };
  requestAnimationFrame(wait);
}
