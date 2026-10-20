"use client";

import { ArrowLeft, Check, Copy, Flame, RotateCcw, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { ERA_LOOK } from "@/lib/game/quiz/look";
import { dayLabel, shareText, titleFor } from "@/lib/game/quiz/run";
import { useQuiz } from "@/lib/game/quiz/store";
import { ERAS } from "@/lib/game/quiz/types";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn, eyebrow } from "../game/bits";
import { useRoll } from "../crisis/ui";

/** The result: your title, score, how each era went, every answer, and a spoiler-free share. */
export function End({ onPractice }: { onPractice: () => void }) {
  const phase = useQuiz((s) => s.phase);
  if (phase !== "end") return null;
  return <Result onPractice={onPractice} />;
}

function Result({ onPractice }: { onPractice: () => void }) {
  const questions = useQuiz((s) => s.questions);
  const answers = useQuiz((s) => s.answers);
  const score = useQuiz((s) => s.score);
  const bestStreak = useQuiz((s) => s.bestStreak);
  const saved = useQuiz((s) => s.saved);
  const record = useQuiz((s) => s.record);
  const daily = useQuiz((s) => s.daily);
  const today = useQuiz((s) => s.today);
  const right = answers.filter((a) => a.correct).length;
  const t = titleFor(right);
  const shown = useRoll(score, 1400);
  const [copied, setCopied] = useState(false);
  const day = dayLabel(today);

  const share = async () => {
    const text = shareText(day, questions, answers, score);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // the player closed the share sheet
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: ease.out }}
      aria-labelledby="result-title"
      className="fixed top-1/2 left-1/2 z-30 flex max-h-[calc(100dvh-32px)] w-[min(980px,calc(100%-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-[0_40px_100px_rgba(17,35,43,.25)] backdrop-blur-2xl max-md:top-auto max-md:bottom-0 max-md:max-h-[92dvh] max-md:w-full max-md:translate-y-0 max-md:flex-col max-md:overflow-y-auto max-md:rounded-b-none"
    >
      <div className="relative flex w-[44%] shrink-0 flex-col bg-[var(--ink-strong)] p-8 text-white max-md:w-full max-md:p-6">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_60%_at_20%_0%,rgba(242,179,61,.28),transparent_60%)]" />
        <div className="relative">
          <div className="text-[11px] font-extrabold tracking-[.18em] text-white/60 uppercase">{daily ? `Daily run · ${day}` : "Practice run"}</div>
          <h2 id="result-title" className="mt-3 font-display text-[clamp(30px,3.6vw,42px)] leading-[1.02] font-semibold">
            You are {/^[AEIOU]/.test(t.title) ? "an" : "a"}{" "}
            <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-[var(--gold)] italic">
              {t.title}
            </motion.span>
          </h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/75">{t.line}</p>
          <div className="mt-6 flex items-end gap-3">
            <b className="font-display text-[64px] leading-none font-semibold tabular-nums">{shown.toLocaleString("en-US")}</b>
            <span className="pb-2 text-[13px] font-bold text-white/60">points</span>
          </div>
          {record && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.4, type: "spring", bounce: 0.5 }}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--gold)] px-2.5 py-0.5 text-[12px] font-extrabold text-[var(--ink-strong)]"
            >
              <Sparkles className="size-3.5" /> New best
            </motion.span>
          )}
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <Stat k="Right" v={`${right}/${questions.length}`} />
            <Stat k="Best streak" v={String(bestStreak)} />
            <Stat k="Day streak" v={String(saved.days)} icon />
          </div>
          <div className="mt-6 grid gap-2.5">
            {ERAS.map((e, k) => {
              const idx = questions.map((q, n) => (q.era === e ? n : -1)).filter((n) => n >= 0);
              const got = idx.filter((n) => answers[n]?.correct).length;
              const l = ERA_LOOK[e];
              const Icon = l.icon;
              return (
                <div key={e} className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0" style={{ color: l.color }} aria-hidden />
                  <span className="w-12 text-[13px] font-bold">{l.name}</span>
                  <span className="flex flex-1 gap-1">
                    {idx.map((n, j) => (
                      <motion.i
                        key={n}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5 + k * 0.2 + j * 0.08 }}
                        className="h-2 flex-1 origin-left rounded-full"
                        style={{
                          background: answers[n]?.correct ? l.color : "rgba(255,255,255,.14)",
                        }}
                      />
                    ))}
                  </span>
                  <span className="w-8 text-right text-[12.5px] font-bold text-white/70 tabular-nums">
                    {got}/{idx.length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative mt-auto flex flex-wrap gap-2 pt-7">
          <Btn variant="gold" className="min-h-12 flex-1 text-[14.5px]" onClick={share}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Share result"}
          </Btn>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-7 max-md:p-5">
        <div className={eyebrow}>Your answers</div>
        <ol className="mt-3 grid flex-1 gap-1.5 overflow-y-auto pr-1">
          {questions.map((q, n) => {
            const a = answers[n];
            return (
              <motion.li key={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + n * 0.04 }} className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-paper">
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white", a?.correct ? "bg-[var(--ally)]" : "bg-[var(--conflict)]")}>
                  {a?.correct ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-snug text-ink-2">{q.quote ? `Headline: ${q.fact}` : q.prompt}</span>
                  <b className="block text-[13px]" style={{ color: ERA_LOOK[q.era].ink }}>
                    {q.options[q.answer]}
                  </b>
                </span>
                {a?.correct && <span className="text-[12px] font-bold text-ink-3 tabular-nums">+{a.points}</span>}
              </motion.li>
            );
          })}
        </ol>
        <p className="mt-3 text-[12.5px] text-ink-3">{daily ? "Tomorrow brings new questions and fresh headlines. Keep your streak going." : "Practice runs do not count toward your day streak."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn className="min-h-12 flex-1 text-[14.5px]" onClick={onPractice}>
            <RotateCcw className="size-4" /> Practice run
          </Btn>
          <Link href="/play" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-white px-5 text-[14.5px] font-bold hover:shadow-[var(--shadow-card)]">
            <ArrowLeft className="size-4" /> Back to Play
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function Stat({ k, v, icon }: { k: string; v: string; icon?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/[.07] px-2 py-2.5">
      <b className="flex items-center justify-center gap-1 text-[20px] leading-none font-extrabold tabular-nums">
        {icon && <Flame className="size-4 text-[#f08a4b]" aria-hidden />}
        {v}
      </b>
      <span className="mt-1 block text-[10.5px] font-bold tracking-[.1em] text-white/55 uppercase">{k}</span>
    </div>
  );
}
