"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { EVENT_BY_ID, SCENARIOS } from "@/lib/game/engine/events";
import { createWorld } from "@/lib/game/engine/init";
import { SEED_2026 } from "@/lib/game/seed";
import { leaderScore, MISSIONS, ranks, standings } from "@/lib/game/engine/score";
import type { Iso3, ScenarioId } from "@/lib/game/engine/types";
import { DIMENSIONS, REGIONS, SEATS } from "@/lib/game/engine/types";
import { REGION_DEFS } from "@/lib/game/engine/regions";
import { sound } from "@/lib/game/sound";
import { useGame } from "@/lib/game/store";
import { CAPITAL, LEADERS, NAMES, SEAT_COLOR, SHORT, cap, money } from "@/lib/game/text";
import { focus } from "@/lib/game/camera";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { encodeShare, type Share } from "@/lib/game/share";
import { Btn, Portrait, eyebrow, glass } from "./bits";
import { DIFF, PITCH, STRONG, WEAK } from "./seats";
import { ShareCard } from "./ShareCard";

const EVENT_PLACE: Record<string, [number, number]> = {
  "energy.hormuz": [26.6, 56.3],
  "energy.pipeline": [55, 15],
  "energy.opecCut": [48.2, 16.4],
  "energy.mildWinter": [55, 40],
  "food.monsoon": [22, 79],
  "food.drought": [34.7, 113.6],
  "food.locusts": [9, 42],
  "food.exportBans": [20, 30],
  "trade.chipControls": [24, 120.9],
  "trade.portStrike": [30.5, 32.3],
  "trade.currencyShock": [40.7, -74],
  "trade.supplyShift": [12, 105],
  "general.heatwave": [32, 10],
  "general.financialPanic": [40.7, -74],
  "general.pandemicScare": [30.6, 114.3],
  "general.techBreakthrough": [37.4, -122],
};

// ───────── Country pick ─────────

const FRESH = createWorld(SEED_2026, { matchId: "pick", seed: 2026, scenario: "calmStart" });

/** Look a little east of the capital so the country sits left of the dossier (desktop only). */
function pickFocus(me: Iso3) {
  const wide = window.innerWidth >= 1024;
  focus(CAPITAL[me][0] - 4, CAPITAL[me][1] + (wide ? 20 : 0), 3.9, 1100);
}

/** Take a seat; a custom leader name carries over, a default one follows the country. */
function pickSeat(s: Iso3) {
  const { setup, setSetup } = useGame.getState();
  setSetup({ me: s, leader: setup.leader && setup.leader !== LEADERS[setup.me] ? setup.leader : "" });
  sound.click();
}

export function PickScreen() {
  const phase = useGame((s) => s.phase);
  const setup = useGame((s) => s.setup);
  const setSetup = useGame((s) => s.setSetup);
  const start = useGame((s) => s.start);
  const online = useGame((s) => !!s.net);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    if (phase === "pick" && !online) pickFocus(setup.me);
  }, [phase, setup.me, online]);

  // ← and → step through the six seats
  useEffect(() => {
    if (phase !== "pick" || online) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,select,textarea")) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const i = SEATS.indexOf(useGame.getState().setup.me);
      pickSeat(SEATS[(i + (e.key === "ArrowRight" ? 1 : SEATS.length - 1)) % SEATS.length]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, online]);

  if (phase !== "pick" || online) return null;
  const me = setup.me;
  const c = FRESH.countries[me];
  const [missionTitle, missionGoal] = MISSIONS[me].text.split(": ");
  const begin = () => {
    if (!setup.leader.trim()) setSetup({ leader: LEADERS[me] });
    start();
    focus(CAPITAL[me][0], CAPITAL[me][1], 2.6, 1600);
  };
  const stats = [
    ["Economy", money(c.gdp)],
    ["Growth", `${c.growth.toFixed(1)}%`],
    ["Own energy", `${Math.round((c.goods.energy.prod / c.goods.energy.demand) * 100)}%`],
  ] as const;

  return (
    <div role="dialog" aria-labelledby="pick-title" className="pointer-events-none fixed inset-0 z-40 overflow-y-auto max-lg:pointer-events-auto max-lg:bg-[rgba(243,241,236,.72)] max-lg:backdrop-blur-[2px]">
      {/* paper wash on the left so the headline reads over the globe */}
      <div aria-hidden className="fixed inset-y-0 left-0 w-[55%] bg-gradient-to-r from-[rgba(243,241,236,.92)] via-[rgba(243,241,236,.45)] to-transparent max-lg:hidden" />
      <div className="relative grid min-h-full grid-cols-[1fr_440px] gap-6 p-6 max-xl:grid-cols-[1fr_400px] max-lg:grid-cols-1 max-lg:gap-4 max-lg:p-3.5">
        {/* headline + the six seats */}
        <div className="flex min-w-0 flex-col justify-between gap-6 max-lg:gap-4">
          <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out }} className="pointer-events-auto max-w-[560px] pt-2 pl-2 max-lg:pt-1 max-lg:pl-1">
            <div className="flex items-center gap-3">
              <Link href="/play" className="grid size-9 place-items-center rounded-full border border-border bg-white/80 text-ink-2 shadow-[var(--shadow-card)] hover:text-ink" aria-label="Back to the Play page">
                <ArrowLeft className="size-4" />
              </Link>
              <span className={eyebrow}>Statecraft · solo match against 5 bots · about 20 minutes</span>
            </div>
            <h2 id="pick-title" className="mt-5 font-display text-[clamp(44px,6vw,88px)] leading-[.92] font-semibold tracking-[-.02em] max-lg:mt-3 max-lg:text-[40px]">
              Who will you{" "}
              <br />
              <em className="text-[var(--gold-ink)]">lead?</em>
            </h2>
            <p className="mt-4 max-w-[40ch] text-[16px] leading-relaxed text-ink-2 max-lg:mt-2 max-lg:text-[13.5px]">
              Six real countries, twelve years, five rival leaders. Pick a seat; the globe shows you where you start.{" "}
              <Link href="/play" className="font-semibold text-ink underline decoration-[var(--gold)] decoration-2 underline-offset-4 hover:decoration-ink">
                How Statecraft works
              </Link>
            </p>
          </motion.header>

          <div className="pointer-events-auto">
            <div className={cn(eyebrow, "mb-2.5 flex items-center gap-2 pl-2 max-lg:hidden")}>
              Choose your country <kbd className="rounded border border-border bg-white/80 px-1.5 font-sans text-[10px] tracking-normal">←</kbd>
              <kbd className="rounded border border-border bg-white/80 px-1.5 font-sans text-[10px] tracking-normal">→</kbd>
            </div>
            <div className="grid grid-cols-6 gap-2.5 max-2xl:grid-cols-3 max-lg:gap-2">
              {SEATS.map((s, i) => {
                const on = me === s;
                return (
                  <motion.button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pickSeat(s)}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: on ? -6 : 0 }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: ease.out }}
                    className={cn(
                      "group relative flex flex-col items-start gap-2.5 overflow-hidden rounded-2xl border bg-white/90 p-3.5 text-left max-lg:gap-1.5 max-lg:p-2.5 shadow-[0_10px_28px_rgba(17,35,43,.1)] backdrop-blur-xl transition-[border-color,box-shadow,background-color]",
                      on ? "border-[var(--gold)] bg-white shadow-[0_0_0_1px_var(--gold),0_18px_40px_rgba(17,35,43,.16)]" : "border-white/80 hover:bg-white",
                    )}
                  >
                    <i aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] transition-opacity" style={{ background: SEAT_COLOR[s], opacity: on ? 1 : 0.25 }} />
                    <span className="flex w-full items-center justify-between">
                      <Flag iso3={s} className="h-[26px] !w-[38px] !bg-cover rounded-[5px] shadow-[0_0_0_1px_rgba(17,35,43,.08)] max-lg:h-5 max-lg:!w-[30px]" />
                      <Difficulty d={DIFF[s]} />
                    </span>
                    <b className="text-[15px] leading-tight max-lg:text-[13px]">{NAMES[s]}</b>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* the dossier */}
        <motion.section
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: ease.out }}
          aria-label={`${NAMES[me]} dossier`}
          className="pointer-events-auto flex max-h-[calc(100dvh-48px)] flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/94 shadow-[0_40px_90px_rgba(17,35,43,.2),0_2px_8px_rgba(17,35,43,.06)] backdrop-blur-2xl lg:self-center max-lg:max-h-none max-lg:overflow-visible"
        >
          <div className="flex-1 overflow-y-auto max-lg:overflow-visible">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={me} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease: ease.out }}>
                {/* cover */}
                <div className="relative flex items-center gap-4 overflow-hidden px-7 pt-6 pb-5 max-lg:px-5" style={{ background: `linear-gradient(160deg, ${SEAT_COLOR[me]}24, transparent 66%)` }}>
                  <Flag iso3={me} className="h-[50px] !w-[74px] shrink-0 !bg-cover rounded-lg shadow-[0_0_0_1px_rgba(17,35,43,.08),0_10px_24px_rgba(17,35,43,.18)]" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-[38px] leading-none font-semibold tracking-tight max-lg:text-[32px]">{NAMES[me]}</h3>
                      <span className={cn("rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-[.12em] uppercase", DIFF[me] === "Hard" ? "bg-[rgba(229,72,77,.1)] text-[var(--down)]" : "bg-[rgba(232,162,28,.16)] text-[#8a5d0b]")}>{DIFF[me]}</span>
                    </div>
                    <p className="mt-1.5 font-display text-[16px] leading-snug text-ink-2 italic">{PITCH[me]}</p>
                  </div>
                </div>

                <div className="grid gap-5 px-7 pb-6 max-lg:px-5">
                  {/* vital signs */}
                  <dl className="grid grid-cols-3 divide-x divide-border border-y border-border">
                    {stats.map(([l, v]) => (
                      <div key={l} className="px-3 py-3 first:pl-0">
                        <dt className="text-[10.5px] font-extrabold tracking-[.12em] text-ink-3 uppercase">{l}</dt>
                        <dd className="mt-1 font-display text-[26px] leading-none font-semibold tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="grid grid-cols-2 gap-5">
                    <Traits label="Strengths" items={STRONG[me]} good />
                    <Traits label="Weak spots" items={WEAK[me]} />
                  </div>

                  <div className="relative overflow-hidden rounded-2xl bg-[var(--ink-strong)] px-5 py-3.5 text-white">
                    <i aria-hidden className="absolute -top-10 -right-10 size-32 rounded-full bg-[radial-gradient(circle,rgba(242,179,61,.45),transparent_70%)]" />
                    <div className="relative flex items-center gap-2 text-[10.5px] font-extrabold tracking-[.16em] text-[var(--gold)] uppercase">
                      <Target /> Your mission · up to 120 points
                    </div>
                    <p className="relative mt-1.5 font-display text-[21px] leading-tight font-semibold">{missionTitle}</p>
                    {missionGoal && <p className="relative mt-1 text-[13.5px] text-white/70">{cap(missionGoal)}</p>}
                  </div>

                  <div>
                    <div className={eyebrow}>Your leader</div>
                    <input
                      id="leader-name"
                      aria-label="Leader name"
                      maxLength={20}
                      placeholder={LEADERS[me]}
                      value={setup.leader}
                      onChange={(e) => setSetup({ leader: e.target.value })}
                      className="mt-2.5 h-11 w-full rounded-xl border border-[rgba(17,35,43,.16)] bg-white px-4 text-[14.5px] font-semibold outline-none focus:border-[var(--ink)] focus:ring-2 focus:ring-[rgba(17,35,43,.1)]"
                    />
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {Array.from({ length: 8 }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Portrait ${i + 1}`}
                          aria-pressed={setup.portrait === i}
                          onClick={() => setSetup({ portrait: i })}
                          className={cn("rounded-full transition", setup.portrait === i ? "scale-110 outline-2 outline-offset-[3px] outline-[var(--gold)]" : "opacity-70 hover:opacity-100")}
                        >
                          <Portrait i={i} seat={SEAT_COLOR[me]} size={30} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* match settings, folded into one line */}
            <div className="border-t border-border px-7 py-4 max-lg:px-5">
              <button type="button" aria-expanded={settings} onClick={() => setSettings((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
                <span>
                  <span className={eyebrow}>Match settings</span>
                  <span className="mt-0.5 block text-[13.5px] font-bold">
                    {SCENARIOS[setup.scenario].name} · {cap(setup.difficulty)} bots · {setup.timed ? "90-second turns" : "No timer"}
                  </span>
                </span>
                <span className="rounded-full border border-border px-3 py-1 text-[12.5px] font-bold text-ink-2">{settings ? "Done" : "Change"}</span>
              </button>
              <AnimatePresence initial={false}>
                {settings && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: ease.out }} className="overflow-hidden">
                    <div className="grid gap-4 pt-4">
                      <Setting label="Scenario" hint={SCENARIOS[setup.scenario].brief}>
                        {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
                          <Seg key={id} on={setup.scenario === id} onClick={() => setSetup({ scenario: id })}>
                            {SCENARIOS[id].name}
                          </Seg>
                        ))}
                      </Setting>
                      <div className="grid grid-cols-2 gap-4">
                        <Setting label="Bots">
                          {(["easy", "normal", "hard"] as const).map((d) => (
                            <Seg key={d} on={setup.difficulty === d} onClick={() => setSetup({ difficulty: d })}>
                              {cap(d)}
                            </Seg>
                          ))}
                        </Setting>
                        <Setting label="Turn timer">
                          <Seg on={!setup.timed} onClick={() => setSetup({ timed: false })}>
                            Off
                          </Seg>
                          <Seg on={setup.timed} onClick={() => setSetup({ timed: true })}>
                            90 s
                          </Seg>
                        </Setting>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="border-t border-border bg-[rgba(243,241,236,.6)] px-7 py-4 max-lg:sticky max-lg:bottom-0 max-lg:rounded-b-[24px] max-lg:bg-[rgba(246,244,239,.96)] max-lg:px-5 max-lg:backdrop-blur-xl">
            <Btn className="min-h-[54px] w-full text-[15.5px]" onClick={begin}>
              Take office as {SHORT[me]} <ArrowRight className="size-4" aria-hidden />
            </Btn>
            <p className="mt-2 text-center text-[12px] text-ink-3">Your first match has a short guided tour. You can skip it.</p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function Difficulty({ d }: { d: "Medium" | "Hard" }) {
  const n = d === "Hard" ? 3 : 2;
  return (
    <span role="img" aria-label={`${d} difficulty`} title={`${d} difficulty`} className="flex items-end gap-[3px]">
      {[1, 2, 3].map((i) => (
        <i key={i} className={cn("w-1 rounded-full", i <= n ? (d === "Hard" ? "bg-[var(--down)]" : "bg-[var(--mixed)]") : "bg-[rgba(17,35,43,.12)]")} style={{ height: 5 + i * 3 }} />
      ))}
    </span>
  );
}

function Traits({ label, items, good }: { label: string; items: string[]; good?: boolean }) {
  return (
    <div>
      <div className={eyebrow}>{label}</div>
      <ul className="mt-2 grid gap-1.5">
        {items.map((t) => (
          <li key={t} className="flex items-center gap-2 text-[14px] font-bold">
            <span className={cn("grid size-5 place-items-center rounded-full text-[9px]", good ? "bg-[rgba(47,163,107,.12)] text-[var(--up)]" : "bg-[rgba(229,72,77,.1)] text-[var(--down)]")} aria-hidden>
              {good ? "▲" : "▼"}
            </span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Target() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function Setting({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <div className={eyebrow}>{label}</div>
      <div className="mt-2 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-paper p-1">{children}</div>
      {hint && <p className="mt-2 text-[12.5px] text-ink-3">{hint}</p>}
    </div>
  );
}

function Seg({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("h-8 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition", on ? "bg-[var(--ink-strong)] text-white shadow-sm" : "text-ink-2 hover:bg-white hover:text-ink")}
    >
      {children}
    </button>
  );
}

// ───────── Locking + reveal ─────────

export function Reveal() {
  const phase = useGame((s) => s.phase);
  const world = useGame((s) => s.world);
  const prev = useGame((s) => s.prev);
  const record = useGame((s) => s.record);
  const me = useGame((s) => s.setup.me);
  const [beat, setBeat] = useState<"title" | "moves" | "prices" | "vote" | "done" | "completed" | null>(null);
  const [shown, setShown] = useState(0);
  const skip = useRef(false);

  // other leaders lock one by one, then the turn resolves
  useEffect(() => {
    if (phase !== "locking") return;
    const g = useGame.getState();
    if (g.net) return; // multiplayer: the server resolves once every leader has locked or time is up
    let t = 0;
    const timers = SEATS.filter((s) => s !== g.setup.me).map((s) => setTimeout(() => useGame.getState().markBotLocked(s), (t += 220 + Math.random() * 280)));
    timers.push(setTimeout(() => useGame.getState().resolve(), t + 350));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "reveal" || !record || !prev || !world) return;
    skip.current = false;
    let alive = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, skip.current || reduce ? 0 : ms));
    const g = useGame.getState();
    (async () => {
      focus(28, 60, 4.4, 1300);
      setBeat("title");
      sound.lock();
      await wait(1500);
      if (!alive) return;
      setBeat("moves");
      setShown(0);
      for (let i = 1; i <= 6; i++) {
        await wait(110);
        if (!alive) return;
        setShown(i);
        sound.flip();
      }
      await wait(1400);
      const seen = new Set<string>();
      const arcs = record.globe.flatMap((e) => {
        const k = `${e.kind}:${e.from}:${e.to}:${e.good ?? ""}`;
        if (seen.has(k) || (e.kind !== "flow" && e.kind !== "sanction") || !e.from || !e.to || !(SEATS as readonly string[]).includes(e.from) || !(SEATS as readonly string[]).includes(e.to)) return [];
        seen.add(k);
        return [{ key: k, from: e.from as Iso3, to: e.to as Iso3, kind: e.kind as "flow" | "sanction", good: e.good }];
      });
      g.setFx({ arcs });
      await wait(arcs.length ? 2000 : 400);
      if (!alive) return;
      if (record.eventId && EVENT_PLACE[record.eventId]) {
        const p = EVENT_PLACE[record.eventId];
        g.setFx({ event: p });
        focus(p[0], p[1], 3.6, 1100);
        await wait(2000);
        g.setFx({ event: null });
      }
      setBeat("prices");
      await wait(1500);
      if (record.vote) {
        setBeat("vote");
        sound.lock();
        await wait(1600);
      }
      const changed = REGIONS.filter((r) => prev.regions[r].leader !== world.regions[r].leader || Math.abs(prev.regions[r].sway[me] - world.regions[r].sway[me]) > 3);
      if (changed.length) {
        setBeat(null);
        g.setFx({ regions: changed });
        focus(12, 45, 4.4, 1100);
        if (changed.some((r) => world.regions[r].leader === me && prev.regions[r].leader !== me)) sound.rank();
        await wait(1700);
      }
      focus(CAPITAL[me][0], CAPITAL[me][1], 2.8, 1200);
      if (record.completed.some((c) => c.iso3 === me)) {
        setBeat("completed");
        sound.chime();
        await wait(1500);
      }
      await wait(500);
      if (!alive) return;
      setBeat(null);
      g.setFx({ arcs: [], regions: [], event: null });
      g.finishReveal();
      if (ranks(world)[me] < ranks(prev)[me]) sound.rank();
    })();
    return () => {
      alive = false;
    };
  }, [phase, record, prev, world, me]);

  if (phase !== "reveal" || !record || !prev || !world) return null;
  const p0 = prev.price;
  const p1 = world.price;
  const vote = record.vote;
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <AnimatePresence>
        {beat === "title" && (
          <motion.div key="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }} className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_55%_45%_at_center,rgba(243,241,236,.82),transparent)]">
            <motion.div initial={{ scale: 0.92, rotate: -1.5 }} animate={{ scale: 1, rotate: -1.5 }} transition={{ type: "spring", bounce: 0.35, duration: 0.6 }} className="w-[min(560px,calc(100%-32px))] border border-[rgba(122,92,46,.25)] bg-[var(--wire-paper)] px-8 py-6 text-center shadow-[0_30px_80px_rgba(17,35,43,.25)]">
              <div className="flex items-center justify-between border-b-2 border-[var(--wire-ink)] pb-1.5 text-[10.5px] font-extrabold tracking-[.18em] text-[var(--wire)] uppercase">
                <span>Simulated</span>
                <span>{record.year}</span>
              </div>
              <div className="mt-2 font-display text-[clamp(36px,6vw,64px)] leading-none font-semibold tracking-tight text-[var(--wire-ink)]">The World Moves</div>
              <div className="mt-2 border-t border-[rgba(122,92,46,.3)] pt-2 font-display text-[15px] text-[var(--wire)] italic">Six leaders have made their decisions. Here is what happened.</div>
            </motion.div>
          </motion.div>
        )}
        {beat === "moves" && (
          <motion.div exit={{ opacity: 0 }} className="absolute top-[104px] left-1/2 flex w-[min(1000px,calc(100%-32px))] -translate-x-1/2 flex-wrap justify-center gap-2.5 [perspective:900px]">
            {SEATS.map((s, i) => (
              <motion.div
                key={s}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={i < shown ? { rotateY: 0, opacity: 1 } : {}}
                transition={{ duration: 0.45, ease: ease.out }}
                style={{ borderTopColor: SEAT_COLOR[s] }}
                className={cn("grid min-h-[92px] w-[150px] content-start gap-1.5 rounded-[6px] border border-t-[3px] border-[rgba(122,92,46,.2)] bg-[var(--wire-paper)] p-3 shadow-[var(--shadow-card)] max-md:w-[calc(33%-8px)]", s === me && "shadow-[0_0_0_2px_var(--gold),var(--shadow-card)]")}
              >
                <div className="flex items-center gap-1.5 text-[12px] font-extrabold">
                  <Flag iso3={s} /> {SHORT[s]}
                </div>
                <p className="font-display text-[14px] leading-snug text-[var(--wire-ink)] italic">{record.moves[s] ?? "Held steady"}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
        {beat === "prices" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-[110px] left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-2.5">
            {(
              [
                ["Oil", "energy"],
                ["Food", "food"],
                ["Chips", "tech"],
              ] as const
            ).map(([n, g]) => (
              <span key={g} className="rounded-full bg-[var(--night)] px-3.5 py-2 text-[13.5px] font-bold text-white">
                {n} {p0[g].toFixed(0)} → <b>{p1[g].toFixed(0)}</b> {p1[g] > p0[g] + 0.5 ? "▲" : p1[g] < p0[g] - 0.5 ? "▼" : ""}
              </span>
            ))}
            {record.eventId && <span className="w-full text-center font-display text-[17px] text-ink italic">{EVENT_BY_ID.get(record.eventId)?.title}</span>}
          </motion.div>
        )}
        {(beat === "vote" || beat === "completed") && (
          <motion.div
            initial={{ opacity: 0, scale: 1.6, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: -6 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", bounce: 0.45, duration: 0.5 }}
            className="absolute top-[42%] left-1/2 -translate-x-1/2 rounded-lg border-[3px] border-current bg-white/90 px-5 py-2 text-[28px] font-extrabold tracking-[.16em] uppercase"
            style={{ color: beat === "completed" ? "#B9821A" : vote?.passed ? "var(--ally)" : "var(--conflict)" }}
          >
            {beat === "completed" ? "Completed" : vote?.passed ? `Passed ${SEATS.filter((s) => vote.votes[s] === "yes").length}–${SEATS.filter((s) => vote.votes[s] === "no").length}` : "Vote failed"}
          </motion.div>
        )}
      </AnimatePresence>
      <button type="button" onClick={() => (skip.current = true)} className="pointer-events-auto fixed bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full border border-border bg-white/90 px-4 py-2 text-[13px] font-bold shadow-[var(--shadow-card)]">
        Skip ▸▸
      </button>
    </div>
  );
}

// ───────── End of match ─────────

export function EndScreen() {
  const phase = useGame((s) => s.phase);
  const world = useGame((s) => s.world);
  const setup = useGame((s) => s.setup);
  const online = useGame((s) => !!s.net);
  const [copied, setCopied] = useState(false);
  const confettiDone = useRef(false);
  const st = phase === "end" && world ? standings(world) : [];
  const winner = st[0]?.iso3;
  useEffect(() => {
    if (phase === "end" && winner === setup.me && !confettiDone.current) {
      confettiDone.current = true;
      setTimeout(confetti, 1600);
    }
    if (phase !== "end") confettiDone.current = false;
  }, [phase, winner, setup.me]);
  if (phase !== "end" || !world) return null;
  const me = setup.me;
  const mine = leaderScore(world, me);
  const r0 = ranks(world, 0)[me];
  const r1 = ranks(world)[me];
  const led = REGIONS.filter((r) => world.regions[r].leader === me).map((r) => REGION_DEFS[r].name);
  const years = `${world.history[0].year}–${world.history.at(-1)!.year}`;
  const dims = DIMENSIONS.map((d) => [d, world.dims[me].at(-1)![d] - world.dims[me][0][d]] as const).sort((a, b) => b[1] - a[1]);
  const c = world.countries[me];
  const ach =
    led.length >= 2
      ? `Led ${led.slice(0, 2).join(" and ")}.`
      : dims[0][0] === "development"
        ? `Cut unemployment to ${c.unemployment.toFixed(1)}% and raised skills to ${c.skills.toFixed(0)}.`
        : dims[0][0] === "diplomacy"
          ? "Built trust that outlasted every crisis."
          : dims[0][0] === "economy"
            ? `Grew the economy to ${money(c.gdp)}.`
            : dims[0][0] === "security"
              ? "Kept the lights on and the shelves full."
              : "Held the country steady through a turbulent decade.";
  const parts = [
    ["Improvement vs. doing nothing", mine.improvement, "#3F63D8"],
    ["Mission", mine.mission, "#F2B33D"],
    ["Rank climb", mine.rankClimb, "#2FA36B"],
    ["Objectives", mine.objectives, "#7A4FD0"],
    ["Difficulty", mine.difficulty, "#5E6B70"],
  ] as const;
  const history = world.history.map((h) => ({ y: h.year, head: (h.news.find((n) => n.iso3 === me) ?? h.news[0])?.headline ?? "A quiet year", move: h.moves[me] ?? "Held steady" }));
  const share: Share = { v: 1, c: me, l: setup.leader.slice(0, 20), p: setup.portrait, y0: world.history[0].year, y1: world.history.at(-1)!.year, r0, r1, s: mine.total, w: winner === me, g: led.length, a: ach.slice(0, 140), sc: world.scenario };
  const link = `${location.origin}/play/h/${encodeShare(share)}`;
  const text = `My Statecraft: ${SHORT[me]} ${years}. Power rank #${r0} → #${r1}. Leader Score ${mine.total}${winner === me ? " (winner)" : ""}. "${ach}" ${link}`;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[rgba(243,241,236,.55)] p-5 backdrop-blur-[4px]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn(glass, "w-[min(1060px,100%)] p-7 max-md:p-5")} role="dialog" aria-labelledby="end-title">
        <div className={eyebrow}>
          {SCENARIOS[world.scenario].name} · {years}
        </div>
        <h2 id="end-title" className="mt-2 font-display text-[clamp(40px,6vw,76px)] leading-none font-semibold tracking-tight">
          {winner === me ? "You won." : `${SHORT[winner!]} wins.`}
        </h2>
        <p className="mt-2 text-[15px] text-ink-2">
          {winner === me ? "You improved your country more than any other leader." : `You finished #${st.findIndex((x) => x.iso3 === me) + 1} with ${mine.total} points.`} Power rank #{r0} → #{r1}.
        </p>
        <div className="mt-6 grid grid-cols-[1.05fr_.95fr] gap-6 max-lg:grid-cols-1">
          <div>
            <div className={eyebrow}>Leader Score</div>
            <ol className="mt-2.5 grid gap-2">
              {st.map((x, i) => (
                <motion.li
                  key={x.iso3}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (st.length - i) * 0.18 }}
                  className={cn("grid grid-cols-[28px_36px_1fr_auto] items-center gap-3 rounded-2xl border bg-white px-3 py-2.5", i === 0 ? "border-[var(--gold)] bg-gradient-to-r from-[rgba(242,179,61,.28)] to-white" : "border-border")}
                >
                  <span className="text-center font-extrabold">{i === 0 ? <Crown /> : i + 1}</span>
                  <Portrait i={SEATS.indexOf(x.iso3)} seat={SEAT_COLOR[x.iso3]} size={32} />
                  <div>
                    <b className="flex items-center gap-1.5">
                      <Flag iso3={x.iso3} /> {SHORT[x.iso3]}
                      {x.iso3 === me && <span className="rounded-full border border-border px-2 text-[11px] font-semibold">You</span>}
                    </b>
                    <small className="text-[12px] text-ink-3">Power #{x.rank}</small>
                  </div>
                  <span className="text-[20px] font-extrabold tabular-nums">{x.score}</span>
                </motion.li>
              ))}
            </ol>
            <div className="mt-5">
              <div className={eyebrow}>Your {mine.total} points · base 500</div>
              <div className="mt-2 flex h-3.5 overflow-hidden rounded-full">
                {parts
                  .filter((p) => p[1] > 0)
                  .map((p) => (
                    <i key={p[0]} title={`${p[0]} ${p[1].toFixed(0)}`} style={{ flexGrow: p[1], background: p[2] }} />
                  ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-bold">
                {parts.map((p) => (
                  <span key={p[0]} className="flex items-center gap-1">
                    <i className="size-2 rounded-full" style={{ background: p[2] }} /> {p[0]} {p[1] >= 0 ? "+" : ""}
                    {p[1].toFixed(0)}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <div className={eyebrow}>Your world history</div>
              <div className="mt-2 rounded-xl border border-[rgba(122,92,46,.2)] bg-[var(--wire-paper)] px-4 py-1.5">
                {history.map((h) => (
                  <div key={h.y} className="grid grid-cols-[60px_1fr] gap-3 border-b border-dashed border-[rgba(122,92,46,.25)] py-2.5 last:border-0">
                    <span className="font-display text-[21px] font-semibold text-[var(--wire)]">{h.y}</span>
                    <div>
                      <p className="font-display text-[15px] text-[var(--wire-ink)] italic">{h.head}</p>
                      <small className="text-[12px] text-ink-2">Your move: {h.move}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className={eyebrow}>Share card</div>
            <div className="mt-2">
              <ShareCard s={share} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn
                onClick={() => {
                  navigator.clipboard?.writeText(text).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  );
                }}
              >
                {copied ? "Link copied" : "Copy share link"}
              </Btn>
              <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-bold text-ink-2 hover:bg-[rgba(17,35,43,.05)]">
                Open share page
              </a>
              {online ? (
                <Link href="/play" className="inline-flex min-h-11 items-center rounded-full bg-[var(--gold)] px-5 text-[14px] font-bold text-[var(--ink-strong)]">
                  Back to the Play page
                </Link>
              ) : (
                <>
                  <Btn variant="gold" onClick={() => useGame.getState().start()}>
                    Rematch
                  </Btn>
                  <Btn variant="glass" onClick={() => useGame.setState({ phase: "pick", world: null })}>
                    New match
                  </Btn>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Crown() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#F2B33D" stroke="#B9821A" strokeWidth="1.2" role="img" aria-label="Winner" className="mx-auto">
      <path d="M3 18h18l-1.5-10-5 4L12 5l-2.5 7-5-4z" />
    </svg>
  );
}

function confetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.style.cssText = "position:fixed;inset:0;z-index:60;pointer-events:none";
  document.body.appendChild(cv);
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  const g = cv.getContext("2d")!;
  const cols = ["#F2B33D", "#E57A3A", "#3F63D8", "#2FA36B", "#7A4FD0", "#D14D72"];
  const ps = Array.from({ length: 150 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.4, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6.28, s: (4 + Math.random() * 6) * dpr, c: cols[(Math.random() * cols.length) | 0] }));
  const t0 = performance.now();
  const f = (t: number) => {
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy * dpr;
      p.r += 0.1;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      g.restore();
    }
    if (t - t0 < 3200) requestAnimationFrame(f);
    else cv.remove();
  };
  requestAnimationFrame(f);
}

// ───────── Guided first match ─────────

const COACH = [
  { target: "goal", text: "Every year the game picks your biggest problem. This is your goal for the year.", next: true },
  { target: "recs", text: "Your advisor suggests three moves and shows what each one does. Tap “Do it” on one.", next: false },
  { target: "lock", text: "Happy with your orders? Lock the turn. All six leaders move at the same time.", next: false },
  { target: "why", text: "Here is your year. Tap “Why?” on any line to see exactly what caused the change.", next: false },
] as const;

export function Coach() {
  const step = useGame((s) => s.tutorial);
  const phase = useGame((s) => s.phase);
  const orders = useGame((s) => s.orders);
  const proposals = useGame((s) => s.proposals);
  const setTutorial = useGame((s) => s.setTutorial);
  const tab = useGame((s) => s.tab);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // advance on the player's actions
  useEffect(() => {
    if (step !== null && step <= 1 && ((orders.cards?.length ?? 0) > 0 || (orders.projects?.length ?? 0) > 0 || proposals.some((p) => !p.inbox))) setTutorial(2);
    if (step !== null && step <= 2 && phase === "result") setTutorial(3);
  }, [step, orders, proposals, phase, setTutorial]);

  const active = step !== null && ((step <= 2 && phase === "plan" && tab === "year") || (step === 3 && phase === "result"));
  const target = step !== null ? COACH[step]?.target : null;
  useLayoutEffect(() => {
    if (!active || !target) return;
    let raf = 0;
    const loop = () => {
      const el = document.querySelector(`[data-coach="${target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, target]);

  if (!active || step === null || !rect) return null;
  const c = COACH[step];
  const left = Math.max(12, Math.min(window.innerWidth - 332, rect.left - 340 < 12 ? rect.left : rect.left - 340));
  const top = Math.max(80, Math.min(window.innerHeight - 170, rect.top));
  return (
    <div className="pointer-events-none fixed inset-0 z-[35]">
      <div className="absolute rounded-2xl shadow-[0_0_0_9999px_rgba(15,29,36,.32)] ring-2 ring-[var(--gold)] transition-all duration-300" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="pointer-events-auto absolute w-[320px] rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]" style={{ left: rect.left - 340 < 12 ? left : rect.left - 340, top }}>
        <div className={eyebrow}>
          Guided first match · {step + 1} of {COACH.length}
        </div>
        <p className="mt-1.5 text-[14.5px] font-semibold">{c.text}</p>
        <div className="mt-3 flex gap-2">
          {c.next && (
            <Btn className="min-h-9 px-4 text-[13px]" onClick={() => setTutorial(step + 1)}>
              Next
            </Btn>
          )}
          <Btn variant="ghost" className="min-h-9 px-3 text-[13px]" onClick={() => setTutorial(null)}>
            Skip the tour
          </Btn>
        </div>
      </motion.div>
    </div>
  );
}
