"use client";

import { ArrowLeft, ArrowRight, EyeOff, Globe2, Siren, UsersRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { Flag } from "@/components/chrome/Flag";
import { AGENDA_BY_ID, START } from "@/lib/game/crisis/catalog";
import { CRISES } from "@/lib/game/crisis/deck";
import { CHOICE_LOOK, METER_LOOK } from "@/lib/game/crisis/look";
import { useCrisis } from "@/lib/game/crisis/store";
import type { Iso3, Theme } from "@/lib/game/crisis/types";
import { CHOICES, METERS } from "@/lib/game/crisis/types";
import { SEATS } from "@/lib/game/engine/types";
import { NAMES, SEAT_COLOR, SHORT } from "@/lib/game/text";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn, eyebrow } from "../game/bits";
import { PITCH } from "../game/seats";
import { Bar } from "./ui";

const THEME_WORD: Record<Theme, string> = { energy: "Oil and gas shocks", food: "Food crises", trade: "Trade and tech fights", money: "Money crises", health: "Pandemics and heat", security: "Security threats" };
const CHOICE_HINT = { coop: "Solve it together, share the cost", self: "Protect only yourself", hard: "Threats, sanctions, force", wait: "Do nothing, keep your money" } as const;

function exposedTo(iso: Iso3): Theme[] {
  const byTheme = new Map<Theme, number[]>();
  for (const c of CRISES) byTheme.set(c.theme, [...(byTheme.get(c.theme) ?? []), c.exposure[iso] ?? 1]);
  return [...byTheme.entries()]
    .map(([t, xs]) => [t, xs.reduce((a, b) => a + b, 0) / xs.length] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([t]) => t);
}

/** Before the match: what the game is, which country you lead, and your secret agenda. */
export function Intro() {
  const phase = useCrisis((s) => s.phase);
  return (
    <AnimatePresence mode="wait">
      {phase === "intro" && <Welcome key="intro" />}
      {phase === "pick" && <Pick key="pick" />}
      {phase === "agenda" && <Agenda key="agenda" />}
    </AnimatePresence>
  );
}

function Welcome() {
  const steps = [
    { icon: Siren, title: "A crisis hits", text: "Each year one crisis hits the whole world: an oil shock, a pandemic, a cyberattack." },
    { icon: UsersRound, title: "Everyone picks in secret", text: "You and five rival leaders choose how to answer. Talk, promise, bluff." },
    { icon: Globe2, title: "The world reacts", text: "All choices flip at once. Together they decide what happens next." },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }} className="fixed inset-0 z-40 overflow-y-auto">
      <div aria-hidden className="fixed inset-y-0 left-0 w-[64%] bg-gradient-to-r from-[rgba(243,241,236,.96)] via-[rgba(243,241,236,.8)] to-transparent max-lg:w-full max-lg:bg-[rgba(243,241,236,.86)]" />
      <div className="relative flex min-h-full max-w-[720px] flex-col justify-center gap-7 px-12 py-12 max-md:px-5 max-md:py-8">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: ease.out }}>
          <div className="flex items-center gap-3">
            <Link href="/play" aria-label="Back to the Play page" className="grid size-9 place-items-center rounded-full border border-border bg-white/80 text-ink-2 shadow-[var(--shadow-card)] hover:text-ink">
              <ArrowLeft className="size-4" />
            </Link>
            <span className={eyebrow}>Statecraft · Crisis Table</span>
          </div>
          <h1 className="mt-6 font-display text-[clamp(44px,6.4vw,92px)] leading-[.92] font-semibold tracking-[-.02em]">
            One crisis.
            <br />
            Six leaders.
            <br />
            <em className="text-[var(--gold-ink)]">Secret choices.</em>
          </h1>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink-2 max-md:text-[15px]">Lead a real country through ten years of world crises. Your best move always depends on what the others do.</p>
        </motion.div>

        <ol className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
          {steps.map((s, i) => (
            <motion.li key={s.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.12, duration: 0.5, ease: ease.out }} className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[var(--shadow-card)]">
              <span className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-[var(--ink-strong)] text-white">
                  <s.icon className="size-4" aria-hidden />
                </span>
                <span className="font-display text-[22px] font-semibold text-ink-3">{i + 1}</span>
              </span>
              <b className="mt-2.5 block text-[15px]">{s.title}</b>
              <span className="mt-1 block text-[13px] leading-snug text-ink-2">{s.text}</span>
            </motion.li>
          ))}
        </ol>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.5 }}>
          <div className={eyebrow}>Every crisis, the same four answers</div>
          <div className="mt-2.5 grid grid-cols-4 gap-2 max-md:grid-cols-2">
            {CHOICES.map((k) => {
              const l = CHOICE_LOOK[k];
              return (
                <div key={k} className="rounded-2xl border border-border bg-white/90 p-3">
                  <span className="flex items-center gap-1.5 text-[13px] font-extrabold" style={{ color: l.ink }}>
                    <l.icon className="size-4" style={{ color: l.color }} aria-hidden /> {l.name}
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-ink-2">{CHOICE_HINT[k]}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }} className="flex flex-wrap items-center gap-4">
          <Btn className="min-h-[54px] px-8 text-[16px]" onClick={() => useCrisis.getState().setPhase("pick")}>
            Choose your country <ArrowRight className="size-4" aria-hidden />
          </Btn>
          <span className="text-[13px] text-ink-3">About 15 minutes · 10 years · against 5 rivals</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Pick() {
  const me = useCrisis((s) => s.me);
  const start = START[me];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} role="dialog" aria-labelledby="pick-title" className="pointer-events-none fixed inset-0 z-40 overflow-y-auto max-lg:pointer-events-auto max-lg:bg-[rgba(243,241,236,.72)]">
      <div aria-hidden className="fixed inset-y-0 left-0 w-[55%] bg-gradient-to-r from-[rgba(243,241,236,.92)] via-[rgba(243,241,236,.45)] to-transparent max-lg:hidden" />
      <div className="relative grid min-h-full grid-cols-[1fr_420px] gap-6 p-6 max-lg:grid-cols-1 max-lg:gap-4 max-lg:p-3.5">
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <header className="pointer-events-auto pt-2 pl-2">
            <button type="button" onClick={() => useCrisis.getState().setPhase("intro")} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-2 hover:text-ink">
              <ArrowLeft className="size-4" /> How it works
            </button>
            <h2 id="pick-title" className="mt-4 font-display text-[clamp(40px,5.4vw,80px)] leading-[.92] font-semibold tracking-[-.02em]">
              Who will you
              {" "}
              <br />
              <em className="text-[var(--gold-ink)]">lead?</em>
            </h2>
            <p className="mt-3 max-w-[38ch] text-[15.5px] text-ink-2">Each country starts strong in some things and weak in others, and each is hit by different crises.</p>
          </header>
          <div className="pointer-events-auto grid grid-cols-6 gap-2.5 max-2xl:grid-cols-3 max-lg:gap-2">
            {SEATS.map((s, i) => {
              const on = s === me;
              return (
                <motion.button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => useCrisis.getState().pick(s)}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: on ? -6 : 0 }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease: ease.out }}
                  className={cn("relative flex flex-col items-start gap-2 overflow-hidden rounded-2xl border bg-white/90 p-3.5 text-left shadow-[0_10px_28px_rgba(17,35,43,.1)] backdrop-blur-xl transition-[border-color,box-shadow] max-lg:p-2.5", on ? "border-[var(--gold)] bg-white shadow-[0_0_0_1px_var(--gold),0_18px_40px_rgba(17,35,43,.16)]" : "border-white/80 hover:bg-white")}
                >
                  <i aria-hidden className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: SEAT_COLOR[s], opacity: on ? 1 : 0.25 }} />
                  <Flag iso3={s} className="h-[26px] !w-[38px] !bg-cover rounded-[5px] shadow-[0_0_0_1px_rgba(17,35,43,.08)] max-lg:h-5 max-lg:!w-[30px]" />
                  <b className="text-[15px] leading-tight max-lg:text-[13px]">{NAMES[s]}</b>
                </motion.button>
              );
            })}
          </div>
        </div>

        <motion.section initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: ease.out }} aria-label={`${NAMES[me]} at the start`} className="pointer-events-auto flex flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/94 shadow-[0_40px_90px_rgba(17,35,43,.2)] backdrop-blur-2xl lg:self-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={me} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="grid gap-5 px-7 pt-6 pb-6 max-lg:px-5" style={{ background: `linear-gradient(170deg, ${SEAT_COLOR[me]}1f, transparent 40%)` }}>
              <div className="flex items-center gap-4">
                <Flag iso3={me} className="h-[50px] !w-[74px] shrink-0 !bg-cover rounded-lg shadow-[0_0_0_1px_rgba(17,35,43,.08),0_10px_24px_rgba(17,35,43,.18)]" />
                <div>
                  <h3 className="font-display text-[36px] leading-none font-semibold tracking-tight">{NAMES[me]}</h3>
                  <p className="mt-1.5 font-display text-[15.5px] text-ink-2 italic">{PITCH[me]}</p>
                </div>
              </div>
              <div className="grid gap-3">
                {METERS.map((k) => {
                  const l = METER_LOOK[k];
                  return (
                    <div key={k} className="grid grid-cols-[92px_1fr_32px] items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold">
                        <l.icon className="size-4" style={{ color: l.color }} aria-hidden /> {l.name}
                      </span>
                      <Bar v={start[k]} color={l.color} className="h-2" />
                      <b className="text-right text-[14px] tabular-nums">{start[k]}</b>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-2xl bg-paper px-4 py-3">
                <div className={eyebrow}>Hit hardest by</div>
                <div className="mt-1 text-[14px] font-bold">{exposedTo(me).map((t) => THEME_WORD[t]).join(" · ")}</div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="border-t border-border bg-[rgba(243,241,236,.6)] px-7 py-4 max-lg:sticky max-lg:bottom-0 max-lg:px-5">
            <Btn className="min-h-[54px] w-full text-[15.5px]" onClick={() => useCrisis.getState().confirmCountry()}>
              Lead {SHORT[me]} <ArrowRight className="size-4" aria-hidden />
            </Btn>
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}

function Agenda() {
  const offer = useCrisis((s) => s.offer);
  const me = useCrisis((s) => s.me);
  if (!offer) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }} className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[rgba(243,241,236,.7)] p-5 backdrop-blur-[3px]">
      <div className="w-[min(760px,100%)] text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink-strong)] px-3 py-1 text-[11px] font-extrabold tracking-[.14em] text-white uppercase">
          <EyeOff className="size-3.5" aria-hidden /> Only you will see this
        </span>
        <h2 className="mt-4 font-display text-[clamp(32px,4.4vw,54px)] leading-none font-semibold tracking-tight">Choose your secret agenda</h2>
        <p className="mx-auto mt-3 max-w-[50ch] text-[15px] text-ink-2">
          Complete it for up to 100 extra points. Every other leader has one too, so watch what they do, not only what they say.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-4 [perspective:1000px] max-md:grid-cols-1">
          {offer.map((id, i) => {
            const a = AGENDA_BY_ID.get(id)!;
            return (
              <motion.button
                key={id}
                type="button"
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: 0.2 + i * 0.18, duration: 0.6, ease: ease.out }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => useCrisis.getState().chooseAgenda(id)}
                className="group relative overflow-hidden rounded-[8px] border border-[rgba(15,29,36,.18)] bg-[#fbf8f0] p-6 text-left shadow-[0_1px_0_rgba(15,29,36,.06),0_24px_50px_-18px_rgba(15,29,36,.35)] transition-shadow hover:shadow-[0_1px_0_rgba(15,29,36,.06),0_30px_60px_-16px_rgba(15,29,36,.42)]"
              >
                <span aria-hidden className="absolute top-5 right-5 rotate-[8deg] rounded-[4px] border-2 border-[var(--down)] px-2 py-0.5 text-[10.5px] font-extrabold tracking-[.18em] text-[var(--down)] uppercase opacity-80 transition group-hover:rotate-[4deg]">
                  Confidential
                </span>
                <span className="block border-b border-dashed border-[rgba(15,29,36,.25)] pb-2 text-[11px] font-extrabold tracking-[.16em] text-[var(--gold-ink)] uppercase">Secret agenda · No. {i + 1}</span>
                <b className="mt-3 block font-display text-[28px] leading-tight font-semibold text-ink">{a.title}</b>
                <span className="mt-1.5 block text-[15px] text-ink-2">{a.goal}</span>
                <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[var(--ink-strong)] px-4 py-2 text-[13.5px] font-extrabold text-white transition group-hover:bg-[var(--gold)] group-hover:text-[var(--ink-strong)]">
                  Take this one <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                </span>
              </motion.button>
            );
          })}
        </div>
        <p className="mt-5 text-[12.5px] text-ink-3">Leading {NAMES[me]}. You can always see your agenda on the result screen.</p>
      </div>
    </motion.div>
  );
}
