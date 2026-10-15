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
import { CAPITAL, NAMES, SEAT_COLOR, SHORT } from "@/lib/game/text";
import { useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Portrait, eyebrow, glass } from "./bits";
import { RoomButtons } from "./RoomButtons";
import { DIFF, PITCH, STRONG } from "./seats";

/**
 * Statecraft Play page (UI-DESIGN §5.2): the 1.0 globe stays fixed behind a long scroll. The hero and the
 * "How a year works" story drive the globe; then countries, the Why chain, the ranking and the FAQ.
 */

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
            <RoomButtons />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="flex -space-x-2.5" aria-hidden>
              {SEATS.map((s) => (
                <span key={s} className="grid size-9 place-items-center overflow-hidden rounded-full border-2 border-paper shadow-[0_4px_10px_rgba(17,35,43,.15)]">
                  <Flag iso3={s} className="!h-full !w-full !rounded-none !bg-cover" />
                </span>
              ))}
            </span>
            <span className="text-[13.5px] leading-snug font-semibold text-ink-2">
              Six real powers · about 20 minutes
              <br />
              <span className="text-ink-3">Free · no download · no login</span>
            </span>
          </div>
        </section>

        <section className="pointer-events-auto max-w-[520px] pt-[8vh]">
          <div className={eyebrow}>How a year works</div>
          <h2 className="mt-2 font-display text-[clamp(34px,4vw,54px)] leading-tight font-semibold">One turn is one year.</h2>
        </section>
        <div className="relative pb-[14vh]">
          {/* progress rail: one dot per step, the line fills as the story advances */}
          <div aria-hidden className="pointer-events-none sticky top-[45dvh] z-10 -mb-[120px] h-[120px] w-0 max-md:hidden">
            <div className="absolute top-0 -left-9 h-[120px] w-[3px] overflow-hidden rounded-full bg-[rgba(17,35,43,.1)] max-lg:hidden">
              <motion.i className="block w-full rounded-full bg-[var(--gold)]" animate={{ height: `${((Math.max(step, 0) + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
          {STEPS.map((s, i) => (
            <article key={s.k} data-step={i} className="pointer-events-auto flex min-h-[70dvh] max-w-[480px] flex-col justify-center max-md:min-h-[64dvh]">
              <motion.div
                animate={{ scale: step === i ? 1 : 0.97 }}
                transition={{ duration: 0.4 }}
                className={cn(glass, "relative overflow-hidden p-7 transition-shadow", step === i && "shadow-[0_0_0_2px_var(--gold),var(--shadow-card)]")}
              >
                <i className="absolute inset-y-0 left-0 w-1 bg-[var(--gold)] transition-opacity" style={{ opacity: step === i ? 1 : 0 }} />
                <div className="flex items-center justify-between gap-3">
                  <span className={eyebrow}>{s.k}</span>
                  <span className="font-display text-[15px] font-semibold text-ink-3 tabular-nums">
                    {String(i + 1).padStart(2, "0")} <span className="font-normal">/ {String(STEPS.length).padStart(2, "0")}</span>
                  </span>
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
        <section className="px-5 pt-6 pb-20">
          <div className="relative mx-auto grid max-w-[1240px] justify-items-center gap-6 overflow-hidden rounded-[32px] bg-[var(--ink-strong)] px-6 py-24 text-center text-white shadow-[0_30px_80px_rgba(15,29,36,.3)] max-md:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_75%_at_50%_0%,rgba(242,179,61,.22),transparent_65%)]" />
            <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.07]" />
            <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.07]" />
            <div className={cn(eyebrow, "relative text-[var(--gold)]")}>Statecraft</div>
            <h2 className="relative font-display text-[clamp(40px,5.6vw,76px)] leading-none font-semibold tracking-tight">Your country is waiting.</h2>
            <p className="relative max-w-[44ch] text-[17px] text-white/70">Twelve years, five rivals, one shared world. See how far you can take it.</p>
            <Link href="/play/match" className="relative inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-b from-[#F7C65E] to-[var(--gold)] px-7 text-[15px] font-bold text-[var(--ink-strong)] shadow-[0_10px_28px_rgba(242,179,61,.35)] transition active:scale-[.97]">
              Start a match <ArrowRight className="size-4" />
            </Link>
          </div>
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
  return (
    <Band>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className={eyebrow}>Six seats</div>
          <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-tight font-semibold">Who will you lead?</h2>
        </div>
        <p className="max-w-[46ch] text-[16px] text-ink-2">Every country starts from real 2025 data and carries its real problem. Pick the one you want to fix.</p>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {SEATS.map((s, i) => (
          <motion.div key={s} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: (i % 3) * 0.07, duration: 0.5 }}>
            <Link
              href={`/play/match?country=${s}`}
              className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-white shadow-[0_1px_2px_rgba(17,35,43,.04),0_12px_32px_rgba(17,35,43,.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(17,35,43,.14)]"
            >
              <div className="relative h-[118px] overflow-hidden">
                <Flag iso3={s} className="absolute inset-0 !h-full !w-full !rounded-none !bg-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,29,36,.82)] via-[rgba(15,29,36,.25)] to-transparent" />
                <div className="absolute inset-x-5 bottom-3.5 flex items-end justify-between gap-3 text-white">
                  <b className="font-display text-[28px] leading-none font-semibold tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,.35)]">{NAMES[s]}</b>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold tracking-[.12em] uppercase backdrop-blur", DIFF[s] === "Hard" ? "bg-[rgba(229,72,77,.85)]" : "bg-white/25")}>{DIFF[s]}</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5">
                <p className="text-[15.5px] font-semibold">{PITCH[s]}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {STRONG[s].map((t) => (
                    <li key={t} className="rounded-full bg-paper px-2.5 py-1 text-[12px] font-bold text-ink-2">
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto flex items-start gap-2 border-t border-border pt-4 text-[13px] text-ink-2">
                  <span className="mt-0.5 size-2 shrink-0 rounded-full" style={{ background: SEAT_COLOR[s] }} />
                  <span>
                    <b className="text-ink">Mission:</b> {MISSIONS[s].text.split(": ")[0]}
                  </span>
                </p>
                <span className="flex items-center justify-between rounded-xl bg-[var(--ink-strong)] px-4 py-2.5 text-[13.5px] font-bold text-white transition group-hover:bg-[#1b313b]">
                  Lead {SHORT[s]} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
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
    <div className="relative overflow-hidden bg-[var(--ink-strong)] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_85%_40%,rgba(242,179,61,.16),transparent_60%),radial-gradient(40%_60%_at_0%_100%,rgba(76,116,217,.18),transparent_60%)]" />
      <Band className="relative grid grid-cols-[.9fr_1.1fr] items-center gap-12 max-lg:grid-cols-1">
        <div>
          <div className={cn(eyebrow, "text-[var(--gold)]")}>The Why chain</div>
          <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-tight font-semibold">Every change has a reason.</h2>
          <p className="mt-3 max-w-[48ch] text-[17px] text-white/70">After every year, tap any number and the game shows the chain that moved it. This one was computed live by the game engine: the same year run twice, once with the pact and once without.</p>
        </div>
        <ol className="grid max-w-[460px] gap-0">
          {rows.map(([t, v, root], i) => (
            <li key={t}>
              {i > 0 && <span className="ml-6 block h-6 w-0.5 bg-gradient-to-b from-white/10 to-white/35" />}
              <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className={cn("flex justify-between gap-3 rounded-[14px] border px-4 py-3 text-[14px] font-bold", root ? "border-transparent bg-gradient-to-b from-[#F7C65E] to-[var(--gold)] text-[var(--ink-strong)]" : "border-white/10 bg-white/[.06] backdrop-blur")}>
                <span>{t}</span>
                <small className={cn("font-semibold tabular-nums", root ? "text-[var(--ink-strong)]/70" : "text-white/60")}>{v}</small>
              </motion.div>
            </li>
          ))}
        </ol>
      </Band>
    </div>
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
