"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { Header } from "@/components/chrome/Header";
import { GlobeClient } from "@/components/globe/GlobeClient";
import { focus } from "@/lib/game/camera";
import { createWorld } from "@/lib/game/engine/init";
import { resolveTurn } from "@/lib/game/engine/resolve";
import type { Iso3, Proposal, WorldState } from "@/lib/game/engine/types";
import { SEATS } from "@/lib/game/engine/types";
import { closeTurn, planBots } from "@/lib/game/match";
import { SEED_2026 } from "@/lib/game/seed";
import { useGame } from "@/lib/game/store";
import { CAPITAL, NAMES, SEAT_COLOR, SHORT } from "@/lib/game/text";
import { useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Portrait, eyebrow, glass } from "./bits";
import { HeroPicker } from "./HeroPicker";
import { DIFF, PITCH } from "./seats";

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
          <HeroPicker />
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
        <Faq />
        <section className="px-5 pt-8 pb-20">
          <div className="mx-auto max-w-[1240px] border-y-[5px] border-[var(--ink-strong)] py-1.5">
            <div className="border-y border-[var(--ink-strong)] px-8 pt-5 pb-0 max-md:px-4">
              <div className="flex items-center justify-between gap-4 text-[11px] font-extrabold tracking-[.2em] text-ink-2 uppercase max-md:justify-center">
                <span className="max-md:hidden">The play edition</span>
                <span>Three games · one world</span>
                <span className="max-md:hidden">Free · no login</span>
              </div>
              <h2 className="mt-8 text-center font-display text-[clamp(52px,9vw,124px)] leading-[.9] font-semibold tracking-[-.04em]">
                The world is <em className="font-medium text-[var(--gold-ink)]">waiting.</em>
              </h2>
              <p className="mt-5 text-center text-[17px] text-ink-2">Three minutes or twenty. Pick a game.</p>
              <div className="-mx-8 mt-10 grid grid-cols-3 border-t border-[var(--ink-strong)] max-md:-mx-4 max-md:grid-cols-1">
                {(
                  [
                    ["/play/match", "20 min", "Statecraft", "Start a match"],
                    ["/play/crisis", "10 min", "Crisis Table", "Take a seat"],
                    ["/play/quiz", "3 min", "Daily Quiz", "Play today's quiz"],
                  ] as const
                ).map(([href, time, name, cta], i) => (
                  <Link key={href} href={href} className={cn("group flex items-end justify-between gap-4 px-6 py-7 transition-colors duration-300 hover:bg-[var(--gold)] max-md:px-4 max-md:py-5", i > 0 && "border-l border-[var(--ink-strong)] max-md:border-t max-md:border-l-0")}>
                    <span>
                      <span className="block text-[11px] font-extrabold tracking-[.18em] text-ink-3 uppercase transition-colors group-hover:text-[var(--ink-strong)]/70">{time}</span>
                      <b className="mt-1 block font-display text-[30px] leading-none font-semibold tracking-tight">{name}</b>
                      <span className="mt-2 block text-[13.5px] font-bold text-ink-2 transition-colors group-hover:text-[var(--ink-strong)]">{cta}</span>
                    </span>
                    <ArrowRight className="size-6 shrink-0 transition duration-300 group-hover:translate-x-1.5" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
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

const Band = ({ children, className }: { children: React.ReactNode; className?: string }) => <section className={cn("mx-auto max-w-[1240px] px-5 py-20 max-md:py-14", className)}>{children}</section>;

function useStartWorld() {
  return useMemo(() => createWorld(SEED_2026, { matchId: "play-page", seed: 2026, scenario: "energyShock" }), []);
}

function Countries() {
  return (
    <Band>
      <div className={eyebrow}>Statecraft · six seats</div>
      <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-[1.05] font-semibold tracking-tight">Who will you lead?</h2>
      <div className="mt-8 grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {SEATS.map((s, i) => (
          <motion.div key={s} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ delay: (i % 3) * 0.06, duration: 0.45 }}>
            <Link
              href={`/play/match?country=${s}`}
              aria-label={`Lead ${NAMES[s]}`}
              className="group flex items-center gap-4 rounded-[20px] border border-border bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(17,35,43,.18)] hover:shadow-[0_16px_36px_rgba(17,35,43,.1)]"
            >
              <span className="grid h-12 w-[68px] shrink-0 overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(17,35,43,.14)] ring-1 ring-black/5">
                <Flag iso3={s} className="!h-full !w-full !rounded-none !bg-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <b className="font-display text-[21px] leading-tight font-semibold">{NAMES[s]}</b>
                  {DIFF[s] === "Hard" && <span className="rounded-full bg-[rgba(229,72,77,.1)] px-1.5 py-px text-[10px] font-extrabold tracking-[.1em] text-[var(--down)] uppercase">Hard</span>}
                </span>
                <span className="block truncate text-[13px] text-ink-3">{PITCH[s]}</span>
              </span>
              <ArrowUpRight className="size-5 shrink-0 text-ink-3 transition group-hover:rotate-45 group-hover:text-ink" aria-hidden />
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
    <div className="border-y border-[rgba(15,29,36,.12)] bg-[#ebe7de]">
      <Band className="grid grid-cols-[.9fr_1.1fr] items-center gap-14 max-lg:grid-cols-1 max-lg:gap-10">
        <div>
          <div className={cn(eyebrow, "text-[var(--gold-ink)]")}>The Why chain</div>
          <h2 className="mt-2 font-display text-[clamp(38px,4.6vw,64px)] leading-[1] font-semibold tracking-tight">
            Every change
            <br />
            has a <em className="font-medium text-[var(--gold-ink)]">reason.</em>
          </h2>
          <p className="mt-4 max-w-[36ch] text-[17px] text-ink-2">Tap any number and see the chain that moved it.</p>
        </div>
        <figure className="relative rounded-[6px] bg-white px-7 pt-6 pb-7 shadow-[0_1px_0_rgba(15,29,36,.08),0_24px_50px_-20px_rgba(15,29,36,.3)] max-md:px-5">
          <figcaption className="flex items-baseline justify-between gap-3 border-b-2 border-[var(--ink-strong)] pb-3">
            <b className="font-display text-[20px] font-semibold">Why India grew faster</b>
            <span className="text-[11px] font-extrabold tracking-[.16em] text-ink-3 uppercase">2026 · from the engine</span>
          </figcaption>
          <ol className="relative mt-1">
            <motion.i aria-hidden initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut" }} className="absolute top-6 bottom-6 left-[13px] w-px origin-top bg-[var(--ink-strong)]" />
            {rows.map(([t, v, root], i) => (
              <motion.li key={t} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 + i * 0.14, duration: 0.4 }} className="relative grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-dashed border-[rgba(15,29,36,.18)] py-3.5 last:border-b-0">
                <span className={cn("relative z-10 grid size-7 place-items-center rounded-full border text-[12px] font-extrabold tabular-nums", root ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-[var(--gold)]" : "border-[var(--ink-strong)] bg-white text-ink")}>{i + 1}</span>
                <span className={cn("text-[15px] font-semibold", root && "font-extrabold")}>
                  <span className={cn(root && "bg-[linear-gradient(transparent_58%,rgba(242,179,61,.55)_58%)] px-0.5")}>{t}</span>
                </span>
                <span className="font-display text-[15px] font-semibold whitespace-nowrap text-ink-2 tabular-nums">{v}</span>
              </motion.li>
            ))}
          </ol>
        </figure>
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

function Faq() {
  const qa = [
    ["Which game first?", "Three minutes: the Daily Quiz. Ten: the Crisis Table. Twenty: Statecraft."],
    ["Do I need friends online?", "No. Bots fill every empty seat. Statecraft also has rooms for friends."],
    ["How do I win?", "Improve your own country the most from where it started. Anyone can beat the USA."],
    ["Is it free?", "Yes. No download, no login, and nothing you can buy gives power."],
  ];
  return (
    <Band className="grid grid-cols-[.8fr_1.2fr] gap-12 max-lg:grid-cols-1 max-lg:gap-8">
      <div className="self-start lg:sticky lg:top-28">
        <div className={eyebrow}>Questions</div>
        <h2 className="mt-2 font-display text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-semibold tracking-tight">Before you take office</h2>
      </div>
      <div className="grid gap-2.5">
        {qa.map(([q, a]) => (
          <details key={q} className="group rounded-[18px] border border-border bg-white px-5 py-4 shadow-[0_1px_2px_rgba(17,35,43,.03)] transition open:shadow-[0_12px_30px_rgba(17,35,43,.08)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15.5px] font-extrabold">
              {q}
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper text-[16px] text-ink-2 transition group-open:rotate-45 group-open:bg-[var(--ink-strong)] group-open:text-white">+</span>
            </summary>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </Band>
  );
}
