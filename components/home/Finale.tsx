"use client";

import { ArrowRight, ArrowUpRight, Clock, Play } from "lucide-react";
import { AnimatePresence, motion, type MotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { Portrait } from "@/components/game/bits";
import { DIFF, PITCH } from "@/components/game/seats";
import glossary from "@/data/curated/glossary.json";
import { timeAgo, useNews, usePulse } from "@/lib/api";
import { createWorld } from "@/lib/game/engine/init";
import { SEATS } from "@/lib/game/engine/types";
import { SEED_2026 } from "@/lib/game/seed";
import { SEAT_COLOR, SHORT } from "@/lib/game/text";
import { HOME_VIEW, homeView, panelOpenSelector, useGlobe } from "@/lib/store";
import { TOURS } from "@/lib/tours";
import { cn } from "@/lib/utils";
import { Reveal } from "./Chapters";
import { STORIES_AT } from "./chapterData";
import { backToGlobe, useHomeStory } from "./homeStore";

const ease = [0.22, 1, 0.36, 1] as const;
const TOUR_TINT = ["#e5484d", "#e8a21c", "#4c74d9", "#2fa36b", "#a07cf0", "#0ea5c6"];

/** Live headlines running across the page, between the story and the rest. */
export function Ticker() {
  const { data } = useNews({ limit: 14 });
  const items = data?.data ?? [];
  if (!items.length) return null;
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((n) => (
        <li key={n.id} className="flex items-center gap-4 px-6 whitespace-nowrap">
          <span className="size-1.5 rounded-full bg-[var(--gold)]" />
          <a href={n.url} target="_blank" rel="noreferrer" tabIndex={hidden ? -1 : undefined} className="text-[15px] font-semibold text-white/85 hover:text-white">
            {n.title}
          </a>
          <span className="text-[12px] font-semibold text-white/55">
            {n.source} · {timeAgo(n.publishedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Latest headlines" className="pointer-events-auto relative overflow-hidden border-y border-white/10 bg-[#070c11]/80 py-5 backdrop-blur-xl">
      <div className="absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-[#070c11] via-[#070c11] to-transparent pr-16 pl-6">
        <span className="flex items-center gap-2 rounded-full bg-[var(--down)] px-3 py-1 text-[11px] font-extrabold tracking-[.16em] text-white uppercase">
          <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" /> Live
        </span>
      </div>
      <div className="flex w-max motion-safe:animate-[marquee_80s_linear_infinite] hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}

/**
 * Story Tours over the live globe: the page pins while the reader scrolls through the six tours, and the
 * globe behind locks onto each tour's first stop. One clear button plays the tour that is on screen.
 */
export function StoryAtlas() {
  const ref = useRef<HTMLElement>(null);
  const n = TOURS.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => setActive(Math.min(n - 1, Math.max(0, Math.floor(p * n)))));
  const fill = useTransform(scrollYProgress, (p) => `${Math.min(1, p) * 100}%`);
  const here = useHomeStory((s) => s.chapter === STORIES_AT);
  const { data: pulse } = usePulse();
  const tour = TOURS[active];
  const stop = tour.stops[0];
  const tint = TOUR_TINT[active % TOUR_TINT.length];

  // while the stories are on screen the explorer's markers step aside
  useEffect(() => {
    useGlobe.getState().setStoryFocus(here);
    return () => useGlobe.getState().setStoryFocus(false);
  }, [here]);

  // the globe behind follows the story on screen
  useEffect(() => {
    if (!here) return;
    const g = useGlobe.getState();
    if (g.tour) return;
    if (panelOpenSelector(g)) g.closePanel();
    const members = stop.highlight_org ? (pulse?.data.organizations.find((o) => o.id === stop.highlight_org)?.members ?? []) : (stop.highlight ?? []);
    useGlobe.setState({ mode: "home", highlight: members });
    g.setOrbit(0);
    g.flyTo({ lat: stop.camera.lat, lng: stop.camera.lng, dist: Math.max(2.4, 1 + stop.camera.altitude) * (homeView().dist / HOME_VIEW.dist), durationMs: 1800 });
  }, [here, stop, pulse]);

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + ((i + 0.5) / n) * (el.offsetHeight - window.innerHeight), behavior: "smooth" });
  };
  const play = () => backToGlobe(() => useGlobe.getState().startTour(tour.id));

  return (
    <section id="stories" ref={ref} data-chapter={STORIES_AT} aria-labelledby="stories-title" style={{ height: `${100 + n * 60}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        <TargetLock key={tour.id} tint={tint} lat={stop.camera.lat} lng={stop.camera.lng} label={stop.caption_title} />
        {/* local scrim so the list reads over bright land */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-[rgba(4,8,12,.88)] via-[rgba(4,8,12,.55)] to-transparent max-md:hidden" />
        <div className="pointer-events-auto relative mx-auto flex h-full w-full max-w-[1380px] flex-col justify-center px-10 max-md:justify-end max-md:px-4 max-md:pb-8">
          <div className="max-w-[540px] max-md:rounded-[28px] max-md:border max-md:border-white/10 max-md:bg-[rgba(4,8,12,.72)] max-md:p-6 max-md:backdrop-blur-xl">
            <div className="flex items-center gap-3 text-[11.5px] font-extrabold tracking-[.22em] text-white/65 uppercase">
              <span className="h-[3px] w-10 rounded-full bg-[var(--gold)]" />
              Story tours
            </div>
            <h2 id="stories-title" className="mt-4 font-display text-[clamp(30px,3.4vw,48px)] leading-[1.02] font-semibold tracking-[-.02em] text-white max-md:sr-only">
              Pick a story. The globe takes you there.
            </h2>
            {/* progress for the whole reel: six segments on phones, a rail beside the list on larger screens */}
            <div aria-hidden className="mt-4 hidden gap-1.5 max-md:flex">
              {TOURS.map((t, i) => (
                <span key={t.id} className={cn("h-[3px] flex-1 rounded-full transition-colors duration-500", i <= active ? "bg-white" : "bg-white/20")} />
              ))}
            </div>
            <div className="relative mt-8 pl-6 max-md:mt-5 max-md:pl-0">
              <div aria-hidden className="absolute inset-y-1 left-0 w-[2px] overflow-hidden rounded-full bg-white/10 max-md:hidden">
                <motion.i style={{ height: fill }} className="block w-full rounded-full bg-[var(--gold)]" />
              </div>
              <ol className="grid gap-1">
                {TOURS.map((t, i) => {
                  const on = i === active;
                  return (
                    <li key={t.id} className={cn(!on && "max-md:hidden")}>
                      <button
                        type="button"
                        onClick={() => jump(i)}
                        aria-current={on ? "step" : undefined}
                        className="group grid w-full grid-cols-[36px_1fr] items-baseline gap-2 py-1.5 text-left"
                      >
                        <span className={cn("font-mono text-[12px] font-bold tabular-nums transition-colors", on ? "text-[var(--gold)]" : "text-white/55")}>{String(i + 1).padStart(2, "0")}</span>
                        <span
                          className={cn(
                            "font-display font-semibold tracking-[-.015em] transition-all duration-500",
                            on ? "text-[clamp(26px,2.6vw,36px)] leading-[1.08] text-white" : "text-[19px] leading-[1.25] text-white/60 group-hover:text-white",
                          )}
                        >
                          {t.title}
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {on && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.45, ease }}
                            className="overflow-hidden pl-[44px] max-md:pl-0"
                          >
                            <p className="pt-2 text-[15.5px] leading-relaxed text-white/70">{t.summary}</p>
                            <p className="mt-3 text-[12.5px] font-semibold text-white/60">
                              {t.stops
                                .slice(1, 4)
                                .map((s) => s.caption_title)
                                .join("  ·  ")}
                              {t.stops.length > 4 && <span className="text-white/45">{`  ·  +${t.stops.length - 4} more`}</span>}
                            </p>
                            <div className="mt-5 mb-4 flex items-center gap-4">
                              <button
                                type="button"
                                onClick={play}
                                className="group/play inline-flex h-12 items-center gap-3 rounded-full bg-white pr-1.5 pl-5 text-[14.5px] font-bold text-[#0a1218] shadow-[0_10px_30px_rgba(255,255,255,.12)] transition hover:bg-[#fff4d6] active:scale-[.97]"
                              >
                                Play this story
                                <span className="grid size-9 place-items-center rounded-full text-white transition group-hover/play:scale-105" style={{ background: tint }}>
                                  <Play className="size-3.5 fill-current" aria-hidden />
                                </span>
                              </button>
                              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/65 tabular-nums">
                                <Clock className="size-3.5" aria-hidden />
                                {Math.max(1, Math.round(t.duration_s / 60))} min · {t.stops.length} stops
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const fmt = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(1)}°${v >= 0 ? pos : neg}`;

/** Brackets that close in on the globe's centre, with the place's name and coordinates beside them. */
function TargetLock({ tint, lat, lng, label }: { tint: string; lat: number; lng: number; label: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 min-[900px]:left-[75%] max-md:top-[34%]">
      <motion.div
        initial={{ scale: 2.2, opacity: 0, rotate: -45 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 1.1, delay: 0.5, ease }}
        className="absolute -top-14 -left-14 size-28"
      >
        {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "right-0 bottom-0 border-r-2 border-b-2"].map((c) => (
          <span key={c} className={cn("absolute size-4 rounded-[3px]", c)} style={{ borderColor: tint }} />
        ))}
        <span className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full" style={{ background: tint, boxShadow: `0 0 0 6px ${tint}33, 0 0 24px ${tint}` }} />
        <span className="absolute inset-5 rounded-full border motion-safe:animate-ping" style={{ borderColor: `${tint}66` }} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 1.2, ease }}
        className="absolute top-12 left-20 w-max rounded-xl border border-white/10 bg-[#0a1016] px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,.4)] max-md:hidden"
      >
        <div className="font-mono text-[10.5px] font-bold tracking-[.12em] text-white/60 uppercase">
          {fmt(lat, "N", "S")} {fmt(lng, "E", "W")}
        </div>
        <div className="mt-0.5 text-[13px] font-bold text-white">{label}</div>
      </motion.div>
    </div>
  );
}

const LEADER_ORDER = ["IND", "USA", "CHN", "RUS", "JPN", "SAU"] as const;

/** Statecraft call to action: the six seats dealt out like a hand of cards as the section scrolls in. */
export function StatecraftBand() {
  const w = useMemo(() => createWorld(SEED_2026, { matchId: "home", seed: 2026, scenario: "calmStart" }), []);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const spread = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  return (
    <section ref={ref} aria-labelledby="statecraft-title" className="relative overflow-hidden px-10 pt-36 pb-28 max-md:px-5 max-md:pt-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="relative mx-auto grid max-w-[1380px] grid-cols-[.9fr_1.1fr] items-center gap-10 max-lg:grid-cols-1">
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }} className="flex items-center gap-3 text-[11.5px] font-extrabold tracking-[.22em] text-[var(--gold)] uppercase">
            <span className="h-[3px] w-10 rounded-full bg-[var(--gold)]" />
            Statecraft
          </motion.div>
          <h2 id="statecraft-title" className="mt-4 font-display text-[clamp(44px,5.6vw,92px)] leading-[.94] font-semibold tracking-[-.035em] text-white">
            <Reveal text="Now run a country" /> <Reveal text="yourself." delay={0.25} wordClassName="text-[var(--gold)]" />
          </h2>
          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.3, ease }} className="mt-6 max-w-[42ch] text-[18px] leading-relaxed text-white/70">
            Pick a seat, strike deals, ride out oil shocks and climb the World Power Index against five rivals.
          </motion.p>
          <motion.dl initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.4, ease }} className="mt-8 grid max-w-[440px] grid-cols-3 border-y border-white/10 py-4">
            {[
              ["12", "years"],
              ["20", "minutes"],
              ["0", "sign-ups"],
            ].map(([v, l]) => (
              <div key={l} className="border-white/10 not-first:border-l not-first:pl-5">
                <dd className="font-display text-[34px] leading-none font-semibold text-white">{v}</dd>
                <dt className="mt-1 text-[12.5px] font-semibold text-white/60">{l}</dt>
              </div>
            ))}
          </motion.dl>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.5, ease }} className="mt-9 flex flex-wrap gap-3">
            <Link href="/play" className="group inline-flex h-14 items-center gap-2.5 rounded-full bg-[var(--gold)] pr-2 pl-7 text-[16px] font-bold text-[#0a1218] shadow-[0_14px_40px_rgba(242,179,61,.3)] transition hover:bg-[#f7c65e] active:scale-[.97]">
              Play Statecraft
              <span className="grid size-10 place-items-center rounded-full bg-[#0a1218] text-[var(--gold)] transition group-hover:translate-x-0.5">
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
            <Link href="/play/match" className="inline-flex h-14 items-center rounded-full border border-white/20 px-7 text-[15px] font-bold text-white/90 transition hover:bg-white/10">
              Jump into a match
            </Link>
          </motion.div>
        </div>
        <div className="relative h-[420px] max-sm:-mx-5 max-sm:h-[300px]">
          <div className="absolute top-10 left-1/2 max-sm:top-2 max-sm:scale-[.62] max-sm:[transform-origin:top_center]">
            {LEADER_ORDER.map((s, i) => (
              <SeatCard key={s} s={s} i={i} spread={spread} power={w.power[s][0]} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SeatCard({ s, i, spread, power }: { s: (typeof LEADER_ORDER)[number]; i: number; spread: MotionValue<number>; power: number }) {
  const k = i - (LEADER_ORDER.length - 1) / 2;
  const x = useTransform(spread, (p) => k * 82 * p);
  const y = useTransform(spread, (p) => Math.abs(k) ** 2 * 5 * p + (1 - p) * 30);
  const rotate = useTransform(spread, (p) => k * 4.5 * p);
  const tint = SEAT_COLOR[s];
  return (
    <motion.div style={{ x, y, rotate, zIndex: 10 - Math.round(Math.abs(k) * 2) }} className="absolute -ml-[98px] [transform-origin:50%_120%] hover:!z-20">
      <motion.div whileHover={{ y: -34, scale: 1.05 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
        <Link
          href="/play/match"
          aria-label={`Play as ${SHORT[s]}`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--px", `${((e.clientX - r.left) / r.width) * 100}%`);
            e.currentTarget.style.setProperty("--py", `${((e.clientY - r.top) / r.height) * 100}%`);
          }}
          className="group relative block h-[290px] w-[196px] overflow-hidden rounded-[22px] border border-white/15 bg-[#0c151c] shadow-[0_30px_60px_rgba(0,0,0,.55)] outline-offset-4 [--px:50%] [--py:30%]"
        >
          <div className="relative h-[124px] overflow-hidden">
            <Flag iso3={s} className="!absolute !inset-0 !h-full !w-full !bg-cover opacity-80 saturate-[.85]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c151c]/30 to-[#0c151c]" />
          </div>
          <div className="relative -mt-8 px-4">
            <Portrait i={SEATS.indexOf(s)} seat={tint} size={50} />
            <div className="mt-3 font-display text-[22px] leading-none font-semibold text-white">{SHORT[s]}</div>
            <p className="mt-2 text-[12.5px] leading-snug text-white/65">{PITCH[s]}</p>
          </div>
          <div className="absolute inset-x-4 bottom-3.5 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11.5px] font-bold">
            <span className="text-white/60">{DIFF[s]}</span>
            <span className="text-white tabular-nums">
              <span className="text-white/60">Power </span>
              {power.toFixed(1)}
            </span>
          </div>
          {/* foil sheen that follows the pointer */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: "radial-gradient(circle at var(--px) var(--py), rgba(255,255,255,.55), transparent 45%), linear-gradient(115deg, transparent 30%, rgba(255,214,140,.35) 45%, rgba(140,200,255,.3) 55%, transparent 70%)" }}
          />
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/0 transition group-hover:ring-2" style={{ ["--tw-ring-color" as string]: tint }} />
        </Link>
      </motion.div>
    </motion.div>
  );
}

/** Glossary and sources, then a closing wordmark. */
export function Outro() {
  const terms = glossary.terms.slice(0, 16);
  return (
    <>
      <section className="mx-auto grid max-w-[1380px] grid-cols-[1.3fr_.7fr] gap-5 px-10 pb-24 max-lg:grid-cols-1 max-md:px-5">
        <div className="rounded-[28px] border border-white/10 bg-white/[.03] p-9 max-md:p-6">
          <div className="text-[11.5px] font-extrabold tracking-[.22em] text-white/65 uppercase">Glossary</div>
          <h2 className="mt-3 font-display text-[clamp(32px,3.4vw,46px)] leading-tight font-semibold text-white">Words that run the world.</h2>
          <div className="mt-7 flex flex-wrap gap-2">
            {terms.map((t) => (
              <Link key={t.id} href={`/glossary#${t.id}`} className="rounded-full border border-white/12 bg-white/[.04] px-3.5 py-1.5 text-[13px] font-semibold text-white/75 transition hover:border-white/40 hover:bg-white/10 hover:text-white">
                {t.term}
              </Link>
            ))}
            <Link href="/glossary" className="inline-flex items-center gap-1 px-2 py-1.5 text-[13px] font-bold text-[var(--gold)] hover:underline">
              All {glossary.terms.length} terms <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="flex flex-col rounded-[28px] border border-white/10 bg-white/[.03] p-9 max-md:p-6">
          <div className="text-[11.5px] font-extrabold tracking-[.22em] text-white/65 uppercase">Sources</div>
          <h2 className="mt-3 font-display text-[clamp(32px,3.4vw,46px)] leading-tight font-semibold text-white">Show your work.</h2>
          <p className="mt-3 flex-1 text-[15px] leading-relaxed text-white/60">Headlines from trusted outlets, maps from Natural Earth and NASA. A story is marked verified only when two independent outlets report it.</p>
          <Link href="/sources" className="mt-6 inline-flex items-center gap-1.5 self-start text-[14px] font-bold text-white hover:underline">
            Where the data comes from <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
      <footer className="relative overflow-hidden border-t border-white/10">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-10 pt-8 text-[13px] text-white/65 max-md:px-5">
          <span>{"GeoPolitics · The world, explained"}</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-6 font-semibold">
            <Link href="/glossary" className="hover:text-white">Glossary</Link>
            <Link href="/sources" className="hover:text-white">Sources</Link>
            <Link href="/play" className="hover:text-white">Statecraft</Link>
            <button type="button" onClick={() => backToGlobe()} className="hover:text-white">Back to the globe ↑</button>
          </nav>
        </div>
        {/* the wordmark is drawn from an attribute so it stays decoration, not page text */}
        <div
          aria-hidden
          data-word="GeoPolitics"
          className="pointer-events-none mt-6 -mb-[3vw] bg-[linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,0)_85%)] bg-clip-text text-center font-display text-[18.5vw] leading-none font-semibold tracking-[-.05em] text-transparent select-none before:content-[attr(data-word)]"
        />
      </footer>
    </>
  );
}
