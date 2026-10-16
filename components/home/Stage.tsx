"use client";

import { ArrowRight, Mouse } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { panelOpenSelector, stageView, useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CHAPTERS, STORIES_AT } from "./chapterData";
import { backToGlobe, useHomeStory } from "./homeStore";

/**
 * The Home stage: the globe stays pinned while the page scrolls. At the top it is the interactive explorer;
 * scrolling down fades the explorer chrome, drifts the globe to the right and turns the sky to night, and the
 * chapters below take over the camera.
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

/** Night sky behind the globe: fades in as the page scrolls down. */
export function Cosmos() {
  const { scrollY } = useScroll();
  const { h } = useViewport();
  const opacity = useTransform(scrollY, (v) => Math.min(1, Math.max(0, (v - h * 0.08) / (h * 0.6))));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // drawn off-screen into an image, so the page keeps a single <canvas> (the globe)
    const cv = document.createElement("canvas");
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
      const g = cv.getContext("2d");
      if (!g) return;
      // seeded so the sky does not reshuffle on resize
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const n = Math.round((innerWidth * innerHeight) / 2600);
      for (let i = 0; i < n; i++) {
        const r = rnd() ** 3 * 1.6 + 0.25;
        g.globalAlpha = 0.25 + rnd() * 0.75;
        g.fillStyle = rnd() > 0.9 ? "#ffe2a8" : rnd() > 0.8 ? "#bcd4ff" : "#ffffff";
        g.beginPath();
        g.arc(rnd() * cv.width, rnd() * cv.height, r * dpr, 0, Math.PI * 2);
        g.fill();
      }
      el.style.backgroundImage = `url(${cv.toDataURL("image/png")})`;
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);
  return (
    <motion.div aria-hidden style={{ opacity }} className="pointer-events-none fixed inset-0 bg-[#04080c]">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_45%,rgba(40,90,140,.35),transparent_70%),radial-gradient(40%_40%_at_10%_90%,rgba(242,179,61,.10),transparent_70%),radial-gradient(35%_35%_at_15%_10%,rgba(120,80,200,.12),transparent_70%)]" />
      <div ref={ref} className="absolute inset-0 bg-cover motion-safe:animate-[sky-drift_120s_linear_infinite_alternate]" />
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
          className="fixed top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-[rgba(10,16,22,.72)] p-1.5 text-white shadow-[0_20px_50px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl"
        >
          <button type="button" onClick={() => backToGlobe()} aria-label="Back to the globe" className="flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 hover:bg-white/10">
            <span className="grid size-8 place-items-center rounded-full bg-white/10">
              <span className="relative block h-2.5 w-4">
                <span className="absolute top-0 left-0 size-2.5 rounded-full bg-gold" />
                <span className="absolute top-0 right-0 size-2.5 rounded-full border-2 border-white" />
              </span>
            </span>
            <span className="text-[13.5px] font-bold max-sm:hidden">GeoPolitics</span>
          </button>
          <motion.div layout className="flex h-9 min-w-[150px] items-center justify-center overflow-hidden rounded-full bg-white/[.06] px-4 text-[12.5px] font-semibold max-sm:min-w-[110px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={chapter === STORIES_AT ? "stories" : (label?.id ?? "more")}
                initial={{ y: 14, opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -14, opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                {chapter === STORIES_AT ? (
                  <>
                    <span className="size-1.5 rounded-full bg-[var(--gold)]" />
                    Story tours
                  </>
                ) : label ? (
                  <>
                    <span className="text-white/65 tabular-nums">{String(chapter + 1).padStart(2, "0")}</span>
                    <span className="size-1.5 rounded-full" style={{ background: label.tint }} />
                    {label.name}
                  </>
                ) : (
                  <span className="text-white/70">The world, explained</span>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.div>
          <a href="#stories" className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-white/75 hover:bg-white/10 hover:text-white max-md:hidden">
            Stories
          </a>
          <Link href="/glossary" className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-white/75 hover:bg-white/10 hover:text-white max-md:hidden">
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
      {chapter >= 0 && chapter <= STORIES_AT && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none fixed inset-y-0 left-0 z-[5] w-[62vw] bg-gradient-to-r from-[rgba(4,8,12,.92)] via-[rgba(4,8,12,.55)] to-transparent max-md:inset-x-0 max-md:top-auto max-md:h-[70vh] max-md:w-full max-md:bg-gradient-to-t"
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
                <span className={cn("text-[11px] font-bold tracking-[.14em] uppercase transition", i === chapter ? "text-white" : "text-white/0 group-hover:text-white/60")}>{c.name}</span>
                <span className={cn("block h-[3px] rounded-full transition-all duration-500", i === chapter ? "w-8" : "w-3 bg-white/30 group-hover:bg-white/60")} style={i === chapter ? { background: c.tint } : undefined} />
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
