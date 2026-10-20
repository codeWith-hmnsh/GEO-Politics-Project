"use client";

import { ArrowLeft, ArrowRight, Check, Flame, Globe2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { ERA_LOOK } from "@/lib/game/quiz/look";
import { PER_ERA, RUN_LENGTH } from "@/lib/game/quiz/run";
import { useQuiz } from "@/lib/game/quiz/store";
import { ERAS } from "@/lib/game/quiz/types";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn, eyebrow } from "../game/bits";

/** The front door: what the game is in one line, three eras, today's run and your streak. */
export function Intro({ onStart, ready, newsDate }: { onStart: (daily: boolean) => void; ready: boolean; newsDate: string | null }) {
  const phase = useQuiz((s) => s.phase);
  const saved = useQuiz((s) => s.saved);
  const today = useQuiz((s) => s.today);
  if (phase !== "intro") return null;
  const doneToday = today > 0 && saved.lastDay === today;
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-y-0 left-0 z-10 w-[min(760px,70vw)] bg-[linear-gradient(90deg,var(--paper)_0%,rgba(243,241,236,.92)_55%,rgba(243,241,236,0)_100%)] max-md:hidden" />
      <motion.section
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: ease.out }}
        aria-labelledby="quiz-title"
        className="fixed inset-y-0 left-0 z-20 flex w-[min(560px,100%)] flex-col justify-center px-10 py-8 max-md:inset-x-0 max-md:top-auto max-md:w-auto max-md:justify-end max-md:rounded-t-[26px] max-md:bg-white/94 max-md:px-5 max-md:pt-6 max-md:pb-[max(20px,env(safe-area-inset-bottom))] max-md:shadow-[0_-20px_60px_rgba(17,35,43,.18)] max-md:backdrop-blur-2xl"
      >
        <Link href="/play" className="absolute top-6 left-10 inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-3 hover:text-ink max-md:hidden">
          <ArrowLeft className="size-4" /> Play
        </Link>
        <div className={eyebrow}>A daily world quiz · {RUN_LENGTH} questions</div>
        <h1 id="quiz-title" className="mt-2 font-display text-[clamp(44px,6vw,76px)] leading-[0.95] font-semibold tracking-tight">
          {ERAS.map((e, k) => (
            <motion.span
              key={e}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15 + k * 0.12,
                duration: 0.5,
                ease: ease.out,
              }}
              className={cn("block", k === 2 && "italic")}
              style={k === 2 ? { color: ERA_LOOK.next.ink } : undefined}
            >
              {ERA_LOOK[e].name}.
            </motion.span>
          ))}
        </h1>
        <p className="mt-4 max-w-[440px] text-[16px] leading-relaxed text-ink-2 max-md:text-[15px]">What happened, what is in the news, and what comes next. Answer, and the globe flies you to where it happened.</p>

        <div className="mt-6 grid grid-cols-3 gap-2.5 max-md:mt-4 max-md:gap-2">
          {ERAS.map((e, k) => {
            const l = ERA_LOOK[e];
            const Icon = l.icon;
            return (
              <motion.div
                key={e}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.5 + k * 0.08,
                  duration: 0.45,
                  ease: ease.out,
                }}
                className="rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-[var(--shadow-card)] backdrop-blur-xl max-md:p-2.5"
              >
                <span className="grid size-9 place-items-center rounded-xl max-md:size-8" style={{ background: l.soft, color: l.ink }}>
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <b className="mt-2 block text-[14px]">
                  {l.name} <span className="font-semibold text-ink-3">· {PER_ERA[e]}</span>
                </b>
                <span className="block text-[12px] leading-snug text-ink-3 max-md:hidden">{l.line}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-[13px] font-bold max-md:mt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 shadow-[var(--shadow-card)]">
            <Flame className={cn("size-4", saved.days ? "text-[#e8742c]" : "text-ink-3")} aria-hidden /> {saved.days} day streak
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 shadow-[var(--shadow-card)]">
            <Trophy className="size-4 text-[var(--gold-ink)]" aria-hidden /> Best {saved.best.toLocaleString("en-US")}
          </span>
          {newsDate && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-ink-2 shadow-[var(--shadow-card)]">
              <span className="size-2 rounded-full bg-[var(--conflict)]" /> Headlines from {newsDate}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 max-md:mt-5">
          {doneToday ? (
            <>
              <span className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[rgba(47,163,107,.12)] px-5 text-[14px] font-bold text-[var(--up)]">
                <Check className="size-4" /> Today&apos;s run done. New one tomorrow.
              </span>
              <Btn className="min-h-[52px] px-6 text-[15px]" disabled={!ready} onClick={() => onStart(false)}>
                Practice run <ArrowRight className="size-4" aria-hidden />
              </Btn>
            </>
          ) : (
            <>
              <Btn className="min-h-[54px] px-7 text-[16px]" disabled={!ready} onClick={() => onStart(true)}>
                {ready ? (
                  <>
                    Play today&apos;s {RUN_LENGTH} <ArrowRight className="size-4" aria-hidden />
                  </>
                ) : (
                  <>
                    <Globe2 className="size-4 animate-spin [animation-duration:2s]" aria-hidden /> Loading the world…
                  </>
                )}
              </Btn>
              <button type="button" disabled={!ready} onClick={() => onStart(false)} className="text-[14px] font-bold text-ink-2 underline-offset-4 hover:text-ink hover:underline disabled:opacity-40">
                Practice run
              </button>
            </>
          )}
        </div>
        <p className="mt-4 text-[12.5px] text-ink-3">About 3 minutes. 20 seconds a question, faster answers score more, and streaks multiply.</p>
      </motion.section>
    </>
  );
}
