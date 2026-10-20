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
      className="fixed top-1/2 left-1/2 z-30 flex max-h-[calc(100dvh-32px)] w-[min(980px,calc(100%-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[10px] border-y-[5px] border-[var(--ink-strong)] bg-[#fbf9f4] shadow-[0_40px_100px_rgba(17,35,43,.22)] max-md:top-auto max-md:bottom-0 max-md:max-h-[92dvh] max-md:w-full max-md:translate-y-0 max-md:flex-col max-md:overflow-y-auto max-md:rounded-none max-md:border-b-0"
    >
      <div className="flex w-[44%] shrink-0 flex-col border-r border-[var(--ink-strong)] p-8 max-md:w-full max-md:border-r-0 max-md:border-b max-md:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--ink-strong)] pb-2.5 text-[10.5px] font-extrabold tracking-[.18em] text-ink-2 uppercase">
          <span>{daily ? `Daily run · ${day}` : "Practice run"}</span>
          <span>Then · Now · Next</span>
        </div>
        <h2 id="result-title" className="mt-5 font-display text-[clamp(32px,3.8vw,44px)] leading-[1.02] font-semibold tracking-tight">
          You are {/^[AEIOU]/.test(t.title) ? "an" : "a"}{" "}
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="font-medium text-[var(--gold-ink)] italic">
            {t.title}
          </motion.span>
        </h2>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{t.line}</p>
        <div className="relative mt-6 flex items-end gap-3">
          <b className="font-display text-[68px] leading-none font-semibold tracking-tight tabular-nums">{shown.toLocaleString("en-US")}</b>
          <span className="pb-2.5 text-[13px] font-bold text-ink-3">points</span>
          {record && (
            <motion.span
              initial={{ scale: 1.8, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: -6 }}
              transition={{ delay: 1.4, type: "spring", bounce: 0.5 }}
              className="mb-3 ml-auto inline-flex items-center gap-1 rounded-md border-2 border-[var(--gold-ink)] px-2 py-0.5 text-[11.5px] font-extrabold tracking-[.12em] text-[var(--gold-ink)] uppercase"
            >
              <Sparkles className="size-3.5" /> New best
            </motion.span>
          )}
        </div>
        <div className="mt-6 grid grid-cols-3 border-y border-[var(--ink-strong)] text-center">
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
                <Icon className="size-4 shrink-0" style={{ color: l.ink }} aria-hidden />
                <span className="w-12 text-[13px] font-bold">{l.name}</span>
                <span className="flex flex-1 gap-1">
                  {idx.map((n, j) => (
                    <motion.i
                      key={n}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.5 + k * 0.2 + j * 0.08 }}
                      className="h-2 flex-1 origin-left rounded-[2px]"
                      style={{ background: answers[n]?.correct ? l.color : "#e4dfd3" }}
                    />
                  ))}
                </span>
                <span className="w-8 text-right text-[12.5px] font-bold text-ink-2 tabular-nums">
                  {got}/{idx.length}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-7">
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
              <motion.li key={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + n * 0.04 }} className="flex items-start gap-2.5 border-b border-dashed border-[rgba(15,29,36,.16)] px-1 py-2.5 last:border-b-0">
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
    <div className="px-2 py-3 [&+&]:border-l [&+&]:border-[var(--ink-strong)]">
      <b className="flex items-center justify-center gap-1 font-display text-[24px] leading-none font-semibold tabular-nums">
        {icon && <Flame className="size-4 text-[#c4561a]" aria-hidden />}
        {v}
      </b>
      <span className="mt-1 block text-[10.5px] font-bold tracking-[.1em] text-ink-3 uppercase">{k}</span>
    </div>
  );
}
