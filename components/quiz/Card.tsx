"use client";

import { ArrowRight, Check, ExternalLink, MapPin, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ERA_LOOK } from "@/lib/game/quiz/look";
import { BLANK } from "@/lib/game/quiz/news";
import { multiplier, TIME_MS } from "@/lib/game/quiz/run";
import { useQuiz } from "@/lib/game/quiz/store";
import type { Question } from "@/lib/game/quiz/types";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn } from "../game/bits";

const LETTERS = ["A", "B", "C", "D"];

/** The question panel: era, prompt, four answers, then the fact that the globe flies to. */
export function Card() {
  const phase = useQuiz((s) => s.phase);
  const i = useQuiz((s) => s.i);
  const q = useQuiz((s) => s.questions[s.i]);
  if ((phase !== "ask" && phase !== "reveal") || !q) return null;
  return (
    <motion.aside
      key={q.id}
      initial={{ opacity: 0, x: 40, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: ease.out }}
      aria-label={`Question ${i + 1}`}
      data-avoid
      className="fixed top-[88px] right-4 bottom-4 z-20 flex w-[480px] flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/94 shadow-[0_30px_80px_rgba(17,35,43,.18)] backdrop-blur-2xl max-[1100px]:w-[430px] max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-h-[62dvh] max-md:w-auto max-md:rounded-b-none"
    >
      <Head q={q} />
      <div className="flex-1 overflow-y-auto px-6 pb-5 max-md:px-4">
        <h2 className="font-display text-[clamp(21px,2.2vw,25px)] leading-[1.18] font-semibold tracking-tight">{q.prompt}</h2>
        {q.quote && <Quote text={q.quote} />}
        <Options q={q} />
        <AnimatePresence>{phase === "reveal" && <Fact q={q} />}</AnimatePresence>
      </div>
      <Foot />
    </motion.aside>
  );
}

function Head({ q }: { q: Question }) {
  const i = useQuiz((s) => s.i);
  const total = useQuiz((s) => s.questions.length);
  const look = ERA_LOOK[q.era];
  const Icon = look.icon;
  return (
    <div className="flex items-center gap-3 px-6 pt-5 pb-3 max-md:px-4 max-md:pt-4">
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[.12em] uppercase" style={{ background: look.soft, color: look.ink }}>
        <Icon className="size-3.5" aria-hidden />
        {look.name}
        {q.source && <span className="font-bold tracking-normal normal-case opacity-80">· In the news</span>}
      </span>
      <span className="text-[12.5px] font-bold text-ink-3 tabular-nums">
        {i + 1} / {total}
      </span>
      <Timer />
    </div>
  );
}

/** A ring that empties over the answer time; at zero the question counts as missed. */
function Timer() {
  const phase = useQuiz((s) => s.phase);
  const askedAt = useQuiz((s) => s.askedAt);
  const [left, setLeft] = useState(TIME_MS);
  useEffect(() => {
    if (phase !== "ask") return;
    let raf = 0;
    const tick = () => {
      const l = Math.max(0, TIME_MS - (performance.now() - askedAt));
      setLeft(l);
      if (l <= 0) useQuiz.getState().answer(null);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, askedAt]);
  const k = left / TIME_MS;
  const urgent = phase === "ask" && left < 5000;
  const R = 15;
  const C = 2 * Math.PI * R;
  return (
    <span className={cn("relative ml-auto grid size-10 place-items-center", urgent && "animate-pulse")} aria-label={`${Math.ceil(left / 1000)} seconds left`} role="timer">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle cx="18" cy="18" r={R} fill="none" stroke="#ebe7de" strokeWidth="3" />
        <circle cx="18" cy="18" r={R} fill="none" stroke={urgent ? "var(--conflict)" : "var(--ink-strong)"} strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - k)} />
      </svg>
      <span className={cn("text-[12.5px] font-extrabold tabular-nums", urgent ? "text-[var(--down)]" : "text-ink")}>{phase === "ask" ? Math.ceil(left / 1000) : "·"}</span>
    </span>
  );
}

/** A newspaper clipping with the country blanked out until you answer. */
function Quote({ text }: { text: string }) {
  const phase = useQuiz((s) => s.phase);
  const q = useQuiz((s) => s.questions[s.i]);
  const parts = text.split(BLANK);
  return (
    <figure className="relative mt-3 rounded-2xl border border-[#e6e0d2] bg-[var(--wire-paper,#fbf8f1)] px-4 pt-3 pb-3.5 shadow-[0_1px_0_#e6e0d2]">
      <span className="text-[10px] font-extrabold tracking-[.18em] text-ink-3 uppercase">{q.when} · Headline</span>
      <blockquote className="mt-1 font-display text-[16.5px] leading-snug font-medium text-ink">
        {parts.map((p, k) => (
          <span key={k}>
            {p}
            {k < parts.length - 1 &&
              (phase === "reveal" ? (
                <motion.b initial={{ backgroundColor: "#11232b" }} animate={{ backgroundColor: "rgba(47,163,107,.16)" }} className="rounded px-1 text-[var(--up)]">
                  {q.options[q.answer]}
                </motion.b>
              ) : (
                <span aria-label="hidden country" className="mx-0.5 inline-block h-[0.95em] w-14 translate-y-[2px] rounded bg-[var(--ink-strong)]" />
              ))}
          </span>
        ))}
      </blockquote>
    </figure>
  );
}

function Options({ q }: { q: Question }) {
  const phase = useQuiz((s) => s.phase);
  const hidden = useQuiz((s) => s.hidden);
  const a = useQuiz((s) => s.answers[s.i]);
  const reveal = phase === "reveal";
  return (
    <div className="mt-4 grid gap-2" role="group" aria-label="Answers">
      {q.options.map((o, k) => {
        const right = reveal && k === q.answer;
        const wrongPick = reveal && a?.picked === k && !a.correct;
        const gone = hidden.includes(k) && !reveal;
        const fold = reveal && !right && !wrongPick;
        return (
          <motion.button
            key={o}
            type="button"
            disabled={reveal || gone}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: gone ? 0.28 : reveal && !right && !wrongPick ? 0.5 : 1,
              y: 0,
              x: wrongPick ? [0, -7, 7, -4, 4, 0] : 0,
              scale: right ? [1, 1.03, 1] : 1,
            }}
            transition={{
              duration: wrongPick ? 0.45 : 0.3,
              delay: reveal ? 0 : 0.12 + k * 0.05,
              ease: ease.out,
            }}
            whileHover={reveal || gone ? undefined : { y: -2 }}
            whileTap={reveal || gone ? undefined : { scale: 0.98 }}
            onClick={() => useQuiz.getState().answer(k)}
            className={cn(
              "group flex min-h-[54px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-[15px] font-semibold transition-colors",
              right ? "border-[var(--ally)] bg-[rgba(47,163,107,.1)] text-ink" : wrongPick ? "border-[var(--conflict)] bg-[rgba(229,72,77,.08)]" : "border-border bg-white hover:border-[rgba(17,35,43,.3)] hover:shadow-[var(--shadow-card)]",
              gone && "line-through",
              fold && "max-md:hidden",
            )}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-xl text-[12.5px] font-extrabold transition-colors",
                right ? "bg-[var(--ally)] text-white" : wrongPick ? "bg-[var(--conflict)] text-white" : "bg-paper text-ink-2 group-hover:bg-[var(--ink-strong)] group-hover:text-white",
              )}
            >
              {right ? <Check className="size-4" strokeWidth={3} /> : wrongPick ? <X className="size-4" strokeWidth={3} /> : LETTERS[k]}
            </span>
            <span className="min-w-0 flex-1">{o}</span>
          </motion.button>
        );
      })}
      {reveal && a?.picked === null && <p className="text-[13px] font-bold text-[var(--down)]">Time ran out.</p>}
    </div>
  );
}

function Fact({ q }: { q: Question }) {
  const a = useQuiz((s) => s.answers[s.i]);
  const streak = useQuiz((s) => s.streak);
  const look = ERA_LOOK[q.era];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25, ease: ease.out }} className="mt-4">
      <div className="flex items-center gap-2">
        <span className={cn("text-[13px] font-extrabold", a?.correct ? "text-[var(--up)]" : "text-[var(--down)]")}>{a?.correct ? "Right!" : "Not quite."}</span>
        {a?.correct && (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.5 }}
            className="rounded-full bg-[var(--ink-strong)] px-2.5 py-0.5 text-[12px] font-extrabold text-white tabular-nums"
          >
            +{a.points}
            {multiplier(streak) > 1 && <span className="ml-1 text-[var(--gold)]">×{multiplier(streak)}</span>}
          </motion.span>
        )}
      </div>
      <div className="mt-2 overflow-hidden rounded-2xl bg-paper">
        <div className="flex items-end justify-between gap-3 px-4 pt-3">
          <span className="font-display text-[30px] leading-none font-semibold" style={{ color: look.ink }}>
            {q.when}
          </span>
          <span className="flex items-center gap-1 pb-0.5 text-[12px] font-bold text-ink-3">
            <MapPin className="size-3.5" aria-hidden /> {q.place.name}
          </span>
        </div>
        <p className="px-4 pt-2 pb-3.5 text-[14.5px] leading-relaxed text-ink-2">{q.source ? <>&ldquo;{q.fact}&rdquo;</> : q.fact}</p>
        {q.source && (
          <a href={q.source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-[12.5px] font-bold text-ink-2 hover:text-ink">
            {q.source.name}
            {q.source.outlets > 1 && <span className="font-semibold text-ink-3">· reported by {q.source.outlets} outlets</span>}
            <ExternalLink className="ml-auto size-3.5" aria-hidden />
          </a>
        )}
      </div>
    </motion.div>
  );
}

function Foot() {
  const phase = useQuiz((s) => s.phase);
  const fiftyUsed = useQuiz((s) => s.fiftyUsed);
  const last = useQuiz((s) => s.i === s.questions.length - 1);
  return (
    <div className="flex items-center gap-2 border-t border-border bg-white/80 px-6 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] max-md:px-4">
      {phase === "ask" ? (
        <>
          <button
            type="button"
            disabled={fiftyUsed}
            onClick={() => useQuiz.getState().fifty()}
            className="rounded-full border border-border bg-white px-3.5 py-2 text-[13px] font-extrabold transition hover:border-[rgba(17,35,43,.3)] disabled:opacity-40"
            title="Removes two wrong answers. Once per run."
          >
            50 : 50
          </button>
          <span className="text-[12px] text-ink-3">{fiftyUsed ? "Lifeline used" : "One lifeline per run"}</span>
          <span className="ml-auto text-[12px] text-ink-3 max-md:hidden">Keys 1–4</span>
        </>
      ) : (
        <Btn className="min-h-[52px] w-full text-[15px]" onClick={() => useQuiz.getState().next()} autoFocus>
          {last ? "See your result" : "Next question"} <ArrowRight className="size-4" aria-hidden />
        </Btn>
      )}
    </div>
  );
}
