"use client";

import { ArrowLeft, Flame, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { sound } from "@/lib/game/sound";
import { ERA_LOOK } from "@/lib/game/quiz/look";
import { multiplier } from "@/lib/game/quiz/run";
import { useQuiz } from "@/lib/game/quiz/store";
import { cn } from "@/lib/utils";
import { glass } from "../game/bits";
import { useRoll } from "../crisis/ui";

/** Top bar during a run: the way out, ten progress steps coloured by era and result, the score and the streak. */
export function Hud() {
  const phase = useQuiz((s) => s.phase);
  const questions = useQuiz((s) => s.questions);
  const answers = useQuiz((s) => s.answers);
  const i = useQuiz((s) => s.i);
  const score = useQuiz((s) => s.score);
  const streak = useQuiz((s) => s.streak);
  const shown = useRoll(score, 600);
  const [muted, setMuted] = useState(sound.isMuted);
  if (phase === "intro" || phase === "end") return null;
  const x = multiplier(streak);
  return (
    <header className="pointer-events-none fixed inset-x-4 top-[max(14px,env(safe-area-inset-top))] z-30 flex items-start gap-3 max-md:inset-x-2.5">
      <div className={cn(glass, "pointer-events-auto flex items-center gap-2 py-1.5 pr-4 pl-1.5")}>
        <button type="button" onClick={() => useQuiz.getState().home()} aria-label="Leave the run" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-paper hover:text-ink">
          <ArrowLeft className="size-[18px]" />
        </button>
        <span className="font-display text-[15px] font-semibold whitespace-nowrap max-md:hidden">Then · Now · Next</span>
      </div>

      <ol className={cn(glass, "pointer-events-auto mx-auto flex items-center gap-1 px-3 py-3 max-md:hidden")} aria-label="Progress">
        {questions.map((q, k) => {
          const a = answers[k];
          const now = k === i;
          return (
            <li key={q.id} className="relative" aria-label={`Question ${k + 1}${a ? (a.correct ? ", right" : ", wrong") : ""}`}>
              <motion.i
                animate={{ width: now ? 34 : 22, opacity: a || now ? 1 : 0.35 }}
                className="block h-2 rounded-full"
                style={{
                  background: a ? (a.correct ? "var(--ally)" : "var(--conflict)") : ERA_LOOK[q.era].color,
                }}
              />
              {k < questions.length - 1 && questions[k + 1].era !== q.era && <span aria-hidden className="absolute top-1/2 -right-[3px] h-3 w-px -translate-y-1/2 bg-border" />}
            </li>
          );
        })}
      </ol>

      <div className={cn(glass, "pointer-events-auto ml-auto flex items-center gap-3 py-1.5 pr-1.5 pl-4 max-md:ml-auto")}>
        <AnimatePresence>
          {streak >= 2 && (
            <motion.span
              key="streak"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="inline-flex items-center gap-1 rounded-full bg-[rgba(232,116,44,.12)] px-2 py-0.5 text-[12.5px] font-extrabold text-[#c4561a]"
              aria-label={`${streak} in a row`}
            >
              <Flame className="size-3.5" aria-hidden /> {streak}
              {x > 1 && <span className="text-[11px]">×{x}</span>}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-right">
          <b className="block text-[18px] leading-none font-extrabold tabular-nums">{shown.toLocaleString("en-US")}</b>
          <span className="text-[10px] font-bold tracking-[.12em] text-ink-3 uppercase">Points</span>
        </span>
        <button
          type="button"
          onClick={() => {
            sound.setMuted(!muted);
            setMuted(!muted);
          }}
          aria-label={muted ? "Sound on" : "Sound off"}
          className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-paper hover:text-ink"
        >
          {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
        </button>
      </div>
    </header>
  );
}
