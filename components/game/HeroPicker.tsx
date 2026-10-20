"use client";

import { ArrowRight, Globe2, Sparkles, UsersRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { focus } from "@/lib/game/camera";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { RoomButtons } from "./RoomButtons";

type Game = {
  id: string;
  name: string;
  icon: typeof Globe2;
  color: string;
  title: [string, string];
  line: string;
  meta: string;
  href: string;
  cta: string;
  look: [lat: number, lng: number, dist: number];
};

const GAMES: Game[] = [
  { id: "statecraft", name: "Statecraft", icon: Globe2, color: "#f2b33d", title: ["Run a country.", "Shape the world."], line: "Six leaders. Twelve years. One world that answers back.", meta: "About 20 min · solo or with friends", href: "/play/match", cta: "Start", look: [22, 70, 4.2] },
  { id: "crisis", name: "Crisis Table", icon: UsersRound, color: "#2B6A73", title: ["One crisis.", "Secret choices."], line: "Join, deal, escalate or wait. Then see who kept their word.", meta: "About 10 min · you and five leaders", href: "/play/crisis", cta: "Take a seat", look: [26.6, 56.3, 3.4] },
  { id: "quiz", name: "Daily Quiz", icon: Sparkles, color: "#E5484D", title: ["Then. Now.", "Next."], line: "Ten quick questions. The globe shows you where.", meta: "About 3 min · new every day", href: "/play/quiz", cta: "Play today's quiz", look: [18, 10, 4.6] },
];

/** The hero: pick one of three games in a small switcher, and the headline, the globe and the start button follow. */
export function HeroPicker() {
  const [id, setId] = useState(GAMES[0].id);
  const g = GAMES.find((x) => x.id === id)!;
  const pick = (x: Game) => {
    setId(x.id);
    focus(...x.look, 1300);
  };
  return (
    <>
      <div role="radiogroup" aria-label="Choose a game" className="inline-flex w-fit gap-1 rounded-full border border-white/80 bg-white/70 p-1 max-sm:grid max-sm:w-full max-sm:grid-cols-3 shadow-[0_8px_24px_rgba(17,35,43,.08)] backdrop-blur-xl">
        {GAMES.map((x) => {
          const on = x.id === id;
          const Icon = x.icon;
          return (
            <button key={x.id} type="button" role="radio" aria-checked={on} onClick={() => pick(x)} className={cn("relative flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-bold transition-colors max-sm:justify-center max-sm:gap-1.5 max-sm:px-1.5 max-sm:text-[12px]", on ? "text-white" : "text-ink-2 hover:text-ink")}>
              {on && <motion.span layoutId="game-pill" transition={{ type: "spring", bounce: 0.2, duration: 0.45 }} className="absolute inset-0 rounded-full bg-[var(--ink-strong)] shadow-[0_6px_16px_rgba(15,29,36,.25)]" />}
              <span className="relative grid size-5 place-items-center rounded-full" style={{ background: on ? x.color : "transparent", color: on ? "#0f1d24" : x.color }}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="relative whitespace-nowrap">{x.name}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={g.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.32, ease: ease.out }} className="grid gap-6">
          <h1 className="font-display text-[clamp(48px,7.2vw,92px)] leading-[.95] font-semibold tracking-[-.035em]">
            {g.title[0]}
            <br />
            <em className={cn("font-medium", g.id === "statecraft" && "text-ink-2")} style={g.id === "statecraft" ? undefined : { color: g.color }}>
              {g.title[1]}
            </em>
          </h1>
          <p className="max-w-[32ch] text-[19px] text-ink-2">{g.line}</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={g.href} className="inline-flex min-h-12 min-w-[160px] items-center justify-center gap-2 rounded-full bg-[var(--ink-strong)] px-6 text-[15px] font-bold text-white shadow-[0_8px_22px_rgba(15,29,36,.25)] transition hover:bg-[#1b313b] active:scale-[.97]">
              {g.cta} <ArrowRight className="size-4" />
            </Link>
            {g.id === "statecraft" && <RoomButtons />}
          </div>
          <span className="text-[13.5px] font-semibold text-ink-3">
            {g.meta} · free, no login
          </span>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
