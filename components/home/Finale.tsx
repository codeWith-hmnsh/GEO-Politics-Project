"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, type MotionValue, useScroll, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { Flag } from "@/components/chrome/Flag";
import { Portrait } from "@/components/game/bits";
import { DIFF, PITCH } from "@/components/game/seats";
import glossary from "@/data/curated/glossary.json";
import { timeAgo, useNews } from "@/lib/api";
import { createWorld } from "@/lib/game/engine/init";
import { SEATS } from "@/lib/game/engine/types";
import { SEED_2026 } from "@/lib/game/seed";
import { SEAT_COLOR, SHORT } from "@/lib/game/text";
import { Reveal } from "./Chapters";
import { backToGlobe } from "./homeStore";

const ease = [0.22, 1, 0.36, 1] as const;

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
          <a href={n.url} target="_blank" rel="noreferrer" tabIndex={hidden ? -1 : undefined} className="font-display text-[17px] font-semibold text-[var(--ink-strong)] hover:underline">
            {n.title}
          </a>
          <span className="text-[12px] font-semibold text-[var(--ink-3)]">
            {n.source} · {timeAgo(n.publishedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Latest headlines" className="pointer-events-auto relative overflow-hidden border-y border-[var(--line)] bg-white py-4">
      <div className="absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-white via-white to-transparent pr-16 pl-6">
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

const LEADER_ORDER = ["IND", "USA", "CHN", "RUS", "JPN", "SAU"] as const;

/** Statecraft call to action: the six seats dealt out like a hand of cards as the section scrolls in. */
export function StatecraftBand() {
  const w = useMemo(() => createWorld(SEED_2026, { matchId: "home", seed: 2026, scenario: "calmStart" }), []);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const spread = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  return (
    <section ref={ref} aria-labelledby="statecraft-title" className="relative overflow-hidden px-10 pt-32 pb-28 max-md:px-5 max-md:pt-20">
      <div className="relative mx-auto grid max-w-[1380px] grid-cols-[.9fr_1.1fr] items-center gap-10 max-lg:grid-cols-1">
        <div>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }} className="flex items-center gap-3 text-[11.5px] font-extrabold tracking-[.22em] text-[var(--ink-2)] uppercase">
            <span className="h-[3px] w-10 rounded-full bg-[var(--gold)]" />
            Statecraft
          </motion.div>
          <h2 id="statecraft-title" className="mt-4 font-display text-[clamp(44px,5.6vw,92px)] leading-[.96] font-semibold tracking-[-.035em] text-[var(--ink-strong)]">
            <Reveal text="Now run a country" />{" "}
            {/* a highlighter stroke under the last word */}
            <Reveal text="yourself." delay={0.25} wordClassName="bg-[linear-gradient(transparent_60%,rgba(242,179,61,.6)_60%,rgba(242,179,61,.6)_90%,transparent_90%)] px-[.04em]" />
          </h2>
          <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.3, ease }} className="mt-6 max-w-[42ch] text-[18px] leading-relaxed text-[var(--ink-2)]">
            Pick a seat, strike deals, ride out oil shocks and climb the World Power Index against five rivals.
          </motion.p>
          <motion.dl initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.4, ease }} className="mt-8 grid max-w-[440px] grid-cols-3 border-y border-[var(--line)] py-4">
            {[
              ["12", "years"],
              ["20", "minutes"],
              ["0", "sign-ups"],
            ].map(([v, l]) => (
              <div key={l} className="border-[var(--line)] not-first:border-l not-first:pl-5">
                <dd className="font-display text-[34px] leading-none font-semibold text-[var(--ink-strong)]">{v}</dd>
                <dt className="mt-1 text-[12.5px] font-semibold text-[var(--ink-3)]">{l}</dt>
              </div>
            ))}
          </motion.dl>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.5, ease }} className="mt-9 flex flex-wrap gap-3">
            <Link href="/play" className="group inline-flex h-14 items-center gap-2.5 rounded-full bg-[var(--ink-strong)] pr-2 pl-7 text-[16px] font-bold text-white shadow-[0_14px_34px_rgba(17,35,43,.22)] transition hover:bg-[#1b313b] active:scale-[.97]">
              Play Statecraft
              <span className="grid size-10 place-items-center rounded-full bg-[var(--gold)] text-[var(--ink-strong)] transition group-hover:translate-x-0.5">
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
            <Link href="/play/match" className="inline-flex h-14 items-center rounded-full border border-[rgba(17,35,43,.18)] bg-white/60 px-7 text-[15px] font-bold text-[var(--ink-strong)] transition hover:bg-white">
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
          className="group relative block h-[290px] w-[196px] overflow-hidden rounded-[22px] border border-[var(--line)] bg-white shadow-[0_24px_50px_rgba(17,35,43,.16),0_2px_6px_rgba(17,35,43,.06)] outline-offset-4 [--px:50%] [--py:30%]"
        >
          <div className="relative h-[118px] overflow-hidden">
            <Flag iso3={s} className="!absolute !inset-0 !h-full !w-full !bg-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white" />
          </div>
          <div className="relative -mt-8 px-4">
            <Portrait i={SEATS.indexOf(s)} seat={tint} size={50} />
            <div className="mt-3 font-display text-[22px] leading-none font-semibold text-[var(--ink-strong)]">{SHORT[s]}</div>
            <p className="mt-2 text-[12.5px] leading-snug text-[var(--ink-2)]">{PITCH[s]}</p>
          </div>
          <div className="absolute inset-x-4 bottom-3.5 flex items-center justify-between border-t border-[var(--line)] pt-2.5 text-[11.5px] font-bold">
            <span className="text-[var(--ink-3)]">{DIFF[s]}</span>
            <span className="text-[var(--ink-strong)] tabular-nums">
              <span className="text-[var(--ink-3)]">Power </span>
              {power.toFixed(1)}
            </span>
          </div>
          {/* foil sheen that follows the pointer */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: "radial-gradient(circle at var(--px) var(--py), rgba(255,255,255,.7), transparent 40%), linear-gradient(115deg, transparent 30%, rgba(255,214,140,.22) 45%, rgba(140,200,255,.2) 55%, transparent 70%)" }}
          />
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px] ring-0 transition group-hover:ring-2" style={{ ["--tw-ring-color" as string]: tint }} />
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
        <div className="rounded-[28px] border border-[var(--line)] bg-white/70 p-9 shadow-[0_1px_0_rgba(255,255,255,.8)_inset] max-md:p-6">
          <div className="text-[11.5px] font-extrabold tracking-[.22em] text-[var(--ink-3)] uppercase">Glossary</div>
          <h2 className="mt-3 font-display text-[clamp(32px,3.4vw,46px)] leading-tight font-semibold text-[var(--ink-strong)]">Words that run the world.</h2>
          <div className="mt-7 flex flex-wrap gap-2">
            {terms.map((t) => (
              <Link key={t.id} href={`/glossary#${t.id}`} className="rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[rgba(17,35,43,.3)] hover:shadow-[0_4px_12px_rgba(17,35,43,.08)]">
                {t.term}
              </Link>
            ))}
            <Link href="/glossary" className="inline-flex items-center gap-1 px-2 py-1.5 text-[13px] font-bold text-[var(--ink-strong)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 hover:decoration-[var(--ink-strong)]">
              All {glossary.terms.length} terms <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="flex flex-col rounded-[28px] border border-[var(--line)] bg-white/70 p-9 max-md:p-6">
          <div className="text-[11.5px] font-extrabold tracking-[.22em] text-[var(--ink-3)] uppercase">Sources</div>
          <h2 className="mt-3 font-display text-[clamp(32px,3.4vw,46px)] leading-tight font-semibold text-[var(--ink-strong)]">Show your work.</h2>
          <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[var(--ink-2)]">Headlines from trusted outlets, maps from Natural Earth and NASA. A story is marked verified only when two independent outlets report it.</p>
          <Link href="/sources" className="mt-6 inline-flex items-center gap-1.5 self-start text-[14px] font-bold text-[var(--ink-strong)] hover:underline">
            Where the data comes from <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
      <footer className="relative overflow-hidden border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4 px-10 pt-8 text-[13px] text-[var(--ink-2)] max-md:px-5">
          <span>{"GeoPolitics · The world, explained"}</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-6 font-semibold">
            <Link href="/glossary" className="hover:text-[var(--ink-strong)]">Glossary</Link>
            <Link href="/sources" className="hover:text-[var(--ink-strong)]">Sources</Link>
            <Link href="/play" className="hover:text-[var(--ink-strong)]">Statecraft</Link>
            <button type="button" onClick={() => backToGlobe()} className="hover:text-[var(--ink-strong)]">Back to the globe ↑</button>
          </nav>
        </div>
        {/* the wordmark is drawn from an attribute so it stays decoration, not page text */}
        <div
          aria-hidden
          data-word="GeoPolitics"
          className="pointer-events-none mt-6 -mb-[3vw] bg-[linear-gradient(180deg,rgba(17,35,43,.14),rgba(17,35,43,0)_85%)] bg-clip-text text-center font-display text-[18.5vw] leading-none font-semibold tracking-[-.05em] text-transparent select-none before:content-[attr(data-word)]"
        />
      </footer>
    </>
  );
}
