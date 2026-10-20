"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { Flag } from "@/components/chrome/Flag";
import { AGENDA_BY_ID } from "@/lib/game/crisis/catalog";
import { score, standings } from "@/lib/game/crisis/engine";
import { useCrisis } from "@/lib/game/crisis/store";
import { SEATS } from "@/lib/game/engine/types";
import { sound } from "@/lib/game/sound";
import { SEAT_COLOR, SHORT } from "@/lib/game/text";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn, Portrait, eyebrow } from "../game/bits";

/** The final verdict: scores, every secret agenda revealed, and who kept their word. */
export function End() {
  const phase = useCrisis((s) => s.phase);
  const m = useCrisis((s) => s.m);
  const me = useCrisis((s) => s.me);
  useEffect(() => {
    if (phase === "end") sound.rank();
  }, [phase]);
  if (phase !== "end" || !m) return null;
  const st = standings(m);
  const winner = st[0].iso3;
  const mine = score(m, me);
  const place = st.findIndex((x) => x.iso3 === me) + 1;
  const wins = m.history.filter((h) => h.success).length;
  const liar = [...SEATS].sort((a, b) => m.seats[b].pledgesBroken - m.seats[a].pledgesBroken)[0];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[rgba(243,241,236,.6)] p-5 backdrop-blur-[4px] max-md:p-2.5">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ease.out }} role="dialog" aria-labelledby="end-title" className="w-[min(1060px,100%)] overflow-hidden rounded-[26px] border border-white/80 bg-white/95 shadow-[0_40px_100px_rgba(17,35,43,.22)]">
        <div className="px-8 pt-7 pb-5 max-md:px-5">
          <div className={eyebrow}>
            Crisis Table · {m.history[0].year}–{m.history.at(-1)!.year} · {wins} of {m.history.length} crises solved together
          </div>
          <h2 id="end-title" className="mt-2 font-display text-[clamp(38px,6vw,72px)] leading-none font-semibold tracking-tight">
            {winner === me ? "You won." : `${SHORT[winner]} wins.`}
          </h2>
          <p className="mt-2 text-[15px] text-ink-2">
            You finished #{place} with {mine.total} points. 500 means you held steady.
          </p>
        </div>

        <div className="grid grid-cols-[1.1fr_.9fr] gap-6 border-t border-border px-8 py-6 max-lg:grid-cols-1 max-md:px-5">
          <div>
            <div className={eyebrow}>Final scores and secret agendas</div>
            <ol className="mt-2.5 grid gap-2">
              {st.map((x, i) => {
                const seat = m.seats[x.iso3];
                const agenda = AGENDA_BY_ID.get(seat.agenda)!;
                const done = agenda.progress(m, x.iso3) >= 1;
                return (
                  <motion.li
                    key={x.iso3}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + (st.length - i) * 0.15 }}
                    className={cn("grid grid-cols-[24px_34px_1fr_auto] items-center gap-3 rounded-2xl border bg-white px-3 py-2.5", i === 0 ? "border-[var(--gold)] bg-gradient-to-r from-[rgba(242,179,61,.22)] to-white" : "border-border")}
                  >
                    <span className="text-center font-display text-[18px] font-semibold text-ink-3">{i + 1}</span>
                    <Portrait i={SEATS.indexOf(x.iso3)} seat={SEAT_COLOR[x.iso3]} size={32} />
                    <div className="min-w-0">
                      <b className="flex items-center gap-1.5 text-[14px]">
                        <Flag iso3={x.iso3} className="h-3 w-[18px]" /> {x.iso3 === me ? "You" : SHORT[x.iso3]}
                      </b>
                      <small className="flex items-center gap-1 text-[12px] text-ink-2">
                        {done ? <Check className="size-3 text-[var(--up)]" /> : <X className="size-3 text-ink-3" />}
                        Secret agenda: <b className="font-semibold">{agenda.title}</b>
                      </small>
                    </div>
                    <span className="font-display text-[24px] font-semibold tabular-nums">{x.total}</span>
                  </motion.li>
                );
              })}
            </ol>
          </div>
          <div className="grid content-start gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-[#1A2C35] to-[var(--ink-strong)] p-4 text-white">
              <div className="text-[11px] font-extrabold tracking-[.14em] text-[var(--gold)] uppercase">Your {mine.total} points</div>
              <div className="mt-2 grid gap-1.5 text-[13.5px]">
                <Row l="Held steady" v={500} />
                <Row l="Change in your four meters" v={mine.improvement} />
                <Row l="Secret agenda" v={mine.agenda} />
                <Row l="Statesman (joint wins, broken promises)" v={mine.statesman} />
              </div>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <div className={eyebrow}>Who kept their word</div>
              <ul className="mt-2 grid gap-1.5 text-[13px]">
                {SEATS.map((s) => {
                  const x = m.seats[s];
                  const total = x.pledgesKept + x.pledgesBroken;
                  return (
                    <li key={s} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Flag iso3={s} className="h-3 w-[18px]" /> {s === me ? "You" : SHORT[s]}
                      </span>
                      <span className={cn("font-semibold", x.pledgesBroken ? "text-[var(--down)]" : "text-ink-2")}>{total ? `kept ${x.pledgesKept} of ${total} promises` : "made no promises"}</span>
                    </li>
                  );
                })}
              </ul>
              {m.seats[liar].pledgesBroken > 0 && (
                <p className="mt-3 rounded-xl bg-[rgba(229,72,77,.07)] px-3 py-2 text-[12.5px] font-semibold text-[var(--down)]">
                  Least trustworthy: {liar === me ? "you" : SHORT[liar]}, with {m.seats[liar].pledgesBroken} broken {m.seats[liar].pledgesBroken === 1 ? "promise" : "promises"}.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn variant="gold" onClick={() => useCrisis.getState().restart()}>
                <RotateCcw className="size-4" /> Play again
              </Btn>
              <Link href="/play" className="inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-bold text-ink-2 hover:bg-[rgba(17,35,43,.05)]">
                Back to the Play page
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: number }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-white/75">{l}</span>
      <b className={cn("tabular-nums", v < 0 && "text-[#ff8f92]")}>{v > 0 && l !== "Held steady" ? `+${v}` : v}</b>
    </div>
  );
}
