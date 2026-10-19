"use client";

import { ArrowLeft, Globe2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag } from "@/components/chrome/Flag";
import { GlobeClient } from "@/components/globe/GlobeClient";
import { Marker } from "@/components/globe/Marker";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { REGION_DEFS } from "@/lib/game/engine/regions";
import { ranks, trend } from "@/lib/game/engine/score";
import { TURN_SECONDS } from "@/lib/game/engine/rules";
import type { Iso3 } from "@/lib/game/engine/types";
import { REGIONS, SEATS } from "@/lib/game/engine/types";
import { focus } from "@/lib/game/camera";
import { isSeat } from "@/lib/game/share";
import { sound } from "@/lib/game/sound";
import { turnSecondsFor } from "@/lib/game/onlineTypes";
import { moneyCommitted, pcLeft, useGame, type Tab } from "@/lib/game/store";
import { CAPITAL, SEAT_COLOR, SHORT, money } from "@/lib/game/text";
import { useGlobe } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Delta, MoveDots, Portrait, TrendChip, eyebrow, glass } from "./bits";
import { CommandPanel } from "./CommandPanel";
import { NetError } from "./NetError";
import { Coach, EndScreen, PickScreen, Reveal } from "./Overlays";
import { EscalationPips, WarRoomFx, escalation, useWarRoom } from "./WarRoom";

/** Statecraft solo match on the 1.0 globe (BUILD-PLAN S3). */
export function PlayScreen({ online }: { online?: { matchId: string; code: string } } = {}) {
  const phase = useGame((s) => s.phase);
  const solo = !online;
  useWarRoom();

  // The globe switches to game layers while this screen is mounted. ?country=IND pre-selects a seat (solo).
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("country");
    if (solo && c && isSeat(c)) useGame.getState().setSetup({ me: c });
    const g = useGlobe.getState();
    g.setPlay(true);
    g.select(null);
    g.setMode("home");
    return () => useGlobe.getState().setPlay(false);
  }, [solo]);

  // Tapping another leader's country on the globe opens a deal with them.
  useEffect(
    () =>
      useGlobe.subscribe((s, prev) => {
        if (s.selectedIso3 === prev.selectedIso3 || !s.selectedIso3) return;
        const iso = s.selectedIso3 as Iso3;
        const game = useGame.getState();
        if (game.phase === "plan" && SEATS.includes(iso) && iso !== game.setup.me) {
          game.setCompose({ to: iso, gives: [], wants: [], turns: 3 });
          game.setTab("deals");
          sound.click();
        }
        setTimeout(() => useGlobe.getState().select(null), 0);
      }),
    [],
  );

  // Timer (solo: optional) and keyboard.
  useEffect(() => {
    const id = setInterval(() => useGame.getState().tick(), 1000);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,select,textarea,[role=dialog]")) return;
      const g = useGame.getState();
      if (g.phase === "result" && (e.key === "Enter" || e.key.toLowerCase() === "l")) g.next();
      if (g.phase !== "plan") return;
      const tabs: Tab[] = ["year", "moves", "deals", "advanced"];
      const n = "1234".indexOf(e.key);
      if (n >= 0) g.setTab(tabs[n]);
      if (e.key.toLowerCase() === "l") g.lock();
      if (e.key.toLowerCase() === "v") g.toggleWorldView();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main className="war relative min-h-dvh overflow-hidden bg-[#03060b] text-ink">
      <div aria-hidden className="war-space pointer-events-none fixed inset-0" />
      <GlobeClient variant="game">
        <SeatLabels />
      </GlobeClient>
      <WarRoomFx />
      <h1 className="sr-only">Statecraft: lead a country, shape the world</h1>
      {online && phase === "pick" && (
        <div role="status" className="fixed inset-0 z-40 grid place-items-center font-hud text-[13px] tracking-[.3em] text-[var(--hud-dim)] uppercase">
          <span className="war-live">Establishing link · room {online.code}</span>
        </div>
      )}
      {phase !== "pick" && phase !== "end" && (
        <>
          <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[9] h-[150px] bg-gradient-to-b from-[rgba(2,5,10,.85)] to-transparent" />
          <TopBar />
          <Rail />
          <News />
          <CommandPanel />
        </>
      )}
      <PickScreen />
      <Reveal />
      <EndScreen />
      <Coach />
      <NetError />
    </main>
  );
}

function SeatLabels() {
  const world = useGame((s) => s.world);
  const me = useGame((s) => s.setup.me);
  const phase = useGame((s) => s.phase);
  if (!world && phase !== "pick") return null;
  return (
    <div aria-hidden={phase === "pick"} className="pointer-events-none fixed inset-0 z-[6] overflow-hidden">
      {SEATS.map((s) => (
        <Marker key={s} lat={CAPITAL[s][0]} lng={CAPITAL[s][1]} interactive>
          <button
            type="button"
            onClick={() => useGlobe.getState().select(s)}
            className={cn(
              "flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-[4px] border py-1 pr-2.5 pl-1.5 font-hud text-[10.5px] font-semibold tracking-[.14em] whitespace-nowrap uppercase",
              s === me ? "border-[var(--gold)] bg-[var(--cta)] text-[var(--cta-ink)] ring-2 ring-[var(--gold)]" : "border-white/80 bg-card/90 text-ink hover:bg-card",
            )}
            title={s === me ? "Your country" : `Offer ${SHORT[s]} a deal`}
          >
            <Flag iso3={s} className="h-3 w-[18px]" />
            {SHORT[s]}
          </button>
        </Marker>
      ))}
    </div>
  );
}

function TopBar() {
  const world = useGame((s) => s.world)!;
  const setup = useGame((s) => s.setup);
  const phase = useGame((s) => s.phase);
  const timeLeft = useGame((s) => s.timeLeft);
  const paused = useGame((s) => s.paused);
  const worldView = useGame((s) => s.worldView);
  const left = useGame(pcLeft);
  const committed = useGame((s) => (s.phase === "plan" || s.phase === "locking" ? moneyCommitted(s) : 0));
  const [muted, setMuted] = useState(sound.isMuted);
  const view = useGame((s) => (s.net ? s.view : null));
  const c = world.countries[setup.me];
  const r = ranks(world)[setup.me];
  const r0 = ranks(world, 0)[setup.me];
  const total = view ? turnSecondsFor(view.match.turnSeconds, world.turn) : TURN_SECONDS(world.turn);
  const resolved = world.ended || phase === "reveal" || phase === "result";
  const year = resolved ? world.year - 1 : world.year;
  const done = Math.min(12, world.turn - 1); // years already resolved
  const lvl = escalation(world.tension);
  const status = phase === "locking" ? (view ? "Locked · waiting for the others" : "Leaders are locking…") : phase === "reveal" ? "The world moves" : phase === "result" ? "Year resolved" : `Year ${Math.min(12, world.turn)} of 12${paused ? " · paused" : ""}`;
  return (
    <header className="pointer-events-none fixed inset-x-4 top-[max(14px,env(safe-area-inset-top))] z-30 grid grid-cols-[1fr_auto_1fr] items-start gap-3 max-md:inset-x-2.5 max-md:grid-cols-[1fr_auto]">
      {/* dossier: who you are, money, moves */}
      <div className={cn(glass, "pointer-events-auto flex items-center gap-3 justify-self-start py-2 pr-4 pl-2 max-md:gap-2 max-md:pr-2.5")}>
        <Link href="/play" aria-label="Leave the match" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-[var(--hover)] hover:text-ink">
          <ArrowLeft className="size-[18px]" />
        </Link>
        <Portrait i={setup.portrait} seat={SEAT_COLOR[setup.me]} size={36} />
        <div className="leading-tight max-md:hidden">
          <b className="flex items-center gap-1.5 font-hud text-[12px] font-semibold tracking-[.2em] text-[var(--gold)]">
            <Flag iso3={setup.me} className="h-3 w-[18px]" /> {SHORT[setup.me].toUpperCase()}
          </b>
          <small className="text-[11.5px] text-ink-3">{setup.leader}</small>
        </div>
        <div className="flex items-center gap-4 border-l border-border pl-3 max-md:gap-2.5 max-md:pl-2">
          <HudStat label="Treasury">
            <span className="text-[18px] font-extrabold tabular-nums max-md:text-[15px]">{money(c.treasury - committed)}</span>
          </HudStat>
          <HudStat label="Moves">
            <span className="mt-1.5 block">
              <MoveDots left={left} total={c.pc} />
            </span>
          </HudStat>
        </div>
      </div>

      {/* the clock: live tag, year, the 12-year term */}
      <div className="pointer-events-auto flex items-center gap-3.5 px-2 text-center [text-shadow:0_1px_10px_rgba(0,0,0,.9)]">
        {setup.timed && (
          <div className={cn("relative size-12", timeLeft <= 10 && phase === "plan" && "animate-pulse")}>
            <svg viewBox="0 0 46 46" className="size-12 -rotate-90">
              <circle cx="23" cy="23" r="20" fill="none" strokeWidth="3" stroke="var(--track)" />
              <circle cx="23" cy="23" r="20" fill="none" strokeWidth="3" strokeLinecap="round" stroke={timeLeft <= 10 ? "var(--alert)" : "var(--intel)"} strokeDasharray="125.66" strokeDashoffset={125.66 * (1 - timeLeft / total)} />
            </svg>
            <span className={cn("absolute inset-0 grid place-items-center font-hud text-[11.5px] font-bold tabular-nums", timeLeft <= 10 && "text-[var(--alert)]")}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          </div>
        )}
        <div className="grid justify-items-center leading-none">
          <span className={cn("font-hud text-[10px] font-semibold tracking-[.26em] uppercase max-md:hidden", view ? "war-live text-[var(--alert)]" : "text-[var(--hud-dim)]")}>{view ? "Live · shared world" : "Simulation · solo"}</span>
          <div className="mt-1 font-hud text-[30px] font-bold tracking-[.06em] tabular-nums max-md:text-[22px]">{year}</div>
          <small className="mt-1 font-hud text-[10.5px] font-medium tracking-[.14em] text-[var(--hud-dim)] uppercase">{status}</small>
          <span aria-hidden className="mt-2 flex gap-[3px]">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} className={cn("h-[3px] w-3 rounded-[1px] max-md:w-2", i < done ? "bg-[var(--intel)] shadow-[0_0_6px_var(--intel)]" : i === done && !resolved ? "animate-pulse bg-[var(--gold)]" : "bg-white/12")} />
            ))}
          </span>
        </div>
      </div>

      {/* threat board: rank, escalation, controls */}
      <div className="pointer-events-auto flex items-center gap-2 justify-self-end max-md:hidden">
        <div className={cn(glass, "flex items-center gap-4 px-4 py-2")}>
          <HudStat label="Power rank">
            <span className="flex items-center gap-1.5 text-[20px] font-extrabold tabular-nums">
              #{r}
              {r !== r0 && <Delta v={r0 - r} d={0} className="text-[12px]" />}
            </span>
          </HudStat>
          <div className="border-l border-border pl-4">
            <HudStat label={`Tension ${world.tension.toFixed(0)}`}>
              <EscalationPips tension={world.tension} className="mt-1.5" />
              <span className={cn("mt-1 block font-hud text-[9.5px] tracking-[.2em] uppercase", lvl >= 4 ? "text-[var(--alert)]" : "text-[var(--hud-dim)]")}>{LEVEL[lvl]}</span>
            </HudStat>
          </div>
        </div>
        <IconBtn label="World view (V): influence, all treaties and sanctions" on={worldView} onClick={() => useGame.getState().toggleWorldView()}>
          <Globe2 className="size-[18px]" />
        </IconBtn>
        <IconBtn
          label={muted ? "Sound off" : "Sound on"}
          onClick={() => {
            sound.setMuted(!muted);
            setMuted(!muted);
          }}
        >
          {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
        </IconBtn>
        {view && (
          <div className={cn(glass, "px-3.5 py-2.5 font-hud text-[13px] font-bold tracking-[.3em] text-[var(--intel)]")} title="Room code">
            {view.match.code}
          </div>
        )}
        {setup.timed && !view && (
          <IconBtn label={paused ? "Resume the timer" : "Pause the timer"} onClick={() => useGame.getState().togglePause()}>
            {paused ? <Play className="size-[18px]" /> : <Pause className="size-[18px]" />}
          </IconBtn>
        )}
      </div>
    </header>
  );
}

const LEVEL = ["", "Calm", "Guarded", "Elevated", "High", "Severe"];

function HudStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block font-hud text-[9.5px] font-semibold tracking-[.2em] text-[var(--hud-dim)] uppercase">{label}</span>
      {children}
    </div>
  );
}

function IconBtn({ label, on, onClick, children }: { label: string; on?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={on} onClick={onClick} className={cn("grid size-[42px] place-items-center rounded-[10px] border transition", on ? "border-[var(--intel)] bg-[rgba(103,232,249,.14)] text-[var(--intel)] shadow-[0_0_14px_rgba(103,232,249,.35)]" : "border-[rgba(140,190,230,.2)] bg-[var(--glass)] text-ink-2 backdrop-blur-xl hover:border-[var(--intel)] hover:text-ink")}>
      {children}
    </button>
  );
}

function Rail() {
  const world = useGame((s) => s.world)!;
  const me = useGame((s) => s.setup.me);
  const botLocks = useGame((s) => s.botLocks);
  const phase = useGame((s) => s.phase);
  const seats = useGame((s) => s.seats);
  const online = useGame((s) => !!s.net);
  const [table, setTable] = useState(false);
  const r = ranks(world);
  const order = [...SEATS].sort((a, b) => r[a] - r[b]);
  const sanctions = SEATS.reduce((t, a) => t + SEATS.filter((b) => b !== a && world.pairs[a][b].sanction).length, 0);
  const led = REGIONS.filter((x) => world.regions[x].leader === me).length;
  const top = Math.max(...SEATS.map((s) => world.power[s].at(-1) ?? 0));
  return (
    <aside aria-label="World Power Index" className={cn(glass, "fixed top-[92px] left-4 z-20 w-[272px] p-4 max-[1100px]:w-[244px] max-md:hidden")}>
      <div className="flex items-center justify-between">
        <span className={cn(eyebrow, "whitespace-nowrap")} style={{ letterSpacing: ".16em" }}>World Power Index</span>
        <button className="rounded-[4px] border border-[rgba(103,232,249,.35)] px-1.5 py-0.5 whitespace-nowrap font-hud text-[9.5px] font-semibold tracking-[.16em] text-[var(--intel)] uppercase hover:bg-[rgba(103,232,249,.12)]" onClick={() => setTable(true)}>
          World table
        </button>
      </div>
      <motion.ol layout className="mt-2.5 grid">
        {order.map((s) => {
          const seat = online ? seats.find((x) => x.iso3 === s) : undefined;
          const human = seat?.kind === "human";
          const locked = online ? !!seat?.locked || (s === me && phase === "locking") : phase === "locking" ? !!botLocks[s] || s === me : false;
          const showLock = online ? human && (phase === "plan" || phase === "locking") : phase === "locking";
          return (
            <motion.li key={s} layout transition={{ type: "spring", bounce: 0.2, visualDuration: 0.5 }} className={cn("grid grid-cols-[16px_30px_1fr_auto] items-center gap-2.5 rounded-lg px-1.5 py-2", s === me && "bg-[rgba(242,179,61,.1)] shadow-[inset_0_0_0_1px_rgba(242,179,61,.45)]")}>
              <span className="font-hud text-[12px] font-bold text-[var(--hud-dim)]">{String(r[s]).padStart(2, "0")}</span>
              <Portrait i={seat ? seat.portrait : SEATS.indexOf(s)} seat={SEAT_COLOR[s]} size={28} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-[13.5px] font-bold">
                  <Flag iso3={s} className="h-3 w-[18px]" />
                  {SHORT[s]}
                </div>
                {human && s !== me && <small className="block truncate text-[11px] font-semibold text-ink-3">{seat.leader}</small>}
                {seat?.kind === "caretaker" && <small className="block text-[11px] font-semibold text-ink-3">Away · bot is caretaker</small>}
                {trend(world, s, "economy") !== "unchanging" && <TrendChip t={trend(world, s, "economy")} />}
                <span aria-hidden className="mt-1 block h-[3px] overflow-hidden rounded-full bg-[var(--track)]">
                  <i className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${((world.power[s].at(-1) ?? 0) / top) * 100}%`, background: SEAT_COLOR[s], boxShadow: `0 0 6px ${SEAT_COLOR[s]}` }} />
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {showLock && <span className={cn("inline-block size-2 rounded-full", locked ? "bg-[var(--up)] shadow-[0_0_8px_var(--up)]" : "animate-pulse bg-ink-3")} title={locked ? "Locked" : "Thinking"} />}
                <span className="font-hud text-[14px] font-bold tabular-nums">{(world.power[s].at(-1) ?? 0).toFixed(1)}</span>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-ink-3">
        <Stat v={world.treaties.length} l="Treaties" />
        <Stat v={sanctions} l="Sanctions" />
        <Stat v={`${led}/8`} l="Regions you lead" />
        <Stat v={world.tension.toFixed(0)} l="World tension" />
      </div>
      <Sheet open={table} onOpenChange={setTable}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-paper sm:max-w-[520px]">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">World table</SheetTitle>
          </SheetHeader>
          <div className="grid gap-5 px-4 pb-8 text-[13px]">
            <div>
              <div className={cn(eyebrow, "mb-2")}>Treaties ({world.treaties.length})</div>
              {world.treaties.length === 0 && <p className="text-ink-3">None yet.</p>}
              {world.treaties.map((t) => (
                <div key={t.id} className="mb-1.5 rounded-xl border border-border bg-card p-2.5 font-bold">
                  <Flag iso3={t.a} /> {SHORT[t.a]} ⇄ <Flag iso3={t.b} /> {SHORT[t.b]} <span className="font-semibold text-ink-3">· {t.turnsLeft} yr left</span>
                </div>
              ))}
            </div>
            <div>
              <div className={cn(eyebrow, "mb-2")}>Sanctions and tariffs</div>
              {SEATS.flatMap((a) =>
                SEATS.filter((b) => b !== a && (world.pairs[a][b].sanction || world.pairs[a][b].tariff)).map((b) => (
                  <div key={a + b} className="mb-1.5 rounded-xl border border-border bg-card p-2.5 font-bold">
                    {SHORT[a]} {world.pairs[a][b].sanction ? "sanctions" : `has a ${world.pairs[a][b].tariff}% tariff on`} {SHORT[b]}
                  </div>
                )),
              )}
            </div>
            <div>
              <div className={cn(eyebrow, "mb-2")}>Partner regions</div>
              {REGIONS.map((rg) => {
                const reg = world.regions[rg];
                const top = [...SEATS].sort((a, b) => reg.sway[b] - reg.sway[a]).slice(0, 3);
                return (
                  <div key={rg} className="mb-1.5 rounded-xl border border-border bg-card p-2.5">
                    <b>
                      {REGION_DEFS[rg].name} · {reg.leader ? `led by ${SHORT[reg.leader]}` : "no leader"}
                    </b>
                    <div className="mt-1.5 flex h-2 overflow-hidden rounded-full">
                      {top.map((s) => (
                        <i key={s} style={{ flexGrow: reg.sway[s], background: SEAT_COLOR[s] }} />
                      ))}
                      <i style={{ flexGrow: Math.max(0, 100 - top.reduce((t, s) => t + reg.sway[s], 0)), background: "var(--track)" }} />
                    </div>
                    <small className="text-ink-3">{top.map((s) => `${SHORT[s]} ${reg.sway[s].toFixed(0)}`).join(" · ")}</small>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </aside>
  );
}

function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div className="rounded-lg border border-border bg-[rgba(255,255,255,.03)] px-2.5 py-2 font-hud text-[9.5px] tracking-[.12em] uppercase">
      <b className="block font-sans text-[16px] tracking-normal text-ink tabular-nums">{v}</b>
      {l}
    </div>
  );
}

function News() {
  const world = useGame((s) => s.world)!;
  const phase = useGame((s) => s.phase);
  const last = world.history.at(-1);
  if (!last || phase === "reveal") return null;
  return (
    <section aria-label="World news" className="fixed bottom-4 left-4 z-10 grid w-[360px] gap-1.5 max-[1100px]:hidden">
      <div className="flex items-center justify-between px-1 font-hud text-[10px] font-semibold tracking-[.22em] text-[var(--hud-dim)] uppercase [text-shadow:0_1px_6px_#000]">
        <span className="war-live">Intel feed · {last.year}</span>
        <span className="rounded-[3px] border border-current bg-[var(--night)] px-1.5 text-[8.5px]">Simulated</span>
      </div>
      <ul className="grid gap-1.5">
        {last.news.slice(0, 3).map((n, i) => (
          <motion.li key={n.id} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.45 }}>
            <button
              type="button"
              className="group block w-full rounded-[4px] border border-[rgba(140,190,230,.16)] border-l-[3px] border-l-[var(--intel)] bg-[var(--glass)] px-3 py-2 text-left backdrop-blur-xl transition hover:border-l-[var(--gold)] hover:bg-[rgba(10,18,28,.9)]"
              onClick={() => {
                if (n.iso3) focus(CAPITAL[n.iso3][0], CAPITAL[n.iso3][1], 3.0);
              }}
            >
              <b className="block font-hud text-[9.5px] font-semibold tracking-[.16em] text-[var(--intel)] uppercase group-hover:text-[var(--gold)]">{n.place ?? (n.iso3 ? SHORT[n.iso3] : "World")}</b>
              <span className="mt-0.5 block text-[13px] leading-snug font-semibold text-[var(--wire-ink)]">{n.headline}</span>
            </button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
