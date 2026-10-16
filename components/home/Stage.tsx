"use client";

import { ArrowRight, Mouse } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { panelOpenSelector, stageView, useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CHAPTERS } from "./chapterData";
import { backToGlobe, useHomeStory } from "./homeStore";

/**
 * The Home stage: the globe stays pinned while the page scrolls. At the top it is the interactive explorer;
 * scrolling down fades the explorer chrome, moves the globe to the right and the chapters below take over the
 * camera.
 */

function useViewport() {
  const [vp, setVp] = useState({ h: 900, wide: true });
  useEffect(() => {
    const read = () => setVp({ h: window.innerHeight, wide: window.innerWidth >= 900 });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return vp;
}

/** Fixed wrapper around the globe: moves it right and stops taking input once the story starts. */
export function GlobeStage({ children }: { children: React.ReactNode }) {
  const { scrollY } = useScroll();
  const { h, wide } = useViewport();
  const [live, setLive] = useState(true);
  // the camera moves the picture, so the canvas still fills the screen: right of the text on wide screens,
  // above the text cards on phones
  const place = useCallback(
    (v: number) => {
      const p = Math.min(1, v / (h * 0.85));
      stageView.x = wide ? p * 0.25 : 0;
      stageView.y = wide ? 0 : p * 0.16;
    },
    [wide, h],
  );
  useEffect(() => {
    place(scrollY.get());
    return () => {
      stageView.x = 0;
      stageView.y = 0;
    };
  }, [place, scrollY]);
  useMotionValueEvent(scrollY, "change", (v) => {
    place(v);
    setLive(v < h * 0.3);
    const cover = document.getElementById("globe-cover");
    const hidden = !!cover && cover.getBoundingClientRect().top <= 0;
    if (hidden !== useGlobe.getState().stageHidden) useGlobe.getState().setStageHidden(hidden);
  });
  useEffect(() => () => useGlobe.getState().setStageHidden(false), []);
  return (
    <div className={cn("fixed inset-0", !live && "pointer-events-none [&_*]:!pointer-events-none")}>
      {children}
    </div>
  );
}

/** The explorer's cards, dock and header: visible on the globe hero only. */
export function HeroChrome({ children }: { children: React.ReactNode }) {
  const { scrollY } = useScroll();
  const { h } = useViewport();
  const opacity = useTransform(scrollY, (v) => 1 - Math.min(1, v / (h * 0.22)));
  const [hidden, setHidden] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => {
    const next = v > h * 0.22;
    if (next === hidden) return;
    setHidden(next);
    // leaving the explorer closes its panels so the story starts clean
    const g = useGlobe.getState();
    if (next && g.tour === null && panelOpenSelector(g)) g.closePanel();
  });
  return (
    <motion.div style={{ opacity }} inert={hidden} className="relative z-20">
      {children}
    </motion.div>
  );
}

/** Floating island nav once the explorer header has faded: shows the chapter on screen. */
export function IslandNav() {
  const chapter = useHomeStory((s) => s.chapter);
  const { scrollY } = useScroll();
  const [shown, setShown] = useState(false);
  const { h } = useViewport();
  useMotionValueEvent(scrollY, "change", (v) => setShown(v > h * 0.3));
  const label = CHAPTERS[chapter] ?? null;
  return (
    <AnimatePresence>
      {shown && (
        <motion.nav
          aria-label="Page"
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
          className="fixed top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--line)] bg-white/80 p-1.5 text-[var(--ink-strong)] shadow-[0_18px_44px_rgba(17,35,43,.14),inset_0_1px_0_#fff] backdrop-blur-2xl"
        >
          <button type="button" onClick={() => backToGlobe()} aria-label="Back to the globe" className="flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 hover:bg-[var(--paper-2)]">
            <span className="grid size-8 place-items-center rounded-full bg-[var(--ink-strong)]">
              <span className="relative block h-2.5 w-4">
                <span className="absolute top-0 left-0 size-2.5 rounded-full bg-gold" />
                <span className="absolute top-0 right-0 size-2.5 rounded-full border-2 border-white" />
              </span>
            </span>
            <span className="text-[13.5px] font-bold max-sm:hidden">GeoPolitics</span>
          </button>
          <motion.div layout className="flex h-9 min-w-[150px] items-center justify-center overflow-hidden rounded-full bg-[var(--paper)] px-4 text-[12.5px] font-semibold max-sm:min-w-[110px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={label?.id ?? "more"}
                initial={{ y: 14, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -14, opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                {label ? (
                  <>
                    <span className="text-[var(--ink-3)] tabular-nums">{String(chapter + 1).padStart(2, "0")}</span>
                    <span className="size-1.5 rounded-full" style={{ background: label.tint }} />
                    {label.name}
                  </>
                ) : (
                  <span className="text-[var(--ink-2)]">The world, explained</span>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.div>
          <button type="button" onClick={() => backToGlobe(() => useGlobe.getState().openSide("stories"))} className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-[var(--ink-2)] hover:bg-[var(--paper-2)] hover:text-[var(--ink-strong)] max-md:hidden">
            Stories
          </button>
          <Link href="/glossary" className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-[var(--ink-2)] hover:bg-[var(--paper-2)] hover:text-[var(--ink-strong)] max-md:hidden">
            Glossary
          </Link>
          <Link href="/play" className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#F7C65E] to-[var(--gold)] px-4 py-2 text-[13px] font-bold text-[var(--ink-strong)]">
            Play <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

/** Darkens the left of the screen behind the chapter text so it reads over the globe. */
export function StoryScrim() {
  const chapter = useHomeStory((s) => s.chapter);
  return (
    <AnimatePresence>
      {chapter >= 0 && chapter < CHAPTERS.length && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none fixed inset-y-0 left-0 z-[5] w-[62vw] bg-gradient-to-r from-[rgba(243,241,236,.97)] via-[rgba(243,241,236,.78)] to-transparent max-md:inset-x-0 max-md:top-auto max-md:h-[70vh] max-md:w-full max-md:bg-gradient-to-t"
        />
      )}
    </AnimatePresence>
  );
}

/** Chapter index on the right edge while the story plays. */
export function ChapterDots() {
  const chapter = useHomeStory((s) => s.chapter);
  return (
    <AnimatePresence>
      {chapter >= 0 && chapter < CHAPTERS.length && (
        <motion.ol
          aria-label="Chapters"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          className="fixed top-1/2 right-6 z-30 grid -translate-y-1/2 gap-3 max-lg:hidden"
        >
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <a href={`#chapter-${c.id}`} className="group flex items-center justify-end gap-3" aria-current={i === chapter ? "step" : undefined}>
                <span className={cn("text-[11px] font-bold tracking-[.14em] uppercase transition", i === chapter ? "text-[var(--ink-strong)]" : "text-transparent group-hover:text-[var(--ink-3)]")}>{c.name}</span>
                <span className={cn("block h-[3px] rounded-full transition-all duration-500", i === chapter ? "w-8" : "w-3 bg-[rgba(17,35,43,.22)] group-hover:bg-[rgba(17,35,43,.5)]")} style={i === chapter ? { background: c.tint } : undefined} />
              </a>
            </li>
          ))}
        </motion.ol>
      )}
    </AnimatePresence>
  );
}

/** "Scroll into the story" cue at the foot of the hero. */
export function ScrollCue() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 120], [1, 0]);
  return (
    <motion.button
      type="button"
      style={{ opacity }}
      onClick={() => window.scrollTo({ top: window.innerHeight * 0.95, behavior: "smooth" })}
      className="group fixed bottom-[104px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/40 bg-[rgba(15,29,36,.55)] py-2.5 pr-4 pl-3 text-[12.5px] font-bold text-white shadow-[0_12px_30px_rgba(0,0,0,.25)] backdrop-blur-xl transition hover:bg-[rgba(15,29,36,.75)] max-md:bottom-[84px]"
    >
      <Mouse className="size-4 motion-safe:animate-bounce" aria-hidden />
      Scroll into the story
    </motion.button>
  );
}
