"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { Header } from "@/components/chrome/Header";
import { GlobeClient } from "@/components/globe/GlobeClient";
import { focus } from "@/lib/game/camera";
import { createWorld } from "@/lib/game/engine/init";
import { resolveTurn } from "@/lib/game/engine/resolve";
import { MISSIONS } from "@/lib/game/engine/score";
import type { Iso3, Proposal, WorldState } from "@/lib/game/engine/types";
import { SEATS } from "@/lib/game/engine/types";
import { closeTurn, planBots } from "@/lib/game/match";
import { SEED_2026 } from "@/lib/game/seed";
import { useGame } from "@/lib/game/store";
import { CAPITAL, NAMES, SEAT_COLOR, SHORT, money } from "@/lib/game/text";
import { useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Portrait, eyebrow, glass } from "./bits";

/**
 * Statecraft Play page (UI-DESIGN §5.2): the 1.0 globe stays fixed behind a long scroll. The hero and the
 * "How a year works" story drive the globe; then countries, the Why chain, the ranking and the FAQ.
 */

const DIFF: Record<Iso3, string> = { IND: "Medium", CHN: "Medium", USA: "Medium", RUS: "Hard", SAU: "Medium", JPN: "Hard" };

type Step = { k: string; title: string; text: string; show: () => void };

const STEPS: Step[] = [
  {
    k: "Briefing",
    title: "The world hands you a problem.",
    text: "A tanker is attacked in the Strait of Hormuz and oil jumps 18%. The game names your biggest problem as this year's goal.",
    show: () => {
      focus(26.6, 56.3, 3.2);
      useGame.getState().setShowcase({ me: "IND", arcs: [], regions: [] });
    },
  },
  {
    k: "Your advisor",
    title: "Three moves, one tap each.",
    text: "Your advisor suggests three moves and shows what each one does next year. Or open Moves, Deals and Advanced and decide everything yourself.",
    show: () => {
      focus(CAPITAL.IND[0], CAPITAL.IND[1], 2.8);
      useGame.getState().setShowcase({ me: "IND", arcs: [], regions: [] });
    },
  },
  {
    k: "Deals",
    title: "Make deals with other leaders.",
    text: "Offer Russia an investment for oil at today's price for three years. Leaders accept, refuse or send a counter-offer.",
    show: () => {
      focus(45, 70, 3.8);
      useGame.getState().setShowcase({ me: "IND", arcs: [{ key: "ri", from: "RUS", to: "IND", kind: "flow", good: "energy" }], regions: [] });
    },
  },
  {
    k: "Lock",
    title: "Everyone moves at once.",
    text: "All six leaders lock. Their moves collide: oil flows, sanctions bite, prices move. You see every move, then exactly what your own decisions did.",
    show: () => {
      focus(42, 60, 4.4);
      useGame.getState().setShowcase({
        me: "IND",
        arcs: [
          { key: "ri", from: "RUS", to: "IND", kind: "flow", good: "energy" },
          { key: "sc", from: "SAU", to: "CHN", kind: "flow", good: "energy" },
          { key: "ur", from: "USA", to: "RUS", kind: "sanction" },
        ],
        regions: [],
      });
    },
  },
  {
    k: "Influence",
    title: "Your colour spreads.",
    text: "Trade, aid and investment win partner regions. Lead South Asia or Africa and your colour spreads across the map, with better prices and more influence.",
    show: () => {
      focus(8, 45, 4.6);
      useGame.getState().setShowcase({
        me: "IND",
        arcs: [],
        regions: [
          { id: "SAS", seat: "IND", strength: 0.8 },
          { id: "SSA", seat: "IND", strength: 0.5 },
          { id: "MENA", seat: "SAU", strength: 0.5 },
          { id: "EUR", seat: "USA", strength: 0.6 },
          { id: "SEA", seat: "CHN", strength: 0.6 },
          { id: "CAS", seat: "RUS", strength: 0.5 },
        ],
      });
    },
  },
];

export function PlayLanding() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const g = useGlobe.getState();
    g.setPlay(true);
    g.select(null);
    const game = useGame.getState();
    if (game.phase !== "pick") useGame.setState({ phase: "pick", world: null });
    game.setShowcase({ me: "IND", arcs: [], regions: [] });
    return () => {
      useGame.getState().setShowcase(null);
      useGlobe.getState().setPlay(false);
    };
  }, []);

  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-step]")];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setStep(Number(vis.target.getAttribute("data-step")));
      },
      { threshold: [0.4, 0.7], rootMargin: "-15% 0px -25% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (step >= 0) STEPS[step].show();
  }, [step]);

  return (
    <main className="relative bg-paper">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(48% 62% at 62% 52%, #d7e3ea 0%, rgba(215,227,234,.6) 45%, rgba(243,241,236,0) 75%), linear-gradient(180deg,#f6f4ef,#efede7)" }}
      />
      {/* the globe sits right of centre so the story reads on the left (a transform makes the fixed canvas follow) */}
      <div className="fixed inset-x-0 top-0 h-dvh [transform:translateZ(0)] max-md:h-[56dvh] md:translate-x-[21vw]">
        <GlobeClient variant="game" />
      </div>
      <Header active="play" />

      {/* hero + story: text on the left, the globe shows through on the right */}
      <div className="pointer-events-none relative z-10 mx-auto max-w-[1240px] px-5">
        <section className="pointer-events-auto flex min-h-[92dvh] max-w-[560px] flex-col justify-center gap-6 pt-24 pb-10 max-md:-mx-5 max-md:mt-[50dvh] max-md:min-h-0 max-md:bg-gradient-to-b max-md:from-transparent max-md:via-paper max-md:to-paper max-md:px-5 max-md:pt-14">
          <div className={eyebrow}>Statecraft · geopolitics you play</div>
          <h1 className="font-display text-[clamp(48px,7.2vw,92px)] leading-[.95] font-semibold tracking-[-.035em]">
            Run a country.
            <br />
            <em className="font-medium text-ink-2">Shape the world.</em>
          </h1>
          <p className="max-w-[30ch] text-[19px] text-ink-2">Six leaders. Twelve years. One shared world that answers back.</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/play/match" className="inline-flex min-h-12 min-w-[160px] items-center justify-center gap-2 rounded-full bg-[var(--ink-strong)] px-6 text-[15px] font-bold text-white shadow-[0_8px_22px_rgba(15,29,36,.25)] transition hover:bg-[#1b313b] active:scale-[.97]">
              Start <ArrowRight className="size-4" />
            </Link>
            <span className="inline-flex min-h-12 items-center rounded-full border border-[rgba(17,35,43,.16)] bg-white/70 px-5 text-[14.5px] font-bold text-ink-3" title="Rooms with friends arrive with multiplayer">
              Create room · soon
            </span>
            <span className="inline-flex min-h-12 items-center rounded-full border border-[rgba(17,35,43,.16)] bg-white/70 px-5 text-[14.5px] font-bold text-ink-3">Join with code · soon</span>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] font-semibold text-ink-2">
            <span>Solo against 5 bots today</span>
            <span>About 20 minutes a match</span>
            <span>Free · no download · no login</span>
          </p>
        </section>

        <section className="pointer-events-auto max-w-[520px] pt-[8vh]">
          <div className={eyebrow}>How a year works</div>
          <h2 className="mt-2 font-display text-[clamp(34px,4vw,54px)] leading-tight font-semibold">One turn is one year.</h2>
        </section>
        <div className="pb-[14vh]">
          {STEPS.map((s, i) => (
            <article key={s.k} data-step={i} className="pointer-events-auto flex min-h-[78dvh] max-w-[480px] flex-col justify-center max-md:min-h-[70dvh]">
              <motion.div animate={{ scale: step === i ? 1 : 0.97 }} transition={{ duration: 0.4 }} className={cn(glass, "p-6 transition-shadow", step === i && "ring-2 ring-[var(--gold)]")}>
                <div className="flex items-center gap-3">
                  <b className="grid size-8 place-items-center rounded-full bg-[var(--ink-strong)] text-[13px] text-white">{i + 1}</b>
                  <span className={eyebrow}>{s.k}</span>
                </div>
                <h3 className="mt-3 font-display text-[clamp(28px,3vw,40px)] leading-tight font-semibold">{s.title}</h3>
                <p className="mt-2 text-[16.5px] leading-relaxed text-ink-2">{s.text}</p>
              </motion.div>
            </article>
          ))}
        </div>
      </div>

      {/* the rest of the page covers the globe */}
      <div className="relative z-10 bg-paper">
        <Countries />
        <WhyDemo />
        <RankDemo />
        <Learn />
        <Faq />
        <section className="grid justify-items-center gap-5 px-5 py-28 text-center">
          <div className={eyebrow}>Statecraft</div>
          <h2 className="font-display text-[clamp(40px,5.6vw,76px)] leading-none font-semibold tracking-tight">Your country is waiting.</h2>
          <Link href="/play/match" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--ink-strong)] px-7 text-[15px] font-bold text-white">
            Start a match <ArrowRight className="size-4" />
          </Link>
        </section>
        <footer className="border-t border-border px-5 py-7 text-[13px] text-ink-3">
          <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-4">
            <span>GeoPolitics · Statecraft · simulated content is labelled</span>
            <span>Starting data: IMF and World Bank via GeoPolitics 1.0, curated drafts under editorial review</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

const Band = ({ children, className }: { children: React.ReactNode; className?: string }) => <section className={cn("mx-auto max-w-[1240px] px-5 py-24 max-md:py-16", className)}>{children}</section>;

function useStartWorld() {
  return useMemo(() => createWorld(SEED_2026, { matchId: "play-page", seed: 2026, scenario: "energyShock" }), []);
}

function Countries() {
  const w = useStartWorld();
  return (
    <Band>
      <div className={eyebrow}>Six seats</div>
      <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-tight font-semibold">Who will you lead?</h2>
      <p className="mt-3 max-w-[60ch] text-[17px] text-ink-2">Every country starts from real 2025 data and carries its real problem. India needs jobs for a young workforce. Japan imports almost all its energy. Saudi Arabia must build an economy beyond oil.</p>
      <div className="mt-9 grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {SEATS.map((s) => {
          const c = w.countries[s];
          return (
            <Link key={s} href={`/play/match?country=${s}`} className="group relative grid gap-3 overflow-hidden rounded-[20px] border border-border bg-white p-5 shadow-[0_6px_18px_rgba(17,35,43,.08)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
              <i className="absolute inset-x-0 top-0 h-1" style={{ background: SEAT_COLOR[s] }} />
              <div className="flex items-center gap-3">
                <Flag iso3={s} className="h-6 w-9 rounded" />
                <b className="text-[20px]">{NAMES[s]}</b>
                <span className="ml-auto text-[11px] font-extrabold tracking-[.1em] text-ink-3 uppercase">{DIFF[s]}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  [money(c.gdp), "GDP"],
                  [`${c.growth.toFixed(1)}%`, "Growth"],
                  [`${Math.round((c.goods.energy.prod / c.goods.energy.demand) * 100)}%`, "Own energy"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-[10px] bg-paper px-2.5 py-2">
                    <b className="block text-[16px] tabular-nums">{v}</b>
                    <small className="text-[11px] font-bold text-ink-3">{l}</small>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-dashed border-[rgba(17,35,43,.18)] px-3 py-2.5 text-[13.5px] font-bold">{MISSIONS[s].text}</div>
              <div className="flex items-center justify-between text-[13.5px] font-extrabold">
                Lead {SHORT[s]} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </Band>
  );
}

function WhyDemo() {
  const w = useStartWorld();
  const rows = useMemo(() => {
    // the same year twice: with and without a Russian oil pact, in a year when tankers avoid Hormuz
    const shocked: WorldState = structuredClone(w);
    shocked.market.energy.shock = -0.9;
    const p: Proposal = { id: "demo", turn: 1, from: "IND", to: "RUS", gives: [{ kind: "investment", amount: 12 }], wants: [{ kind: "goods", good: "energy", units: 5, priceAdj: -0.1 }], turns: 3, status: "accepted" };
    const others = { USA: { cards: [{ cardId: "trade.sanction", params: { target: "RUS" as Iso3 } }] } };
    const a = resolveTurn(shocked, others, []).countries.IND;
    const next = resolveTurn(shocked, { ...others, IND: { proposalsSent: 1 } }, [p]);
    const b = next.countries.IND;
    const causes = next.history[0].causes;
    const delivered = causes.filter((c) => c.field === "IND.energy.supply" && c.label === "treaty.supply").reduce((t, c) => t + c.delta, 0);
    const delayed = causes.filter((c) => c.field === "IND.energy.supply" && c.label === "sanctions.delay").reduce((t, c) => t + c.delta, 0);
    return [
      ["Supply pact with Russia", "India invests $12B", true],
      ["Russia delivers oil under the pact", `+${delivered.toFixed(1)} pts of demand`],
      ...(delayed < -0.05 ? [["US sanctions delay part of it", `${delayed.toFixed(1)} pts · USA's move`]] : []),
      ["India's energy supply", `${(a.goods.energy.supplyRatio * 100).toFixed(0)}% → ${(b.goods.energy.supplyRatio * 100).toFixed(0)}%`],
      ["Fuel shortage holds back growth less", `${a.growth.toFixed(1)}% → ${b.growth.toFixed(1)}%`],
      ["More jobs", `unemployment ${a.unemployment.toFixed(2)}% → ${b.unemployment.toFixed(2)}%`],
    ] as [string, string, boolean?][];
  }, [w]);
  return (
    <Band className="grid grid-cols-[.9fr_1.1fr] items-center gap-12 max-lg:grid-cols-1">
      <div>
        <div className={eyebrow}>The Why chain</div>
        <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-tight font-semibold">Every change has a reason.</h2>
        <p className="mt-3 max-w-[48ch] text-[17px] text-ink-2">After every year, tap any number and the game shows the chain that moved it. This one was computed live by the game engine: the same year run twice, once with the pact and once without.</p>
      </div>
      <ol className="grid max-w-[460px] gap-0">
        {rows.map(([t, v, root], i) => (
          <li key={t}>
            {i > 0 && <span className="ml-6 block h-6 w-0.5 bg-ink-3" />}
            <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className={cn("flex justify-between gap-3 rounded-[14px] border px-4 py-3 text-[14px] font-bold shadow-[0_6px_18px_rgba(17,35,43,.08)]", root ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white" : "border-border bg-white")}>
              <span>{t}</span>
              <small className={cn("font-semibold tabular-nums", root ? "text-white/70" : "text-ink-3")}>{v}</small>
            </motion.div>
          </li>
        ))}
      </ol>
    </Band>
  );
}

function RankDemo() {
  const start = useStartWorld();
  const [match, setMatch] = useState<WorldState | null>(null);
  const [t, setT] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const play = () => {
    clearInterval(timer.current);
    setT(0);
    let k = 0;
    timer.current = setInterval(() => {
      k += 1;
      setT(k);
      if (k >= 12) clearInterval(timer.current);
    }, 850);
  };
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setTimeout(() => {
        let w = start;
        while (!w.ended) w = closeTurn(w, planBots(w, [...SEATS], "normal"), {}, []);
        setMatch(w);
        play();
      }, 50);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer.current);
    };
  }, [start]);
  const order = match ? [...SEATS].sort((a, b) => match.power[b][t] - match.power[a][t]) : [...SEATS].sort((a, b) => start.power[b][0] - start.power[a][0]);
  const pw = (s: Iso3) => (match ? match.power[s][t] : start.power[s][0]);
  const max = Math.max(...SEATS.map(pw));
  return (
    <Band className="grid grid-cols-[1.1fr_.9fr] items-center gap-12 max-lg:grid-cols-1">
      <div ref={box} className={cn(glass, "p-5")}>
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[44px] font-semibold tabular-nums">{t ? 2025 + t : "Start"}</span>
          <span className={eyebrow}>World Power Index</span>
        </div>
        <ol className="mt-3 grid gap-1.5">
          {order.map((s, i) => (
            <motion.li key={s} layout transition={{ type: "spring", bounce: 0.2, visualDuration: 0.5 }} className={cn("grid grid-cols-[22px_34px_1fr_60px] items-center gap-2.5 rounded-xl border bg-white px-3 py-2", s === "IND" ? "border-[var(--gold)]" : "border-border")}>
              <span className="font-extrabold text-ink-3">{i + 1}</span>
              <Portrait i={SEATS.indexOf(s)} seat={SEAT_COLOR[s]} size={30} />
              <div>
                <b className="flex items-center gap-1.5 text-[14px]">
                  <Flag iso3={s} /> {SHORT[s]}
                </b>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e2ded4]">
                  <i className="block h-full transition-[width] duration-500" style={{ width: `${(pw(s) / max) * 100}%`, background: SEAT_COLOR[s] }} />
                </div>
              </div>
              <span className="text-right font-extrabold tabular-nums">{pw(s).toFixed(1)}</span>
            </motion.li>
          ))}
        </ol>
      </div>
      <div>
        <div className={eyebrow}>Rank 1 is earned</div>
        <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-tight font-semibold">Climb the World Power Index.</h2>
        <p className="mt-3 text-[17px] text-ink-2">Economy, development, security, diplomacy and stability. The winner is the leader who improved their country most compared with doing nothing, so India, Saudi Arabia or Japan can beat the USA.</p>
        <p className="mt-3 text-[13px] text-ink-3">A full match played by bots in your browser, replayed year by year.</p>
        {match && (
          <button onClick={play} className="mt-4 rounded-full border border-[rgba(17,35,43,.16)] bg-white px-4 py-2 text-[13px] font-bold">
            Replay
          </button>
        )}
      </div>
    </Band>
  );
}

function Learn() {
  const tiles = [
    ["Trade", "Sanctions leakage", "Sanctions rarely stop trade fully. Goods find other buyers at a discount, through third countries.", "In the game: part of a sanctioned country's oil still reaches the market, at a lower price."],
    ["Jobs", "Okun's law", "A growing workforce needs growth just to keep unemployment flat. Faster growth cuts it; slower growth raises it.", "In the game: India needs about 6.5% growth before unemployment starts to fall."],
    ["Markets", "Terms of trade", "When oil gets expensive, exporters gain and importers pay. Long contracts protect a buyer from price spikes.", "In the game: a treaty fixes the price at signing for its whole term."],
  ];
  return (
    <Band>
      <div className={eyebrow}>Learn by leading</div>
      <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-tight font-semibold">You will meet real ideas.</h2>
      <div className="mt-9 grid grid-cols-3 gap-4 max-md:grid-cols-1">
        {tiles.map(([tag, t, d, ex]) => (
          <div key={t} className="grid gap-3 rounded-[18px] border border-border bg-white p-5">
            <span className="justify-self-start rounded-full border border-border px-2.5 py-0.5 text-[12px] font-bold text-ink-2">{tag}</span>
            <h3 className="font-display text-[23px] font-semibold">{t}</h3>
            <p className="text-[14.5px] text-ink-2">{d}</p>
            <p className="rounded-xl bg-paper px-3 py-2.5 text-[13px] font-bold">{ex}</p>
          </div>
        ))}
      </div>
    </Band>
  );
}

function Faq() {
  const qa = [
    ["How long is a match?", "Twelve years, about 20 minutes. There is no timer in solo unless you turn it on."],
    ["Do I need friends online?", "No. Today you play solo against five bots. Rooms with friends and Quick Match come with multiplayer."],
    ["Is there a war?", "Not in this version. Military strength works through deterrence and security. Economy, trade and diplomacy decide the match."],
    ["How is the winner chosen?", "By Leader Score: how much you improved your country compared with doing nothing, plus your mission, your rank climb and the scenario objectives."],
    ["Is it free?", "Yes. No download, no login. Nothing you can buy will give power in ranked play."],
  ];
  return (
    <Band>
      <div className={eyebrow}>Questions</div>
      <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-tight font-semibold">Before you take office</h2>
      <div className="mt-7 grid max-w-[760px] gap-2.5">
        {qa.map(([q, a]) => (
          <details key={q} className="group rounded-[14px] border border-border bg-white px-5 py-4">
            <summary className="flex cursor-pointer list-none justify-between gap-3 font-extrabold">
              {q}
              <span className="text-ink-3 group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </Band>
  );
}
