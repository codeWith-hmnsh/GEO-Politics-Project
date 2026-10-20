"use client";

import { ArrowLeft, Droplet, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { METER_LOOK } from "@/lib/game/crisis/look";
import { useCrisis } from "@/lib/game/crisis/store";
import { METERS } from "@/lib/game/crisis/types";
import { sound } from "@/lib/game/sound";
import { SHORT } from "@/lib/game/text";
import { cn } from "@/lib/utils";
import { glass } from "../game/bits";
import { Bar, useRoll } from "./ui";

/** Top of the screen while a match runs: your four meters, the year, oil and world tension. */
export function Hud() {
  const m = useCrisis((s) => s.m)!;
  const me = useCrisis((s) => s.me);
  const phase = useCrisis((s) => s.phase);
  const [muted, setMuted] = useState(sound.isMuted);
  const resolved = phase === "reveal" || phase === "result";
  const year = resolved ? m.year - 1 : m.year;
  const done = m.turn - 1;
  const lvl = Math.max(1, Math.min(5, Math.ceil(m.tension / 20)));
  return (
    <header className="pointer-events-none fixed inset-x-4 top-[max(14px,env(safe-area-inset-top))] z-30 grid grid-cols-[1fr_auto_1fr] items-start gap-3 max-md:inset-x-2.5 max-md:grid-cols-[1fr_auto]">
      <div className={cn(glass, "pointer-events-auto flex items-center gap-3 justify-self-start py-2 pr-4 pl-2 max-md:gap-2 max-md:pr-3")}>
        <Link href="/play" aria-label="Leave the match" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-paper hover:text-ink">
          <ArrowLeft className="size-[18px]" />
        </Link>
        <span className="flex items-center gap-2 border-r border-border pr-3 text-[13px] font-extrabold tracking-[.1em] max-lg:hidden">
          <Flag iso3={me} className="h-3.5 w-[21px]" /> {SHORT[me].toUpperCase()}
        </span>
        <div className="flex items-center gap-4 max-md:gap-2.5" data-coach="meters">
          {METERS.map((k) => (
            <MeterPill key={k} k={k} v={m.seats[me].meters[k]} />
          ))}
        </div>
      </div>

      <div className={cn(glass, "pointer-events-auto grid justify-items-center px-5 py-2 leading-none max-md:px-3.5")}>
        <span className="font-display text-[26px] font-semibold tabular-nums max-md:text-[20px]">{year}</span>
        <small className="mt-0.5 text-[11px] font-semibold text-ink-3 max-md:hidden">{m.ended && resolved ? "Final year" : `Year ${Math.min(m.turns, resolved ? done : m.turn)} of ${m.turns}`}</small>
        <small className="mt-0.5 text-[11px] font-bold text-ink-3 tabular-nums md:hidden">
          {Math.min(m.turns, resolved ? done : m.turn)}/{m.turns}
        </small>
        <span aria-hidden className="mt-1.5 flex gap-[3px] max-md:hidden">
          {Array.from({ length: m.turns }, (_, i) => (
            <i key={i} className={cn("h-1 w-2.5 rounded-full max-md:w-1.5", i < done ? "bg-[var(--gold)]" : i === done && !resolved ? "animate-pulse bg-[var(--ink-strong)]" : "bg-[#e2ded4]")} />
          ))}
        </span>
      </div>

      <div className="pointer-events-auto flex items-center gap-2 justify-self-end max-md:hidden">
        <div className={cn(glass, "flex items-center gap-4 px-4 py-2 leading-none")}>
          <div title="World oil price (100 = normal)">
            <small className="block text-[10px] font-extrabold tracking-[.12em] text-ink-3">OIL PRICE</small>
            <span className="mt-1 flex items-center gap-1 text-[17px] font-extrabold tabular-nums">
              <Droplet className="size-3.5 text-ink-3" aria-hidden />
              {m.oil}
              {m.oil >= 115 && <span className="text-[12px] text-[var(--down)]">▲</span>}
            </span>
          </div>
          <div className="border-l border-border pl-4" title={`World tension ${m.tension} of 100`}>
            <small className="block text-[10px] font-extrabold tracking-[.12em] text-ink-3">WORLD TENSION</small>
            <span className="mt-1.5 flex items-center gap-2">
              <span className="flex gap-[3px]" role="img" aria-label={`World tension ${m.tension} of 100`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <i key={i} className={cn("h-2 w-3 rounded-[2px] transition-colors duration-700", i > lvl ? "bg-[#e2ded4]" : lvl >= 4 ? "bg-[var(--conflict)]" : "bg-[var(--mixed)]")} />
                ))}
              </span>
              <b className={cn("text-[12px] font-extrabold", lvl >= 4 ? "text-[var(--down)]" : "text-ink-2")}>{["", "Calm", "Calm", "Tense", "High", "Severe"][lvl]}</b>
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label={muted ? "Sound off" : "Sound on"}
          onClick={() => {
            sound.setMuted(!muted);
            setMuted(!muted);
          }}
          className="grid size-[42px] place-items-center rounded-full border border-border bg-white/90 text-ink-2 shadow-[var(--shadow-card)] hover:text-ink"
        >
          {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
        </button>
      </div>
    </header>
  );
}

function MeterPill({ k, v }: { k: (typeof METERS)[number]; v: number }) {
  const look = METER_LOOK[k];
  const Icon = look.icon;
  const shown = useRoll(v);
  return (
    <div className="w-[64px] leading-none max-md:w-[40px]" title={`${look.name} ${v} of 100`}>
      <span className="flex items-center gap-1 text-[10px] font-extrabold tracking-[.08em] text-ink-3 uppercase max-md:hidden">
        <Icon className="size-3" style={{ color: look.color }} aria-hidden /> {look.name}
      </span>
      <span className="mt-1 flex items-center gap-1 text-[17px] font-extrabold tabular-nums max-md:text-[14px]">
        <Icon className="size-3.5 md:hidden" style={{ color: look.color }} aria-hidden />
        {shown}
      </span>
      <Bar v={v} color={look.color} className="mt-1" />
    </div>
  );
}
