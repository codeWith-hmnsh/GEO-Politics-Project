"use client";

import { ArrowRight, Check, EyeOff, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { Flag } from "@/components/chrome/Flag";
import { focus } from "@/lib/game/camera";
import { AGENDA_BY_ID } from "@/lib/game/crisis/catalog";
import { CRISIS_BY_ID } from "@/lib/game/crisis/deck";
import { METER_LOOK } from "@/lib/game/crisis/look";
import { useCrisis } from "@/lib/game/crisis/store";
import type { Meter } from "@/lib/game/crisis/types";
import { METERS } from "@/lib/game/crisis/types";
import { SEATS } from "@/lib/game/engine/types";
import { CAPITAL, SHORT } from "@/lib/game/text";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn, eyebrow } from "../game/bits";
import { Bar, ChoiceTag, useRoll } from "./ui";

/** After the reveal: what the year did to your country, and why. */
export function Result() {
  const phase = useCrisis((s) => s.phase);
  const record = useCrisis((s) => s.record);
  const m = useCrisis((s) => s.m);
  const prev = useCrisis((s) => s.prev);
  const me = useCrisis((s) => s.me);
  useEffect(() => {
    if (phase === "result") focus(CAPITAL[me][0], CAPITAL[me][1], 3.2, 1200);
  }, [phase, me]);
  if (phase !== "result" || !record || !m || !prev) return null;
  const c = CRISIS_BY_ID.get(record.crisisId)!;
  const reasons = record.reasons[me];
  const agenda = AGENDA_BY_ID.get(m.seats[me].agenda)!;
  const progress = agenda.progress(m, me);
  const byMeter = (k: Meter) => reasons.filter((r) => r.meter === k && r.delta !== 0);
  const note = reasons.find((r) => r.delta === 0);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: ease.out }}
      aria-label="Your year"
      data-avoid
      className="fixed top-[96px] right-4 bottom-4 z-20 flex w-[460px] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white/93 shadow-[var(--shadow-card)] backdrop-blur-2xl max-[1100px]:w-[410px] max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[66dvh] max-md:w-auto max-md:rounded-b-none"
    >
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-5">
        <div className={eyebrow}>
          {record.year} · {c.title}
        </div>
        <h2 className="mt-1.5 flex items-start gap-2 font-display text-[24px] leading-tight font-semibold">
          <span className={cn("mt-1 grid size-6 shrink-0 place-items-center rounded-full text-white", record.success ? "bg-[var(--ally)]" : "bg-[var(--conflict)]")}>{record.success ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}</span>
          {record.headline}
        </h2>
        <p className="mt-1.5 text-[13.5px] text-ink-2">
          {record.counts.coop} cooperated · {record.counts.self} made private deals · {record.counts.hard} escalated · {record.counts.wait} waited.
        </p>

        <section className="mt-5 rounded-2xl bg-gradient-to-br from-[#1A2C35] to-[var(--ink-strong)] p-4 text-white">
          <div className="text-[11px] font-extrabold tracking-[.14em] text-[var(--gold)] uppercase">What it did to {SHORT[me]}</div>
          <div className="mt-3 grid gap-3">
            {METERS.map((k, i) => (
              <MeterChange key={k} k={k} before={prev.seats[me].meters[k]} after={m.seats[me].meters[k]} delay={i * 0.12} />
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className={cn(eyebrow, "mb-2")}>Why</div>
          <ul className="grid gap-1.5">
            {METERS.flatMap((k) =>
              byMeter(k).map((r, i) => {
                const Icon = METER_LOOK[k].icon;
                return (
                  <motion.li key={`${k}-${i}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.05 }} className="flex items-start gap-2.5 rounded-xl border border-border bg-white px-3 py-2 text-[13px]">
                    <span className={cn("inline-flex min-w-[52px] items-center gap-1 font-extrabold tabular-nums", r.delta > 0 ? "text-[var(--up)]" : "text-[var(--down)]")}>
                      <Icon className="size-3.5" aria-hidden />
                      {r.delta > 0 ? "+" : "−"}
                      {Math.abs(r.delta)}
                    </span>
                    <span className="text-ink-2">{r.text}</span>
                  </motion.li>
                );
              }),
            )}
            {note && <li className="rounded-xl bg-[rgba(229,72,77,.06)] px-3 py-2 text-[12.5px] font-semibold text-[var(--down)]">{note.text}</li>}
          </ul>
        </section>

        <section className="mt-5">
          <div className={cn(eyebrow, "mb-2")}>Who did what</div>
          <div className="grid grid-cols-2 gap-1.5">
            {SEATS.map((s) => (
              <div key={s} className={cn("flex items-center justify-between gap-2 rounded-xl border bg-white px-2.5 py-2 text-[12.5px] font-bold", s === me ? "border-[var(--gold)]" : "border-border")}>
                <span className="flex items-center gap-1.5">
                  <Flag iso3={s} className="h-3 w-[18px]" /> {s === me ? "You" : SHORT[s]}
                  {record.broke.includes(s) && <X className="size-3.5 text-[var(--down)]" aria-label="broke a promise" />}
                </span>
                <ChoiceTag c={record.picks[s]} />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-dashed border-[rgba(17,35,43,.2)] p-3.5">
          <div className={cn(eyebrow, "flex items-center gap-1.5")}>
            <EyeOff className="size-3.5" aria-hidden /> Your secret agenda
          </div>
          <div className="mt-1 text-[14px] font-extrabold">{agenda.title}</div>
          <div className="text-[12.5px] text-ink-2">{agenda.goal}</div>
          <Bar v={progress * 100} color="var(--gold)" className="mt-2 h-2" />
        </section>
      </div>
      <div className="border-t border-border bg-white/80 px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
        <Btn className="min-h-[52px] w-full text-[15px]" onClick={() => useCrisis.getState().nextYear()}>
          {m.ended ? "See the final verdict" : `On to ${m.year}`} <ArrowRight className="size-4" aria-hidden />
        </Btn>
      </div>
    </motion.aside>
  );
}

function MeterChange({ k, before, after, delay }: { k: Meter; before: number; after: number; delay: number }) {
  const look = METER_LOOK[k];
  const Icon = look.icon;
  const shown = useRoll(after, 900);
  const d = after - before;
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.3 }} className="grid grid-cols-[96px_1fr_64px] items-center gap-3">
      <span className="flex items-center gap-1.5 text-[13px] font-bold text-white/85">
        <Icon className="size-4" style={{ color: look.color === "#5e6b70" ? "#9fb0b8" : look.color }} aria-hidden /> {look.name}
      </span>
      <span className="relative block h-2 overflow-hidden rounded-full bg-white/12">
        <i className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${Math.max(before, after)}%` }} />
        <motion.i initial={{ width: `${before}%` }} animate={{ width: `${after}%` }} transition={{ delay: delay + 0.2, duration: 0.8, ease: ease.out }} className={cn("absolute inset-y-0 left-0 rounded-full", d < 0 ? "bg-[#ff8f92]" : "bg-[var(--gold)]")} />
      </span>
      <span className="text-right tabular-nums">
        <b className="text-[16px]">{shown}</b>{" "}
        <small className={cn("text-[12px] font-bold", d > 0 ? "text-[#7fe0a8]" : d < 0 ? "text-[#ff8f92]" : "text-white/50")}>{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "±0"}</small>
      </span>
    </motion.div>
  );
}
