"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Flag } from "@/components/chrome/Flag";
import { CHOICE_LOOK } from "@/lib/game/crisis/look";
import { useCrisis } from "@/lib/game/crisis/store";
import type { Iso3 } from "@/lib/game/crisis/types";
import { SEATS } from "@/lib/game/engine/types";
import { SEAT_COLOR, SHORT } from "@/lib/game/text";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Portrait, eyebrow, glass } from "../game/bits";
import { ChoiceTag } from "./ui";

const SHOW = new Set(["brief", "choose", "home", "locking", "result"]);

/** The other five leaders: what they say this year, their pledges, how far they can be trusted. */
export function Table() {
  const phase = useCrisis((s) => s.phase);
  const m = useCrisis((s) => s.m);
  const me = useCrisis((s) => s.me);
  const chat = useCrisis((s) => s.chat);
  const heard = useCrisis((s) => s.heard);
  const locked = useCrisis((s) => s.locked);
  const choice = useCrisis((s) => s.choice);
  const pledge = useCrisis((s) => s.pledge);
  const record = useCrisis((s) => s.record);
  if (!m || !SHOW.has(phase)) return null;
  const others = SEATS.filter((s) => s !== me);
  const said = new Map(chat.slice(0, heard).map((c) => [c.iso3, c]));
  const typing = phase !== "result" && heard < chat.length ? chat[heard].iso3 : null;
  const latest = heard > 0 ? chat[heard - 1] : null;

  return (
    <>
      <aside aria-label="The table" data-avoid className={cn(glass, "fixed top-[96px] left-4 z-20 w-[288px] p-3.5 max-[1100px]:w-[256px] max-md:hidden")}>
        <div className="flex items-baseline justify-between px-1">
          <span className={eyebrow}>The table</span>
          <span className="text-[11px] font-semibold text-ink-3">{phase === "result" ? "What they did" : "What they say"}</span>
        </div>
        <ul className="mt-2 grid gap-1">
          {others.map((s) => {
            const line = said.get(s);
            const seat = m.seats[s];
            const pledges = seat.pledgesKept + seat.pledgesBroken;
            const picked = phase === "result" && record ? record.picks[s] : null;
            const broke = phase === "result" && record?.broke.includes(s);
            return (
              <li key={s} className="rounded-2xl px-1.5 py-2">
                <div className="flex items-center gap-2.5">
                  <Portrait i={SEATS.indexOf(s)} seat={SEAT_COLOR[s]} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13.5px] font-bold">
                      <Flag iso3={s} className="h-3 w-[18px]" /> {SHORT[s]}
                      {phase === "locking" && (
                        <span className={cn("ml-auto text-[11px] font-bold", locked.includes(s) ? "text-[var(--up)]" : "text-ink-3")}>
                          {locked.includes(s) ? (
                            <span className="inline-flex items-center gap-0.5">
                              <Check className="size-3" /> Locked
                            </span>
                          ) : (
                            "Thinking…"
                          )}
                        </span>
                      )}
                      {picked && <span className="ml-auto">{<ChoiceTag c={picked} />}</span>}
                    </div>
                    <small className="block text-[11px] text-ink-3">
                      Trusts you {m.trust[s][me]}
                      {pledges > 0 && ` · kept ${seat.pledgesKept} of ${pledges} promises`}
                    </small>
                  </div>
                </div>
                <AnimatePresence initial={false}>
                  {broke ? (
                    <motion.p key="broke" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 ml-10 rounded-xl bg-[rgba(229,72,77,.08)] px-2.5 py-1.5 text-[12px] font-bold text-[var(--down)]">
                      Broke their promise
                    </motion.p>
                  ) : line && phase !== "result" ? (
                    <motion.div key="said" initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, ease: ease.out }} className="relative mt-1.5 ml-10 rounded-2xl rounded-tl-md bg-paper px-3 py-2 text-[12.5px] leading-snug text-ink">
                      “{line.text}”
                      {line.pledge && (
                        <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink-3">
                          Promised <ChoiceTag c={line.pledge} />
                        </span>
                      )}
                    </motion.div>
                  ) : typing === s ? (
                    <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1.5 ml-10 inline-flex gap-1 rounded-2xl rounded-tl-md bg-paper px-3 py-2.5" aria-label={`${SHORT[s]} is typing`}>
                      {[0, 1, 2].map((i) => (
                        <motion.i key={i} className="size-1.5 rounded-full bg-ink-3" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
        {phase !== "result" && (
          <div className="mt-1 border-t border-border px-1.5 pt-2.5 text-[12px] text-ink-2">
            {choice && pledge ? (
              <span className="flex items-center gap-1.5 font-semibold">
                You promised <ChoiceTag c={choice} />
              </span>
            ) : (
              "Promises are not binding. Leaders can bluff."
            )}
          </div>
        )}
      </aside>

      {/* phones: a strip of portraits and the latest line */}
      <div className="fixed inset-x-2.5 top-[86px] z-20 md:hidden">
        <div className="flex items-center justify-between gap-1 rounded-2xl bg-white/85 px-2 py-1.5 shadow-[var(--shadow-card)] backdrop-blur-xl">
          {others.map((s) => {
            const p = said.get(s)?.pledge;
            return (
              <span key={s} className="relative" title={said.get(s)?.text ?? SHORT[s]}>
                <Portrait i={SEATS.indexOf(s)} seat={p ? CHOICE_LOOK[p].color : SEAT_COLOR[s]} size={26} />
                {phase === "locking" && locked.includes(s) && <Check className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-[var(--up)] p-0.5 text-white" />}
              </span>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          {latest && phase !== "result" && (
            <motion.p key={heard} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 truncate rounded-xl bg-white/85 px-3 py-1.5 text-[12px] backdrop-blur-xl">
              <b>{SHORT[latest.iso3 as Iso3]}:</b> {latest.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
