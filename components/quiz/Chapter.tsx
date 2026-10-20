"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { ERA_LOOK } from "@/lib/game/quiz/look";
import { useQuiz } from "@/lib/game/quiz/store";
import { ERAS } from "@/lib/game/quiz/types";
import { ease } from "@/lib/motion";

/** A title card between eras: "Chapter 2 · Now". It moves on by itself, or on a tap. */
export function Chapter() {
  const phase = useQuiz((s) => s.phase);
  const q = useQuiz((s) => s.questions[s.i]);
  useEffect(() => {
    if (phase !== "chapter") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => useQuiz.getState().ask(), reduce ? 700 : 1700);
    return () => clearTimeout(t);
  }, [phase, q?.era]);
  if (phase !== "chapter" || !q) return null;
  const look = ERA_LOOK[q.era];
  const Icon = look.icon;
  const n = ERAS.indexOf(q.era) + 1;
  return (
    <motion.button
      key={q.era}
      type="button"
      onClick={() => useQuiz.getState().ask()}
      aria-label={`Chapter ${n}: ${look.name}. Start`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-30 grid cursor-pointer place-items-center bg-[radial-gradient(60%_60%_at_50%_50%,rgba(243,241,236,.92),rgba(243,241,236,.55))]"
    >
      <div className="grid justify-items-center text-center">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
          className="grid size-16 place-items-center rounded-2xl shadow-[0_18px_40px_rgba(17,35,43,.15)]"
          style={{ background: "#fff", color: look.ink }}
        >
          <Icon className="size-8" aria-hidden />
        </motion.span>
        <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-5 text-[12px] font-extrabold tracking-[.24em] text-ink-3 uppercase">
          Chapter {n} of 3
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 24, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "-0.02em" }}
          transition={{ delay: 0.2, duration: 0.7, ease: ease.out }}
          className="mt-1 font-display text-[clamp(64px,11vw,128px)] leading-none font-semibold"
          style={{ color: look.ink }}
        >
          {look.name}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-3 text-[17px] font-semibold text-ink-2">
          {look.line}
        </motion.p>
        <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.6, ease: "linear" }} className="mt-6 block h-1 w-40 origin-left rounded-full" style={{ background: look.color }} />
      </div>
    </motion.button>
  );
}
