"use client";

import { ArrowRight, ArrowUpRight, Clock, Play } from "lucide-react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { Portrait } from "@/components/game/bits";
import glossary from "@/data/curated/glossary.json";
import { timeAgo, useNews } from "@/lib/api";
import { createWorld } from "@/lib/game/engine/init";
import { SEATS } from "@/lib/game/engine/types";
import { SEED_2026 } from "@/lib/game/seed";
import { SEAT_COLOR, SHORT } from "@/lib/game/text";
import { useGlobe } from "@/lib/store";
import { TOURS } from "@/lib/tours";
import { cn } from "@/lib/utils";
import { Reveal } from "./Chapters";
import { backToGlobe } from "./homeStore";

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

/** Story Tours as a horizontal reel, pinned while the page scrolls past it. */
export function StoriesRail() {
  const outer = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [span, setSpan] = useState(0);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSpan(Math.max(0, el.scrollWidth - window.innerWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -span]);
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <section id="stories" ref={outer} style={{ height: `calc(100vh + ${span}px)` }} className="relative scroll-mt-0">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 flex w-full max-w-[1380px] items-end justify-between gap-6 px-10 max-md:px-5">
          <div>
            <div className="text-[11.5px] font-extrabold tracking-[.22em] text-white/55 uppercase">Story Tours</div>
            <h2 className="mt-3 font-display text-[clamp(40px,5vw,72px)] leading-[.98] font-semibold tracking-[-.025em] text-white">
              <Reveal text="Two minutes. One big story." />
            </h2>
          </div>
          <div className="w-[220px] max-md:hidden">
            <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
              <motion.i style={{ width: bar }} className="block h-full rounded-full bg-[var(--gold)]" />
            </div>
            <p className="mt-2 text-right text-[12px] font-semibold text-white/60">Keep scrolling</p>
          </div>
        </div>
        <motion.div ref={track} style={{ x }} className="flex w-max gap-5 px-10 max-md:px-5">
          {TOURS.map((t, i) => (
            <TourCard key={t.id} i={i} title={t.title} summary={t.summary} minutes={Math.max(1, Math.round(t.duration_s / 60))} stops={t.stops.length} onWatch={() => backToGlobe(() => useGlobe.getState().startTour(t.id))} />
          ))}
          <div className="flex w-[360px] shrink-0 flex-col justify-end rounded-[28px] border border-dashed border-white/15 p-8 max-md:w-[78vw]">
            <p className="font-display text-[30px] leading-tight font-semibold text-white">More stories are on the way.</p>
            <button type="button" onClick={() => backToGlobe(() => useGlobe.getState().openSide("stories"))} className="mt-5 inline-flex items-center gap-2 self-start text-[14px] font-bold text-[var(--gold)] hover:underline">
              Open the story list <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TourCard({ i, title, summary, minutes, stops, onWatch }: { i: number; title: string; summary: string; minutes: number; stops: number; onWatch: () => void }) {
  const tint = TOUR_TINT[i % TOUR_TINT.length];
  return (
    <article
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className="group relative flex h-[min(520px,62vh)] w-[420px] shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b131a] p-8 max-md:w-[78vw] max-md:p-6"
    >
      {/* spotlight that follows the pointer */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `radial-gradient(420px circle at var(--mx) var(--my), ${tint}33, transparent 60%)` }} />
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" style={{ background: `${tint}2e` }} />
      <div aria-hidden data-n={String(i + 1).padStart(2, "0")} className="pointer-events-none absolute -right-6 -bottom-16 font-display text-[240px] leading-none font-semibold text-white/[.04] before:content-[attr(data-n)]" />
      {/* a dotted planet with an orbit, turning slowly */}
      <div aria-hidden className="pointer-events-none absolute top-14 right-8 size-[190px] max-md:size-[150px]">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.55)_1px,transparent_1.6px)] [background-size:9px_9px] [mask-image:radial-gradient(circle_at_38%_35%,#000_30%,transparent_70%)] motion-safe:animate-[spin_60s_linear_infinite]" />
        <div className="absolute inset-0 rounded-full shadow-[inset_-20px_-24px_60px_rgba(0,0,0,.6)]" style={{ background: `radial-gradient(circle at 35% 30%, ${tint}55, transparent 62%)` }} />
        <div className="absolute -inset-6 rounded-full border border-white/10 [transform:rotateX(70deg)_rotateZ(-20deg)]" />
        <span className="absolute top-1/2 -right-5 size-2.5 rounded-full shadow-[0_0_12px_currentColor]" style={{ background: tint, color: tint }} />
      </div>
      <div className="relative flex items-center gap-3 text-[12px] font-bold text-white/55">
        <span className="h-[3px] w-8 rounded-full" style={{ background: tint }} />
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> {minutes} min
        </span>
        <span>· {stops} stops</span>
      </div>
      <h3 className="relative mt-auto font-display text-[34px] leading-[1.05] font-semibold tracking-tight text-white max-md:text-[28px]">{title}</h3>
      <p className="relative mt-3 text-[15px] leading-relaxed text-white/60">{summary}</p>
      <button
        type="button"
        onClick={onWatch}
        aria-label={`Watch the story tour: ${title}`}
        className="relative mt-7 inline-flex items-center gap-2.5 self-start rounded-full bg-white py-2.5 pr-5 pl-2.5 text-[14px] font-bold text-[#0a1218] transition hover:gap-3.5 active:scale-[.97]"
      >
        <span className="grid size-8 place-items-center rounded-full text-white" style={{ background: tint }}>
          <Play className="size-3.5 fill-current" aria-hidden />
        </span>
        Watch on the globe
      </button>
    </article>
  );
}

/** Statecraft call to action with a card that tilts toward the pointer. */
export function StatecraftBand() {
  const w = useMemo(() => createWorld(SEED_2026, { matchId: "home", seed: 2026, scenario: "calmStart" }), []);
  const order = [...SEATS].sort((a, b) => w.power[b][0] - w.power[a][0]);
  const max = w.power[order[0]][0];
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 150, damping: 18 });
  return (
    <section className="relative overflow-hidden px-10 py-32 max-md:px-5 max-md:py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_75%_50%,rgba(242,179,61,.16),transparent_70%)]" />
      <div className="relative mx-auto grid max-w-[1380px] grid-cols-[1fr_1fr] items-center gap-16 max-lg:grid-cols-1">
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }} className="text-[11.5px] font-extrabold tracking-[.22em] text-[var(--gold)] uppercase">
            Statecraft · geopolitics you play
          </motion.div>
          <h2 className="mt-4 font-display text-[clamp(48px,6.4vw,104px)] leading-[.92] font-semibold tracking-[-.035em] text-white">
            <Reveal text="Now run a country" />{" "}
            <em className="font-medium">
              <Reveal text="yourself." delay={0.25} wordClassName="bg-[linear-gradient(100deg,#f7c65e,#fff2cc_45%,#f2b33d)] bg-clip-text pr-[.08em] text-transparent" />
            </em>
          </h2>
          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.3, ease }} className="mt-6 max-w-[46ch] text-[18px] leading-relaxed text-white/65">
            Six leaders, twelve years, one shared world. Strike deals, ride out oil shocks and climb the World Power Index. About 20 minutes. Free, no login.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.45, ease }} className="mt-9 flex flex-wrap gap-3">
            <Link href="/play" className="group relative inline-flex min-h-14 items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-b from-[#F7C65E] to-[var(--gold)] px-8 text-[16px] font-bold text-[#0a1218] shadow-[0_14px_40px_rgba(242,179,61,.35)] transition active:scale-[.97]">
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition duration-700 group-hover:translate-x-full" />
              <span className="relative">Play Statecraft</span> <ArrowRight className="relative size-4 transition group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link href="/play/match" className="inline-flex min-h-14 items-center rounded-full border border-white/20 px-7 text-[15px] font-bold text-white/90 transition hover:bg-white/10">
              Jump into a match
            </Link>
          </motion.div>
        </div>
        <div
          className="[perspective:1200px]"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            mx.set((e.clientX - r.left) / r.width - 0.5);
            my.set((e.clientY - r.top) / r.height - 0.5);
          }}
          onPointerLeave={() => {
            mx.set(0);
            my.set(0);
          }}
        >
          <motion.div
            style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease }}
            className="relative mx-auto w-full max-w-[520px] rounded-[30px] border border-white/15 bg-gradient-to-b from-white/[.12] to-white/[.04] p-6 shadow-[0_50px_120px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.15)] backdrop-blur-2xl"
          >
            <div style={{ transform: "translateZ(40px)" }} className="flex items-baseline justify-between">
              <span className="font-display text-[40px] leading-none font-semibold text-white">2026</span>
              <span className="text-[11px] font-extrabold tracking-[.18em] text-white/65 uppercase">World Power Index</span>
            </div>
            <ol style={{ transform: "translateZ(60px)" }} className="mt-5 grid gap-2">
              {order.map((s, i) => (
                <li key={s} className={cn("grid grid-cols-[18px_32px_1fr_48px] items-center gap-3 rounded-2xl border px-3 py-2.5", s === "IND" ? "border-[var(--gold)]/70 bg-[rgba(242,179,61,.12)]" : "border-white/10 bg-white/[.04]")}>
                  <span className="text-[13px] font-extrabold text-white/65">{i + 1}</span>
                  <Portrait i={SEATS.indexOf(s)} seat={SEAT_COLOR[s]} size={28} />
                  <div className="min-w-0">
                    <b className="flex items-center gap-1.5 text-[13.5px] text-white">
                      <Flag iso3={s} className="!w-[18px]" /> {SHORT[s]}
                      {s === "IND" && <span className="rounded-full bg-[var(--gold)] px-1.5 text-[10px] font-extrabold text-[#0a1218]">YOU</span>}
                    </b>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.i initial={{ width: 0 }} whileInView={{ width: `${(w.power[s][0] / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.3 + i * 0.08, ease }} className="block h-full rounded-full" style={{ background: SEAT_COLOR[s] }} />
                    </div>
                  </div>
                  <span className="text-right text-[14px] font-extrabold text-white tabular-nums">{w.power[s][0].toFixed(1)}</span>
                </li>
              ))}
            </ol>
            <div style={{ transform: "translateZ(80px)" }} className="absolute -bottom-6 -left-6 rounded-2xl border border-white/15 bg-[#0b131a]/90 px-4 py-3 shadow-[0_20px_40px_rgba(0,0,0,.5)] backdrop-blur max-sm:hidden">
              <div className="text-[10.5px] font-extrabold tracking-[.16em] text-[var(--gold)] uppercase">Your mission</div>
              <div className="mt-0.5 text-[13.5px] font-bold text-white">Jobs for a young country</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
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
