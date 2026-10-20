"use client";

import { ArrowRight, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { focus } from "@/lib/game/camera";
import { CRISIS_BY_ID } from "@/lib/game/crisis/deck";
import { CHOICE_LOOK } from "@/lib/game/crisis/look";
import { useCrisis } from "@/lib/game/crisis/store";
import type { Iso3 } from "@/lib/game/crisis/types";
import { SEATS } from "@/lib/game/engine/types";
import { sound } from "@/lib/game/sound";
import { SEAT_COLOR, SHORT } from "@/lib/game/text";
import { ease } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Btn, Portrait, eyebrow } from "../game/bits";

/** The big moment: six face-down cards flip one by one, the joint answer fills up, and the world's verdict lands. */
export function Reveal() {
  const phase = useCrisis((s) => s.phase);
  const record = useCrisis((s) => s.record);
  if (phase !== "reveal" || !record) return null;
  return <Stage key={record.year} />;
}

function Stage() {
  const record = useCrisis((s) => s.record)!;
  const me = useCrisis((s) => s.me);
  const flipped = useCrisis((s) => s.flipped);
  const [stamp, setStamp] = useState(false);
  const skip = useRef(false);

  const order: Iso3[] = [...SEATS.filter((s) => s !== me).sort((a, b) => ((SEATS.indexOf(a) + record.year) % 5) - ((SEATS.indexOf(b) + record.year) % 5)), me];

  useEffect(() => {
    const c = CRISIS_BY_ID.get(record.crisisId)!;
    focus(c.place.lat, c.place.lng, c.place.global ? 5.2 : 4.4, 1300);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, skip.current || reduce ? 0 : ms));
    (async () => {
      await wait(900);
      for (const s of order) {
        if (!alive) return;
        useCrisis.getState().flip(s);
        sound.flip();
        await wait(s === order.at(-2) ? 900 : 620);
      }
      await wait(450);
      if (!alive) return;
      setStamp(true);
      if (record.success) sound.chime();
      else sound.knock();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per reveal; the stage is keyed by year
  }, []);

  const c = CRISIS_BY_ID.get(record.crisisId)!;
  const coopNow = flipped.filter((s) => record.picks[s] === "coop").length + (c.hardHelps ? flipped.filter((s) => record.picks[s] === "hard").length * 0.5 : 0);
  const finish = () => {
    skip.current = true;
    const st = useCrisis.getState();
    for (const s of order) if (!st.flipped.includes(s)) st.flip(s);
    setStamp(true);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-[rgba(243,241,236,.97)] via-[rgba(243,241,236,.75)] to-transparent" />

      <AnimatePresence>
        {stamp && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: ease.out }}
            className="absolute top-[14%] left-1/2 w-[min(560px,calc(100%-32px))] -translate-x-1/2 max-md:top-[12%]"
          >
            <div className="relative rounded-[24px] border border-white/80 bg-white/96 px-7 pt-9 pb-6 text-center shadow-[0_30px_70px_rgba(17,35,43,.25)] backdrop-blur-xl max-md:px-5">
              <motion.div
                initial={{ opacity: 0, scale: 1.6, rotate: -8, x: "-50%" }}
                animate={{ opacity: 1, scale: 1, rotate: -2, x: "-50%" }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.55, delay: 0.15 }}
                className={cn("absolute -top-6 left-1/2 inline-flex items-center gap-2 rounded-xl border-[3px] bg-white px-5 py-1.5 text-[clamp(20px,3vw,28px)] font-extrabold tracking-[.14em] whitespace-nowrap uppercase shadow-[0_14px_30px_rgba(17,35,43,.18)]", record.success ? "border-[var(--ally)] text-[var(--up)]" : "border-[var(--conflict)] text-[var(--down)]")}>
                {record.success ? <Check className="size-7" strokeWidth={3} /> : <X className="size-7" strokeWidth={3} />}
                {record.success ? "It worked" : "It failed"}
              </motion.div>
              <p className="font-display text-[clamp(21px,2.6vw,28px)] leading-tight font-semibold text-ink">{record.headline}</p>
              <p className="mt-2 text-[13px] font-bold text-ink-3">
                {c.place.name}
                {c.place.note ? ` · ${c.place.note}` : ""}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-[max(20px,env(safe-area-inset-bottom))] mx-auto grid w-[min(1000px,100%)] justify-items-center gap-4 px-3">
        <div className="rounded-2xl bg-white/95 px-5 py-2.5 text-center shadow-[var(--shadow-card)] backdrop-blur-xl">
          <div className={eyebrow}>The world decides · {record.year}</div>
          <h2 className="mt-0.5 font-display text-[20px] leading-tight font-semibold max-md:text-[16px]">{c.title}</h2>
        </div>

        <div className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 shadow-[var(--shadow-card)]" aria-live="polite">
          <span className="text-[12.5px] font-bold" style={{ color: CHOICE_LOOK.coop.ink }}>
            Joined
          </span>
          <span className="flex gap-1.5">
            {Array.from({ length: 6 }, (_, i) => {
              const full = coopNow >= i + 1;
              const half = !full && coopNow >= i + 0.5;
              return (
                <motion.i
                  key={i}
                  animate={{ scale: full || half ? [1.4, 1] : 1 }}
                  className={cn("relative size-3.5 overflow-hidden rounded-full border-2", i < c.need ? "border-[#3F63D8]" : "border-[#cfd6e8]")}
                >
                  <i className="absolute inset-y-0 left-0 bg-[#3F63D8] transition-[width] duration-300" style={{ width: full ? "100%" : half ? "50%" : "0%" }} />
                </motion.i>
              );
            })}
          </span>
          <span className="text-[12.5px] font-bold text-ink-2 tabular-nums">
            {coopNow} of {c.need} needed
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 [perspective:1000px]">
          {order.map((s) => (
            <FlipCard key={s} iso={s} on={flipped.includes(s)} me={s === me} />
          ))}
        </div>

        <div className="pointer-events-auto flex min-h-12 items-center gap-2">
          {stamp ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Btn className="min-h-12 px-7 text-[15px]" onClick={() => useCrisis.getState().toResult()}>
                See what it did to {SHORT[me]} <ArrowRight className="size-4" aria-hidden />
              </Btn>
            </motion.div>
          ) : (
            <button type="button" onClick={finish} className="rounded-full border border-border bg-white/90 px-4 py-2 text-[13px] font-bold shadow-[var(--shadow-card)]">
              Skip ▸▸
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FlipCard({ iso, on, me }: { iso: Iso3; on: boolean; me: boolean }) {
  const record = useCrisis((s) => s.record)!;
  const c = CRISIS_BY_ID.get(record.crisisId)!;
  const pick = record.picks[iso];
  const look = CHOICE_LOOK[pick];
  const Icon = look.icon;
  const pledged = record.pledges[iso];
  const broke = record.broke.includes(iso);
  return (
    <div className={cn("relative h-[150px] w-[136px] max-md:h-[118px] max-md:w-[104px]", me && "-translate-y-1")}>
      <motion.div initial={false} animate={{ rotateY: on ? 0 : 180 }} transition={{ duration: 0.6, ease: ease.out }} className="relative size-full [transform-style:preserve-3d]">
        {/* face: the answer */}
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border bg-white p-3 shadow-[var(--shadow-card)] [backface-visibility:hidden]" style={{ borderColor: look.color, boxShadow: me ? `0 0 0 2px var(--gold), var(--shadow-card)` : undefined }}>
          <i aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: look.color }} />
          <span className="flex items-center gap-1.5 text-[12px] font-extrabold">
            <Flag iso3={iso} className="h-3 w-[18px]" /> {me ? "You" : SHORT[iso]}
          </span>
          <span className="mt-2 grid size-9 place-items-center rounded-xl max-md:size-7" style={{ background: look.soft, color: look.color }}>
            <Icon className="size-[18px] max-md:size-4" aria-hidden />
          </span>
          <b className="mt-1.5 text-[10.5px] font-extrabold tracking-[.12em] uppercase" style={{ color: look.ink }}>
            {look.name}
          </b>
          <span className="text-[12px] leading-tight font-semibold text-ink-2 max-md:hidden">{c.choices[pick].title}</span>
          {pledged && (
            <span className={cn("mt-auto inline-flex items-center gap-1 text-[10.5px] font-bold", broke ? "text-[var(--down)]" : "text-[var(--up)]")}>
              {broke ? <X className="size-3" /> : <Check className="size-3" />} {broke ? "Broke promise" : "Kept promise"}
            </span>
          )}
        </div>
        {/* back: face down */}
        <div className="absolute inset-0 grid place-items-center overflow-hidden rounded-2xl bg-[var(--ink-strong)] text-white shadow-[var(--shadow-card)] [backface-visibility:hidden] [transform:rotateY(180deg)]" style={{ boxShadow: me ? "0 0 0 2px var(--gold), var(--shadow-card)" : undefined }}>
          <div aria-hidden className="absolute inset-2 rounded-xl border border-white/15 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,.04)_0_6px,transparent_6px_12px)]" />
          <div className="relative grid justify-items-center gap-2">
            <Portrait i={SEATS.indexOf(iso)} seat={SEAT_COLOR[iso]} size={38} />
            <span className="flex items-center gap-1.5 text-[12px] font-bold">
              <Flag iso3={iso} className="h-3 w-[18px]" /> {me ? "You" : SHORT[iso]}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
