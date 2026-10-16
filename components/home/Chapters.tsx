"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import CountUp from "@/components/bits/CountUp";
import chokepoints from "@/data/curated/chokepoints.json";
import nuclear from "@/data/curated/nuclear.json";
import orgs from "@/data/curated/organizations.json";
import { usePulse } from "@/lib/api";
import { metricById, type ChoroplethMode, type MetricId } from "@/lib/metrics";
import { HOME_VIEW, homeView, panelOpenSelector, useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CHAPTERS, type Chapter } from "./chapterData";
import { useHomeStory } from "./homeStore";

const ease = [0.22, 1, 0.36, 1] as const;

function applyChapter(c: Chapter) {
  const g = useGlobe.getState();
  if (g.tour) return;
  if (panelOpenSelector(g)) g.closePanel();
  useGlobe.setState({ mode: c.mode, highlight: [], ...(c.diplo ? { diplo: c.diplo } : {}) });
  if (c.metric && c.mode !== "home" && c.mode !== "diplomacy") g.setModeMetric(c.mode as ChoroplethMode, c.metric);
  if (c.id === "conflict" && !g.layers.wars) g.toggleLayer("wars");
  g.setOrbit(c.orbit);
  // narrow screens need the camera farther out, as on the home view
  g.flyTo({ ...c.cam, dist: c.cam.dist * (homeView().dist / HOME_VIEW.dist), durationMs: 1900 });
}

function resetToExplorer() {
  const g = useGlobe.getState();
  if (g.tour) return;
  useGlobe.setState({ mode: "home", highlight: [] });
  g.setOrbit(0);
  g.flyTo({ ...homeView(), durationMs: 1600 });
}

/** Picks the chapter crossing the middle of the screen and hands the globe to it. */
function useChapterDriver() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-chapter]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number(e.target.getAttribute("data-chapter"));
          const prev = useHomeStory.getState().chapter;
          if (i === prev) continue;
          useHomeStory.getState().setChapter(i);
          if (i >= CHAPTERS.length) continue;
          if (i >= 0) applyChapter(CHAPTERS[i]);
          else if (prev >= 0) resetToExplorer();
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      useGlobe.getState().setOrbit(0);
      useHomeStory.getState().setChapter(-1);
    };
  }, []);
}

/** Words rise out of a blur, one after another. */
export function Reveal({ text, className, wordClassName, delay = 0 }: { text: string; className?: string; wordClassName?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <motion.span
            key={i}
            className={cn("inline-block whitespace-pre", wordClassName)}
            initial={{ opacity: 0, y: "0.35em" }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.8, delay: delay + i * 0.06, ease }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </span>
    </span>
  );
}

const fadeUp = (d = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10% 0px" },
  transition: { duration: 0.8, delay: d, ease },
});

function ChapterFrame({ i, title, body, children }: { i: number; title: string; body: React.ReactNode; children: React.ReactNode }) {
  const c = CHAPTERS[i];
  return (
    <section id={`chapter-${c.id}`} data-chapter={i} aria-labelledby={`chapter-${c.id}-title`} className="pointer-events-none relative flex min-h-[130vh] items-center max-md:min-h-[150vh] max-md:items-end max-md:pb-[20vh]">
      <div className="mx-auto w-full max-w-[1380px] px-10 max-md:px-4">
        <div className="pointer-events-auto max-w-[520px] max-md:rounded-[28px] max-md:border max-md:border-[var(--line)] max-md:bg-white/95 max-md:p-6 max-md:shadow-[0_20px_50px_rgba(17,35,43,.12)]">
          <motion.div {...fadeUp()} className="flex items-center gap-4">
            <span className="font-display text-[88px] leading-[.8] font-semibold tracking-tight text-transparent [-webkit-text-stroke:1.2px_rgba(17,35,43,.32)] max-md:text-[60px]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="grid gap-1.5">
              <span className="block h-[3px] w-10 rounded-full" style={{ background: c.tint }} />
              <span className="text-[11.5px] font-extrabold tracking-[.22em] text-[var(--ink-3)] uppercase">Chapter {i + 1} · {c.name}</span>
            </span>
          </motion.div>
          <h2 id={`chapter-${c.id}-title`} className="mt-6 font-display text-[clamp(40px,5.2vw,76px)] leading-[.98] font-semibold tracking-[-.025em] text-[var(--ink-strong)]">
            <Reveal text={title} />
          </h2>
          <motion.div {...fadeUp(0.25)} className="mt-5 text-[17.5px] leading-relaxed text-[var(--ink-2)]">
            {body}
          </motion.div>
          <motion.div {...fadeUp(0.4)} className="mt-8">
            {children}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold transition",
    on ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white shadow-[0_8px_20px_rgba(17,35,43,.2)]" : "border-[var(--line)] bg-white/80 text-[var(--ink)] hover:border-[rgba(17,35,43,.3)] hover:bg-white",
  );

function Stat({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <div>
      <div className="font-display text-[56px] leading-none font-semibold tracking-tight text-[var(--ink-strong)] tabular-nums max-md:text-[44px]">
        <CountUp to={value} duration={1.6} separator="," />
        {suffix}
      </div>
      <div className="mt-1.5 text-[13px] font-semibold text-[var(--ink-3)]">{label}</div>
    </div>
  );
}

function Conflict() {
  const { data } = usePulse();
  const list = [...(data?.data.conflicts ?? [])].sort((a, b) => b.intensity - a.intensity).slice(0, 5);
  const active = data?.data.conflicts.filter((c) => c.status === "active").length;
  return (
    <ChapterFrame
      i={0}
      title="The world is not at peace."
      body="Wars, ceasefires and insurgencies, each pinned where it is fought and checked against trusted reporting. Touch one to fly there."
    >
      {active !== undefined && <Stat value={active} label="active conflicts tracked right now" />}
      <ul className="mt-6 grid gap-1.5">
        {list.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              aria-label={`Show on the globe: ${c.parties.join(" against ")}`}
              onMouseEnter={() => useGlobe.getState().flyTo({ lat: c.at[0], lng: c.at[1], dist: 2.3, durationMs: 1400 })}
              onClick={() => useGlobe.getState().flyTo({ lat: c.at[0], lng: c.at[1], dist: 2.1, durationMs: 1200 })}
              className="group flex w-full items-center gap-4 rounded-2xl border border-transparent px-3 py-2.5 text-left transition hover:border-[var(--line)] hover:bg-white/80"
            >
              <span className="flex gap-[3px]">
                {[1, 2, 3].map((k) => (
                  <i key={k} className={cn("h-4 w-[3px] rounded-full", k <= c.intensity ? "bg-[var(--conflict)]" : "bg-[rgba(17,35,43,.14)]")} />
                ))}
              </span>
              <span className="flex-1 text-[15px] font-semibold text-[var(--ink-strong)]">{c.name}</span>
              <span className="text-[12px] font-semibold text-[var(--ink-3)]">{c.status === "ceasefire" ? "Ceasefire" : `Since ${c.start.slice(0, 4)}`}</span>
            </button>
          </li>
        ))}
      </ul>
    </ChapterFrame>
  );
}

function MetricPicker({ mode, ids }: { mode: ChoroplethMode; ids: MetricId[] }) {
  const current = useGlobe((s) => s.modeMetric[mode]);
  const m = metricById(current);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <button key={id} type="button" aria-pressed={current === id} onClick={() => useGlobe.getState().setModeMetric(mode, id)} className={chip(current === id)}>
            {metricById(id).label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-[var(--ink-3)]">
        On the globe: <b className="font-semibold text-[var(--ink)]">{m.title}</b> · {m.source}
      </p>
    </div>
  );
}

function Money() {
  return (
    <ChapterFrame
      i={1}
      title="Money moves before armies do."
      body="Growth, prices, jobs and debt for every economy, painted straight onto the map. Switch the measure and watch the planet re-colour."
    >
      <MetricPicker mode="economy" ids={["growth", "inflation", "unemployment", "debt", "gdp"]} />
    </ChapterFrame>
  );
}

function Energy() {
  const [id, setId] = useState("hormuz");
  const c = chokepoints.items.find((x) => x.id === id)!;
  return (
    <ChapterFrame
      i={2}
      title="The world runs through six narrow gaps."
      body="Oil and gas cross the sea through a handful of straits and canals. Close one, and prices jump on the other side of the planet."
    >
      <div className="flex flex-wrap gap-2">
        {chokepoints.items.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={id === x.id}
            onClick={() => {
              setId(x.id);
              useGlobe.getState().flyTo({ lat: x.at[0], lng: x.at[1], dist: 2.2, durationMs: 1500 });
            }}
            className={chip(id === x.id)}
          >
            {x.name.replace(/ \(.*\)$/, "")}
          </button>
        ))}
      </div>
      <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_30px_rgba(17,35,43,.08)]">
        <div className="text-[11px] font-extrabold tracking-[.18em] text-[var(--up)] uppercase">{c.name}</div>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink)]">{c.flow}</p>
      </motion.div>
    </ChapterFrame>
  );
}

function Force() {
  const warheads = nuclear.items.reduce((t, x) => t + x.warheads, 0);
  return (
    <ChapterFrame
      i={3}
      title="Power still wears a uniform."
      body="Military spending, armed forces and the arsenals behind deterrence, compared country by country."
    >
      <div className="mb-7 flex gap-10">
        <Stat value={nuclear.items.length} label="countries with nuclear weapons" />
        <Stat value={warheads} label="warheads, estimated (FAS 2025)" />
      </div>
      <MetricPicker mode="defense" ids={["milPct", "milUsd", "personnel", "nuclear", "capability"]} />
    </ChapterFrame>
  );
}

function Alliances() {
  const bloc = useGlobe((s) => s.diplo.bloc);
  const o = orgs.items.find((x) => x.id === bloc) ?? orgs.items[0];
  return (
    <ChapterFrame
      i={4}
      title="Everyone belongs to a club."
      body="Alliances promise defence, blocs promise markets, forums promise a seat at the table. Pick one and see who is in."
    >
      <div className="flex flex-wrap gap-2">
        {orgs.items.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={bloc === x.id}
            onClick={() => {
              useGlobe.setState({ mode: "diplomacy" });
              useGlobe.getState().setDiplo({ view: "blocs", bloc: x.id });
              useGlobe.getState().flyTo({ lat: x.pin[0], lng: x.pin[1], dist: 3.3, durationMs: 1500 });
            }}
            className={chip(bloc === x.id)}
          >
            <i className="size-2 rounded-full" style={{ background: x.color }} />
            {x.id}
          </button>
        ))}
      </div>
      <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-start gap-5 rounded-2xl border border-[var(--line)] bg-white/95 p-5 shadow-[0_12px_30px_rgba(17,35,43,.08)]">
        <div className="text-center">
          <div className="font-display text-[44px] leading-none font-semibold text-[var(--ink-strong)] tabular-nums">{o.members.length}</div>
          <div className="mt-1 text-[11px] font-bold text-[var(--ink-3)]">members</div>
        </div>
        <div>
          <div className="text-[15px] font-bold text-[var(--ink-strong)]">{o.name}</div>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--ink-2)]">{o.purpose}</p>
        </div>
      </motion.div>
    </ChapterFrame>
  );
}

export function Chapters() {
  useChapterDriver();
  return (
    <>
      {/* the globe hero: an empty first screen the explorer shows through */}
      <div data-chapter={-1} aria-hidden className="pointer-events-none h-[105vh]" />
      <Conflict />
      <Money />
      <Energy />
      <Force />
      <Alliances />
    </>
  );
}
