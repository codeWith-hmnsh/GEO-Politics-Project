"use client";

import { ArrowLeft, ArrowRight, Check, Lightbulb, Lock, MapPin, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { Flag } from "@/components/chrome/Flag";
import { POLICY_BY_ID } from "@/lib/game/crisis/catalog";
import { becauseLine, crisisOf, POLICY_PICKS } from "@/lib/game/crisis/engine";
import { CHOICE_LOOK } from "@/lib/game/crisis/look";
import { useCrisis } from "@/lib/game/crisis/store";
import type { Choice, CrisisDef, Iso3 } from "@/lib/game/crisis/types";
import { CHOICES } from "@/lib/game/crisis/types";
import { SEATS } from "@/lib/game/engine/types";
import { NAMES, SHORT } from "@/lib/game/text";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn, eyebrow } from "../game/bits";
import { ChoiceTag, DeltaChips } from "./ui";

export function stakesFor(c: CrisisDef, iso: Iso3) {
  const x = c.exposure[iso] ?? 1;
  if (x < 0) return { tone: "good" as const, text: `${SHORT[iso]} could profit if this drags on.` };
  if (x >= 1.3) return { tone: "bad" as const, text: `${SHORT[iso]} is hit hard if the world fails here.` };
  if (x <= 0.6) return { tone: "calm" as const, text: `${SHORT[iso]} is fairly safe from this one.` };
  return { tone: "mid" as const, text: `${SHORT[iso]} takes a normal hit if this fails.` };
}

/** The year's decision flow: the crisis briefing, your answer to the world, your home policies, then lock. */
export function Decide() {
  const phase = useCrisis((s) => s.phase);
  const m = useCrisis((s) => s.m);
  if (!m || m.ended) return null;
  return (
    <AnimatePresence mode="wait">
      {phase === "brief" && <Brief key={`brief-${m.turn}`} />}
      {(phase === "choose" || phase === "home" || phase === "locking") && <Panel key="panel" />}
    </AnimatePresence>
  );
}

function Brief() {
  const m = useCrisis((s) => s.m)!;
  const me = useCrisis((s) => s.me);
  const first = useCrisis((s) => s.firstMatch && s.m?.turn === 1);
  const c = crisisOf(m);
  const stakes = stakesFor(c, me);
  const because = becauseLine(m);
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24, transition: { duration: 0.25 } }}
      transition={{ duration: 0.6, ease: ease.out, delay: 0.5 }}
      aria-labelledby="crisis-title"
      className="fixed bottom-[max(24px,env(safe-area-inset-bottom))] left-1/2 z-30 w-[min(680px,calc(100%-24px))] -translate-x-1/2 overflow-hidden rounded-[26px] border border-white/80 bg-white/95 shadow-[0_40px_90px_rgba(17,35,43,.25)] backdrop-blur-2xl"
    >
      <div className="flex items-center gap-2 bg-[var(--ink-strong)] px-6 py-2.5 text-[11px] font-extrabold tracking-[.18em] text-white uppercase max-md:px-5">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--conflict)]" />
          <span className="relative size-2 rounded-full bg-[var(--conflict)]" />
        </span>
        Breaking · {m.year}
        <span className="ml-auto flex items-center gap-1 font-semibold tracking-[.08em] text-white/70 normal-case">
          <MapPin className="size-3.5" aria-hidden /> {c.place.name}
        </span>
      </div>
      <div className="px-7 pt-5 pb-6 max-md:px-5">
        {because && <p className="mb-2 text-[12.5px] font-bold text-[var(--gold-ink)]">{because}</p>}
        <h2 id="crisis-title" className="font-display text-[clamp(26px,3.4vw,38px)] leading-[1.05] font-semibold tracking-tight">
          {c.title}
        </h2>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-2">{c.story}</p>
        <div className={cn("mt-4 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[13.5px] font-bold", stakes.tone === "bad" ? "bg-[rgba(229,72,77,.08)] text-[var(--down)]" : stakes.tone === "good" ? "bg-[rgba(47,163,107,.1)] text-[var(--up)]" : "bg-paper text-ink-2")}>
          <Flag iso3={me} className="h-3.5 w-[21px]" /> {stakes.text}
        </div>
        {first && (
          <p className="mt-3 flex items-start gap-2 text-[13px] text-ink-2">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" aria-hidden />
            All six leaders face this same crisis. Each of you picks an answer in secret, and the result depends on what everyone picks.
          </p>
        )}
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-ink-3">The other leaders are already talking. Read them on the left.</span>
          <Btn className="min-h-12 px-6 text-[15px]" onClick={() => useCrisis.getState().setPhase("choose")}>
            See your options <ArrowRight className="size-4" aria-hidden />
          </Btn>
        </div>
      </div>
    </motion.section>
  );
}

function Panel() {
  const phase = useCrisis((s) => s.phase);
  const m = useCrisis((s) => s.m)!;
  const c = crisisOf(m);
  return (
    <motion.aside
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
      transition={{ duration: 0.45, ease: ease.out }}
      aria-label="Your decisions"
      data-avoid
      className="fixed top-[96px] right-4 bottom-4 z-20 flex w-[460px] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white/93 shadow-[var(--shadow-card)] backdrop-blur-2xl max-[1100px]:w-[410px] max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[64dvh] max-md:w-auto max-md:rounded-b-none"
    >
      <div className="border-b border-border px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <span className={eyebrow}>
            {m.year} · {c.place.name}
          </span>
          <Steps />
        </div>
        <h2 className="mt-1 font-display text-[21px] leading-tight font-semibold">{c.title}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-5">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "choose" && <Choose key="choose" />}
          {(phase === "home" || phase === "locking") && <Home key="home" />}
        </AnimatePresence>
      </div>
      <Footer />
    </motion.aside>
  );
}

function Steps() {
  const phase = useCrisis((s) => s.phase);
  const step = phase === "choose" ? 0 : 1;
  return (
    <ol className="flex items-center gap-1.5 text-[11.5px] font-bold" aria-label="Steps">
      {["World", "Home"].map((l, i) => (
        <li key={l} className={cn("flex items-center gap-1 rounded-full px-2 py-0.5", i === step ? "bg-[var(--ink-strong)] text-white" : i < step ? "text-[var(--up)]" : "text-ink-3")}>
          {i < step ? <Check className="size-3" /> : <span>{i + 1}</span>} {l}
        </li>
      ))}
    </ol>
  );
}

function Choose() {
  const m = useCrisis((s) => s.m)!;
  const choice = useCrisis((s) => s.choice);
  const pledge = useCrisis((s) => s.pledge);
  const first = useCrisis((s) => s.firstMatch && s.m?.turn === 1);
  const c = crisisOf(m);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
      <p className="text-[14px] font-semibold text-ink-2">How does {SHORT[m.me]} answer? Pick one.</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Your answer to the crisis">
        {CHOICES.map((k, i) => (
          <ChoiceCard key={k} k={k} c={c} on={choice === k} index={i} />
        ))}
      </div>
      {first && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[rgba(63,99,216,.07)] px-3.5 py-2.5 text-[12.5px] leading-snug text-ink-2">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-[#3F63D8]" aria-hidden />
          <span>
            <b className="text-ink">Cooperate only works if {c.need} leaders pick it.</b> If fewer join, they pay and nothing is fixed. Leaders who stay out still gain when it works.
          </span>
        </p>
      )}
      <AnimatePresence>
        {choice && (
          <motion.button
            type="button"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => useCrisis.getState().togglePledge()}
            aria-pressed={pledge}
            className="mt-3 flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-border bg-white px-3.5 py-3 text-left transition hover:border-[rgba(17,35,43,.25)]"
          >
            <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", pledge ? "bg-[var(--ink-strong)]" : "bg-[#d9d5cb]")}>
              <motion.i layout transition={{ type: "spring", bounce: 0.3, duration: 0.3 }} className={cn("absolute top-1 size-4 rounded-full bg-white shadow", pledge ? "right-1" : "left-1")} />
            </span>
            <span className="min-w-0">
              <b className="flex flex-wrap items-center gap-1.5 text-[13.5px]">
                Promise the table: <ChoiceTag c={choice} />
              </b>
              <small className="text-[12px] text-ink-3">Others see it and trust you more. Breaking a promise costs Allies −6.</small>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ChoiceCard({ k, c, on, index }: { k: Choice; c: CrisisDef; on: boolean; index: number }) {
  const look = CHOICE_LOOK[k];
  const Icon = look.icon;
  const t = c.choices[k];
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={on}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: on ? -3 : 0, scale: on ? 1.02 : 1 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: ease.out }}
      whileTap={{ scale: 0.97 }}
      onClick={() => useCrisis.getState().setChoice(k)}
      className={cn("relative flex min-h-[176px] flex-col items-start gap-1.5 overflow-hidden rounded-2xl border bg-white p-3.5 text-left transition-shadow", on ? "shadow-[0_14px_32px_rgba(17,35,43,.16)]" : "border-border hover:shadow-[var(--shadow-card)]")}
      style={on ? { borderColor: look.color, boxShadow: `0 0 0 2px ${look.color}, 0 14px 32px rgba(17,35,43,.16)` } : undefined}
    >
      <i aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: look.color }} />
      <span className="flex w-full items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl" style={{ background: look.soft, color: look.color }}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <AnimatePresence>
          {on && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="grid size-6 place-items-center rounded-full text-white" style={{ background: look.color }}>
              <Check className="size-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="text-[10.5px] font-extrabold tracking-[.14em] uppercase" style={{ color: look.ink }}>
        {look.name}
      </span>
      <b className="text-[15px] leading-tight">{t.title}</b>
      <span className="text-[12.5px] leading-snug text-ink-2">{t.line}</span>
      <span className="mt-auto pt-1">
        {k === "coop" ? (
          <span className="mb-1 block text-[11px] font-bold" style={{ color: look.ink }}>
            Works if {c.need}+ join
          </span>
        ) : k === "hard" && c.hardHelps ? (
          <span className="mb-1 block text-[11px] font-bold" style={{ color: look.ink }}>
            Counts as half a joiner
          </span>
        ) : null}
        <DeltaChips d={c.cost[k]} />
      </span>
    </motion.button>
  );
}

function Home() {
  const m = useCrisis((s) => s.m)!;
  const me = useCrisis((s) => s.me);
  const policies = useCrisis((s) => s.policies);
  const phase = useCrisis((s) => s.phase);
  const theme = crisisOf(m).theme;
  const locking = phase === "locking";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
      {!locking && (
        <button type="button" onClick={() => useCrisis.getState().setPhase("choose")} className="mb-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-ink-3 hover:text-ink">
          <ArrowLeft className="size-3.5" /> Change your answer
        </button>
      )}
      <p className="text-[14px] font-semibold text-ink-2">
        At home in {NAMES[me]}: pick up to {POLICY_PICKS} policies. <span className="text-ink-3">({policies.length} of {POLICY_PICKS})</span>
      </p>
      <div className="mt-3 grid gap-2">
        {m.hands[me].map((id, i) => {
          const p = POLICY_BY_ID.get(id)!;
          const on = policies.includes(id);
          const shield = p.shield === theme;
          return (
            <motion.button
              key={id}
              type="button"
              disabled={locking}
              aria-pressed={on}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: ease.out }}
              onClick={() => useCrisis.getState().togglePolicy(id)}
              className={cn("flex items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left transition disabled:opacity-60", on ? "border-[var(--ink-strong)] shadow-[inset_0_0_0_1px_var(--ink-strong)]" : "border-border hover:shadow-[var(--shadow-card)]")}
            >
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-lg border-2 transition", on ? "border-[var(--ink-strong)] bg-[var(--ink-strong)] text-white" : "border-[#cfcac0]")}>{on && <Check className="size-3.5" />}</span>
              <span className="min-w-0 flex-1">
                <b className="block text-[14px]">{p.name}</b>
                <DeltaChips d={p.effect} className="mt-1" />
                {shield && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[rgba(242,179,61,.18)] px-2 py-0.5 text-[11px] font-bold text-[var(--gold-ink)]">
                    <ShieldCheck className="size-3" /> Halves the damage if this crisis goes badly
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
      {locking && <LockingRow />}
    </motion.div>
  );
}

function LockingRow() {
  const locked = useCrisis((s) => s.locked);
  const me = useCrisis((s) => s.me);
  return (
    <div className="mt-4 rounded-2xl bg-paper p-3.5">
      <div className={eyebrow}>Leaders are locking</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SEATS.filter((s) => s !== me).map((s) => (
          <span key={s} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold transition", locked.includes(s) ? "bg-white text-ink shadow-sm" : "text-ink-3")}>
            <Flag iso3={s} className="h-3 w-[18px]" /> {SHORT[s]} {locked.includes(s) && <Check className="size-3 text-[var(--up)]" />}
          </span>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  const phase = useCrisis((s) => s.phase);
  const choice = useCrisis((s) => s.choice);
  const pledge = useCrisis((s) => s.pledge);
  const policies = useCrisis((s) => s.policies);
  const st = useCrisis.getState();
  return (
    <div className="border-t border-border bg-white/80 px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">
      {phase === "choose" ? (
        <Btn className="min-h-[52px] w-full text-[15px]" disabled={!choice} onClick={() => st.setPhase("home")}>
          {choice ? (
            <>
              Next: home policies <ArrowRight className="size-4" aria-hidden />
            </>
          ) : (
            "Pick an answer first"
          )}
        </Btn>
      ) : (
        <>
          {choice && (
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-ink-3">
              Your answer <ChoiceTag c={choice} />
              {pledge && <span>· promised</span>}
              {policies.length > 0 && <span>· {policies.length} {policies.length === 1 ? "policy" : "policies"}</span>}
            </div>
          )}
          <Btn className="min-h-[52px] w-full text-[15px]" disabled={phase === "locking"} onClick={() => st.lock()}>
            {phase === "locking" ? "Waiting for the others…" : (
              <>
                <Lock className="size-4" aria-hidden /> Lock decisions
              </>
            )}
          </Btn>
        </>
      )}
    </div>
  );
}

/** Drives the chat and the locking beat; mounted once by the game screen. */
export function useDecideTimers() {
  const phase = useCrisis((s) => s.phase);
  const turn = useCrisis((s) => s.m?.turn);
  // the other leaders talk one at a time while you read and decide
  useEffect(() => {
    if (phase !== "brief" && phase !== "choose" && phase !== "home") return;
    const id = setInterval(() => {
      const s = useCrisis.getState();
      if (s.heard < s.chat.length) s.hear();
    }, 1500);
    return () => clearInterval(id);
  }, [phase, turn]);
  // bots lock one by one, then the year resolves
  useEffect(() => {
    if (phase !== "locking") return;
    const g = useCrisis.getState();
    let t = 250;
    const timers = SEATS.filter((s) => s !== g.me).map((s) => setTimeout(() => useCrisis.getState().markLocked(s), (t += 180 + Math.random() * 260)));
    timers.push(setTimeout(() => useCrisis.getState().resolve(), t + 450));
    return () => timers.forEach(clearTimeout);
  }, [phase]);
}
