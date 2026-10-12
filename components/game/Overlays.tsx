"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { EVENT_BY_ID, SCENARIOS } from "@/lib/game/engine/events";
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
import { ShareCard } from "./ShareCard";

const DIFF: Record<Iso3, string> = { IND: "Medium", CHN: "Medium", USA: "Medium", RUS: "Hard", SAU: "Medium", JPN: "Hard" };
const STRONG: Record<Iso3, string> = { IND: "Growth, young workforce, food", CHN: "Industry, tech, reserves", USA: "Tech, energy, money", RUS: "Energy, food, military", SAU: "Oil, cash reserves", JPN: "Tech, money, skills" };
const WEAK: Record<Iso3, string> = { IND: "Oil imports, jobs", CHN: "Energy imports, ageing", USA: "Debt, stability", RUS: "Sanctions, tech imports", SAU: "Food, jobs beyond oil", JPN: "Energy imports, ageing, debt" };
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

export function PickScreen() {
  const phase = useGame((s) => s.phase);
  const setup = useGame((s) => s.setup);
  const setSetup = useGame((s) => s.setSetup);
  const start = useGame((s) => s.start);
  useEffect(() => {
    if (phase === "pick") focus(CAPITAL[setup.me][0] - 6, CAPITAL[setup.me][1], 3.4, 1100);
  }, [phase, setup.me]);
  if (phase !== "pick") return null;
  const begin = () => {
    if (!setup.leader.trim()) setSetup({ leader: LEADERS[setup.me] });
    start();
    focus(CAPITAL[setup.me][0], CAPITAL[setup.me][1], 2.6, 1600);
  };
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[rgba(243,241,236,.5)] p-5 backdrop-blur-[3px]">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn(glass, "w-[min(980px,100%)] p-7 max-md:p-5")} role="dialog" aria-labelledby="pick-title">
        <div className={eyebrow}>Statecraft · solo match against 5 bots · about 20 minutes</div>
        <h2 id="pick-title" className="mt-2 font-display text-[clamp(38px,6vw,72px)] leading-none font-semibold tracking-tight">
          Who will you lead?
        </h2>
        <div className="mt-5 grid grid-cols-3 gap-3 max-md:grid-cols-1">
          {SEATS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSetup({ me: s, leader: setup.leader && setup.leader !== LEADERS[setup.me] ? setup.leader : "" });
                sound.click();
              }}
              className={cn("grid gap-2 rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]", setup.me === s ? "border-[var(--gold)] shadow-[0_0_0_2px_var(--gold)]" : "border-border")}
            >
              <div className="flex items-center gap-2.5">
                <Flag iso3={s} className="h-[22px] w-8 rounded" />
                <b className="text-[16px]">{NAMES[s]}</b>
                <span className="ml-auto text-[11px] font-extrabold tracking-[.08em] text-ink-3 uppercase">{DIFF[s]}</span>
              </div>
              <small className="text-[12.5px] text-ink-2">
                <b>Strong:</b> {STRONG[s]}
                <br />
                <b>Weak:</b> {WEAK[s]}
              </small>
              <small className="text-[12.5px] text-ink">
                <b>Mission:</b> {MISSIONS[s].text}
              </small>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <span className={eyebrow}>Scenario</span>
          {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
            <Chip key={id} on={setup.scenario === id} onClick={() => setSetup({ scenario: id })}>
              {SCENARIOS[id].name}
            </Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <span className={eyebrow}>Bots</span>
          {(["easy", "normal", "hard"] as const).map((d) => (
            <Chip key={d} on={setup.difficulty === d} onClick={() => setSetup({ difficulty: d })}>
              {cap(d)}
            </Chip>
          ))}
          <span className={cn(eyebrow, "ml-3")}>Turn timer</span>
          <Chip on={!setup.timed} onClick={() => setSetup({ timed: false })}>
            Off
          </Chip>
          <Chip on={setup.timed} onClick={() => setSetup({ timed: true })}>
            90 seconds
          </Chip>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <span className={eyebrow}>Leader</span>
          <input
            id="leader-name"
            aria-label="Leader name"
            maxLength={20}
            placeholder={LEADERS[setup.me]}
            value={setup.leader}
            onChange={(e) => setSetup({ leader: e.target.value })}
            className="h-10 w-[210px] rounded-full border border-[rgba(17,35,43,.16)] bg-white px-4 text-[14px]"
          />
          <div className="flex gap-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} aria-label={`Portrait ${i + 1}`} onClick={() => setSetup({ portrait: i })} className={cn("rounded-full", setup.portrait === i && "outline-2 outline-offset-2 outline-[var(--gold)]")}>
                <Portrait i={i} seat={SEAT_COLOR[setup.me]} size={30} />
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Btn className="min-w-[220px]" onClick={begin}>
            Take office ▸
          </Btn>
          <Link href="/play" className="text-[14px] font-semibold text-ink-2 underline-offset-4 hover:underline">
            How Statecraft works
          </Link>
          <span className="text-[12.5px] text-ink-3">Your first match has a short guided tour. You can skip it.</span>
        </div>
      </motion.div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("h-8 rounded-full border px-3.5 text-[13px] font-semibold", on ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white" : "border-[rgba(17,35,43,.16)] bg-white text-ink-2")}>
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
  const [beat, setBeat] = useState<"moves" | "prices" | "vote" | "done" | "completed" | null>(null);
  const [shown, setShown] = useState(0);
  const skip = useRef(false);

  // other leaders lock one by one, then the turn resolves
  useEffect(() => {
    if (phase !== "locking") return;
    const g = useGame.getState();
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
        {beat === "moves" && (
          <motion.div exit={{ opacity: 0 }} className="absolute top-[104px] left-1/2 flex w-[min(1000px,calc(100%-32px))] -translate-x-1/2 flex-wrap justify-center gap-2.5 [perspective:900px]">
            {SEATS.map((s, i) => (
              <motion.div
                key={s}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={i < shown ? { rotateY: 0, opacity: 1 } : {}}
                transition={{ duration: 0.45, ease: ease.out }}
                className={cn("grid min-h-[92px] w-[150px] gap-1.5 rounded-[14px] bg-white p-3 shadow-[var(--shadow-card)] max-md:w-[calc(33%-8px)]", s === me && "shadow-[0_0_0_2px_var(--gold),var(--shadow-card)]")}
              >
                <div className="flex items-center gap-1.5 text-[12px] font-extrabold">
                  <Flag iso3={s} /> {SHORT[s]}
                </div>
                <p className="text-[12.5px] leading-snug font-bold">{record.moves[s] ?? "Held steady"}</p>
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
              <Btn variant="gold" onClick={() => useGame.getState().start()}>
                Rematch
              </Btn>
              <Btn variant="glass" onClick={() => useGame.setState({ phase: "pick", world: null })}>
                New match
              </Btn>
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
