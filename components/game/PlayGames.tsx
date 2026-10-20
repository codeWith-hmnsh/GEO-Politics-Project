"use client";

import { ArrowRight, Check, Clock, Flame, Users } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Flag } from "@/components/chrome/Flag";
import { CHOICE_LOOK } from "@/lib/game/crisis/look";
import { CHOICES } from "@/lib/game/crisis/types";
import { ERA_LOOK } from "@/lib/game/quiz/look";
import { ERAS } from "@/lib/game/quiz/types";
import { cn } from "@/lib/utils";
import { eyebrow } from "./bits";

type Game = {
  href: string;
  tag: string;
  badge?: string;
  title: string;
  pitch: string;
  points: string[];
  time: string;
  who: string;
  cta: string;
  stage: React.ReactNode;
};

const GAMES: Game[] = [
  {
    href: "/play/match",
    tag: "Strategy",
    title: "Statecraft",
    pitch: "Run a real country for twelve years and climb the World Power Index.",
    points: ["Budgets, deals and sanctions", "Every number explains itself", "Solo, or a room with friends"],
    time: "About 20 min",
    who: "1–6 players",
    cta: "Start a match",
    stage: <StatecraftStage />,
  },
  {
    href: "/play/crisis",
    tag: "Bluff and trust",
    badge: "New",
    title: "Crisis Table",
    pitch: "One crisis a year. Six leaders answer in secret, and the world feels the result.",
    points: ["Four answers: join, deal, escalate, wait", "Promises, bluffs and a secret agenda", "Ten years, sixteen real crises"],
    time: "About 10 min",
    who: "You and 5 leaders",
    cta: "Take a seat",
    stage: <CrisisStage />,
  },
  {
    href: "/play/quiz",
    tag: "Daily quiz",
    badge: "Daily",
    title: "Then · Now · Next",
    pitch: "Ten questions about what happened, what is in the news and what comes next.",
    points: ["Built from today's headlines", "The globe flies to every answer", "Keep your day streak going"],
    time: "About 3 min",
    who: "New every day",
    cta: "Play today's 10",
    stage: <QuizStage />,
  },
];

/** "Three ways to play": one card per game, each with a small live-looking preview of what you will see. */
export function PlayGames() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 pt-24 pb-16 max-md:pt-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className={eyebrow}>Three ways to play</div>
          <h2 className="mt-2 font-display text-[clamp(34px,4.2vw,56px)] leading-[1.05] font-semibold tracking-tight">Pick your game.</h2>
        </div>
        <p className="max-w-[44ch] text-[16px] text-ink-2">All three run on the same live globe and real-world data. Start with the quiz if you have three minutes, or take a country for twenty.</p>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-5 max-lg:grid-cols-1">
        {GAMES.map((g, i) => (
          <motion.div key={g.href} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.08, duration: 0.55 }}>
            <Link
              href={g.href}
              className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-border bg-white shadow-[0_1px_2px_rgba(17,35,43,.04),0_14px_36px_rgba(17,35,43,.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(17,35,43,.14)]"
            >
              <div className="relative h-[210px] overflow-hidden">
                {g.stage}
                {g.badge && <span className="absolute top-4 right-4 rounded-full bg-[var(--ink-strong)] px-2.5 py-1 text-[10.5px] font-extrabold tracking-[.14em] text-[var(--gold)] uppercase shadow-[0_6px_16px_rgba(15,29,36,.25)]">{g.badge}</span>}
              </div>
              <div className="flex flex-1 flex-col p-6 max-md:p-5">
                <span className={eyebrow}>{g.tag}</span>
                <h3 className="mt-1.5 font-display text-[28px] leading-tight font-semibold tracking-tight">{g.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{g.pitch}</p>
                <ul className="mt-4 grid gap-1.5">
                  {g.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-2">
                      <Check className="size-3.5 shrink-0 text-[var(--up)]" strokeWidth={3} aria-hidden /> {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-4 pt-6 text-[12.5px] font-bold text-ink-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden /> {g.time}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5" aria-hidden /> {g.who}
                  </span>
                </div>
                <span className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--ink-strong)] px-5 py-3.5 text-[14.5px] font-bold text-white transition group-hover:bg-[#1b313b]">
                  {g.cta} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** Statecraft: a power ranking with India climbing. */
function StatecraftStage() {
  const rows: [string, number, string][] = [
    ["USA", 86, "#4c74d9"],
    ["IND", 74, "#e8742c"],
    ["CHN", 70, "#d94848"],
  ];
  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#e3ecf1,#f3f1ec)]">
      <div aria-hidden className="absolute -right-16 -bottom-24 size-[260px] rounded-full border border-[rgba(17,35,43,.08)] bg-[radial-gradient(circle_at_35%_35%,#dbe7ee,#c9d9e2)] shadow-[inset_-20px_-30px_60px_rgba(17,35,43,.12)]" />
      <div className="absolute inset-x-6 top-7 grid gap-2">
        {rows.map(([s, v, c], i) => (
          <div key={s} className={cn("flex items-center gap-2.5 rounded-xl bg-white/90 px-3 py-2 shadow-[0_6px_16px_rgba(17,35,43,.08)] transition duration-500", s === "IND" && "ring-2 ring-[var(--gold)] group-hover:-translate-y-[calc(100%+8px)]", s === "USA" && "group-hover:translate-y-[calc(100%+8px)]")}>
            <span className="w-3 text-[12px] font-extrabold text-ink-3">{i + 1}</span>
            <Flag iso3={s} className="h-3.5 w-[21px]" />
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e7e3da]">
              <i className={cn("block h-full rounded-full transition-[width] duration-700", s === "IND" ? "w-[74%] group-hover:w-[90%]" : "")} style={{ width: s === "IND" ? undefined : `${v}%`, background: c }} />
            </span>
            <b className="w-7 text-right text-[12.5px] tabular-nums">{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Crisis Table: the four answers fanned out like a hand of cards. */
function CrisisStage() {
  return (
    <div className="absolute inset-0 bg-[var(--ink-strong)]">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(242,179,61,.2),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-[-22px] flex justify-center transition duration-500 group-hover:-translate-y-3">
        {CHOICES.map((k, i) => {
          const l = CHOICE_LOOK[k];
          const Icon = l.icon;
          const rot = (i - 1.5) * 9;
          return (
            <span
              key={k}
              className="-mx-2.5 flex h-[150px] w-[108px] origin-bottom flex-col items-start gap-1.5 rounded-2xl border-2 bg-white p-3 shadow-[0_18px_36px_rgba(0,0,0,.35)] transition duration-500"
              style={{ borderColor: l.color, transform: `rotate(${rot}deg) translateY(${Math.abs(i - 1.5) * 8}px)` }}
            >
              <span className="grid size-8 place-items-center rounded-lg" style={{ background: l.soft, color: l.color }}>
                <Icon className="size-4" aria-hidden />
              </span>
              <b className="text-[9.5px] font-extrabold tracking-[.06em] uppercase" style={{ color: l.ink }}>
                {l.name}
              </b>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Then · Now · Next: a question card with the right answer lit. */
function QuizStage() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,#eef1fb,#f3f1ec)]">
      <div className="absolute top-6 left-6 flex gap-1.5">
        {ERAS.map((e) => {
          const l = ERA_LOOK[e];
          const Icon = l.icon;
          return (
            <span key={e} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tracking-[.1em] uppercase" style={{ background: l.soft, color: l.ink }}>
              <Icon className="size-3" aria-hidden /> {l.name}
            </span>
          );
        })}
      </div>
      <div className="absolute inset-x-6 top-[58px] rounded-2xl bg-white p-3.5 shadow-[0_14px_30px_rgba(17,35,43,.12)] transition duration-500 group-hover:-translate-y-1">
        <b className="block font-display text-[15px] leading-snug">Which country mines most of the world&apos;s cobalt?</b>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[12px] font-semibold">
          {["Chile", "DR Congo", "Australia", "Russia"].map((o) => (
            <span key={o} className={cn("rounded-lg border px-2 py-1.5", o === "DR Congo" ? "border-[var(--ally)] bg-[rgba(47,163,107,.1)] text-[var(--up)]" : "border-border text-ink-2")}>
              {o === "DR Congo" && <Check className="mr-1 inline size-3" strokeWidth={3} aria-hidden />}
              {o}
            </span>
          ))}
        </div>
      </div>
      <span className="absolute right-5 bottom-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-extrabold text-[#c4561a] shadow-[0_6px_16px_rgba(17,35,43,.1)]">
        <Flame className="size-3.5" aria-hidden /> 4 day streak
      </span>
    </div>
  );
}
