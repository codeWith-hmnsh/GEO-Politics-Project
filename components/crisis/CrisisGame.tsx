"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Flag } from "@/components/chrome/Flag";
import { GlobeClient } from "@/components/globe/GlobeClient";
import { Marker } from "@/components/globe/Marker";
import { focus } from "@/lib/game/camera";
import { CRISIS_BY_ID } from "@/lib/game/crisis/deck";
import { CHOICE_LOOK } from "@/lib/game/crisis/look";
import { useCrisis } from "@/lib/game/crisis/store";
import { CHOICES } from "@/lib/game/crisis/types";
import { SEATS } from "@/lib/game/engine/types";
import { CAPITAL, SHORT } from "@/lib/game/text";
import { useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Decide, useDecideTimers } from "./Decide";
import { End } from "./End";
import { Hud } from "./Hud";
import { Intro } from "./Intro";
import { Result } from "./Result";
import { Reveal } from "./Reveal";
import { Table } from "./Table";

const IN_MATCH = new Set(["brief", "choose", "home", "locking", "reveal", "result"]);

/** Statecraft 5.0, the Crisis Table: one shared crisis a year, six secret answers, on the live globe. */
export function CrisisGame() {
  const phase = useCrisis((s) => s.phase);
  const me = useCrisis((s) => s.me);
  const crisisId = useCrisis((s) => s.m?.crisisId);
  useDecideTimers();

  // the globe switches to game mode while this screen is mounted; taps on countries never open explore panels
  useEffect(() => {
    const g = useGlobe.getState();
    g.setPlay(true);
    g.select(null);
    g.setMode("home");
    const unsub = useGlobe.subscribe((s, prev) => {
      if (s.selectedIso3 && s.selectedIso3 !== prev.selectedIso3) setTimeout(() => useGlobe.getState().select(null), 0);
    });
    return () => {
      unsub();
      useGlobe.getState().setPlay(false);
    };
  }, []);

  // camera: the world at the start, your country while you pick, the crisis while you decide
  useEffect(() => {
    const wide = window.innerWidth >= 1024;
    if (phase === "intro") focus(18, 40, 4.8, 1600);
    else if (phase === "pick" || phase === "agenda") focus(CAPITAL[me][0] - 4, CAPITAL[me][1] + (wide ? 20 : 0), 3.9, 1100);
    else if (phase === "brief" && crisisId) {
      const c = CRISIS_BY_ID.get(crisisId)!;
      focus(c.place.lat - (wide ? 4 : 0), c.place.lng, 3.3, 1600);
    }
  }, [phase, me, crisisId]);

  // keyboard: Enter moves on, 1–4 pick an answer, L locks
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select")) return;
      const s = useCrisis.getState();
      if (s.phase === "brief" && e.key === "Enter") s.setPhase("choose");
      else if (s.phase === "choose") {
        const n = "1234".indexOf(e.key);
        if (n >= 0) s.setChoice(CHOICES[n]);
        if (e.key === "Enter" && s.choice) s.setPhase("home");
      } else if (s.phase === "home" && (e.key.toLowerCase() === "l" || e.key === "Enter")) s.lock();
      else if (s.phase === "result" && e.key === "Enter") s.nextYear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-paper">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(48% 62% at 50% 52%, #d7e3ea 0%, rgba(215,227,234,.6) 45%, rgba(243,241,236,0) 75%), linear-gradient(180deg,#f6f4ef,#efede7)" }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(rgba(17,35,43,.07)_1px,transparent_1.2px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_70%_at_50%_50%,transparent_35%,#000_75%)]" />
      <GlobeClient variant="crisis">
        <CrisisMarker />
        <SeatPins />
      </GlobeClient>
      <h1 className="sr-only">Statecraft Crisis Table</h1>
      {IN_MATCH.has(phase) && (
        <>
          <Hud />
          <Table />
        </>
      )}
      <Intro />
      <Decide />
      <Reveal />
      <Result />
      <End />
    </main>
  );
}

/** A pulsing ring and a label on the crisis location. */
function CrisisMarker() {
  const phase = useCrisis((s) => s.phase);
  const m = useCrisis((s) => s.m);
  const record = useCrisis((s) => s.record);
  if (!m || !IN_MATCH.has(phase)) return null;
  const id = phase === "reveal" || phase === "result" ? record?.crisisId : m.crisisId;
  const c = id ? CRISIS_BY_ID.get(id) : null;
  if (!c) return null;
  const tone = phase === "result" && record ? (record.success ? "#2fa36b" : "#e5484d") : "#e8a21c";
  return (
    <div className="pointer-events-none fixed inset-0 z-[6] overflow-hidden">
      <Marker lat={c.place.lat} lng={c.place.lng} priority={10}>
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <span className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 opacity-60 motion-reduce:hidden" style={{ borderColor: tone, animationDuration: "2.2s" }} />
          <span className="absolute top-1/2 left-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" style={{ borderColor: tone, background: `${tone}22` }} />
          <span className="relative grid size-4 place-items-center rounded-full border-2 border-white shadow-[0_0_14px_rgba(0,0,0,.25)]" style={{ background: tone }} />
          <span className="absolute top-1/2 left-7 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-[var(--ink-strong)] py-1 pr-3 pl-2 text-[12px] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(17,35,43,.25)]">
            <TriangleAlert className="size-3.5" style={{ color: tone }} aria-hidden />
            {c.place.name}
          </span>
        </div>
      </Marker>
    </div>
  );
}

/** Flags on the six capitals; in the reveal each one takes the colour of the card it played. */
function SeatPins() {
  const phase = useCrisis((s) => s.phase);
  const me = useCrisis((s) => s.me);
  const record = useCrisis((s) => s.record);
  const flipped = useCrisis((s) => s.flipped);
  if (phase === "intro") return null;
  const showPick = (phase === "reveal" || phase === "result") && record;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[6] overflow-hidden">
      {SEATS.map((s) => {
        const pick = showPick && flipped.includes(s) ? record!.picks[s] : null;
        return (
          <Marker key={s} lat={CAPITAL[s][0]} lng={CAPITAL[s][1]}>
            <span
              className={cn(
                "flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border py-1 pr-2.5 pl-1.5 text-[11.5px] font-bold whitespace-nowrap shadow-[0_6px_18px_rgba(17,35,43,.18)] transition-colors duration-500",
                s === me && !pick ? "border-[var(--gold)] bg-[var(--ink-strong)] text-white ring-2 ring-[var(--gold)]" : "border-white/80 bg-white/90 text-ink",
              )}
              style={pick ? { background: CHOICE_LOOK[pick].color, borderColor: CHOICE_LOOK[pick].color, color: "#fff" } : undefined}
            >
              <Flag iso3={s} className="h-3 w-[18px]" />
              {s === me ? "You" : SHORT[s]}
              {pick && <span className="opacity-90">· {CHOICE_LOOK[pick].name}</span>}
            </span>
          </Marker>
        );
      })}
    </div>
  );
}
